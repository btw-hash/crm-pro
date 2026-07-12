import { describe, expect, it } from "vitest";
import { makeId } from "@/domain/shared/id";
import {
  complete,
  createTechRequest,
  type CreateTechRequestInput,
  takeInWork,
  TechRequestError,
} from "./tech-request";

function baseInput(): CreateTechRequestInput {
  return {
    id: makeId<"TechRequestId">("tr1"),
    dealId: makeId<"DealId">("d1"),
    clientId: makeId<"ClientId">("c1"),
    kind: "consult",
    note: "Need a consultation on how to use the improver",
    requestedBy: "manager-owens",
    createdAt: "2026-06-24T10:00:00Z",
  };
}

describe("createTechRequest", () => {
  it("creates a request with status open", () => {
    const req = createTechRequest(baseInput());
    expect(req.status).toBe("open");
    expect(req.assignedTo).toBeNull();
    expect(req.productId).toBeNull();
  });

  it("trims whitespace from note", () => {
    const req = createTechRequest({ ...baseInput(), note: "  question  " });
    expect(req.note).toBe("question");
  });

  it("throws TechRequestError on an empty note", () => {
    expect(() => createTechRequest({ ...baseInput(), note: "   " })).toThrow(TechRequestError);
  });

  it("accepts productId", () => {
    const req = createTechRequest({
      ...baseInput(),
      productId: makeId<"ProductId">("p1"),
    });
    expect(req.productId).toBe("p1");
  });
});

describe("takeInWork", () => {
  it("moves open → in_progress and sets assignedTo", () => {
    const open = createTechRequest(baseInput());
    const inProgress = takeInWork(open, "tech-kent");
    expect(inProgress.status).toBe("in_progress");
    expect(inProgress.assignedTo).toBe("tech-kent");
  });

  it("throws an error when trying to take one not from open", () => {
    const open = createTechRequest(baseInput());
    const inProgress = takeInWork(open, "tech-kent");
    expect(() => takeInWork(inProgress, "tech-derek")).toThrow(TechRequestError);
  });
});

describe("complete", () => {
  it("moves in_progress → done", () => {
    const open = createTechRequest(baseInput());
    const inProgress = takeInWork(open, "tech-kent");
    const done = complete(inProgress);
    expect(done.status).toBe("done");
  });

  it("throws an error when trying to complete from open", () => {
    const open = createTechRequest(baseInput());
    expect(() => complete(open)).toThrow(TechRequestError);
  });

  it("throws an error when trying to complete an already done one", () => {
    const open = createTechRequest(baseInput());
    const done = complete(takeInWork(open, "tech-kent"));
    expect(() => complete(done)).toThrow(TechRequestError);
  });
});
