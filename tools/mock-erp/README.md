# Fake ERP — a demo ERP copy for showcasing the integration

A standalone process (zero-dep, `node:http`) that emulates a real ERP's OData
publication. The CRM (`ERP_MODE=odata`) talks to it over HTTP **the same way** it
would talk to the real system — connecting a real ERP only changes `ERP_BASE_URL`.

Why: a real (anonymized) ERP copy isn't available yet (blocker #1/#15), and the
demo needs to show the client that the CRM really works with an ERP — reading
prices/stock/receivables and posting a "Customer order".

## Run it

```bash
npm run mock-erp          # http://127.0.0.1:8108  (port changes via MOCK_ERP_PORT)
```

- **ERP UI** (yellow-gray, auto-refreshing): http://127.0.0.1:8108/
- **OData**: http://127.0.0.1:8108/odata/standard.odata/ (Basic auth, any non-empty credentials)

State is in memory (a restart resets orders/reservations back to the original seed data).

## Connecting the CRM to the fake ERP

In the app's `.env`:

```
ERP_MODE=odata
ERP_BASE_URL=http://127.0.0.1:8108
ERP_USERNAME=demo
ERP_PASSWORD=demo
```

Then in two terminals: `npm run mock-erp` and `npm run dev`. Open the CRM and the
ERP window (`/`) side by side.

## Demo script (what to show)

1. Open a client/deal card in the CRM -> the price, free stock, and the client's
   receivables arrive **from the ERP window** over the network (not from CRM memory).
2. Reserve a test batch -> a "Stock reservation" document appears in the ERP window,
   and free stock drops in real time.
3. Move the deal to "Won" / place an order -> a posted **"Customer order"** appears in
   the ERP window with a number like `SO-2026-XXXX`. Placing the same order again
   returns the same number (idempotency — no duplicates).
4. Try placing an order without a shipment date -> the ERP rejects it (a visible
   error, not a silent failure).

## OData contract

See `specs/mock-erp-odata.md` (the "port-method -> HTTP endpoint" table). The
adapter implementation is `src/infrastructure/erp/odata-erp-gateway.ts`. The demo
copy's entity/field names are realistic, but when connecting a real ERP they're
re-checked against its `$metadata` (they depend on configuration) — only the
adapter changes, use-cases/screens stay untouched.
