import { describe, expect, it } from "vitest";
import { makeId } from "@/domain/shared/id";
import {
  type Activity,
  ActivityValidationError,
  createActivity,
  isActivityKind,
  markDone,
  nextStep,
} from "./activity";

const dealId = makeId<"DealId">("d1");

function input(over: Partial<Parameters<typeof createActivity>[0]> = {}) {
  return {
    id: makeId<"ActivityId">("a1"),
    dealId,
    kind: "note" as const,
    text: "Discussed the test over a call",
    author: "manager-smith",
    createdAt: "2026-06-21T10:00:00Z",
    ...over,
  };
}

describe("createActivity", () => {
  it("creates an activity linked to a deal", () => {
    const a = createActivity(input());
    expect(a.kind).toBe("note");
    expect(a.done).toBe(false);
  });

  it("throws on empty text", () => {
    expect(() => createActivity(input({ text: "  " }))).toThrow(ActivityValidationError);
  });

  it("requires a link to a deal or a client", () => {
    expect(() => createActivity(input({ dealId: null, clientId: null }))).toThrow(
      ActivityValidationError,
    );
  });

  it("keeps the due date for a task and clears it for a non-task", () => {
    expect(createActivity(input({ kind: "task", dueDate: "2026-06-25" })).dueDate).toBe(
      "2026-06-25",
    );
    expect(createActivity(input({ kind: "note", dueDate: "2026-06-25" })).dueDate).toBeNull();
  });
});

describe("nextStep", () => {
  function task(id: string, dueDate: string | null, done = false): Activity {
    return {
      id: makeId<"ActivityId">(id),
      dealId,
      clientId: null,
      kind: "task",
      text: id,
      author: "m",
      createdAt: "2026-06-21T10:00:00Z",
      dueDate,
      done,
    };
  }

  it("returns the open task with the nearest due date", () => {
    const step = nextStep([task("late", "2026-07-01"), task("soon", "2026-06-23")]);
    expect(step?.id).toBe("soon");
  });

  it("ignores done tasks and notes", () => {
    const note = createActivity(input({ kind: "note" }));
    expect(nextStep([task("done", "2026-06-22", true), note])).toBeNull();
  });
});

describe("markDone", () => {
  it("marks the task done without mutating the original", () => {
    const t = createActivity(input({ kind: "task", dueDate: "2026-06-25" }));
    const done = markDone(t);
    expect(done.done).toBe(true);
    expect(t.done).toBe(false);
  });
});

describe("isActivityKind", () => {
  it("accepts valid kinds", () => {
    expect(isActivityKind("call")).toBe(true);
    expect(isActivityKind("visit")).toBe(true);
    expect(isActivityKind("note")).toBe(true);
    expect(isActivityKind("task")).toBe(true);
  });
  it("rejects unknown/empty values", () => {
    expect(isActivityKind("email")).toBe(false);
    expect(isActivityKind("")).toBe(false);
    expect(isActivityKind(null)).toBe(false);
    expect(isActivityKind(42)).toBe(false);
  });
});
