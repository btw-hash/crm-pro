import { describe, expect, it } from "vitest";
import {
  canAccessAccountingStage,
  canAccessLoadingStage,
  canCreateDeal,
  canManageProcurement,
  canManageShipments,
  canSeeClientBase,
  canSeeMargin,
  canSeePersonalAnalytics,
  canSeeTechQueue,
  canSeeTeamAnalytics,
  canUseManagerAssistant,
  canViewMyShipments,
  isOwnerScoped,
} from "./role";

describe("canSeeMargin (commercial figures)", () => {
  it("Head of Sales and Manager see margin/prices/AR", () => {
    expect(canSeeMargin("head")).toBe(true);
    expect(canSeeMargin("mop")).toBe(true);
  });
  it("the technologist does not see margin/prices/AR", () => {
    expect(canSeeMargin("technologist")).toBe(false);
  });
});

describe("isOwnerScoped (own portfolio only)", () => {
  it("only the Manager is limited to their own records", () => {
    expect(isOwnerScoped("mop")).toBe(true);
  });
  it("Head of Sales and the technologist see beyond their own portfolio", () => {
    expect(isOwnerScoped("head")).toBe(false);
    expect(isOwnerScoped("technologist")).toBe(false);
  });
});

describe("canSeeTeamAnalytics (department summary)", () => {
  it("only Head of Sales sees the breakdown by manager", () => {
    expect(canSeeTeamAnalytics("head")).toBe(true);
    expect(canSeeTeamAnalytics("mop")).toBe(false);
    expect(canSeeTeamAnalytics("technologist")).toBe(false);
  });
});

describe("canSeePersonalAnalytics (access to the analytics section)", () => {
  it("Head of Sales and Manager see analytics, the technologist does not", () => {
    expect(canSeePersonalAnalytics("head")).toBe(true);
    expect(canSeePersonalAnalytics("mop")).toBe(true);
    expect(canSeePersonalAnalytics("technologist")).toBe(false);
  });
});

describe("canUseManagerAssistant (assistant — head + manager)", () => {
  it("Head of Sales and Manager — yes; everyone else — no", () => {
    expect(canUseManagerAssistant("head")).toBe(true);
    expect(canUseManagerAssistant("mop")).toBe(true);
    expect(canUseManagerAssistant("technologist")).toBe(false);
    expect(canUseManagerAssistant("procurement")).toBe(false);
  });
});

describe("the procurement role (category manager/buyer)", () => {
  it("sees commercial figures (they purchase), but not sales analytics or the assistant", () => {
    expect(canSeeMargin("procurement")).toBe(true);
    expect(canSeePersonalAnalytics("procurement")).toBe(false);
    expect(canSeeTeamAnalytics("procurement")).toBe(false);
    expect(canUseManagerAssistant("procurement")).toBe(false);
  });
  it('works with department data, not "their own portfolio"', () => {
    expect(isOwnerScoped("procurement")).toBe(false);
  });
});

describe('canManageProcurement (the "Procurement" section)', () => {
  it("category manager and Head of Sales — yes; Manager and technologist — no", () => {
    expect(canManageProcurement("procurement")).toBe(true);
    expect(canManageProcurement("head")).toBe(true);
    expect(canManageProcurement("mop")).toBe(false);
    expect(canManageProcurement("technologist")).toBe(false);
  });
});

describe("canSeeTechQueue (the tech queue)", () => {
  it("technologist and Head of Sales — yes; Manager and category manager — no", () => {
    expect(canSeeTechQueue("technologist")).toBe(true);
    expect(canSeeTechQueue("head")).toBe(true);
    expect(canSeeTechQueue("mop")).toBe(false);
    expect(canSeeTechQueue("procurement")).toBe(false);
  });
});

describe("canViewMyShipments (my shipments — the manager's track)", () => {
  it("mop and head see their own shipments", () => {
    expect(canViewMyShipments("mop")).toBe(true);
    expect(canViewMyShipments("head")).toBe(true);
  });

  it("technologist, buyer, accountant, logistics — do not see them", () => {
    expect(canViewMyShipments("technologist")).toBe(false);
    expect(canViewMyShipments("procurement")).toBe(false);
    expect(canViewMyShipments("accountant")).toBe(false);
    expect(canViewMyShipments("logist")).toBe(false);
  });
});

describe("canAccessAccountingStage (the accounting stage)", () => {
  it("accountant and Head of Sales — yes", () => {
    expect(canAccessAccountingStage("accountant")).toBe(true);
    expect(canAccessAccountingStage("head")).toBe(true);
  });

  it("mop, logist, procurement, technologist — no", () => {
    expect(canAccessAccountingStage("mop")).toBe(false);
    expect(canAccessAccountingStage("logist")).toBe(false);
    expect(canAccessAccountingStage("procurement")).toBe(false);
    expect(canAccessAccountingStage("technologist")).toBe(false);
  });
});

describe("canAccessLoadingStage (the loading/delivery stage)", () => {
  it("logistics and Head of Sales — yes", () => {
    expect(canAccessLoadingStage("logist")).toBe(true);
    expect(canAccessLoadingStage("head")).toBe(true);
  });

  it("mop, accountant, procurement, technologist — no", () => {
    expect(canAccessLoadingStage("mop")).toBe(false);
    expect(canAccessLoadingStage("accountant")).toBe(false);
    expect(canAccessLoadingStage("procurement")).toBe(false);
    expect(canAccessLoadingStage("technologist")).toBe(false);
  });
});

describe("canManageShipments — new roles do not get full access", () => {
  it("accountant and logist do not have full access to shipments", () => {
    expect(canManageShipments("accountant")).toBe(false);
    expect(canManageShipments("logist")).toBe(false);
  });
});

describe("isOwnerScoped — new roles are not owner-scoped", () => {
  it("accountant and logist are not limited to their own portfolio", () => {
    expect(isOwnerScoped("accountant")).toBe(false);
    expect(isOwnerScoped("logist")).toBe(false);
  });
});

describe("canCreateDeal (creating deals/tasks)", () => {
  it("Manager and Head of Sales can create deals", () => {
    expect(canCreateDeal("mop")).toBe(true);
    expect(canCreateDeal("head")).toBe(true);
  });

  it("category manager, technologist, accountant, logist — cannot (the /deals form isn't for them)", () => {
    expect(canCreateDeal("procurement")).toBe(false);
    expect(canCreateDeal("technologist")).toBe(false);
    expect(canCreateDeal("accountant")).toBe(false);
    expect(canCreateDeal("logist")).toBe(false);
  });
});

describe("canSeeClientBase (the commercial client base)", () => {
  it("Head of Sales, Manager, and category manager see the client base", () => {
    expect(canSeeClientBase("head")).toBe(true);
    expect(canSeeClientBase("mop")).toBe(true);
    expect(canSeeClientBase("procurement")).toBe(true);
  });

  it("operational roles (accountant/logistics) and the technologist do not see the commercial base", () => {
    expect(canSeeClientBase("accountant")).toBe(false);
    expect(canSeeClientBase("logist")).toBe(false);
    expect(canSeeClientBase("technologist")).toBe(false);
  });
});
