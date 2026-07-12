import { describe, expect, it } from "vitest";
import { makeId } from "@/domain/shared/id";
import { type CreateTestActInput, createTestAct, TestActValidationError } from "./test-act";

function baseInput(): CreateTestActInput {
  return {
    id: makeId<"TestActId">("t1"),
    dealId: makeId<"DealId">("d1"),
    result: "success",
    confirmedBy: "tech-1",
    confirmedAt: "2026-06-21T00:00:00Z",
  };
}

describe("createTestAct", () => {
  it("creates a confirmed act", () => {
    const act = createTestAct({
      ...baseInput(),
      productName: "Carat Cover glaze",
      dosage: "12%",
    });

    expect(act.result).toBe("success");
    expect(act.productName).toBe("Carat Cover glaze");
    expect(act.comment).toBeNull();
  });

  it("throws an error when the result is not determined (unknown)", () => {
    expect(() => createTestAct({ ...baseInput(), result: "unknown" })).toThrow(
      TestActValidationError,
    );
  });
});
