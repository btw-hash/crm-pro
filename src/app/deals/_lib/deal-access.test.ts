import { describe, expect, it } from "vitest";
import type { Viewer } from "@/domain/shared/viewer";
import { canAccessDeals, canAssignToManager } from "./deal-access";

const viewer = (id: string, role: Viewer["role"]): Viewer => ({ id, role });

describe("canAccessDeals", () => {
  it("sales roles (head, mop) have access to the deals section", () => {
    expect(canAccessDeals("head")).toBe(true);
    expect(canAccessDeals("mop")).toBe(true);
  });

  it("operational/non-sales roles have no access to the deals section", () => {
    expect(canAccessDeals("accountant")).toBe(false);
    expect(canAccessDeals("logist")).toBe(false);
    expect(canAccessDeals("technologist")).toBe(false);
    expect(canAccessDeals("procurement")).toBe(false);
  });
});

describe("canAssignToManager", () => {
  it("the head of sales can assign a deal to any manager", () => {
    expect(canAssignToManager(viewer("head-1", "head"), "manager-grant")).toBe(true);
    expect(canAssignToManager(viewer("head-1", "head"), "manager-owens")).toBe(true);
  });

  it("a sales manager can only assign a deal to themselves", () => {
    const mop = viewer("manager-owens", "mop");
    expect(canAssignToManager(mop, "manager-owens")).toBe(true);
    expect(canAssignToManager(mop, "manager-grant")).toBe(false);
  });

  it("an empty/blank responsible-manager id is invalid", () => {
    expect(canAssignToManager(viewer("head-1", "head"), "")).toBe(false);
    expect(canAssignToManager(viewer("head-1", "head"), "   ")).toBe(false);
  });
});
