// Fake ERP -- a standalone process emulating a real ERP's OData publication.
// The CRM (ERP_MODE=odata) talks to it over HTTP exactly as it would to a real
// base; connecting a real ERP only changes ERP_BASE_URL. State is in memory;
// if MOCK_ERP_STORE is set, orders/reservations are saved to a file and survive
// a restart. Zero-dep: only node:http/node:fs. Run: npm run mock-erp.

import http from "node:http";
import fs from "node:fs";
import {
  counterparties,
  products,
  prices,
  purchaseHistory,
  receivables,
  salesHistory,
  stock,
} from "./data.mjs";

const PORT = Number(process.env.MOCK_ERP_PORT ?? 8108);
const ODATA = "/odata/standard.odata";

// ── "Database" state (documents created by the CRM during the demo) ───────────
/** Test-batch reservations: Product_Key -> quantity. */
const reservations = new Map();
/** "Stock reservation" documents (for the UI). */
const reservationDocs = [];
/** Customer orders: IdempotencyKey -> document. */
const ordersByKey = new Map();
/** Customer orders in creation order (for the UI). */
const orders = [];
let orderCounter = 29; // next number SO-2026-0030 (seed shipments occupy up to 0023)

const freeQty = (key) => {
  const s = stock.find((row) => row.productKey === key);
  if (!s) return null;
  return Math.max(0, s.onHand - (reservations.get(key) ?? 0));
};

const label = (dict, key) => dict[key]?.name ?? key;

// ── OData helpers ─────────────────────────────────────────────────────────────
const odataBody = (value) => JSON.stringify({ "odata.metadata": `${ODATA}/$metadata`, value });

/** Parses `Field eq 'value'` (joined by `and`) from an already-decoded $filter. */
function parseFilter(filter) {
  const out = {};
  if (!filter) return out;
  const re = /(\w+)\s+eq\s+'([^']*)'/g;
  let m;
  while ((m = re.exec(filter)) !== null) out[m[1]] = m[2];
  return out;
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(body);
}

function odataError(res, status, code, message) {
  sendJson(res, status, JSON.stringify({ "odata.error": { code, message: { value: message } } }));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("bad json"));
      }
    });
    req.on("error", reject);
  });
}

// ── Documents (for the UI and history) ─────────────────────────────────────────
const salesHistoryDocs = salesHistory();
const purchaseHistoryDocs = purchaseHistory();

// ── OData GET handlers ─────────────────────────────────────────────────────────
function handleGet(res, entity, filter) {
  switch (entity) {
    case "InformationRegister_ClientPrices": {
      const value = prices.filter(
        (p) =>
          (!filter.Client_Key || p.clientKey === filter.Client_Key) &&
          (!filter.Product_Key || p.productKey === filter.Product_Key),
      );
      return sendJson(
        res,
        200,
        odataBody(
          value.map((p) => ({
            Client_Key: p.clientKey,
            Product_Key: p.productKey,
            Price: p.price,
          })),
        ),
      );
    }
    case "AccumulationRegister_ProductBalances/Balance": {
      const value = stock
        .filter((s) => !filter.Product_Key || s.productKey === filter.Product_Key)
        .map((s) => ({
          Product_Key: s.productKey,
          OnHandBalance: s.onHand,
          FreeBalance: freeQty(s.productKey),
          Unit: s.unit,
        }));
      return sendJson(res, 200, odataBody(value));
    }
    case "AccumulationRegister_Settlements/Balance": {
      const value = receivables
        .filter((b) => !filter.Client_Key || b.clientKey === filter.Client_Key)
        .map((b) => ({ Client_Key: b.clientKey, Debt: b.debt, CreditLimit: b.creditLimit }));
      return sendJson(res, 200, odataBody(value));
    }
    case "Document_GoodsAndServicesSales": {
      const value = salesHistoryDocs.filter(
        (d) => !filter.Client_Key || d.Client_Key === filter.Client_Key,
      );
      return sendJson(res, 200, odataBody(value));
    }
    case "Document_GoodsAndServicesReceipt": {
      return sendJson(res, 200, odataBody(purchaseHistoryDocs));
    }
    case "Document_CustomerOrder": {
      const value = orders.filter(
        (d) =>
          (!filter.Client_Key || d.Client_Key === filter.Client_Key) &&
          (!filter.IdempotencyKey || d.IdempotencyKey === filter.IdempotencyKey),
      );
      return sendJson(res, 200, odataBody(value));
    }
    default:
      return odataError(res, 404, "ENTITY_NOT_FOUND", `Entity "${entity}" is not published.`);
  }
}

