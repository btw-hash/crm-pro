# Data Policy — Residency & Security

**Audience:** the whole team (dev-a, dev-b, designer) + the customer (acting as data
controller for their end users' personal data).
**Core idea:** development and production are separated by a **data boundary, not a
tooling boundary**. The team is free to use the best tools worldwide; real personal data
(PII) belonging to the customer's end users, and the ERP export itself, stay inside an
approved, compliant hosting environment.

> ⚠️ This isn't a formality. Under GDPR/CCPA-style data protection regimes, unlawful
> cross-border transfer of PII can carry serious civil penalties for the company and, in
> some jurisdictions, personal liability for those responsible. Data-localization
> violations routinely carry fines in the range of tens of thousands to millions of
> dollars, with repeat offenses escalating sharply.

## The 10 rules

1. **Data residency.** The production database holding end-user PII (counterparties,
   contact persons) is stored **only** inside the approved, compliant hosting
   environment (see `DEPLOY.md`). Primary collection and storage happen inside that
   environment.
2. **No raw ERP exports leave the approved environment.** Never take a copy/dump of the
   ERP containing real PII outside the approved environment — that is an unlawful
   cross-border transfer. Only anonymized synthetic data may travel abroad.
3. **Anonymize the dev copy.** The dev copy of ERP data is prepared inside the approved
   environment by a deterministic pipeline: names → synthetic names, phone/email → fake
   values in the correct format, tax IDs/passport numbers → random, addresses →
   generalized; masking is deterministic (one real record → one fake value) so joins stay
   consistent. Correctly anonymized data falls outside the scope of PII rules and may be
   held anywhere.
4. **Strip free text entirely.** Notes/comment fields in the dev copy are removed in
   full — PII there is mixed in with everything else, and partial masking is unsafe.
5. **PII field checklist.** Maintain a map of every PII field in the ERP
   (counterparties, contact persons, contracts, phone/email/tax ID/passport/address,
   free text) and review it whenever the ERP schema changes, together with the
   anonymization pipeline.
6. **Two-tier LLM policy.** Real PII/trade secrets → only the approved compliant
   provider (inside the approved environment). Code, anonymized and non-sensitive data →
   global models (Claude, OpenRouter — it proxies to third-party model hosts, same
   contour as Claude) with no restriction. Sending real PII to a global-only provider
   (OpenAI/Anthropic/OpenRouter outside the approved contour) is treated as an
   unauthorized cross-border transfer.
7. **Dev/prod boundary.** dev = anonymized data + any international tooling
   (GitHub/Figma/Linear/Claude). prod = real PII + approved environment only + restricted
   access. Separate secret stores for dev and prod; log access to production.
8. **Never commit:** a real ERP export or dump containing PII; `.env`/secrets/tokens/API
   keys; production database connection strings; private keys (SSH/TLS/KMS); production
   passwords; real price lists and the counterparty list (trade secret). Enforcement:
   `.gitignore` + secret scanning (gitleaks/GitGuardian) in pre-commit and CI + GitHub
   Push Protection.
9. **Production secrets stay separate.** Production secrets live in a secrets
   manager/KMS inside the approved environment; developers have no direct access. Dev
   secrets and personal passwords — 1Password Business.
10. **A compliance certification doesn't discharge the customer.** A hosting provider's
    compliance certification does not remove the customer's obligations as data
    controller: threat modeling, subject consent, and any required regulator
    notification (including a separate pre-transfer notice for cross-border transfers)
    remain the customer's responsibility.

## PII pseudonymization before the LLM — current state (an honest note)

Before any user-authored text is sent to an LLM, a PII-minimization layer runs
(`src/infrastructure/ai/pseudonymize.ts`, wired into the `composition-root` via
`PseudonymizingLlmProvider`): sensitive values are replaced with placeholders, and the
model's response is restored to the originals on the way back (round-trip via
`restore`).

> ⚠️ **Only phone numbers are masked today.** **Names pass through to the LLM
> unmasked.** Reliably detecting names in free text without NER isn't feasible, so names
> are only pseudonymized on an exact match against a `knownContacts` list — and that
> list is currently **empty** (`PseudonymizingLlmProvider` is constructed with no
> contacts → `knownContacts = []`). The mechanism for names exists but is dormant until
> contacts are wired in from the ERP. See `pseudonymize.ts` and issue #1.

Practical consequences while names aren't masked:

- Don't send real end-user PII (including full names) to **global** LLMs (Claude) — that
  is still a cross-border transfer under rule 6 above. Until `knownContacts` is
  populated, the pseudonymization layer **doesn't cover** names, and it must not be
  relied on as the sole protection against a name leak.
- Real PII → only the approved compliant provider. On the anonymized/synthetic dev copy
  (rule 3), names are synthetic to begin with — there's no risk there.

## Retention, deletion, and subject requests

- **PII retention periods** must be defined and documented (a matrix: which data — how
  long it's kept — the legal basis). Once the purpose/period has been reached — data is
  **destroyed**, with a record kept of the destruction.
- **Data subject requests** (access, correction, deletion) — the controller responds
  within the applicable statutory window (commonly 30-45 days depending on
  jurisdiction, with a possible extension). Document the procedure and the responsible
  owner.
- **Incident/breach notification** — see `INCIDENT_RESPONSE.md`.

## Data processing agreements

If a third party processes the data (the cloud host, an LLM provider) — put a **Data
Processing Agreement (DPA)** in place with confidentiality and security requirements
(the GDPR-style baseline is Art. 28). A hosting provider's compliance certification does
not replace such an agreement.

## Logs without PII

Application and infrastructure logs must **never contain PII** (names, phone numbers,
emails, the content of customer messages). `ConsoleLogger` and any logger must mask
sensitive fields; production log collection stays inside the approved environment.

## Call recording — consent required

Recording and transcribing phone calls requires notice/consent: the phone system should
play a "this call may be recorded" announcement. Recordings and transcripts are PII:
store them inside the approved environment, never export them raw, and exclude them from
the dev copy (or anonymize them).

## Development tools — unrestricted

GitHub, Figma, Linear, Claude Code and similar tools are not restricted by this policy:
it governs the flow of real PII and the production system, not the tooling used by an
international team.
