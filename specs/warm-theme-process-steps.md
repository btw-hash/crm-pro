# Spec: process steps "Tech request / Technologist response / Proposal approval" + "Tech queue"

- **Status:** DRAFT — pending sign-off (there's a blocking open question, OPEN-1).
- **Date:** 2026-07-01
- **Source:** a design reference → `design_handoff_warm_theme/UPDATE-2026-07-process-steps.md`
  (a delta on `PROMPT_FOR_CLAUDE_CODE.md`). The canonical values live in
  `reference/CRM-PRO.dc.html`.
- **Layer:** presentation (`src/app`, `globals.css`). We touch the domain ONLY where
  explicitly called out (REQ-4: **hide, don't remove** the proposal economics — an
  owner decision from 2026-07-01).
- **The base warm theme + tech-queue/workspaces are already on `main`** — this spec is
  only the process delta.

## Context: where the design and the code diverge (important)

The handoff was written against a **5-stage prototype**
(`qualification → audit → testing → quote → done`). Production is **6 stages**:
`qualification → audit → test_requested → testing → quote → completed`
(`src/domain/deal/deal-stage.ts`). The **`test_requested` ("Test request")** stage
isn't mentioned in the design, even though it semantically overlaps with the new "Tech
request" step. It carries real weight: analytics, the home page (`page.tsx`),
`deal-outcome.ts`, the `request-sample.ts` use-case, `deal-stage-progress.ts`,
`deal-type.ts`, the seed. A naive rename of `audit → "Tech request"` would leave "Test
request" orphaned between "Tech request" and "Technologist response."

## Open questions (resolve BEFORE writing code)

- **OPEN-1 (blocks §1/REQ-1). Pipeline model: 5 stages or 6?**
  - _Option A (non-destructive, recommended):_ keep 6 stages, only rename the labels:
    `audit → "Tech request"`, `testing → "Technologist response"`,
    `quote → "Proposal approval"`; leave `test_requested` as "Test request" unchanged.
    Risk: three "technologist-ish" steps in the UI.
  - _Option B (as in the prototype):_ collapse `audit` + `test_requested` into one
    "Tech request" → 5 stages. Destructive: a stage migration, rewriting transitions/
    ranks/analytics/seed/outcome.
  - → **Needs an owner/customer decision.** We don't start until REQ-1 is answered.
- **OPEN-2 (§4). Stage transition after "Send to client":** the design moves
  `quote → Won/Lost` directly. In code it's `quote → completed` + a separate
  `DealOutcome (won/lost)`. To clarify: does "Approved" set `completed`+`won`,
  "Declined" set `completed`+`lost`, and "Needs revision" stay in `quote` (revision
  N+1)?

## Requirements

### REQ-1 — Rename stage labels (§1) — BLOCKED ON OPEN-1

We don't touch the keys, only the display labels in the single source of truth
`src/domain/deal/deal-stage.ts` (`DEAL_STAGE_LABELS`): `audit → "Tech request"`,
`testing → "Technologist response"`, `quote → "Proposal approval"` (currently "Proposal
builder"). The label must update everywhere consistently: Kanban columns
(`deals-kanban.tsx`), the stepper (`stage-stepper.tsx`), the drawer's activity feed
(`deal-drawer.tsx`), drag/undo toasts, selects/filters. The pipeline charts in Analytics
and the text of two demo notifications ("…Testing," "Audit → Testing") stay as they are
(short example labels, not real stages).

- _Acceptance:_ a grep for the old labels in the UI returns nothing; `deals-kanban.test`/
  `deal-drawer.test` are updated; `npm run verify` is green.
- _Effort:_ **S** (after OPEN-1).

### REQ-2 — The "Tech request" step (stage `audit`, §2)

A workspace for filing a request to the technologist, with a **type** picker (3
toggle cards): **Consultation** · **Demo & testing** · **Audit**; fields depend on the
type (see §2 of the handoff). Shared fields: a note (manual entry by default, an
optional "Record" voice input), a "Deadline" (`type=date`), a gate button "Review
request" → a "Review the tech request" summary → "Confirm and send" → moves to
"Technologist response" + an entry in the tech queue. Exact terminology: "Deadline,"
"Call."

- _Files:_ `deals/[id]/_components/tech-request-form.tsx`, `audit-workspace.tsx`; the
  server action `requestTechAction` in `deals/[id]/actions.ts`; the domain
  `tech-request/tech-request.ts`; the use-case `create-tech-request.ts`.
- _Acceptance:_ the 3 types render their own fields; the gate is disabled until required
  fields are filled; matches the prototype 1:1.
- _Effort:_ **M**.

### REQ-3 — The "Technologist response" step (stage `testing`, §3) — read-only

Turn `testing-workspace.tsx` into a **read-only** view for the manager: an empty state
("Waiting on the technologist's response," with elapsed time) or a card ("The
technologist replied" — who · date) + documents, shaped by the request type
(Production report / Consultation summary / Audit summary) + a result chip + a comment.
**Remove the manager's old manual report form** (the report is now filled in by the
technologist — REQ-5). Email icons — blue.

- _Files:_ `deals/[id]/_components/testing-workspace.tsx` (+ update `.test.tsx`).
- _Acceptance:_ the manager has no report input fields; data comes from reports created
  in `tech-queue`; both states render.
- _Effort:_ **M**.

### REQ-4 — The "Proposal approval" step (stage `quote`, §4) — a rework

Flow: build the line items (build) → the document (ready) → send it (sent) → the
client's response.

- **4.1 Build:** a line-item table, one line per row (`ITEM · PRICE · QTY · UNIT · TOTAL · ✕`),
  price entered manually (pre-filled from list price × discount, but editable), unit =
  each/kg/L, "Add line," a live total.
- **4.2 Document:** a "paper" document layout, a table `ITEM·PRICE·VOLUME·TOTAL`+Grand
  total, a cover note (editable live), buttons "Send to client"/"Export PDF"/"Save to
  process"/"Back" (outlined+←, dark text, doesn't look disabled).
- **4.3 Send + response (NEW):** a status "Proposal sent · revision #N · awaiting
  response" + "Approved" (→ Won/order) / "Needs revision" (→ revision N+1) / "Client
  declined" (→ Lost). See OPEN-2 for the stage transitions.
- **4.4 Client email:** an AI-drafted follow-up → subject+body (editable) → "Copy."
  No auto-send.
- **4.5 Proposal economics — HIDE, DON'T REMOVE** (an owner decision): the "customer
  savings" block (`computeEconomics` in `domain/proposal/proposal.ts`, the "monthly
  volume"/"defect rate before/after" fields, the savings badge in the document, the
  mention in the email) — **hide it in the UI**, leave the domain logic and the
  `build-proposal-draft.ts` use-case untouched (reversible). Disclosing the list
  price/discount and the "/month" labels — also hidden in presentation.
- _Files:_ `deals/[id]/_components/quote-workspace.tsx`, `proposal-composer.tsx`,
  `client-message-composer.tsx`; the actions `buildProposalAction`/
  `saveProposalActivityAction`/`draftClientMessageAction`; the outcome/order
  `deal-outcome-controls.tsx`, `order-composer.tsx`, the use-case
  `place-customer-order.ts`.
- _Acceptance:_ the build→ready→sent flow works end to end; economics aren't visible in
  the UI, but `computeEconomics` still exists in code (a test for the function's
  presence doesn't fail); stage transitions follow OPEN-2.
- _Effort:_ **L**.

### REQ-5 — "Tech queue" (`/tech-queue`, §5) — the technologist's workspace

A dedicated screen (not a generic table): a request table
`Request·Client·Type·Date·Deadline·Status`+an action. Clicking a row → a popup (closes
only via the × button, no "Close" button): _info_ mode (details by type + "Add to
calendar" → actually writes an event to the technologist's calendar) or _report_ mode
(a type-dependent form: Production report / Consultation summary / Audit summary +
result chips + a comment + an optional voice input). "Save document" → back to the
list; then "Add another report"; "Send to manager" → the list goes read-only and the
report shows up for the manager in REQ-3.

- _Files:_ `src/app/tech-queue/` (page + `_components` + `actions.ts`); the calendar —
  `src/app/calendar/`.
- _Acceptance:_ the popup has both modes; "Add to calendar" creates an event; forms
  vary by type; matches the prototype 1:1.
- _Effort:_ **L**.

### REQ-6 — End-to-end data linking (§6) — not a blocker

In the prototype, the request (REQ-2), the queue row (REQ-5), and "Technologist
response" (REQ-3) are independent demo data. In the product, it's one process: linked
by `dealId`/`techRequestId`. Do this as part of implementing REQ-2/3/5; if there's no
time, carve it out as a separate issue rather than leaving it a silent gap.

## Plan (PR order, each one: Issue → branch → PR → showcase → verify → self-merge)

1. **REQ-1** (after OPEN-1) — rename the stage labels. Cheap, isolated.
   `feat(deals): rename stage labels…`
2. **REQ-3** — `testing-workspace` → read-only. Removes the duplicate manual report.
3. **REQ-5** — the tech queue as a real workspace (gives REQ-3 a source of reports).
4. **REQ-2** — the tech request form (3 types).
5. **REQ-4** — the proposal rework (the biggest one; economics hidden, domain untouched).
6. **REQ-6** — data linking (or a separate issue).

## Out of scope

- Rich SVG charts in Analytics (gauge/donut) — an optional polish item, not in this
  spec.
- Restructuring the pipeline to 5 stages (OPEN-1 Option B) — only on an explicit
  decision, in a separate spec.
