import type { DealRepository } from "@/application/ports/deal-repository";
import type { Notifier } from "@/application/ports/notifier";
import type { TestActRepository } from "@/application/ports/test-act-repository";
import { type CreateTestActInput, createTestAct, type TestAct } from "@/domain/test-act/test-act";
import { DealNotFoundError } from "./advance-deal-stage";

export type RecordTestActInput = CreateTestActInput;

export type RecordTestAct = (input: RecordTestActInput) => Promise<TestAct>;

/**
 * Records a human-confirmed test act and notifies the responsible manager:
 * this closes the loop "technologist ran the test → manager finds out and prepares a proposal".
 */
export function makeRecordTestAct(deps: {
  acts: TestActRepository;
  deals: DealRepository;
  notifier: Notifier;
}): RecordTestAct {
  return async function recordTestAct(input) {
    const deal = await deps.deals.findById(input.dealId);
    if (!deal) {
      throw new DealNotFoundError(input.dealId);
    }
    const act = createTestAct(input);
    await deps.acts.save(act);
    const outcome = act.result === "success" ? "successfully" : "without success";
    await deps.notifier.notify({
      recipientId: deal.responsibleManagerId,
      message: `Test for deal "${deal.title}" completed (${outcome}). Ready to prepare a proposal.`,
      dealId: deal.id,
    });
    return act;
  };
}
