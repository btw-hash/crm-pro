import type { DealRepository } from "@/application/ports/deal-repository";
import type { Notifier } from "@/application/ports/notifier";
import type { TestActRepository } from "@/application/ports/test-act-repository";
import { markActSent } from "@/domain/test-act/test-act";
import type { TestActId } from "@/domain/test-act/test-act";

export class TestActNotFoundError extends Error {
  constructor(id: TestActId) {
    super(`Act ${id} not found`);
    this.name = "TestActNotFoundError";
  }
}

export interface SendTestActInput {
  readonly actId: TestActId;
  readonly sentAt: string;
}

export type SendTestAct = (input: SendTestActInput) => Promise<void>;

/**
 * The technologist clicks "Send to manager" — the act is marked with sentAt
 * and the deal's responsible manager is notified.
 */
export function makeSendTestAct(deps: {
  acts: TestActRepository;
  deals: DealRepository;
  notifier: Notifier;
}): SendTestAct {
  return async function sendTestAct(input) {
    const act = await deps.acts.findById(input.actId);
    if (!act) {
      throw new TestActNotFoundError(input.actId);
    }
    const sent = markActSent(act, input.sentAt);
    await deps.acts.save(sent);
    const deal = await deps.deals.findById(act.dealId);
    if (deal) {
      await deps.notifier.notify({
        recipientId: deal.responsibleManagerId,
        message: `The technologist sent a response for deal "${deal.title}"`,
        dealId: deal.id,
      });
    }
  };
}
