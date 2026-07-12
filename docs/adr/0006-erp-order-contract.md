# ADR-0006: The `createCustomerOrder` contract — fields, idempotency, errors

- **Status:** accepted
- **Date:** 2026-06-24
- **Issue:** #135

## Context

[ADR-0002](0002-system-of-record-and-idempotency.md) §3 fixed the _principle_ of write
idempotency against the ERP, but not the _contract_: which fields are required to post a
"customer order," how the idempotency key is passed, what an ERP rejection looks like,
and how CRM↔ERP ids map to each other. Per the integration research, an order won't post
without a shipment date and a status; without an explicit contract, the real adapter
(#15) and the use-case would drift apart. The contract is fixed **before** the real
adapter and encoded in the `ErpGateway` port + `StubErpGateway` (its behavior is
verifiable against the stub).

## Decision

### 1. Required fields on `CustomerOrderDraft`

| Field            | Type                  | Purpose                                                            |
| ---------------- | --------------------- | ------------------------------------------------------------------ |
| `clientId`       | `ClientId` (= ERP id) | the order's counterparty                                           |
| `lines`          | `CustomerOrderLine[]` | line items (product + quantity); ≥1, quantity > 0                  |
| `shipmentDate`   | ISO `yyyy-mm-dd`      | **required** — the ERP won't post an order without a shipment date |
| `idempotencyKey` | `string`              | a stable operation key (see §2)                                    |

**The ERP document's status is not a request field.** The "customer order" is created
by the ERP in whatever status its own policy dictates (e.g. "to be fulfilled"); the CRM
doesn't dictate it — the order status belongs to the ERP
([ADR-0003](0003-status-semantics-definition-of-fact.md)). The CRM doesn't pass
prices/totals into the order either — the ERP computes them from the contract/price type
(ADR-0002).

### 2. Idempotency key format

`idempotencyKey = "order:<dealId>"` — **one order per won deal**. A repeated call (a
network retry, a double click) with the same key doesn't create a second document — it
returns the already-created one with `idempotent: true`. If multiple orders per deal are
needed later, the key can be extended with a hash of the line items/timestamp without
breaking the contract (it stays a `string`).

### 3. ERP write-failure error model

A write failure is **loud** — a typed `ErpWriteError` with a `reason` (not a silent
`catch`, [A18]):

| `reason`                 | When                                                | CRM behavior                         |
| ------------------------ | --------------------------------------------------- | ------------------------------------ |
| `missing_required_field` | a required field wasn't filled in (shipment date)   | shown to the user, no duplicate      |
| `rejected_by_erp`        | the ERP rejected the document (a business rule)     | show the reason, no order created    |
| `unavailable`            | the ERP is unreachable (network/write service down) | retry with the same `idempotencyKey` |

`unavailable` can be safely retried precisely because of idempotency (§2): a retry
doesn't create a duplicate. The server action distinguishes `ErpWriteError` and shows the
message to the user instead of returning a 500.

### 4. CRM↔ERP id mapping

Domain ids (`ClientId`, `ProductId`) **are** the ERP's own ids (ADR-0002 §4) — no
separate mapping table is needed for the order. The result includes an `orderNumber`
(the ERP document number) for display and linking back to the deal.

### 5. A dedicated write service account

Writes to the ERP go under a **dedicated service account** (not a sales rep's account):
separate "create order" permissions, an audit trail of the bot's actions, and access
revocation without locking out people. Credentials live in the adapter's config
(`ODataErpConfig`) as a secret, **never** in git (DATA_POLICY.md). Implemented alongside
the adapter in #15; the stub needs no account.

## Consequences

- The order contract is unambiguous and verifiable against `StubErpGateway` ahead of the
  real ERP (#15 implements the same interface).
- Duplicate orders are ruled out by the idempotency key; retrying on ERP unavailability
  is safe.
- An ERP rejection is visible to the user (a typed error), never lost silently.
- The shipment date became mandatory on the order form — an order can't be placed
  without it.

## Alternatives

- **Idempotency by a random uuid per click** — rejected: retrying with a new uuid
  creates a duplicate; the key must be stable for the intent, not the request.
- **Return `null`/a code instead of an error on rejection** — rejected: a write failure
  must be loud (A18), not silent; `reason` allows branching without string parsing.
- **The CRM sets the order status in the ERP** — rejected: order status belongs to the
  ERP (ADR-0003).
