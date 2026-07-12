import Link from "next/link";
import { notFound } from "next/navigation";
import { ErpLink } from "@/app/_components/erp-link";
import { Tabs } from "@/app/_components/tabs";
import { ClientNotFoundError } from "@/application/use-cases/get-client-card";
import { ACTIVITY_KIND_LABELS } from "@/domain/activity/activity";
import { isOverCreditLimit } from "@/domain/client/client-balance";
import type { ClientCategory } from "@/domain/client/client-category";
import { CLIENT_TYPE_LABELS } from "@/domain/client/client-type";
import { CONTACT_ROLE_LABELS } from "@/domain/contact/contact";
import {
  isReturnTerminal,
  RETURN_REASON_LABELS,
  RETURN_REASONS,
  RETURN_STATUS_LABELS,
} from "@/domain/return-claim/return-claim";
import type { ProductTrend } from "@/domain/sales/product-matrix";
import { makeId } from "@/domain/shared/id";
import { canCreateDeal, canSeeMargin } from "@/domain/shared/role";
import { requireUser } from "@/infrastructure/config/current-user";
import { getContainer } from "@/infrastructure/composition-root";
import { managerLabel } from "@/infrastructure/persistence/seed";
import { advanceReturnAction, fileReturnAction, rejectReturnAction } from "./actions";
import { EditClientButton } from "@/app/clients/_components/edit-client-button";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const TREND_ICON: Record<ProductTrend, string> = {
  up: "↑",
  flat: "—",
  down: "↓",
  dormant: "✕",
};
const TREND_LABEL: Record<ProductTrend, string> = {
  up: "growing",
  flat: "stable",
  down: "declining",
  dormant: "dormant",
};

// Header segment pill: ABC category → label and warm colors (1:1 design reference).
const SEGMENT_META: Record<ClientCategory, { label: string; bg: string; color: string }> = {
  A: { label: "Key", bg: "#f7e4e2", color: "var(--accent)" },
  B: { label: "Mid-size", bg: "#efe9e2", color: "#6a5f54" },
  C: { label: "Large", bg: "#fbf1d6", color: "#9a6a00" },
};

// Palette of gradient contact avatars (from the design reference) — cycled by index.
const CONTACT_AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#8a90a0,#2b303c)",
  "linear-gradient(135deg,#b0a08f,#6a5f54)",
] as const;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase() || "?";
}

// Colored circle icon for activity type (design reference: phone/mail/stage arrow).
const ACTIVITY_ICON_STYLE: Record<
  string,
  { bg: string; color: string; path: "phone" | "mail" | "arrow" }
> = {
  call: { bg: "#e7f5ee", color: "#197a48", path: "phone" },
  email: { bg: "#f6e7e2", color: "var(--accent)", path: "mail" },
  meeting: { bg: "#e7f5ee", color: "#197a48", path: "phone" },
  note: { bg: "#eef0f2", color: "#6b6f78", path: "arrow" },
  task: { bg: "#eef0f2", color: "#6b6f78", path: "arrow" },
};

function ActivityIcon({ kind }: { kind: string }) {
  const meta = ACTIVITY_ICON_STYLE[kind] ?? {
    bg: "#eef0f2",
    color: "#6b6f78",
    path: "arrow" as const,
  };
  return (
    <div
      style={{
        width: "30px",
        height: "30px",
        borderRadius: "9px",
        background: meta.bg,
        color: meta.color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "none",
      }}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        {meta.path === "phone" ? (
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
        ) : meta.path === "mail" ? (
          <>
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3 7 9 6 9-6" />
          </>
        ) : (
          <>
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </>
        )}
      </svg>
    </div>
  );
}

// Shared frosted-glass card style — CRM Pro design reference, warm theme.
const FROSTED: React.CSSProperties = {
  background: "rgba(255,255,255,0.6)",
  backdropFilter: "blur(22px) saturate(1.3)",
  WebkitBackdropFilter: "blur(22px) saturate(1.3)",
  border: "1px solid rgba(255,255,255,0.7)",
  boxShadow: "0 12px 34px rgba(31,45,80,0.10), inset 0 1px 0 rgba(255,255,255,0.85)",
};

