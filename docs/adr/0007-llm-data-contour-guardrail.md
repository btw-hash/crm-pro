# ADR-0007: Data guardrail — trade secrets/PII stay on the approved LLM provider

- **Status:** accepted
- **Date:** 2026-06-25
- **Issue:** #179 (supports epic #176 — assortment analytics)

## Context

Sales/procurement analytics and AI features work on top of sensitive data: price lists,
individual prices, margin, receivables/credit limits, the counterparty list (LLCs/sole
proprietors, tax IDs), contact PII. Direct pain from a stakeholder (the category
manager): "no generic price lists shared around... data security." Under the project's
data-residency policy and trade-secret rules, this data must not be sent to the
**global contour** (Claude/other external LLMs) — that would be an unauthorized
transfer.

Two layers of protection already exist: [ADR/CLAUDE.md] the two-tier LLM policy;
`assertProviderCompliant` (`global-llm-guard.ts`) blocks the global provider in
production without an explicit flag; `PseudonymizingLlmProvider` masks phone
numbers/names. What was missing was **a machine check of the payload itself at the
boundary**: even if the global provider is configured (dev/flag), a leak of a specific
price or counterparty must be caught and blocked.

## Decision

### 1. What counts as a trade secret/PII (must not reach the global contour)

| Category                      | Examples                                                    | Contour                             |
| ----------------------------- | ----------------------------------------------------------- | ----------------------------------- |
| Price lists / prices / margin | individual prices, list price, receivables, limits, revenue | the approved provider only (OpenAI) |
| The counterparty list         | LLC/sole-proprietor/Inc. names, tax IDs                     | the approved provider only          |
| PII                           | contact names, phone numbers, emails                        | the approved provider only          |
| Code / anonymized data        | pipeline questions, synthetic data with no real numbers     | the global model is fine            |

### 2. A machine guard at the global-LLM boundary

- `findDataPolicyViolations(text)` (`data-contour-guard.ts`) — a pure function that
  looks for markers: currency amounts (`$`), legal-entity suffixes (LLC/Inc./Co.),
  tax-ID-shaped numbers (EIN-style, 9-10 digits).
- `ContourGuardLlmProvider` — an `LlmProvider` decorator: before every
  `extractJson`/`completeText` call it invokes `assertCleanForGlobalContour(system+user)`;
  on a violation it throws `DataContourViolationError` (the delegate call never
  happens — nothing leaks).
- Wired in **only for the global provider** (`composition-root`, `AI_PROVIDER=anthropic`)
  and **inside** `PseudonymizingLlmProvider`, so it sees the text that's actually about
  to be sent. The approved provider (OpenAI) isn't restricted by this guard.

### 3. Analytics on top of the ERP never calls AI for the "generic" contour

Analytics numbers (sales/procurement/margin — #176/#177/#178) are computed
**deterministically from the ERP/history** (pure domain functions); AI never sees them
at all. That way analytics features pass the guard by construction: there's no external
LLM call carrying price data. The AI assistant (a snapshot with the counterparty
list/receivables), if pointed at the global provider, would be blocked by the guard →
its contour is the approved provider.

## Consequences

- A price/counterparty/tax-ID leak to an external LLM **fails** (a test demonstrates the
  block).
- A cheap defense-in-depth layer on top of `assertProviderCompliant` (config-level) and
  pseudonymization (PII-level): a payload-level check is added.
- Commercial AI features are de facto tied to the approved provider — which is what the
  policy requires.
- False positives are possible (a number like "$1,180,000" in anonymized synthetic data
  would also be blocked on the global contour) — that's a deliberate fail-safe: block,
  don't "leak." For synthetic data/demos, use the stub or the approved provider.

## Alternatives

- **Config-level guard only (`assertProviderCompliant`)** — rejected: doesn't catch a
  leak if the global provider is used anyway (dev/flag); no check of the payload itself.
- **A silent sanitizer that strips prices from the payload** — rejected: silently
  modifying the payload masks a routing mistake and corrupts the AI's response; it's
  safer to **block** and make the developer choose the approved provider.
