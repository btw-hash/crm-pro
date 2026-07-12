import { describe, expect, it } from "vitest";
import type { NotifyInput } from "@/application/ports/notifier";
import type { ClientId } from "@/domain/client/client";
import type { Deal } from "@/domain/deal/deal";
import { TestActValidationError } from "@/domain/test-act/test-act";
import { makeId } from "@/domain/shared/id";
import { InMemoryDealRepository } from "@/infrastructure/persistence/in-memory-deal-repository";
import { InMemoryTestActRepository } from "@/infrastructure/persistence/in-memory-test-act-repository";
import { DealNotFoundError } from "./advance-deal-stage";
import { makeRecordTestAct, type RecordTestActInput } from "./record-test-act";

const dealId = makeId<"DealId">("d1");
const deal: Deal = {
  id: dealId,
  clientId: makeId<"ClientId">("c1") as ClientId,
  title: "Deal",
  stage: "testing",
  responsibleManagerId: "manager-owens",
};

function build() {
  const deals = new InMemoryDealRepository([deal]);
  const acts = new InMemoryTestActRepository();
  const sent: NotifyInput[] = [];
  const notifier = {
    notify: async (input: NotifyInput) => {
      sent.push(input);
    },
  };
  return { record: makeRecordTestAct({ acts, deals, notifier }), acts, sent };
}

function input(): RecordTestActInput {
  return {
    id: makeId<"TestActId">("t1"),
    dealId,
    productName: "Carat Cover Glaze",
    dosage: "12%",
    result: "success",
    confirmedBy: "tech-1",
    confirmedAt: "2026-06-21T00:00:00Z",
  };
}

describe("recordTestAct", () => {
  it("records an act for an existing deal", async () => {
    const { record, acts } = build();

    const act = await record(input());

    expect(act.result).toBe("success");
    expect(await acts.findByDealId(dealId)).not.toBeNull();
  });

  it("notifies the responsible manager about the recorded test", async () => {
    const { record, sent } = build();

    await record(input());

    expect(sent).toHaveLength(1);
    expect(sent[0]?.recipientId).toBe("manager-owens");
    expect(sent[0]?.dealId).toBe(dealId);
  });

  it("throws DealNotFoundError for a non-existent deal", async () => {
    const { record } = build();
    await expect(
      record({ ...input(), dealId: makeId<"DealId">("missing") }),
    ).rejects.toBeInstanceOf(DealNotFoundError);
  });

  it("propagates a validation error (result unknown)", async () => {
    const { record } = build();
    await expect(record({ ...input(), result: "unknown" })).rejects.toBeInstanceOf(
      TestActValidationError,
    );
  });
});