// ── OData POST handlers ────────────────────────────────────────────────────────
function postReservation(res, body) {
  const key = body.Product_Key;
  const qty = Number(body.Quantity);
  const s = stock.find((row) => row.productKey === key);
  if (!s) return sendJson(res, 200, JSON.stringify({ ok: false, Available: 0, Unit: null }));
  const free = freeQty(key);
  if (!Number.isFinite(qty) || qty <= 0 || free < qty) {
    return sendJson(res, 200, JSON.stringify({ ok: false, Available: free, Unit: s.unit }));
  }
  reservations.set(key, (reservations.get(key) ?? 0) + qty);
  _reservationSeq += 1;
  reservationDocs.unshift({
    Ref_Key: `res-${String(_reservationSeq).padStart(4, "0")}`,
    ProductName: label(products, key),
    Quantity: qty,
    Unit: s.unit,
  });
  persist();
  return sendJson(
    res,
    201,
    JSON.stringify({
      ok: true,
      Reserved: qty,
      FreeBalance: free - qty,
      Unit: s.unit,
    }),
  );
}

let _reservationSeq = 0;

function postCustomerOrder(res, body) {
  if (!body.ShipmentDate) {
    return odataError(
      res,
      400,
      "MISSING_REQUIRED_FIELD",
      'ERP won\'t post a "Customer order" without a shipment date (the ShipmentDate field).',
    );
  }
  // Idempotency: a repeat with the same key doesn't create a new document.
  const key = body.IdempotencyKey;
  const existing = key ? ordersByKey.get(key) : undefined;
  if (existing) return sendJson(res, 200, JSON.stringify({ ...existing, _idempotent: true }));

  orderCounter += 1;
  const number = `SO-2026-${String(orderCounter).padStart(4, "0")}`;
  const doc = {
    Ref_Key: `so-${String(orderCounter).padStart(4, "0")}`,
    Number: number,
    Date: newTimestamp(),
    Client_Key: body.Client_Key,
    ClientLabel: label(counterparties, body.Client_Key),
    ShipmentDate: body.ShipmentDate,
    IdempotencyKey: key ?? null,
    Posted: true,
    Lines: (body.Lines ?? []).map((l) => ({
      Product_Key: l.Product_Key,
      ProductName: label(products, l.Product_Key),
      Quantity: l.Quantity,
    })),
  };
  orders.unshift(doc);
  if (key) ordersByKey.set(key, doc);
  persist();
  return sendJson(res, 201, JSON.stringify({ ...doc, _idempotent: false }));
}

// Document timestamp -- no Date.now in the stable part of the data, but for
// documents created at runtime we record the actual creation moment (a "just now"
// demo effect).
function newTimestamp() {
  return new Date().toISOString();
}

// ── "ERP database" persistence ─────────────────────────────────────────────────
// MOCK_ERP_STORE -- path to the store file (on a Docker volume). If set, orders/
// reservations created during the demo survive a container restart. Without it --
// the old behavior (everything in memory). The write is synchronous: the document
// volume is small.
const STORE = process.env.MOCK_ERP_STORE;

function persist() {
  if (!STORE) return;
  try {
    const snap = {
      orders,
      ordersByKey: [...ordersByKey.entries()],
      reservationDocs,
      reservations: [...reservations.entries()],
      orderCounter,
      _reservationSeq,
    };
    fs.writeFileSync(STORE, JSON.stringify(snap));
  } catch (e) {
    console.error("[mock-erp] failed to save state:", e.message);
  }
}

function loadState() {
  if (!STORE || !fs.existsSync(STORE)) return;
  try {
    const s = JSON.parse(fs.readFileSync(STORE, "utf8"));
    orders.push(...(s.orders ?? []));
    for (const [k, v] of s.ordersByKey ?? []) ordersByKey.set(k, v);
    reservationDocs.push(...(s.reservationDocs ?? []));
    for (const [k, v] of s.reservations ?? []) reservations.set(k, v);
    if (typeof s.orderCounter === "number") orderCounter = s.orderCounter;
    if (typeof s._reservationSeq === "number") _reservationSeq = s._reservationSeq;
    console.log(
      `[mock-erp] restored from ${STORE}: ${orders.length} orders, ${reservationDocs.length} reservations`,
    );
  } catch (e) {
    console.error("[mock-erp] failed to load state:", e.message);
  }
}

