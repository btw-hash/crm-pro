# Features

The full feature breakdown, moved here to keep the top-level [README](../README.md) a
90-second skim. Everything runs on seed data (`ERP_MODE=stub`, `AI_MODE=stub`) — no real
ERP or external AI is required; connecting them just swaps the adapters behind the
ports. The OData integration with ERP is also verified live against a **fake ERP** (see
[DEPLOY.md](DEPLOY.md)).

- **Home** (`/`) — a role-based starting dashboard made of **bento tiles** showing
  "what I need to do right now": **manager** — today's/overdue tasks + hot deals +
  personal funnel and revenue (own scope only); **head of sales** — team workload by
  manager + what needs attention + department funnel/revenue; **technologist** — the
  request queue (no commercial data); **procurement** — shortages/overstock +
  assortment + operational queues; **accountant/logistics** — a link to their own
  operational section. Numbers come from existing use-cases (deterministic, no AI).
- **Clients** (`/clients`) — a list with **owner-based visibility** (a manager sees
  only their own portfolio), **city**, and **priority derived from the ABC category**;
  quick **client creation** with autocomplete. A 360 client card with tabs: prices/stock/
  accounts receivable (over-limit flag), **Contacts** (decision makers), **Legal
  entities** (a network can span several LLCs/sole proprietors), **Purchases** (a
  "product x trend" matrix, churn), **Recommendations** (next-best-product, score),
  **Return claims** (with a status workflow: internal memo -> return waybill ->
  warehouse pickup -> received in ERP), activities.
- **Roles and access control** — **6 roles**: **Head of sales** (`head` — sees the
  whole department, per-manager analytics, the AI assistant), **Manager** (`mop` — own
  portfolio only + commercial data for own clients + personal analytics),
  **Technologist** (`technologist` — the test queue, no commercial data: price/margin/
  receivables aren't even requested), **Category manager/procurement** (`procurement` —
  quotas, shortages, assortment, shipments/packing/defect warehouse), **Accountant**
  (`accountant` — the `in_accounting` stage: ERP documents), and **Logistics**
  (`logist` — the `loading` stage: loading/dispatch). Predicates live in
  `domain/shared/role.ts` (`canSeeMargin`, `isOwnerScoped`, `canManageProcurement`,
  `canAccessAccountingStage`, `canAccessLoadingStage`, `canViewMyShipments`, ...).
  Gating applies both on reads and on **server actions** (owner enforcement: a manager
  can't reach a colleague's data via a direct POST). Login is username+password, session
  in an httpOnly cookie; a quick-login picker on `/login` covers all 6 roles (password
  `demo1234`).
