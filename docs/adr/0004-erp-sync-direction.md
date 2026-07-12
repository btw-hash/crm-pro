# ADR-0004: ERP sync direction — events vs. polling

- **Status:** accepted (direction; implementation lands with the integration, #15)
- **Date:** 2026-06-24
- **Issue:** #137

## Context

[ADR-0002](0002-system-of-record-and-idempotency.md) §2 fixed the **outbound**
direction: the CRM reads the ERP on demand through `ErpGateway` (price, stock, balance —
at the moment it's needed). The **inbound** question is still open: how does the CRM
learn about changes that happened **in the ERP** that the CRM didn't initiate — an order
created directly in the ERP, a payment posted, a stock level changed. Read-by-request
doesn't cover this: the CRM doesn't know _what_ to re-read or _when_. The options are
timer-based polling (the CRM asks) or events (the ERP notifies). The decision needs to be
baked into the `ErpGateway` contract before #15 is implemented, so use-cases don't need
rewriting later.

## Decision

### 1. MVP — timer-based polling, a pull model

The CRM periodically polls the ERP for a delta of changes on the entities it cares about
(order statuses, payments, critical stock levels). Reasons for MVP:

- **Requires no ERP-side work.** Webhooks/events from the ERP would be development work
  on the ERP side (HTTP services, scheduled jobs, a queue). For the demo we have an
  anonymized copy and OData access (#1/#15) — polling is implemented entirely on the CRM
  side.
- **Simpler and more reliable to start with.** No lost events, no "exactly once"
  delivery to build; a missed polling tick self-heals on the next one.
- **Compatible with ADR-0002.** Sensitive numbers (price/receivables) are still read
  point-in-time on demand; polling is only for the status delta, not bulk mirroring.

### 2. Contract: a delta + a cursor, not a "full dump"

Inbound sync is designed as **a delta by cursor**, not re-reading everything:

- A request shaped like "changes since time T / since version V" (OData supports
  filtering by modification date; where available, an ETag/version number).
- The CRM stores **the cursor of the last successful sync** (per entity). A failed sync
  doesn't lose data — the next pass resumes from the same cursor.
- Applying the delta is **idempotent** (ADR-0002 §3): a change that arrives twice
  doesn't create a duplicate `DealEvent`/record.

### 3. Extending the port (scaffolding only, no MVP implementation)

`ErpGateway` gets a placeholder method for reading the delta — the signature is fixed
now, the implementation in `ODataErpGateway` arrives with #15. A sketch of the direction
(not final code):

```ts
// scaffolding for #15 — fixes the direction, not implemented on the stub
interface ErpInboundSync {
  /** Order/payment status changes since the cursor. A delta, not a full dump. */
  pullOrderChanges(sinceCursor: string | null): Promise<{
    changes: readonly OrderStatusChange[];
    nextCursor: string;
  }>;
}
```

`StubErpGateway` returns an empty delta (the seed is static) — use-cases and the UI work
without a live ERP. The polling trigger (a timer/scheduled job) lives in the
infrastructure layer, not the domain.

### 4. A path to events (push) — planned for, not built

Once the ERP side can send events (an HTTP service → a webhook into the CRM), the switch
happens **without breaking the contract**: the CRM's endpoint accepts the same
`OrderStatusChange` shape and applies the same idempotent delta logic as polling. In
other words, polling and events are two _transports_ into the same delta handler. That
preserves the investment in the delta model and lets us switch once the ERP side is
ready, without rewriting use-cases.

## Consequences

- MVP doesn't depend on ERP-side work — polling is implemented by the CRM team over
  OData (#15).
- Delta-by-cursor + idempotency rule out duplicates and data loss on failure.
- Switching to push later is a transport change, not a contract change; the delta
  handler is shared.
- A new piece of state appears — the "sync cursor" — its persistence is covered in
  [ADR-0005](0005-persistence-postgresql.md) (it can't live only in memory, or a restart
  means starting the sync over from scratch).

## Alternatives

- **Events (push) from the ERP right away** — rejected for MVP: requires ERP-side
  development, "exactly once" delivery, and handling lost events; not available for the
  demo. Reserved as a future transport on top of the same delta model.
- **Two-way replication of ERP↔CRM reference data** — rejected (as in ADR-0002 §2):
  complexity, risk of stale commercial data, unnecessary PII duplication.
- **Read-by-request only, no inbound sync** — insufficient: misses changes initiated in
  the ERP (a payment, a direct order) — and those are key facts (ADR-0003).