// ── Router ──────────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = decodeURIComponent(url.pathname);

  if (req.method === "GET" && path === "/") return sendHtml(res);
  if (req.method === "GET" && path === "/state.json") return sendState(res);

  if (path.startsWith(ODATA + "/")) {
    // The ERP publication is protected by Basic auth -- require the header (demo: any non-empty value).
    if (!req.headers.authorization) {
      res.writeHead(401, { "WWW-Authenticate": 'Basic realm="ERP"' });
      return res.end("401 Unauthorized");
    }
    const entity = path.slice(ODATA.length + 1);
    if (req.method === "GET") {
      const filter = parseFilter(decodeURIComponent(url.searchParams.get("$filter") ?? ""));
      return handleGet(res, entity, filter);
    }
    if (req.method === "POST") {
      let body;
      try {
        body = await readBody(req);
      } catch {
        return odataError(res, 400, "BAD_REQUEST", "The request body is not valid JSON.");
      }
      if (entity === "Document_StockReservation") return postReservation(res, body);
      if (entity === "Document_CustomerOrder") return postCustomerOrder(res, body);
      return odataError(res, 404, "ENTITY_NOT_FOUND", `POST to "${entity}" is not supported.`);
    }
  }
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("404 Not Found");
});

function sendState(res) {
  const stockView = stock.map((s) => ({
    ProductName: label(products, s.productKey),
    OnHand: s.onHand,
    Free: freeQty(s.productKey),
    Unit: s.unit,
    reserved: reservations.get(s.productKey) ?? 0,
  }));
  sendJson(res, 200, JSON.stringify({ orders, reservations: reservationDocs, stock: stockView }));
}

loadState();
server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[mock-erp] ERP (mock) listening on http://127.0.0.1:${PORT}`);
  // eslint-disable-next-line no-console
  console.log(
    `[mock-erp] OData: http://127.0.0.1:${PORT}${ODATA}/  ·  UI: http://127.0.0.1:${PORT}/`,
  );
});

// ── "ERP" web UI (yellow-gray), polling /state.json ────────────────────────────
function sendHtml(res) {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(UI_HTML);
}

