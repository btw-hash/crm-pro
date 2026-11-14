import { describe, expect, it } from "vitest";
import { makeId } from "@/domain/shared/id";
import {
  advancePacking,
  createPackingRequest,
  type CreatePackingRequestInput,
  isPackingDone,
  PackingRequestError,
} from "./packing-request";

const base: CreatePackingRequestInput = {
  id: makeId<"PackingRequestId">("p1"),
  productName: "Noirelle chocolate",
  sourcePack: "1 kg",
  targetPack: "10 x 100 g",
  quantity: 50,
  unit: "kg",
  requestedBy: "manager-owens",
  createdAt: "2026-06-24T10:00:00.000Z",
};

describe("createPackingRequest", () => {
  it("creates a request at the 'Request created' stage", () => {
    const req = createPackingRequest(base);
    expect(req.status).toBe("requested");
    expect(req.sourcePack).toBe("1 kg");
    expect(req.targetPack).toBe("10 x 100 g");
  });

  it("rejects an empty product/pack or a non-positive quantity", () => {
    expect(() => createPackingRequest({ ...base, productName: " " })).toThrow(PackingRequestError);
    expect(() => createPackingRequest({ ...base, targetPack: "" })).toThrow(PackingRequestError);
    expect(() => createPackingRequest({ ...base, quantity: 0 })).toThrow(PackingRequestError);
  });
});

describe("advancePacking", () => {
  it("goes 'Request → In progress → Done', no further after that", () => {
    let req = createPackingRequest(base);
    req = advancePacking(req);
    expect(req.status).toBe("in_progress");
    req = advancePacking(req);
    expect(req.status).toBe("done");
    expect(isPackingDone(req.status)).toBe(true);
    expect(() => advancePacking(req)).toThrow(PackingRequestError);
  });
});
