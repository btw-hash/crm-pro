import Link from "next/link";
import { notFound } from "next/navigation";
import { ErpLink } from "@/app/_components/erp-link";
import { ACTIVITY_KIND_LABELS } from "@/domain/activity/activity";
import { DEAL_EVENT_TYPE_LABELS } from "@/domain/deal-event/deal-event";
import { DEFAULT_DEAL_GOAL } from "@/domain/deal/deal-goal";
import { DEAL_STAGE_LABELS, isTerminal } from "@/domain/deal/deal-stage";
import { SHIPMENT_STATUS_LABELS } from "@/domain/shipment/shipment";
import { currentStageTodo } from "@/domain/deal/deal-stage-progress";
import { makeId } from "@/domain/shared/id";
import { canSeeMargin } from "@/domain/shared/role";
import { requireUser } from "@/infrastructure/config/current-user";
import { getContainer } from "@/infrastructure/composition-root";
import { MANAGER_LABELS, managerLabel, personLabel } from "@/infrastructure/persistence/seed";
import { canAccessDeals } from "../_lib/deal-access";
import { outcomeBadge, reachedStage, sectionVisibilityForDeal } from "../_lib/deal-outcome";
import { completeTaskAction, recordActivityAction } from "./actions";
import { AuditWorkspace } from "./_components/audit-workspace";
import { DealCrudControls } from "./_components/deal-crud-controls";
import { DealInlineFields } from "./_components/deal-inline-fields";
import { DealStageControls } from "./_components/deal-stage-controls";
import { NextStepAdvisor } from "./_components/next-step-advisor";
import { DealOutcomeControls } from "./_components/deal-outcome-controls";
import { OrderComposer } from "./_components/order-composer";
import { ProposalDocument } from "./_components/proposal-document";
import { QuoteWorkspace } from "./_components/quote-workspace";
import { StageSection } from "./_components/stage-section";
import { QualificationWorkspace } from "./_components/qualification-workspace";
import { StageStepper } from "./_components/stage-stepper";
import { TestingWorkspace } from "./_components/testing-workspace";
import { VoiceActivityComposer } from "./_components/voice-activity-composer";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const s = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return s.toUpperCase() || "?";
}

/** Bento-card glass / deal-card band (the "CRM Pro UI" design reference). */
const GLASS: React.CSSProperties = {
  background: "rgba(255,255,255,0.6)",
  backdropFilter: "blur(22px) saturate(1.3)",
  WebkitBackdropFilter: "blur(22px) saturate(1.3)",
  border: "1px solid rgba(255,255,255,0.7)",
  boxShadow: "0 12px 34px rgba(31,45,80,0.10), inset 0 1px 0 rgba(255,255,255,0.85)",
  borderRadius: 18,
};

