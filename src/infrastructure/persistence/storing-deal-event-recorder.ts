import type {
  DealEventRecorder,
  RecordDealEventInput,
} from "@/application/ports/deal-event-recorder";
import type { DealEventRepository } from "@/application/ports/deal-event-repository";
import { createDealEvent } from "@/domain/deal-event/deal-event";
import { makeId } from "@/domain/shared/id";

/**
 * Writes domain events to the repository. Id and time are set here (infra
 * layer), like `StubNotifier` — so use-cases stay pure. In a real DB this
 * becomes a transactional write to a shared journal.
 */
export class StoringDealEventRecorder implements DealEventRecorder {
  constructor(private readonly events: DealEventRepository) {}

  async record(input: RecordDealEventInput): Promise<void> {
    const event = createDealEvent({
      id: makeId<"DealEventId">(crypto.randomUUID()),
      dealId: input.dealId,
      type: input.type,
      summary: input.summary,
      actor: input.actor,
      createdAt: new Date().toISOString(),
      fromStage: input.fromStage ?? null,
      toStage: input.toStage ?? null,
    });
    await this.events.save(event);
  }
}
