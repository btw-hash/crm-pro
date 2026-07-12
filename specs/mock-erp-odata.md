# SPEC: Fake ERP for the demo (OData mock + live gateway)

Status: in progress · Owner: dev-b · Issue: TBD · Branch: `feat/mock-erp-odata`

## Why

The customer demo needs to show that the CRM actually talks to the ERP, but the real
anonymized ERP copy isn't available yet (blocker #1/#15). So we stand up a **fake ERP**
that the CRM hits over real HTTP, exactly the way it will hit the real base — only
`ERP_BASE_URL` changes when the real copy arrives.

Two pieces, decided with the user:

1. **A standalone OData mock server** (`tools/mock-erp/`) — a separate `node:http`
   process (zero deps) that answers the same OData endpoints a real ERP's
   `standard.odata` interface exposes, holds its own in-memory state (created orders,
   reservations), and renders a recognizable yellow/grey **ERP web UI** that
   auto-refreshes so the audience sees documents land in the ERP.
2. **`ODataErpGateway`** — the previously stubbed real adapter, now implemented with
   `fetch` + Basic auth + OData JSON parsing. The same code runs against the fake and
   the real base.

## REQ

- **REQ-1** CRM with `ERP_MODE=odata` + `ERP_BASE_URL` reads prices / stock / balances /
  sales+purchase history from the mock over HTTP; behavior matches the existing
  `StubErpGateway` contract (same `erp-gateway.test`-style guarantees).
- **REQ-2** Reserving a test batch (`reserveStock`) POSTs to the mock; free stock
  decreases and the change is visible in the ERP UI.
- **REQ-3** Winning a deal (`createCustomerOrder`) POSTs a customer order; the mock
  returns an ERP-style document number, the document appears in the ERP UI, and a
  repeat with the same `idempotencyKey` returns the same number without a duplicate.
- **REQ-4** Write failures are loud (A18): missing shipment date → 400
  `MISSING_REQUIRED_FIELD` → `ErpWriteError("missing_required_field")`; server down →
  `ErpWriteError("unavailable")`.
- **REQ-5** No new npm dependencies; `npm run verify` (typecheck+lint+format+test)
  stays green. The mock is excluded from app typecheck (`.mjs`, outside tsconfig).

## SVC — OData contract (mock defines it; gateway consumes it)

Base path prefix: `/odata/standard.odata`. Responses are OData-v3 JSON:
`{ "odata.metadata": "...", "value": [ ... ] }`. Keys use ERP-style `Ref_Key` / `*_Key`
conventions so the adapter is written against a realistic shape. When the real base
arrives, only entity/field names are re-checked against `$metadata`.

| Port method           | HTTP | Entity                                                                                    | Maps to                                                                             |
| --------------------- | ---- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `listNomenclature`    | GET  | `Catalog_Nomenclature` `$filter=DeletionMark eq false and IsFolder eq false`              | product rows → `NomenclatureItem[]`                                                 |
| `getIndividualPrice`  | GET  | `InformationRegister_ClientPrices` `$filter=Client_Key eq '<c>' and Product_Key eq '<p>'` | `{Price}` → `Money`                                                                 |
| `getStockLevel`       | GET  | `AccumulationRegister_ProductBalances/Balance` `$filter=Product_Key eq '<p>'`             | `{FreeBalance, Unit}` → `freeQuantity, unit`                                        |
| `getClientBalance`    | GET  | `AccumulationRegister_Settlements/Balance` `$filter=Client_Key eq '<c>'`                  | `{Debt, CreditLimit}` → `Money`                                                     |
| `getSalesHistory`     | GET  | `Document_GoodsAndServicesSales` `[?$filter=Client_Key eq '<c>']`                         | doc rows → `SalesOrder[]`                                                           |
| `getPurchaseHistory`  | GET  | `Document_GoodsAndServicesReceipt`                                                        | doc rows → `PurchaseReceipt[]`                                                      |
| `reserveStock`        | POST | `Document_StockReservation`                                                               | body `{Product_Key, Quantity}` → `{ok, Reserved, FreeBalance, Available, Unit}`     |
| `createCustomerOrder` | POST | `Document_CustomerOrder`                                                                  | body `{Client_Key, ShipmentDate, IdempotencyKey, Lines[]}` → `{Number, idempotent}` |

Auth: HTTP Basic (`ERP_USERNAME`/`ERP_PASSWORD`), as with a real ERP publication. Mock
accepts any non-empty credentials (demo).

## TASK

1. `tools/mock-erp/data.mjs` — a synthetic ERP dataset (prices/stock/balances + a
   compact monthly sales/purchase history) keyed by the same ids as `seed.ts`.
2. `tools/mock-erp/server.mjs` — a `node:http` server: OData GET/POST + the ERP UI page
   (`GET /`) with JSON polling.
3. `tools/mock-erp/README.md` — how to run + a demo script.
4. `src/infrastructure/erp/odata-erp-gateway.ts` — implement all 8 methods.
5. `src/infrastructure/erp/odata-erp-gateway.test.ts` — fetch-mocked unit tests.
6. Wiring: `eslint.config.mjs` ignore `tools/**`; `package.json` `mock-erp` script;
   `.env.example` odata notes; a showcase HTML page; the worklog.

## Out of scope

- Real ERP document printing (invoice/packing slip/bill of lading) — stays behind the
  port (#15).
- Persisting mock state to disk — in-memory is enough for a demo (a restart resets it).
- `$metadata` document fidelity — a minimal stub only.
