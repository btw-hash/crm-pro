# ADR-0003: Status semantics — "what counts as a fact"

- **Status:** accepted
- **Date:** 2026-06-24
- **Issue:** #136

## Context

Pipeline stages (`DEAL_STAGES` in `src/domain/deal/deal-stage.ts`) describe where a deal
sits in the sales process. But the "facts" that trigger downstream action in the
accounting contour — **payment received**, **order accepted**, **procurement/production
started** — are currently smeared across the CRM (deal stage) and the ERP (the
financial and warehouse contour). Per the ERP-integration research, this is the crux of
a reliable exchange: until both sides agree on _which_ event is authoritative _where_,
any sync will drift ("paid in the CRM, not paid in the ERP"). [ADR-0002](0002-system-of-record-and-idempotency.md)
fixed the **owner** of each entity; this ADR fixes the **semantics of transitions**:
what each status means and who is entitled to set it.

## Decision

### 1. Two different notions of "status" — don't conflate them

| Concept                             | Lives in | Owner | Example values                     |
| ----------------------------------- | -------- | ----- | ---------------------------------- |
| **Deal stage** (sales)              | CRM      | CRM   | `qualification … quote → won/lost` |
| **Order state** (finance/warehouse) | ERP      | ERP   | accepted, paid, shipped, closed    |

The deal stage is about the _probability of a sale_. The order state is about
_fulfilling an obligation_. `won` (deal won) **is not the same as** "paid": a won deal
spawns a "customer order" in the ERP (#8), while payment/shipment are separate facts
that live inside the ERP.

### 2. The source of truth for each key fact

A "fact" is a state that downstream automation (starting a purchase, a reminder,
analytics) can rely on. Each has **exactly one owner** and **one trigger of truth**.

| Fact                           | Ground truth (owner)                                         | Effect in the CRM                                         |
| ------------------------------ | ------------------------------------------------------------ | --------------------------------------------------------- |
| Deal "in progress"             | stage ∈ {audit … quote}, a "next step" exists (CRM)          | shows up in the pipeline/forecast, isn't "stalled"        |
| Deal won                       | stage = `won` (CRM), confirmed by a human                    | allowed to create a "customer order" in the ERP           |
| Order created in the ERP       | `createCustomerOrder` returned an `orderNumber` (ERP)        | the deal is marked "order placed," carries the idemp. key |
| **Payment received**           | the payment fact in the ERP (ERP)                            | the CRM **reads** it, never sets it; unlocks later stages |
| Procurement/production started | a deficit/quota decision (CRM, deterministic) + an ERP order | a request to the technologist/buyer (#35, /procurement)   |
| Shipment / delivery            | the shipment is posted in the ERP (ERP)                      | the CRM reads the status for the deal's activity feed     |

Rule: **the CRM never "assigns" a fact the ERP owns.** Payment, shipment, stock are only
ever reflected by the CRM (read per ADR-0002 §2). The reverse holds too: the ERP never
moves the pipeline stage — that's the sales process, owned by the CRM.

### 3. `won` doesn't finalize the obligation

Terminal pipeline stages (`won`/`lost`, `isTerminal`) close out the **sale**, not the
**fulfillment**. The order's lifecycle (payment → shipment → close) lives in the ERP and
is reflected in the deal's activity feed (`DealEvent`) as events read from the ERP —
without a dedicated pipeline stage per financial status. This keeps the pipeline about
sales and avoids duplicating the ERP's accounting contour inside the CRM.

### 4. Human confirmation as part of the definition of a fact

In the spirit of passive capture (CLAUDE.md): a fact extracted by AI (from voice or a
message) becomes a "fact" only after a human confirms it (~30 sec). Before confirmation
it's a _candidate_, not grounds for automated action. This applies to stages, goals,
requests — anything that advances the process.

## Consequences

- An unambiguous "fact → owner → effect" map underpins the sync contract
  ([ADR-0004](0004-erp-sync-direction.md)) and the order contract (#135).
- Financial statuses (payment/shipment) aren't modeled as pipeline stages — less
  duplication with the ERP, the pipeline stays about sales.
- Any automated action (a reminder, starting procurement) must reference a fact with a
  defined owner — nothing can trigger off an unconfirmed AI candidate.

## Alternatives

- **Add "paid"/"shipped" pipeline stages** — rejected: duplicates the ERP's financial
  contour, breaks the meaning of the pipeline (sale probability ≠ fulfillment), creates
  two sources of truth for payment.
- **Let the CRM set payment itself (on the manager's say-so)** — rejected: the ERP owns
  payment (ADR-0002); a verbal claim is an unverified fact and poisons forecasts.
