# Spec: UX upgrades for the demo (gold standard vs. the incumbent CRM)

- **Status:** ACCEPTED — the full set is in progress (decision-maker focus). Issues #153-158.
- **Date:** 2026-06-24
- **Context:** a demo/MVP for a bid. Goal — the interface feels faster and more modern
  than the incumbent CRM. We win on speed/fewer-clicks/keyboard, NOT on reporting depth.
- **Out of scope:** AI features (a separate developer). This spec covers only the
  non-AI interface.

## Demo narrative (the golden path)

The manager opens the board → sees deal "health" by color → Ctrl+K finds a client in a
second → on the card, one field records a call and sets the next step → the
decision-maker, on the same board, sees where things are stuck. All without page
reloads or 15-field forms.

## Requirements

### REQ-1 — Score Pill (deal health)

A colored indicator on the Kanban card and in the list: **green** — there's a next step
due on time; **yellow** — the step is overdue or missing for >7 days; **red** — >14 days
with no movement / no next step. Computed from data that already exists (`daysOnStage`,
`isStaleOnStage`, the "no next step" flag).

- _Why:_ the decision-maker sees the whole team in 10 seconds with zero clicks. The
  incumbent requires opening every deal individually.
- _Comparable to:_ Pipedrive Deal Rotting, HubSpot Deal Health.
- _Acceptance:_ the pill is visible on the card and in the list row; the color matches
  the rule; there's a legend/tooltip; it doesn't break card density.
- _Effort:_ **S (1-2 days).**

### REQ-2 — Hover quick-actions + logging an activity in one field

Hovering a card/row → actions appear: "Log activity," "Next step," "Change stage."
"Log activity" opens a mini popover with one field ("What happened?") + a type (call/
visit/email) as a pill + a date (defaults to today) → Enter → a `DealEvent` entry.

- _Why:_ logging a call used to be "open the card → a tab → a form → save → back" (4+
  clicks); now it's "hover → 1 click → Enter." The sales rep's single most frequent
  action.
- _Comparable to:_ Close CRM call notes, Pipedrive quick actions.
- _Acceptance:_ from the board, without opening the card, you can log an activity and
  set the next step; the entry appears in the feed with an author and a timestamp;
  works within a sales rep's owner boundary.
- _Effort:_ **M (~a week).**

### REQ-3 — Command palette (Ctrl+K)

A global modal: fuzzy search over clients/deals/contacts + quick commands ("New deal,"
"Go to Analytics"). Enter — navigate/act.

- _Why:_ the demo's "wow" moment — you find what you need in a second, without digging
  through menus. A mark of a professional tool (Linear/Notion/Figma).
- _Acceptance:_ Ctrl+K opens it; search covers ≥3 entity types; arrow keys + Enter; Esc
  closes it; results respect the role (a sales rep doesn't see someone else's book).
- _Effort:_ **S (2-4 days).**

### REQ-4 — Saved Views (saved filter tabs)

A row of tabs above the list/board: "All," "My active deals," "No next step," "Proposals
this week" — "Save this view." Switching is instant, the filter persists (per user/
role).

- _Why:_ a direct answer to the decision-maker's "how do I keep an eye on my reps"; a
  sales rep starts the day with "no next step" in one click.
- _Acceptance:_ ≥3 preset views; switching changes the result set; the view persists
  across sessions; the URL reflects the active view.
- _Effort:_ **M (~a week to a week and a half).**

### REQ-5 — Inline editing (#158)

Clicking a field in the deal's "Overview" (priority, goal, next step) → the field
becomes an input → Enter saves, Esc cancels. No separate "Edit mode."

- _Why:_ in 2025 the incumbent still opens a full edit form — a legacy tell. Inline
  editing is a 2024+ baseline.
- _Acceptance:_ ≥3 fields are editable in place; optimistic updates; an error rolls the
  value back; respects RBAC.
- _Effort:_ **S-M (~a week).**

### REQ-6 — Side drawer (the record as a right-hand panel) (#156)

Clicking a row/card opens the client/deal record as a slide-in panel on the right,
without navigating to a separate page; the list stays visible on the left. The Score
Pill, quick-actions, and inline-edit all live inside the drawer.

- _Why:_ the most "modern" interaction (Attio/Linear/Intercom); you can review several
  records in a row without losing context. The incumbent does a full page reload on
  every navigation.
- _Acceptance:_ opens in a drawer without leaving the list; a deep link/URL for the
  record; closes on Esc/click-outside; respects RBAC.
- _Effort:_ **L (~1-2 weeks).** Touches routing (some records live in the drawer) — a
  hot zone, do it early; the remaining features live inside the drawer.

## Out of scope for the demo (traps — do NOT build)

- Custom fields/objects on the fly (slow, reads as "complicated").
- Improving reporting (the incumbent is strong there — we'd lose).
- Wizard-style onboarding, "helpers."
- An overloaded Kanban card: at most name + client + amount + rep + 1 pill.
- 15-field modals for creating a deal.
- Pulling returns/packing/claims into the demo flow — golden path only, everything else
  is "answer if asked."

## Work order (the full set, decision-maker focus)

Each item is its own PR with an HTML showcase (project rule). The order weighs: a quick
early win → decision-maker control → the drawer as a foundation → features inside the
drawer.

- **TASK-1** REQ-1 Score Pill (S) — #153. First: almost free from signals we already
  have, an instant visual "wow" for the decision-maker.
- **TASK-2** REQ-4 Saved Views (M) — #155. Team oversight for the decision-maker.
- **TASK-3** REQ-3 Ctrl+K (S) — #154. A cheap "wow," independent of the drawer.
- **TASK-4** REQ-6 Side drawer (L) — #156. The foundation: later features live inside
  it.
- **TASK-5** REQ-2 Quick-action + log-activity-in-one-field (M) — #157. "Fewer clicks"
  for the sales rep, inside the drawer/card.
- **TASK-6** REQ-5 Inline edit (S-M) — #158. The final "modern" polish.

## Decisions (fixed 2026-06-24)

1. The #1 "wow" audience is the **decision-maker**: Score Pill + Saved Views come early.
2. Inline edit — **in the demo** (REQ-5/#158, TASK-6).
3. Side drawer — **in the demo** (REQ-6/#156, TASK-4), not deferred.