- **Deals** — a **kanban pipeline** with drag-and-drop stage transitions (optimistic,
  validated against allowed transitions) **and** advancing a deal along its track
  **right from the card** (`DealStageControls` — buttons only for valid
  forward/backward transitions) with **soft nudges about an unfinished step** ("no
  audit performed / no samples requested / no act recorded"). On the card: a
  production audit, a **sample request** (reserving a test batch from stock -> the
  "Sample requested" stage), a test act, a proposal, a **deal goal** (used as a funnel
  filter), an activity feed with a "next step", and **reassigning the deal to another
  manager** (head of sales — any deal, manager — only their own). On the kanban card —
  a **"no next step" flag** (red badge) and **"stuck N days on this stage"** (an
  hourglass icon once stalled >=14 days) — commercial-discipline signals (the
  a legacy CRM "no pending activities" pattern).
- **Operations track: one shared cross-department shipment pipeline** — a single order
  moves through `placed -> in_accounting -> in_warehouse -> loading -> delivered`, each
  stage confirmed by its own role (passive capture, no re-typing): **Shipments**
  (`/shipments`, procurement) — the system automatically assembles a **warehouse
  pick note** from orders (client/address/composition/weight/vehicle) and a **delivery
  schedule** by driver; **Accounting** (`/accounting`, accountant) — issues the ERP
  documents (invoice/waybill/UPD) and moves the order to the warehouse; **Logistics**
  (`/logist`, logistics) — loading and marking dispatch; **My shipments**
  (`/my-shipments`, manager) — an owner-scoped status track for a manager's own
  orders; **Add-on requests** (`/shipments/additional`) — late add-on orders placed
  after hours against the same day's request; **Packing** (`/packing`) — the packer's
  queue (1 kg -> 10x100 g); **Defect warehouse** (`/defects`) — relabeling
  (defect -> request -> relabeling -> ready -> issued); **Onboarding** (`/onboarding`)
  — collecting a new client's document package -> legal review (head of sales).
  Every stage has a status workflow confirmed by a human.
- **AI voice-to-act** — the technologist dictates a report (recorded via Web Audio ->
  a server-side speech-to-text provider behind the `SpeechToText` port; browser-side
  Web Speech API was removed since it sent audio to a third party, which the data
  policy disallows), and AI fills in the draft act's fields, **which a human then
  confirms**. Numbers come from the text/ERP, never invented. The AI layer sits behind
  the `AiGateway` port: a stub by default, and with `AI_MODE=live`, a real LLM behind
  the `LlmProvider` port (currently **Claude**/**OpenAI**; other providers can be added
  behind the same port). All calls go through `fetch`, no vendor SDK.
- **AI assistant for the head of sales** (`/assistant`) — a **chat** (the conversation
  accumulates as a thread) with a **cost estimate** for each request (roughly
  tokens/$ per message plus a running total). A question gets **routed**: about the
  CRM's internal state ("which deals are stalled?", "who's over their limit?", "manager
  workload") — the answer is built from a **deterministic CRM snapshot** (the numbers
  are computed by code, AI only finds and formats them, never invents anything), with a
  link back to the source; about the outside world ("find bakery clients", "raw-material
  suppliers") — it goes to **web search** behind the `WebSearchGateway` port (backed by
  a real search provider; a stub by default, `WEB_SEARCH_MODE=live` turns on the real
  one — enabled on the cloud demo). The assistant is a **ReAct tool agent**: it picks and
  combines tools itself (CRM snapshot / web search), `source` = `crm|web|mixed`. **The
  CRM snapshot never goes out with a web search** (phone numbers and known names are
  stripped from the outgoing web query). The same LLM synthesizes the answer;
  sensitive data is pseudonymized. **Conversation history** is persisted (list/search
  past chats, "new conversation", context-aware follow-ups, clickable sources;
  persistence behind a port — in-memory/Postgres). Access — head of sales only.
- **AI helpers on a deal** — on the deal card: a **"next step" suggestion** (for a
  stalled deal, AI proposes a concrete action based on stage/history -> a human edits
  it -> saves it as a task) and a **draft client message** (given the deal's context,
  AI writes a follow-up; the manager edits and sends it themselves — there's no
  auto-send). Facts are never invented.
- **Won deal -> customer order in ERP** — a won deal generates a "customer order"
  through the `ErpGateway` port. The OData integration is implemented (idempotent,
  loud write errors) and verified live against the fake ERP; on the stub
  (`ERP_MODE=stub`) it runs on seed data.
- **Credit limit on an order** — when building an order, the client's available credit
  limit is shown; going over it is blocked, with an explicit override option (logged).
  The amount comes from ERP prices (deterministic).
- **Proposal with savings calculation (CPQ)** — a deterministic calculation (output x
  defect-rate reduction), price from ERP, accompanying copy drafted by AI; **export to
  PDF** and saved to the deal's feed.
- **Activities and tasks** — calls/visits/notes/tasks on a deal and a client, a "next
  step". **By voice**: the manager dictates a call/meeting summary -> the same
  server-side STT (as voice-to-act) -> AI extracts the type/gist/next step -> a human
  confirms -> it's recorded in the feed (+ an optional next-step task).
- **Unified activity feed** — on the deal card, manual activities and **system events**
  (stage changes, etc.) flow together as a single chronological stream (the classic CRM
  feed pattern). System events are logged via `DealEvent`.
- **Stage triggers** ("robots") — moving to a key stage makes the system automatically
  create a reminder task for the responsible manager and notify them: Proposal ->
  "prepare the proposal", Testing -> "follow up on the test", Won -> "create the ERP
  order". A small, fixed set of rules in code (no no-code builder).
- **Sales dashboard** (`/analytics`) — a sales dashboard: **revenue** total / monthly /
  **month-over-month and year-over-year trend**, broken down **by manager and by
  product**; plus a deal funnel (total/in progress/won/lost/**win rate**, by stage and
  by goal). Head of sales sees the department, a manager sees their own slice. The
  **"View"** toggle (trend period, `?period=`) and **"Breakdown"** toggle (by
  manager/by product, `?view=`) work via URL parameters (SSR); **"Export"** returns a
  CSV of the analytics for the selected breakdown/period (a shared `ExportButton`);
  charts show a tooltip on hover. Numbers are a deterministic aggregation of sales
  history (via `ErpGateway`), not from AI.
- **Assortment** (`/assortment`) — analytics for procurement: SKU classification
  (**drop/keep/grow**), gross margin, **promotion suggestions** (clearance/push for
  dead or declining items and stock on hand), and purchasing (shortage/overstock).
  Deterministic.
- **"Client x product" matrix** — on the client card, the "Purchases" tab: for each
  SKU, the **trend** (up/flat/down/x-gone) plus month of last order and revenue over
  the last 3 months. Highlights declining/churning products (churn risk, a reason to
  re-engage). Gated by role.
- **Sales kit (catalog `/products`)** — product cards: benefits, shelf life, RSP,
  margin (commercial roles only) + a "Copy for client" action (a pitch without the
  internal margin). Plus **search** by name/SKU, a **cart** (building a list for a
  proposal), **stock levels from ERP**, **AI-generated product descriptions**
  (batch-generated ahead of time, with a "AI-generated" badge and a source link;
  curated by procurement/head of sales), and a **"New SKU" launch** button that
  creates a `new_sku` deal-task (qualification -> visit -> audit -> test -> proposal).
  Reference content is deterministic; AI only drafts the descriptions.
- **Visit prep** (`/deals/[id]/prepare`) — a PREPARE sheet: the deal's goal/status,
  the client's finances, **what to pitch** (re-engaging churning SKUs), prices/stock,
  recent activities — assembled from existing data.
- **"What to pitch" recommendations** — on the client card, a tab with a
  **deterministic scorer** for next-best-product (popularity among similar clients +
  margin -> a 1-10 score + a code-generated rationale). Gated by role.
- **Notifications** — recording a test act notifies the responsible manager
  (technologist -> manager loop), stage triggers and operational events; a bell icon
  in the top bar with an unread count and a **dropdown list**, plus the
  `/notifications` feed. Delivery goes through the `Notifier` port (a stub that logs
  for now; real channels come later).
- **UI** — a classic CRM-style layout as a starting point: a left sidebar (items by role), a
  **kanban pipeline with drag-and-drop**, deal/client cards with **tabs**.

## Pages by section

Visibility depends on role — see "Roles and access control" above; log in at `/login`.

- **Sales:** `/` (role-based dashboard), `/clients` + `/clients/[id]` (360 card),
  `/deals` (kanban) + `/deals/[id]` (deal) + `/deals/[id]/prepare` (visit prep),
  `/products` (Sales Kit catalog), `/analytics` (sales dashboard), `/assistant`
  (AI assistant), `/notifications`.
- **Procurement/assortment:** `/procurement` (quotas/shortages), `/assortment`
  (assortment analytics).
- **Operations track:** `/tech-queue` (technologist queue), `/shipments` +
  `/shipments/additional` (shipments/add-on requests), `/my-shipments` (a manager's
  own track), `/accounting` (accountant), `/logist` (logistics), `/packing`
  (packing), `/defects` (defect warehouse), `/onboarding` (client onboarding).
- **Utility:** `/api/health`.

> Voice input requires a microphone and (for live STT) access to the server — the
> recording goes through Web Audio; recognition runs server-side. Without a
> microphone, the act's fields can be filled in from text — the rest of the flow is
> the same.

## Ports (application layer)

- `ErpGateway` port (7 methods): `getIndividualPrice` / `getStockLevel` /
  `getClientBalance` / `getSalesHistory` / `getPurchaseHistory` / `reserveStock` /
  `createCustomerOrder`.
- `AiGateway` port (7 methods): `parseVoiceToActDraft` / `draftActivityFromVoice` /
  `draftProposalText` / `answerManagerQuestion` / `suggestNextStep` /
  `draftClientMessage` / `describeProduct`.
- `LlmProvider` port (the low-level HTTP boundary `AiGateway` is built on):
  `extractJson` (structured, function-calling) / `completeText` (free-form) +
  usage-tracking variants. Implemented by `AnthropicLlmProvider` / `OpenAiLlmProvider`.
- `WebSearchGateway` port: external search for the assistant (a data-policy guard
  ensures the CRM snapshot never leaves). `SpeechToText` port: server-side speech
  recognition.

## Environment variables

See `.env.example`. Everything defaults to `stub` mode — the app works on seed data
without a real ERP and without external AI.

> To enable a real LLM, see the step-by-step guide in
> [`LLM_SETUP.md`](LLM_SETUP.md).

| Variable          | Values                  | Purpose                                                                                       |
| ----------------- | ----------------------- | --------------------------------------------------------------------------------------------- |
| `ERP_MODE`        | `stub` \| `odata`       | source of prices/stock/receivables/history/orders (`odata` — real ERP or fake ERP)            |
| `AI_MODE`         | `stub` \| `live`        | AI gateway mode                                                                               |
| `AI_PROVIDER`     | `anthropic` \| `openai` | LLM provider; data-residency policy applies (see [`DATA_POLICY.md`](DATA_POLICY.md))          |
| `WEB_SEARCH_MODE` | `stub` \| `live`        | assistant web search (`live` — a real provider; stub by default)                              |
| `AUTH_OPTIONAL`   | `true` \| `false`       | dev only: without a session, act as the demo head of sales (ignored in prod)                  |
| `USAGE_TRACKING`  | `on` \| `off`           | server-side tracking of LLM token spend (#216); the journal holds only numbers+labels, no PII |

> `ERP_BASE_URL/USERNAME/PASSWORD`, `AI_API_KEY/MODEL/BASE_URL`, `ALLOW_GLOBAL_LLM`,
> `USAGE_RETENTION_DAYS/USAGE_MEMORY_MAX_ROWS` — connection parameters and spend-journal
> settings (see `.env.example`). Auth is a real username+password login (session in an
> httpOnly cookie); the role comes from the user. Quick login for demos — buttons on
> `/login`.

> **LLM token usage tracking (#216).** For every model call, the server records the
> actual usage (input/output/cached tokens + feature/model/timestamp) in a separate
> journal — not in the logs, and without the request/response body (only numbers and
> enum labels are stored). Capture happens via an external decorator,
> `UsageTrackingLlmProvider`; the feature label is passed through `LlmFeatureScope`
> (AsyncLocalStorage). Storage follows `PERSISTENCE_MODE`: in-memory (a ring buffer of
> detail rows plus daily aggregates with a hard memory cap — anti-OOM on a small demo
> VM) or Postgres (`usage_records` + `usage_daily`, with raw-row retention rotated by
> `USAGE_RETENTION_DAYS` via a daily `npm run usage:prune` cleanup — a scheduled
> GitHub Actions workflow). The `usage_daily` aggregates are untouched. Writes are
> fire-and-forget: a telemetry failure never breaks the response (trade-off: some
> records may not finish writing before a serverless request completes). The cost
> shown in the report (`getUsageReport`) is computed deterministically from the token
> counts.

## Scripts

| Command                       | Purpose                                       |
| ----------------------------- | --------------------------------------------- |
| `npm run dev`                 | dev server                                    |
| `npm run build` / `npm start` | production build and start                    |
| `npm run mock-erp`            | standalone fake ERP (OData) for integration   |
| `npm run typecheck`           | strict type checking (`tsc --noEmit`)         |
| `npm test`                    | unit and component tests (Vitest + RTL)       |
| `npm run test:watch`          | tests in watch mode                           |
| `npm run test:coverage`       | coverage (domain + application)               |
| `npm run test:smoke`          | Prisma adapters against a real Postgres       |
| `npm run lint`                | ESLint                                        |
| `npm run format`              | Prettier                                      |
| `npm run verify`              | typecheck + lint + format + tests             |
| `npm run ci:local`            | local CI mirror (adds build + postgres-smoke) |

## Next steps

- Additional LLM-provider adapters behind the `LlmProvider` port (Claude and OpenAI
  are implemented; OpenRouter is being added — see `feat/live-llm-provider`).
- Connect a **real ERP** (an anonymized copy + OData access) — the `ODataErpGateway`
  adapter is ready and verified against the fake ERP; it needs real data and document
  printing.

> **Persistent storage (Postgres) — ready.** The migration from in-memory to
> PostgreSQL is complete (21 Prisma repositories behind ports, `prisma/schema.prisma`
> with 21 models, the `0_init` migration, `docker-compose.demo.yml` with
> `PERSISTENCE_MODE=postgres`). By default the app runs in-memory with seed data
> (`PERSISTENCE_MODE=memory`); `PERSISTENCE_MODE=postgres` switches to the Prisma
> repositories without touching any use-cases.
