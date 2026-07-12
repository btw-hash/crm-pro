import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));
vi.mock("@/app/login/actions", () => ({ logoutAction: vi.fn() }));

import { AppSidebar } from "./app-sidebar";

function sidebar(role: Parameters<typeof AppSidebar>[0]["role"]) {
  render(<AppSidebar role={role} userName="Test" userRoleLabel="Test" />);
}

describe("AppSidebar — tab visibility by role", () => {
  it("Assistant is visible to head", () => {
    sidebar("head");
    expect(screen.getAllByTitle("Assistant").length).toBeGreaterThan(0);
  });

  it("Assistant is visible to mop", () => {
    sidebar("mop");
    expect(screen.getAllByTitle("Assistant").length).toBeGreaterThan(0);
  });

  it("Assistant is NOT visible to technologist", () => {
    sidebar("technologist");
    expect(screen.queryByTitle("Assistant")).toBeNull();
  });

  it("Deals is visible to head", () => {
    sidebar("head");
    expect(screen.getAllByTitle("Deals").length).toBeGreaterThan(0);
  });

  it("Deals is visible to mop", () => {
    sidebar("mop");
    expect(screen.getAllByTitle("Deals").length).toBeGreaterThan(0);
  });

  it("Deals is NOT visible to technologist", () => {
    sidebar("technologist");
    expect(screen.queryByTitle("Deals")).toBeNull();
  });

  it("Deals is NOT visible to procurement", () => {
    sidebar("procurement");
    expect(screen.queryByTitle("Deals")).toBeNull();
  });

  it("Deals is NOT visible to accountant", () => {
    sidebar("accountant");
    expect(screen.queryByTitle("Deals")).toBeNull();
  });

  it("Deals is NOT visible to logist", () => {
    sidebar("logist");
    expect(screen.queryByTitle("Deals")).toBeNull();
  });

  it("Tech queue is visible to technologist on the rail (primary section)", () => {
    sidebar("technologist");
    expect(screen.getAllByTitle("Tech queue").length).toBeGreaterThan(0);
  });

  it("Tech queue is NOT on the rail for mop", () => {
    sidebar("mop");
    expect(screen.queryByTitle("Tech queue")).toBeNull();
  });

  it("Calendar is visible to technologist", () => {
    sidebar("technologist");
    expect(screen.getAllByTitle("Calendar").length).toBeGreaterThan(0);
  });

  it("Calendar is NOT visible to mop", () => {
    sidebar("mop");
    expect(screen.queryByTitle("Calendar")).toBeNull();
  });

  it("My shipments is on the rail for mop", () => {
    sidebar("mop");
    expect(screen.getAllByTitle("My shipments").length).toBeGreaterThan(0);
  });

  it("My shipments is NOT visible to technologist", () => {
    sidebar("technologist");
    expect(screen.queryByTitle("My shipments")).toBeNull();
  });
});
