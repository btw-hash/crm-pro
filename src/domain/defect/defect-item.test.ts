import { describe, expect, it } from "vitest";
import { makeId } from "@/domain/shared/id";
import {
  advanceDefect,
  createDefectItem,
  type CreateDefectItemInput,
  DefectItemError,
  isDefectReleased,
} from "./defect-item";

const base: CreateDefectItemInput = {
  id: makeId<"DefectItemId">("d1"),
  productName: "Belcolade chocolate",
  quantity: 30,
  unit: "kg",
  reason: "wrong_label",
  createdBy: "manager-smith",
  createdAt: "2026-06-24T10:00:00.000Z",
};

describe("createDefectItem", () => {
  it("puts the item into the defect warehouse", () => {
    const item = createDefectItem(base);
    expect(item.status).toBe("on_defect_stock");
    expect(item.reason).toBe("wrong_label");
  });

  it("rejects an empty product and a non-positive quantity", () => {
    expect(() => createDefectItem({ ...base, productName: " " })).toThrow(DefectItemError);
    expect(() => createDefectItem({ ...base, quantity: 0 })).toThrow(DefectItemError);
  });
});

describe("advanceDefect", () => {
  it("goes defect warehouse -> requested -> relabeling -> ready -> released, then no further", () => {
    let item = createDefectItem(base);
    item = advanceDefect(item);
    expect(item.status).toBe("relabel_requested");
    item = advanceDefect(item);
    expect(item.status).toBe("relabeling");
    item = advanceDefect(item);
    expect(item.status).toBe("ready");
    item = advanceDefect(item);
    expect(item.status).toBe("released");
    expect(isDefectReleased(item.status)).toBe(true);
    expect(() => advanceDefect(item)).toThrow(DefectItemError);
  });
});
