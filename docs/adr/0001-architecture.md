# ADR-0001: Clean architecture + a thin ERP layer

- **Status:** accepted
- **Date:** 2026-06-21

## Context

We need a CRM on top of an existing ERP, with AI features (voice→report, proposals), a
small team (2 developers + a designer), and room to grow (quotas, deficits, a B2B
portal). The ERP is fixed as the system of record; the AI provider is open.

## Decision

1. **Clean architecture** (domain / application / infrastructure / presentation).
   Dependencies point inward; the domain knows nothing about the framework, the ERP, or
   AI.
2. **A thin ERP layer**: the accounting core stays in the ERP; product logic lives in
   the external application. ERP access goes through a single `ErpGateway` port.
3. **AI behind a port** (`AiGateway`) with a provider abstraction: swapping the LLM
   never touches use-cases. Rule: AI extracts/drafts, numbers come from the ERP, a human
   confirms.
4. **Stack:** Next.js + TypeScript (one language for front/back, fast with an AI
   assistant), strict TS, Vitest, ESLint/Prettier. Hosting follows the data-residency
   policy (see `docs/DATA_POLICY.md`).

## Consequences

- Business rules are tested without the framework and without the ERP (fast TDD tests).
- Switching "stub → real ERP" happens in `composition-root` via `ERP_MODE`.
- Cost: more "glue" code (ports, adapters) than calling the ERP directly — justified by
  swappability and testability.

## Alternatives

- Put the logic inside the ERP (configuration customizations) — rejected: breaks
  upgradability, hard to test, inflexible UX.
- Call the ERP directly from pages — rejected: blurs boundaries, hurts testability.