const UI_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ERP System (demo copy)</title>
<style>
  :root{--erp-yellow:#ffd200;--erp-bg:#ece9d8;--erp-line:#c8c2a8;--erp-head:#4a4636;--erp-accent:#b8860b}
  *{box-sizing:border-box}
  body{margin:0;font-family:"Segoe UI",Tahoma,sans-serif;background:var(--erp-bg);color:#2b2b20;font-size:13px}
  header{background:linear-gradient(#fbe27a,var(--erp-yellow));border-bottom:2px solid var(--erp-accent);padding:8px 14px;display:flex;align-items:center;gap:10px}
  header .logo{background:#c1121f;color:#fff;font-weight:700;border-radius:3px;padding:3px 7px;letter-spacing:.5px}
  header h1{font-size:15px;margin:0;font-weight:600;color:#3a3522}
  header .sub{margin-left:auto;font-size:11px;color:#6b6442}
  nav{background:#f5f2e4;border-bottom:1px solid var(--erp-line);padding:5px 14px;display:flex;gap:16px;font-size:12px;color:var(--erp-head)}
  nav b{color:#000}
  main{padding:14px;max-width:1100px;margin:0 auto}
  section{background:#fffdf5;border:1px solid var(--erp-line);border-radius:4px;margin-bottom:14px}
  section>h2{margin:0;font-size:13px;background:#efead6;border-bottom:1px solid var(--erp-line);padding:6px 10px;color:var(--erp-head);display:flex;align-items:center;gap:8px}
  section>h2 .cnt{margin-left:auto;background:var(--erp-accent);color:#fff;border-radius:10px;padding:1px 8px;font-size:11px}
  table{width:100%;border-collapse:collapse}
  th,td{text-align:left;padding:5px 10px;border-bottom:1px solid #eee7cf;vertical-align:top}
  th{font-weight:600;color:#6b6442;font-size:11px;text-transform:uppercase;letter-spacing:.3px}
  td.num{font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}
  .doc{color:#0b5394;font-weight:600}
  .new{animation:flash 2s ease-out}
  @keyframes flash{0%{background:#fff7b0}100%{background:transparent}}
  .ok{color:#2e7d32;font-weight:600}
  .muted{color:#999}
  .empty{padding:10px;color:#999;font-style:italic}
  .bar{height:7px;background:#e7e0c4;border-radius:4px;overflow:hidden;min-width:90px;display:inline-block;vertical-align:middle}
  .bar>i{display:block;height:100%;background:linear-gradient(90deg,#8bc34a,#c0a000)}
  footer{text-align:center;color:#8a835f;font-size:11px;padding:6px}
</style></head>
<body>
<header>
  <span class="logo">ERP</span>
  <h1>Enterprise Resource Planning <span class="muted" style="font-weight:400">— demo copy (mock)</span></h1>
  <span class="sub">OData publication · refreshes every 1.5 s · <span id="clock"></span></span>
</header>
<nav><b>Documents</b><span>Directories</span><span>Warehouse</span><span>CRM</span><span>Reports</span><span>Administration</span></nav>
<main>
  <section>
    <h2>Customer orders <span class="cnt" id="cnt-orders">0</span></h2>
    <table><thead><tr><th>Number</th><th>Date</th><th>Client</th><th>Shipment date</th><th>Contents</th><th>Posted</th></tr></thead>
    <tbody id="orders"><tr><td colspan="6" class="empty">No orders yet. Win a deal in the CRM — the document will appear here.</td></tr></tbody></table>
  </section>
  <section>
    <h2>Stock reservations <span class="cnt" id="cnt-rez">0</span></h2>
    <table><thead><tr><th>Number</th><th>Product</th><th>Quantity</th></tr></thead>
    <tbody id="rez"><tr><td colspan="3" class="empty">No reservations yet. Reserve a test batch in the CRM.</td></tr></tbody></table>
  </section>
  <section>
    <h2>Warehouse product balances</h2>
    <table><thead><tr><th>Product</th><th>On hand</th><th>Reserved</th><th>Free</th><th></th></tr></thead>
    <tbody id="stock"></tbody></table>
  </section>
</main>
<footer>Fake ERP — a standalone process (node:http). The CRM talks to it over OData/HTTP just like a real base.</footer>
<script>
const fmt = new Intl.DateTimeFormat('en-US',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
const seen = new Set();
function row(html){const tr=document.createElement('tr');tr.innerHTML=html;return tr}
async function tick(){
  document.getElementById('clock').textContent = new Date().toLocaleTimeString('en-US');
  let s; try{ s = await (await fetch('/state.json',{cache:'no-store'})).json() }catch{ return }
  const ob=document.getElementById('orders'); ob.innerHTML='';
  document.getElementById('cnt-orders').textContent=s.orders.length;
  if(!s.orders.length){ ob.appendChild(row('<td colspan=6 class=empty>No orders yet. Win a deal in the CRM — the document will appear here.</td>')) }
  for(const d of s.orders){
    const isNew=!seen.has(d.Ref_Key); seen.add(d.Ref_Key);
    const contents=(d.Lines||[]).map(t=>t.ProductName+' × '+t.Quantity).join('; ');
    const tr=row('<td class=doc>'+d.Number+'</td><td>'+fmt.format(new Date(d.Date))+'</td><td>'+(d.ClientLabel||d.Client_Key)+'</td><td>'+d.ShipmentDate+'</td><td>'+contents+'</td><td class=ok>✓ posted</td>');
    if(isNew) tr.className='new'; ob.appendChild(tr);
  }
  const rb=document.getElementById('rez'); rb.innerHTML='';
  document.getElementById('cnt-rez').textContent=s.reservations.length;
  if(!s.reservations.length){ rb.appendChild(row('<td colspan=3 class=empty>No reservations yet. Reserve a test batch in the CRM.</td>')) }
  for(const r of s.reservations){
    const isNew=!seen.has(r.Ref_Key); seen.add(r.Ref_Key);
    const tr=row('<td class=doc>'+r.Ref_Key+'</td><td>'+r.ProductName+'</td><td class=num>'+r.Quantity+' '+r.Unit+'</td>');
    if(isNew) tr.className='new'; rb.appendChild(tr);
  }
  const sb=document.getElementById('stock'); sb.innerHTML='';
  for(const it of s.stock){
    const pct = it.OnHand>0 ? Math.round(100*it.Free/it.OnHand) : 0;
    sb.appendChild(row('<td>'+it.ProductName+'</td><td class=num>'+it.OnHand+' '+it.Unit+'</td><td class=num>'+(it.reserved||0)+'</td><td class=num>'+it.Free+' '+it.Unit+'</td><td><span class=bar><i style="width:'+pct+'%"></i></span></td>'));
  }
}
tick(); setInterval(tick, 1500);
</script>
</body></html>`;