const SECTION_TITLE: React.CSSProperties = { font: "600 15px Arial", marginBottom: "12px" };

// Deterministic string hash (same technique as the kanban avatars) — so demo-derived
// metrics stay stable for a given client across renders.
function stableHash(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash;
}

// "Label on top / value below" pair for the "Client data" block (design reference, lines 1149-1156).
function DataField({
  label,
  value,
  span2,
  children,
}: {
  label: string;
  value?: string;
  span2?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div style={{ minWidth: 0, ...(span2 ? { gridColumn: "span 2" } : null) }}>
      <div style={{ font: "400 11px Arial", color: "#9a9ea8", marginBottom: "5px" }}>{label}</div>
      {children ?? (
        <div style={{ font: "600 14px Arial", color: "#16181d", lineHeight: 1.3 }}>{value}</div>
      )}
    </div>
  );
}

export default async function ClientCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const role = user.role;
  const showPrice = canSeeMargin(role);
  // "Create process" leads to the /deals form — it only opens for manager/head of sales.
  // For other roles (e.g. category manager) we hide the button so it doesn't lead to a
  // silent dead end.
  const showCreateDeal = canCreateDeal(role);
  const clientId = makeId<"ClientId">(id);

  let card;
  try {
    card = await getContainer().getClientCard(clientId, user);
  } catch (error) {
    if (error instanceof ClientNotFoundError) {
      notFound();
    }
    throw error;
  }
  const activities = await getContainer().listActivitiesByClient(clientId);
  // Purchase matrix (revenue is commercially sensitive) — only for roles with margin access.
  const matrix = showPrice ? await getContainer().getCustomerProductMatrix({ clientId }) : null;
  // "What to offer" recommendations (score by margin/similarity) — also commercial.
  const recommendations = showPrice
    ? await getContainer().getProductRecommendations({ clientId })
    : null;
  // Returns/claims — a commercial/operational process (like prices — for roles with commerce access).
  const returns = showPrice ? await getContainer().listClientReturns(clientId) : null;

  const segment = SEGMENT_META[card.client.category];

  // Header metrics row — EXACTLY 4 fixed cards in the order of the CRM Pro design
  // reference (Balance → Credit limit → Active processes → Annual revenue).
  // • Balance / Credit limit — numbers from the ERP; commercially sensitive, so they're
  //   only revealed to roles with margin access (showPrice + a balance on file),
  //   otherwise "—" (RBAC is never loosened).
  // • Active processes / Annual revenue — there's no dedicated backend field yet: a
  //   deterministic demo derivative of the client id (stable across renders, AI does
  //   not invent the numbers). Revenue is formatted as in the reference: "$ NNNK".
  const overCredit = showPrice && card.balance ? isOverCreditLimit(card.balance) : false;
  const seed = stableHash(card.client.id);
  const activeDealsDemo = (seed % 4) + 1; // 1..4 active processes
  const annualRevenueDemoK = 110 + (seed % 100); // $110K..$209K annual revenue (demo derivative)
  const metrics: ReadonlyArray<{ label: string; value: string; color?: string }> = [
    {
      label: "Balance",
      value: showPrice && card.balance ? card.balance.debt.format() : "—",
      color: overCredit ? "var(--accent)" : "#16181d",
    },
    {
      label: "Credit limit",
      value: showPrice && card.balance ? card.balance.creditLimit.format() : "—",
    },
    { label: "Active processes", value: String(activeDealsDemo) },
    {
      label: "Annual revenue",
      value: `$${annualRevenueDemoK}K`,
    },
  ];

  // "Client info" tab: "Client data" block (key-value grid) + "Contacts" + a functional
  // "Available stock" table. Some showcase fields ("Payment terms", "Client since") aren't
  // returned by the backend yet — a deterministic demo placeholder (marked), the real
  // fields come from card.client. Price/stock numbers come from the ERP, as before.
  const overview = (
    <>
      {showPrice && card.balance !== undefined ? (
        card.balance ? (
          overCredit ? (
            <p
              style={{
                background: "#f7e4e2",
                color: "var(--accent)",
                font: "600 13px Arial",
                padding: "11px 14px",
                borderRadius: "14px",
                marginBottom: "16px",
              }}
            >
              ⚠ Credit limit exceeded — orders on credit are blocked
            </p>
          ) : null
        ) : (
          <p style={{ font: "400 13px Arial", color: "#9a9ea8", marginBottom: "16px" }}>
            No balance on file for this client in the ERP.
          </p>
        )
      ) : null}

      <div style={{ font: "600 15px Arial", marginBottom: "15px" }}>Client data</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <DataField label="Legal name" value={card.client.name} span2 />
        <DataField label="EIN" value={card.client.ein ?? "—"} />
        <DataField label="Segment">
          <span
            style={{
              background: segment.bg,
              color: segment.color,
              font: "600 11px Arial",
              padding: "4px 11px",
              borderRadius: "999px",
            }}
          >
            {segment.label} · {card.client.category}
          </span>
        </DataField>
        <DataField label="Account manager" value={managerLabel(card.client.responsibleManagerId)} />
        {/* Demo placeholder: payment terms aren't captured in the CRM yet (no field in the ERP contract). */}
        <DataField label="Payment terms" value="Net 14 days" />
        <DataField label="Industry" value={CLIENT_TYPE_LABELS[card.client.type]} />
        {/* Demo placeholder: the client-since date isn't stored yet. */}
        <DataField label="Client since" value="March 2021" />
        <DataField
          label="Delivery address"
          value={card.client.city ? card.client.city : "—"}
          span2
        />
      </div>

      <div style={{ font: "600 15px Arial", marginBottom: "14px" }}>Contacts</div>
      {card.contacts.length > 0 ? (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "13px", marginBottom: "24px" }}
        >
          {card.contacts.map((contact, index) => (
            <div key={contact.id} style={{ display: "flex", alignItems: "center", gap: "11px" }}>
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  background: CONTACT_AVATAR_GRADIENTS[index % CONTACT_AVATAR_GRADIENTS.length],
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  font: "700 11px Arial",
                  flex: "none",
                }}
              >
                {initials(contact.name)}
              </div>
              <div>
                <div style={{ font: "600 13px Arial" }}>{contact.name}</div>
                <div style={{ font: "400 11px Arial", color: "#9a9ea8", margin: "1px 0" }}>
                  {CONTACT_ROLE_LABELS[contact.role]} · {contact.position}
                </div>
                {contact.phone ? (
                  <div
                    style={{ font: "600 14.5px Arial", color: "#16181d", letterSpacing: ".2px" }}
                  >
                    {contact.phone}
                  </div>
                ) : null}
                {contact.email ? (
                  <div style={{ font: "400 11px Arial", color: "#9a9ea8", marginTop: "1px" }}>
                    {contact.email}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ font: "400 13px Arial", color: "#9a9ea8", marginBottom: "24px" }}>
          No contacts on file.
        </p>
      )}

      <div style={SECTION_TITLE}>Available stock</div>
      <table className="grid">
        <thead>
          <tr>
            <th>Product</th>
            {showPrice ? <th>Client price</th> : null}
            <th>Available stock</th>
          </tr>
        </thead>
        <tbody>
          {card.lines.map((line) => (
            <tr key={line.product.id}>
              <td>
                {line.product.name}
                <br />
                <span className="muted">{line.product.sku}</span>
              </td>
              {showPrice ? <td>{line.price ? line.price.format() : "—"}</td> : null}
              <td>{line.freeQuantity !== null ? `${line.freeQuantity} ${line.unit}` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );

  // Right sidebar: "Activity feed" — real client activities (design reference, lines 1202-1207).
  const activityFeed = (
    <div style={{ ...FROSTED, borderRadius: "22px", padding: "22px" }}>
      <div style={{ font: "600 15px Arial", marginBottom: "14px" }}>Activity feed</div>
      {activities.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {activities.map((item) => (
            <div key={item.id} style={{ display: "flex", gap: "11px" }}>
              <ActivityIcon kind={item.kind} />
              <div>
                <div style={{ font: "500 13px Arial", lineHeight: 1.35 }}>{item.text}</div>
                <div style={{ font: "400 11px Arial", color: "#9a9ea8", marginTop: "2px" }}>
                  {ACTIVITY_KIND_LABELS[item.kind]} · {managerLabel(item.author)} ·{" "}
                  {formatDateTime(item.createdAt)}
                  {item.kind === "task" && item.done ? " · ✓ done" : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ font: "400 13px Arial", color: "#9a9ea8" }}>No activities yet.</p>
      )}
    </div>
  );

  // Right sidebar: "Popular products" — top 4 products from the purchase matrix (real
  // revenue numbers for the last 3 months from the ERP; rows are already sorted by
  // revenue descending). Bar width — by rank (leader 100%), so the scale reads without a
  // "raw" minor field. Available to roles with margin access; without the matrix we don't
  // render the block (we don't invent data).
  const BAR_WIDTHS = [100, 66, 42, 25] as const;
  const popularProducts =
    matrix && matrix.rows.length > 0 ? matrix.rows.slice(0, BAR_WIDTHS.length) : null;

  const popularProductsCard = popularProducts ? (
    <div style={{ ...FROSTED, borderRadius: "22px", padding: "22px" }}>
      <div style={{ font: "600 15px Arial", marginBottom: "16px" }}>Popular products</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        {popularProducts.map((row, index) => (
          <div key={row.productName}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "10px",
                marginBottom: "7px",
              }}
            >
              <span style={{ font: "500 13px Arial", color: "#16181d" }}>{row.productName}</span>
              <span style={{ font: "700 13px Arial", color: "#16181d" }}>{row.last3Revenue}</span>
            </div>
            <div
              style={{
                height: "7px",
                background: "#efe9e2",
                borderRadius: "4px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${BAR_WIDTHS[index] ?? 25}%`,
                  height: "100%",
                  background: "var(--accent)",
                  borderRadius: "4px",
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div style={{ font: "400 11px Arial", color: "#9a9ea8", marginTop: "15px" }}>
        Revenue by product over the last 3 months
      </div>
    </div>
  ) : null;

  const purchases =
    matrix && matrix.rows.length > 0 ? (
      <>
        <p style={{ font: "400 13px Arial", color: "#9a9ea8", marginBottom: "12px" }}>
          Purchase trend and last order by product (counted from {matrix.referenceMonth}). ↓/✕ —
          churn risk, a reason to re-engage.
        </p>
        <table className="grid">
          <thead>
            <tr>
              <th>Product</th>
              <th>Trend</th>
              <th>Last order</th>
              <th>Revenue (3 mo)</th>
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row) => {
              const alert = row.trend === "dormant" || row.trend === "down";
              const trendText = `${TREND_ICON[row.trend]} ${TREND_LABEL[row.trend]}`;
              return (
                <tr key={row.productName}>
                  <td>{row.productName}</td>
                  <td>
                    {alert ? (
                      <strong style={{ color: "var(--accent)" }}>{trendText}</strong>
                    ) : (
                      trendText
                    )}
                  </td>
                  <td>
                    {row.lastOrderMonth}
                    {row.monthsSinceLast >= 3 ? ` · ${row.monthsSinceLast} mo ago` : ""}
                  </td>
                  <td>{row.last3Revenue}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </>
    ) : matrix ? (
      <p style={{ font: "400 13px Arial", color: "#9a9ea8" }}>
        No purchase history for this client.
      </p>
    ) : null;

  const recs =
    recommendations && recommendations.length > 0 ? (
      <>
        <p style={{ font: "400 13px Arial", color: "#9a9ea8", marginBottom: "12px" }}>
          What to offer next: score 1-10 — deterministic, based on similar clients and margin (AI
          does not invent the numbers).
        </p>
        <table className="grid">
          <thead>
            <tr>
              <th>Product</th>
              <th>Score</th>
              <th>Why</th>
            </tr>
          </thead>
          <tbody>
            {recommendations.map((row) => (
              <tr key={row.productName}>
                <td>{row.productName}</td>
                <td>
                  {row.score >= 8 ? (
                    <strong style={{ color: "var(--accent)" }}>{row.score}</strong>
                  ) : (
                    <strong>{row.score}</strong>
                  )}
                </td>
                <td className="muted">{row.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    ) : recommendations ? (
      <p style={{ font: "400 13px Arial", color: "#9a9ea8" }}>
        No new recommendations — the client already buys the core assortment.
      </p>
    ) : null;

  const legalEntities = card.client.legalEntities ?? [];
  const legalEntitiesContent = (
    <>
      <p style={{ font: "400 13px Arial", color: "#9a9ea8", marginBottom: "12px" }}>
        Client legal entities — shipments/documents are issued to a specific LLC/sole proprietor.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "13px" }}>
        {legalEntities.map((entity) => (
          <div key={entity.id}>
            <div style={{ font: "600 13px Arial" }}>
              {entity.name}
              {entity.isPrimary ? (
                <span
                  style={{
                    background: "#f7e4e2",
                    color: "var(--accent)",
                    font: "600 11px Arial",
                    padding: "3px 9px",
                    borderRadius: "999px",
                    marginLeft: "8px",
                  }}
                >
                  primary
                </span>
              ) : null}
            </div>
            <div style={{ font: "400 11px Arial", color: "#9a9ea8", marginTop: "2px" }}>
              EIN {entity.ein}
              {entity.kpp ? ` · Branch ID ${entity.kpp}` : ""}
            </div>
          </div>
        ))}
      </div>
    </>
  );

  const returnsContent = returns ? (
    <>
      <p style={{ font: "400 13px Arial", color: "#9a9ea8", marginBottom: "12px" }}>
        Returns and claims: internal memo → return waybill → warehouse pickup → received in the ERP
        → document adjustment.
      </p>
      {returns.length > 0 ? (
        <ul className="timeline">
          {returns.map((claim) => (
            <li key={claim.id} className="timeline__item">
              <span className={`badge${isReturnTerminal(claim.status) ? "" : " attention-badge"}`}>
                {RETURN_STATUS_LABELS[claim.status]}
              </span>
              <div className="timeline__body">
                <p>
                  <strong>{claim.productName}</strong> · {claim.quantity} {claim.unit} ·{" "}
                  {RETURN_REASON_LABELS[claim.reason]}
                </p>
                {claim.comment ? <p className="muted">{claim.comment}</p> : null}
                <p className="muted">
                  {managerLabel(claim.createdBy)} · {formatDateTime(claim.createdAt)}
                </p>
              </div>
              {!isReturnTerminal(claim.status) ? (
                <div className="stage-controls">
                  <form action={advanceReturnAction}>
                    <input type="hidden" name="claimId" value={claim.id} />
                    <input type="hidden" name="clientId" value={clientId} />
                    <button type="submit" className="btn">
                      Next stage →
                    </button>
                  </form>
                  {claim.status === "requested" ? (
                    <form action={rejectReturnAction}>
                      <input type="hidden" name="claimId" value={claim.id} />
                      <input type="hidden" name="clientId" value={clientId} />
                      <button type="submit" className="btn btn--revert">
                        Reject
                      </button>
                    </form>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ font: "400 13px Arial", color: "#9a9ea8" }}>No returns for this client.</p>
      )}

      <h3 style={{ ...SECTION_TITLE, marginTop: "22px" }}>File a return</h3>
      <form action={fileReturnAction} className="form">
        <input type="hidden" name="clientId" value={clientId} />
        <label>
          Product
          <input name="productName" required placeholder="E.g. Belcolade chocolate" />
        </label>
        <label>
          Quantity
          <input name="quantity" type="number" min="1" step="any" required />
        </label>
        <label>
          Unit
          <input name="unit" defaultValue="kg" />
        </label>
        <label>
          Reason
          <select name="reason" defaultValue="defect">
            {RETURN_REASONS.map((reason) => (
              <option key={reason} value={reason}>
                {RETURN_REASON_LABELS[reason]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Comment
          <textarea name="comment" rows={2} placeholder="Return details" />
        </label>
        <button type="submit" className="btn">
          File return
        </button>
      </form>
    </>
  ) : null;

  return (
    <div className="scr">
      {/* Back to the client list */}
      <Link
        href="/clients"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "7px",
          font: "600 13px Arial",
          color: "#6b6f78",
          textDecoration: "none",
          cursor: "pointer",
          marginBottom: "16px",
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 12H5" />
          <path d="M12 19l-7-7 7-7" />
        </svg>
        Back to clients
      </Link>

      {/* Card header */}
      <div
        style={{
          ...FROSTED,
          borderRadius: "22px",
          padding: "22px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "58px",
              height: "58px",
              borderRadius: "16px",
              background: "#1c1f27",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              font: "700 19px Arial",
              flex: "none",
            }}
          >
            {initials(card.client.name)}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "11px", flexWrap: "wrap" }}>
              <span style={{ font: "700 23px Arial", letterSpacing: "-.3px" }}>
                {card.client.name}
              </span>
              <span
                style={{
                  background: segment.bg,
                  color: segment.color,
                  font: "600 11px Arial",
                  padding: "4px 11px",
                  borderRadius: "999px",
                }}
              >
                {segment.label}
              </span>
            </div>
            <div style={{ font: "400 12px Arial", color: "#9a9ea8", marginTop: "5px" }}>
              {card.client.ein ? `EIN ${card.client.ein}` : CLIENT_TYPE_LABELS[card.client.type]}
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            flex: "none",
            flexWrap: "wrap",
          }}
        >
          {/* Account manager block with a vertical divider (design reference, lines 1127-1130). */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "11px",
              paddingRight: "16px",
              borderRight: "1px solid #e8e1d9",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "11px",
                background: CONTACT_AVATAR_GRADIENTS[0],
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                font: "700 13px Arial",
                flex: "none",
              }}
            >
              {initials(managerLabel(card.client.responsibleManagerId))}
            </div>
            <div>
              <div style={{ font: "400 11px Arial", color: "#9a9ea8" }}>Account manager</div>
              <div style={{ font: "600 14px Arial", color: "#16181d", marginTop: "2px" }}>
                {managerLabel(card.client.responsibleManagerId)}
              </div>
            </div>
          </div>
          {showPrice ? <ErpLink label="Open counterparty in ERP" /> : null}
          {showCreateDeal ? <EditClientButton client={card.client} /> : null}
          {showCreateDeal ? (
            <Link
              href={`/deals?createForClient=${id}`}
              style={{
                border: "none",
                background: "#1c1f27",
                color: "#fff",
                font: "600 13px Arial",
                padding: "11px 18px",
                borderRadius: "24px",
                display: "flex",
                alignItems: "center",
                gap: "7px",
                textDecoration: "none",
                whiteSpace: "nowrap",
                flex: "none",
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              Create process
            </Link>
          ) : null}
        </div>
      </div>

      {/* Metrics row — 4 fixed cards (CRM Pro design reference, lines 1134-1139) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "16px",
          marginBottom: "16px",
        }}
      >
        {metrics.map((metric) => (
          <div key={metric.label} style={{ ...FROSTED, borderRadius: "18px", padding: "18px" }}>
            <div style={{ font: "400 12px Arial", color: "#9a9ea8" }}>{metric.label}</div>
            <div
              style={{
                font: "700 24px Arial",
                letterSpacing: "-.5px",
                marginTop: "8px",
                color: metric.color ?? "#16181d",
              }}
            >
              {metric.value}
            </div>
          </div>
        ))}
      </div>

      {/* Two-column grid: tabs on the left, sidebar on the right */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.7fr 1fr",
          gap: "16px",
          alignItems: "start",
        }}
      >
        <div style={{ ...FROSTED, borderRadius: "22px", padding: "22px" }}>
          <Tabs
            tabs={[
              { key: "overview", label: "Info", content: overview },
              ...(matrix ? [{ key: "purchases", label: "Purchases", content: purchases }] : []),
              ...(recommendations
                ? [{ key: "recommendations", label: "Recommendations", content: recs }]
                : []),
              ...(returns
                ? [
                    {
                      key: "returns",
                      label: returns.length > 0 ? `Returns (${returns.length})` : "Returns",
                      content: returnsContent,
                    },
                  ]
                : []),
              ...(legalEntities.length > 0
                ? [
                    {
                      key: "legal",
                      label: `Legal entities (${legalEntities.length})`,
                      content: legalEntitiesContent,
                    },
                  ]
                : []),
            ]}
          />
        </div>

        {/* Sidebar: "Activity feed" + "Popular products" (design reference, lines 1200-1218). */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {activityFeed}
          {popularProductsCard}
        </div>
      </div>
    </div>
  );
}
