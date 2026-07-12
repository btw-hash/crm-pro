# ADR-0002: System of record and ERP integration idempotency

- **Status:** accepted
- **Date:** 2026-06-21

## Context

An early spec draft describes the ERP integration as a "magic API": data "instantly
lands," orders "get created automatically." Two things a reliable integration cannot
skip are left unstated: **who owns each entity** (where the source of truth is) and
**what happens on a repeated write** (a network retry must not spawn duplicate orders).
Without these rules it's easy to end up with duplicate "customer orders," price
drift, and conflicts from 7 sales reps working in parallel. This builds on
[ADR-0001](0001-architecture.md) (a thin ERP layer + the `ErpGateway` port).

## Decision

### 1. System of record

| Data                                  | Owner     | CRM                      | Note                                                                      |
| ------------------------------------- | --------- | ------------------------ | ------------------------------------------------------------------------- |
| Counterparties, product catalog       | ERP       | reads                    | CRM references records by ERP id                                          |
| Individual prices, discounts          | ERP       | reads, **doesn't store** | the number is fetched on demand (see #7: not exposed to the technologist) |
| Stock levels, reservations            | ERP       | reads                    | free stock = balance − reservations                                       |
| Receivables, credit limit, payments   | ERP       | reads                    | used to check the limit when placing an order (#34)                       |
| "Customer order," the finance contour | ERP       | **creates** via the port | see idempotency below (#8)                                                |
| Deal stages, the pipeline             | **CRM**   | owns                     | sales-process state                                                       |
| Production report, the audit record   | **CRM**   | owns                     | confirmed by a human                                                      |
| Activities, tasks, "next step"        | **CRM**   | owns                     | #31                                                                       |
| Sample requests, deal goal            | **CRM**   | owns                     | #35, #37                                                                  |
| Quotas, allocation, deficits          | ERP + CRM | Phase 2                  | needs history; deterministic, not AI-driven                               |

Conflict-resolution rule: for fields the ERP owns, **the ERP is always right**. The CRM
never edits fields it doesn't own and never recomputes commercial math on its own side —
it takes the finished number (prices/discounts are computed by the ERP's own mechanisms:
contracts, price types).

### 2. Read direction

The CRM reads ERP data **on demand** through `ErpGateway`; sensitive numbers (price,
receivables) are never cached in the CRM database beyond the request. There is no bulk
mirroring of ERP reference data into the CRM database at MVP. If a cache is needed later
for performance — only a delta sync with the ERP as the source of truth (ETag/version),
not two-way replication.

### 3. Write idempotency

Any mutation sent to the ERP through `ErpGateway` must be **idempotent**: the calling
layer passes a stable operation key (e.g. `dealId` + operation type); the ERP adapter
must not recreate a document that's already been created under that key (an existence
check or dedup on the ERP/gateway side). This closes the door on duplicate orders from
network retries. Implemented as part of #8 (the `createCustomerOrder` contract gets an
idempotency key) and extended to future writes (sample reservation — #35).

### 4. Identity mapping

CRM domain entities use branded ids (`ClientId`, `ProductId`, …) whose values are the
ERP's own ids. Where needed, a CRM↔ERP mapping table exists.

## Consequences

- Unambiguous ownership rules out double writes and stale prices/discounts.
- Every ERP write must carry an idempotency key — accounted for when implementing #8.
- Less "magic," more predictability; the cost is an explicit read/write contract instead
  of "it syncs itself."

## Alternatives

- **Mirror all ERP reference data into the CRM database** — rejected for MVP: sync
  complexity, risk of stale commercial data, unnecessary PII duplication.
- **Make the CRM the source of truth for prices/discounts** — rejected: the ERP is the
  accounting core (ADR-0001); recomputing commercial math outside the ERP breaks
  reconciliation and upgradability.
