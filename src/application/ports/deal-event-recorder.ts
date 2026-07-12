import type { DealEventType } from "@/domain/deal-event/deal-event";
import type { DealId } from "@/domain/deal/deal";
import type { DealStage } from "@/domain/deal/deal-stage";

export interface RecordDealEventInput {
  readonly dealId: DealId;
  readonly type: DealEventType;
  readonly summary: string;
  readonly actor: string;
  readonly fromStage?: DealStage | null;
  readonly toStage?: DealStage | null;
}

/**
 * Records a deal domain event. Id and timestamp are set by the implementation (like
 * `StubNotifier`), so use-cases stay pure and don't have to generate ids/clocks.
 * Event logging is a side effect: it must never fail the main operation.
 */
export interface DealEventRecorder {
  record(input: RecordDealEventInput): Promise<void>;
}
