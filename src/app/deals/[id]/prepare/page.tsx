import Link from "next/link";
import { notFound } from "next/navigation";
import { ClientNotFoundError } from "@/application/use-cases/get-client-card";
import { ACTIVITY_KIND_LABELS } from "@/domain/activity/activity";
import { availableCredit, isOverCreditLimit } from "@/domain/client/client-balance";
import { DEAL_GOAL_LABELS, DEFAULT_DEAL_GOAL } from "@/domain/deal/deal-goal";
import { DEAL_STAGE_LABELS } from "@/domain/deal/deal-stage";
import { makeId } from "@/domain/shared/id";
import { canSeeMargin } from "@/domain/shared/role";
import { requireUser } from "@/infrastructure/config/current-user";
import { getContainer } from "@/infrastructure/composition-root";
import { personLabel } from "@/infrastructure/persistence/seed";

const TREND_LABEL = {
  up: "growing",
  flat: "stable",
  down: "declining",
  dormant: "churned",
} as const;

/**
 * Visit-prep screen (PREPARE per Puratos): brings together on one page the deal's
 * goal and status, client finances, what to offer (reactivating dormant SKUs),
 * prices/stock, and recent activity. All from ready-made data via ports — no ERP
 * history lookup needed.
 */
export default async function VisitPrepPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const role = user.role;
  const showCommercial = canSeeMargin(role);
  const container = getContainer();

  const workspace = await container.getDealWorkspace(makeId<"DealId">(id), user);
  if (!workspace) {
    notFound();
  }
  const { deal, timeline, nextStep } = workspace;
  // The deal has already been checked for ownership (getDealWorkspace). If the deal's
  // client belongs to another manager (data desync) — getClientCard throws
  // ClientNotFoundError → 404, not a 500.
  let card;
  try {
    card = await container.getClientCard(deal.clientId, user);
  } catch (error) {
    if (error instanceof ClientNotFoundError) {
      notFound();
    }
    throw error;
  }
  const matrix = showCommercial
    ? await container.getCustomerProductMatrix({ clientId: deal.clientId })
    : null;
  const reactivate = matrix
    ? matrix.rows.filter((row) => row.trend === "dormant" || row.trend === "down")
    : [];
  const recent = timeline.slice(0, 5);

  return (
    <section>
      <h1>Additional info</h1>
      <p className="muted">
        {card.client.name} · deal "{deal.title}"
      </p>
      <Link href={`/deals/${deal.id}`} className="btn">
        ← Back to the deal
      </Link>

      <h2>Goal and status</h2>
      <div className="card">
        <p>
          <strong>Goal:</strong> {DEAL_GOAL_LABELS[deal.goal ?? DEFAULT_DEAL_GOAL]} ·{" "}
          <strong>Stage:</strong> {DEAL_STAGE_LABELS[deal.stage]}
        </p>
        {nextStep ? (
          <p>
            <strong>Next step:</strong> {nextStep.text}
            {nextStep.dueDate ? ` · due ${nextStep.dueDate}` : ""}
          </p>
        ) : (
          <p className="muted">No next step planned — set one during the visit.</p>
        )}
      </div>

      {showCommercial ? (
        <>
          <h2>Client finances</h2>
          {card.balance ? (
            <div
              className={`card balance${isOverCreditLimit(card.balance) ? " balance--alert" : ""}`}
            >
              <span>
                <span className="muted">Receivables:</span> {card.balance.debt.format()}
              </span>
              <span>
                <span className="muted">Credit limit:</span> {card.balance.creditLimit.format()}
              </span>
              <span>
                <span className="muted">Available:</span> {availableCredit(card.balance).format()}
              </span>
              {isOverCreditLimit(card.balance) ? (
                <strong className="balance__flag">⚠ Limit exceeded — discuss payment</strong>
              ) : null}
            </div>
          ) : (
            <p className="muted">No balance set up for this client.</p>
          )}
        </>
      ) : null}

      {reactivate.length > 0 ? (
        <>
          <h2>What to offer (reactivation)</h2>
          <ul>
            {reactivate.map((row) => (
              <li key={row.productName}>
                <strong>{row.productName}</strong> — {TREND_LABEL[row.trend]} (last order{" "}
                {row.lastOrderMonth}
                {row.monthsSinceLast >= 3 ? `, ${row.monthsSinceLast} mo ago` : ""})
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <h2>Prices and stock</h2>
      <table className="grid">
        <thead>
          <tr>
            <th>Product</th>
            {showCommercial ? <th>Client price</th> : null}
            <th>Available stock</th>
          </tr>
        </thead>
        <tbody>
          {card.lines.map((line) => (
            <tr key={line.product.id}>
              <td>{line.product.name}</td>
              {showCommercial ? <td>{line.price ? line.price.format() : "—"}</td> : null}
              <td>{line.freeQuantity !== null ? `${line.freeQuantity} ${line.unit}` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Recent tasks</h2>
      {recent.length > 0 ? (
        <ul className="timeline">
          {recent.map((item) => (
            <li key={item.id} className="timeline__item">
              <span className="badge">
                {item.source === "activity" ? ACTIVITY_KIND_LABELS[item.activityKind] : "event"}
              </span>
              <div className="timeline__body">
                <p>{item.text}</p>
                <p className="muted">{personLabel(item.author)}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">No tasks yet.</p>
      )}
    </section>
  );
}