export default async function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  // RBAC #7: the deal card — sales roles only. Operational roles (accountant/
  // logistics/technologist/category manager) don't own a pipeline and shouldn't be
  // able to open a deal via a direct link (getDealWorkspace doesn't apply an owner
  // boundary for them).
  if (!canAccessDeals(user.role)) {
    notFound();
  }
  // The technologist runs testing/production, but not the commercial side: the
  // proposal, prices, order, client message, and advisor are unavailable to them
  // (read gate + server-action gate in actions.ts).
  const showCommercial = canSeeMargin(user.role);
  const container = getContainer();
  const [workspace, products, clients, techRequests, qualification] = await Promise.all([
    container.getDealWorkspace(makeId<"DealId">(id), user),
    container.listProducts(),
    container.listClients(user),
    container.listAllTechRequests(),
    container.getDealQualification(makeId<"DealId">(id)),
  ]);
  if (!workspace) {
    notFound();
  }
  const { deal, audit, testAct, testActs, sampleRequests, timeline, nextStep, shipment } =
    workspace;
  // Tech requests for this deal (#394 item 20): listAllTechRequests includes DONE
  // requests — the request stays on the card as history, it doesn't disappear once
  // completed. Filtered by dealId across the whole department.
  const dealTechRequests = techRequests.filter((request) => request.dealId === deal.id);
  const badge = outcomeBadge(deal);
  // Section progress accounting for the outcome (#28): on a lost deal, skipped stages
  // (e.g. "Proposal" when closing before reaching it) aren't marked "completed".
  const reached = reachedStage({
    hasAudit: audit !== null,
    sampleCount: sampleRequests.length,
    hasTestAct: testAct !== null,
  });
  const sectionVis = (section: Parameters<typeof sectionVisibilityForDeal>[0]) =>
    sectionVisibilityForDeal(section, deal, reached);
  const productOptions = products.map((product) => ({
    id: product.id,
    name: product.name,
    // Suggested retail price (kit.rsp) in USD to prefill the proposal line price; 0 if there's no price.
    price: product.kit ? product.kit.rsp.amountMinor / 100 : 0,
  }));

  const canEdit = user.role === "head" || deal.responsibleManagerId === user.id;
  // RBAC #10: the client list in the edit form — scoped to the viewer's owner scope.
  const clientOptions = clients.map((c) => ({ id: c.id, name: c.name }));
  // RBAC #27 (UI): the responsible-manager dropdown — the head of sales sees all
  // managers, a manager only sees themselves. Server-side validation lives in
  // updateDealAction/inlineUpdateDealAction.
  const managerOptions =
    user.role === "head"
      ? Object.entries(MANAGER_LABELS).map(([mid, name]) => ({ id: mid, name }))
      : [{ id: user.id, name: managerLabel(user.id) }];
  // Client balance (receivables/limit) — to check an order "on credit" (#34); commercial
  // roles only and only on a completed deal (the won/lost outcome no longer gates the order, #442 6d).
  const clientBalance =
    showCommercial && deal.stage === "completed"
      ? await container.getClientBalanceView(deal.clientId)
      : null;
  // Saved proposal (built at "Proposal negotiation") — shown as a document at "Completed"
  // and its lines prefill the "Purchase order (ERP)" (#462 §4.1/4.2).
  const proposal =
    showCommercial && deal.stage === "completed" ? await container.getProposal(deal.id) : null;
  const dealClientName = clients.find((c) => c.id === deal.clientId)?.name ?? deal.clientId;
  const orderPrefill = proposal?.lines.map((line) => ({
    productId: line.productId,
    productName: line.productName,
    unit: line.unit,
    quantity: line.quantity,
  }));

  // Card sections expand by deal stage: the current one — with actions, past ones —
  // read-only, future ones — collapsed (issue #207). Section → stage mapping.
  const auditVis = sectionVis("audit");
  const testingVis = sectionVis("testing");
  const quoteVis = sectionVis("quote");
  const orderVis = sectionVis("completed");

  const overview = (
    <>
      <StageSection
        title="Qualification"
        visibility={sectionVis("qualification")}
        unlockLabel={DEAL_STAGE_LABELS.qualification}
      >
        <QualificationWorkspace dealId={deal.id} existing={qualification} />
      </StageSection>

      <StageSection
        title="Tech request"
        visibility={auditVis}
        unlockLabel={DEAL_STAGE_LABELS.audit}
      >
        <AuditWorkspace
          dealId={deal.id}
          clientId={deal.clientId}
          dealTitle={deal.title}
          dealTechRequests={dealTechRequests}
          visibility={auditVis}
        />
      </StageSection>

      <StageSection
        title="Tech response"
        visibility={testingVis}
        unlockLabel={DEAL_STAGE_LABELS.testing}
      >
        <TestingWorkspace
          dealId={deal.id}
          clientId={deal.clientId}
          dealTitle={deal.title}
          visibility={testingVis}
          testAct={testAct}
          testActs={testActs}
          dealTechRequests={dealTechRequests}
          labelFor={personLabel}
        />
      </StageSection>

      {showCommercial ? (
        <>
          <StageSection
            title="Proposal and client message (AI)"
            visibility={quoteVis}
            unlockLabel={DEAL_STAGE_LABELS.quote}
          >
            <QuoteWorkspace
              dealId={deal.id}
              clientId={deal.clientId}
              products={productOptions}
              visibility={quoteVis}
            />
          </StageSection>

          <StageSection
            title="Purchase order (ERP)"
            visibility={orderVis}
            unlockLabel={DEAL_STAGE_LABELS.completed}
          >
            {proposal ? <ProposalDocument proposal={proposal} clientName={dealClientName} /> : null}
            {shipment ? (
              <div className="card">
                <p>
                  <strong>Order No. {shipment.orderNumber}</strong> was placed in the ERP.
                </p>
                <p>
                  Shipment status:{" "}
                  <span className="badge">{SHIPMENT_STATUS_LABELS[shipment.status]}</span>
                </p>
                <p className="muted">
                  Shipment date: {shipment.scheduledDate} · address: {shipment.address}
                </p>
              </div>
            ) : orderVis === "active" ? (
              <>
                <p className="muted">
                  The deal is completed — place the shipment as a "Purchase order" in the ERP
                  (numbers and the order come from the ERP).
                </p>
                <OrderComposer
                  dealId={deal.id}
                  products={productOptions}
                  balance={clientBalance}
                  prefillLines={orderPrefill}
                />
                {/* The "Won/Lost" outcome — an optional flag for win-rate analytics,
                    no longer a precondition for the order (#442 6d). */}
                <details className="mt-2">
                  <summary className="muted" style={{ cursor: "pointer" }}>
                    Mark the deal outcome (for analytics, optional)
                  </summary>
                  <DealOutcomeControls dealId={deal.id} outcome={deal.outcome} />
                </details>
              </>
            ) : (
              <p className="muted">Available once the deal is completed.</p>
            )}
          </StageSection>
        </>
      ) : null}
    </>
  );

  // HERO "What to do now" — the next step or a stall hint (#207/#28).
  // Large deal heading (design reference, line 346): a deterministic demo derivation —
  // "Deal completed" on a completed deal, otherwise the current stage's name as the
  // "what we're doing now" wording. No separate backend field for the heading.
  const heroTitle = isTerminal(deal.stage) ? "Deal completed" : DEAL_STAGE_LABELS[deal.stage];
  const nextStepHero = (
    <div className="bento-tile deal360-hero" style={{ ...GLASS, padding: "20px 22px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
        <span
          style={{ width: 8, height: 8, borderRadius: "50%", background: "#bf322b" }}
          aria-hidden
        />
        <span style={{ font: "700 11px Arial", color: "#bf322b", letterSpacing: ".6px" }}>
          WHAT TO DO NOW
        </span>
      </div>
      <div style={{ font: "700 20px Arial", letterSpacing: "-.3px" }}>{heroTitle}</div>
      {nextStep ? (
        <div
          style={{
            background: "rgba(247,228,226,0.5)",
            border: "1px solid #e9bdb8",
            borderRadius: 13,
            padding: "11px 14px",
            marginTop: 13,
            font: "400 13px/1.45 Arial",
          }}
        >
          <strong>Next step:</strong> {nextStep.text}
          {nextStep.dueDate ? <span className="muted"> · due {nextStep.dueDate}</span> : null}
        </div>
      ) : !isTerminal(deal.stage) ? (
        <div style={{ marginTop: 13 }}>
          <p style={{ margin: "0 0 8px" }}>
            <strong>No next step</strong> — the deal may stall.
            {showCommercial ? " Ask the AI." : ""}
          </p>
          {showCommercial ? <NextStepAdvisor dealId={deal.id} clientId={deal.clientId} /> : null}
        </div>
      ) : (
        <p className="muted" style={{ margin: "13px 0 0" }}>
          The deal is completed — no active steps.
        </p>
      )}
    </div>
  );

  const tasksFeed = (
    <>
      {timeline.length > 0 ? (
        <ul className="timeline">
          {timeline.map((item) => (
            <li
              key={item.id}
              className={
                "timeline__item" + (item.source === "event" ? " timeline__item--event" : "")
              }
            >
              <span className="badge">
                {item.source === "activity"
                  ? ACTIVITY_KIND_LABELS[item.activityKind]
                  : DEAL_EVENT_TYPE_LABELS[item.eventType]}
              </span>
              <div className="timeline__body">
                <p>{item.text}</p>
                <p className="muted">
                  {personLabel(item.author)} · {formatDateTime(item.at)}
                </p>
              </div>
              {item.source === "activity" && item.openTask ? (
                <form action={completeTaskAction}>
                  <input type="hidden" name="dealId" value={deal.id} />
                  <input type="hidden" name="activityId" value={item.id} />
                  <button type="submit" className="btn">
                    Done
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">No tasks yet.</p>
      )}

      <h2>Dictate a task (AI)</h2>
      <VoiceActivityComposer dealId={deal.id} clientId={deal.clientId} />

      <h2>Add manually</h2>
      <form action={recordActivityAction} className="form">
        <input type="hidden" name="dealId" value={deal.id} />
        <input type="hidden" name="clientId" value={deal.clientId} />
        <label>
          Type
          <select name="kind" defaultValue="note">
            <option value="note">Note</option>
            <option value="call">Call</option>
            <option value="visit">Visit</option>
            <option value="task">Task</option>
          </select>
        </label>
        <label>
          Text
          <textarea name="text" rows={2} placeholder="What happened / what needs to be done" />
        </label>
        <label>
          Due date (for a task)
          <input type="date" name="dueDate" />
        </label>
        <button type="submit" className="btn">
          Add
        </button>
      </form>
    </>
  );

  // Status chip in the header (no new health plumbing): "No next step" — when an
  // active deal has no next step (stall risk), otherwise "In progress".
  const statusChip = isTerminal(deal.stage)
    ? null
    : nextStep
      ? { label: "In progress", bg: "#e7f5ee", color: "#1f9e6c" }
      : { label: "No next step", bg: "#f7e4e2", color: "#bf322b" };

  return (
    <section className="deal360" style={{ maxWidth: 1180, margin: "0 auto" }}>
      <Link
        href="/deals"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          font: "600 13px Arial",
          color: "#6b6f78",
          textDecoration: "none",
          marginBottom: 15,
        }}
      >
        ← All deals
      </Link>

      {/* ───── HEADER BAND ───── */}
      <div className="bento-tile" style={{ ...GLASS, padding: "22px 26px", marginBottom: 16 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 18,
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                marginBottom: 9,
                flexWrap: "wrap",
              }}
            >
              <span style={{ font: "700 11px Arial", color: "#9a9ea8", letterSpacing: ".8px" }}>
                DEAL
              </span>
              {statusChip ? (
                <span
                  style={{
                    background: statusChip.bg,
                    color: statusChip.color,
                    font: "600 11px Arial",
                    padding: "4px 11px",
                    borderRadius: 999,
                  }}
                >
                  {statusChip.label}
                </span>
              ) : null}
              {badge ? (
                <span
                  className={`badge outcome-badge outcome-badge--${badge.outcome}`}
                  style={{
                    background: badge.bg,
                    color: badge.color,
                    font: "600 11px Arial",
                    padding: "4px 11px",
                    borderRadius: 999,
                  }}
                >
                  Outcome: {badge.label}
                </span>
              ) : null}
            </div>
            <h1
              style={{
                font: "700 28px/1.15 Arial",
                letterSpacing: "-.5px",
                margin: 0,
              }}
            >
              {deal.title}
            </h1>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginTop: 11,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  font: "600 13px Arial",
                }}
              >
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 7,
                    background: "#1c1f27",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    font: "700 10px Arial",
                  }}
                  aria-hidden
                >
                  {initials(managerLabel(deal.responsibleManagerId))}
                </span>
                {managerLabel(deal.responsibleManagerId)}
              </span>
              <span
                style={{ width: 4, height: 4, borderRadius: "50%", background: "#cfd2d8" }}
                aria-hidden
              />
              <span style={{ font: "400 13px Arial", color: "#6b6f78" }}>
                {DEAL_STAGE_LABELS[deal.stage]}
              </span>
            </div>
          </div>
          {showCommercial ? <ErpLink label="Open in ERP" /> : null}
        </div>

        <StageStepper stage={deal.stage} />

        {/* stage actions */}
        <div
          style={{
            display: "flex",
            gap: 9,
            flexWrap: "wrap",
            alignItems: "center",
            marginTop: 20,
            paddingTop: 17,
            borderTop: "1px solid #ece6df",
          }}
        >
          <DealStageControls
            dealId={deal.id}
            stage={deal.stage}
            todo={currentStageTodo({
              stage: deal.stage,
              hasAudit: audit !== null,
              sampleCount: sampleRequests.length,
              hasTestAct: testAct !== null,
            })}
          />
          <DealCrudControls
            dealId={deal.id}
            dealTitle={deal.title}
            clientId={deal.clientId}
            responsibleManagerId={deal.responsibleManagerId}
            goal={deal.goal}
            comment={deal.comment}
            clients={clientOptions}
            managers={managerOptions}
            canEdit={canEdit}
          />
        </div>
      </div>

      {/* ───── BENTO GRID ───── */}
      <div className="deal360-grid">
        <div className="deal360-main">
          {nextStepHero}
          {overview}
        </div>
        <aside className="deal360-side">
          <div className="bento-tile" style={{ ...GLASS, padding: 22 }}>
            <div style={{ font: "600 16px Arial", marginBottom: 14 }}>About the deal</div>
            <DealInlineFields
              dealId={deal.id}
              title={deal.title}
              goal={deal.goal ?? DEFAULT_DEAL_GOAL}
              responsibleManagerId={deal.responsibleManagerId}
              managers={managerOptions}
              canEdit={canEdit}
            />
            {deal.comment ? (
              <p
                style={{
                  margin: "14px 0 0",
                  padding: "10px 14px",
                  background: "rgba(255,255,255,0.55)",
                  borderRadius: 12,
                  font: "400 13px Arial",
                  whiteSpace: "pre-wrap",
                }}
              >
                <span style={{ color: "#9a9ea8", marginRight: 6 }}>Comment:</span>
                {deal.comment}
              </p>
            ) : null}
          </div>
          <div className="bento-tile" style={{ ...GLASS, padding: 22 }}>
            <div style={{ font: "600 16px Arial", marginBottom: 14 }}>
              {timeline.length > 0 ? `Task feed (${timeline.length})` : "Task feed"}
            </div>
            {tasksFeed}
          </div>
        </aside>
      </div>
    </section>
  );
}
