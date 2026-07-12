import { DEAL_STAGE_LABELS, type DealStage } from "@/domain/deal/deal-stage";

export function StageBadge({ stage }: { stage: DealStage }) {
  return (
    <span className="badge" data-testid="stage-badge" data-stage={stage}>
      {DEAL_STAGE_LABELS[stage]}
    </span>
  );
}
