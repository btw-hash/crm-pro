import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { makeId } from "@/domain/shared/id";
import type { TechRequest } from "@/domain/tech-request/tech-request";
import type { TestAct } from "@/domain/test-act/test-act";
import { TestingWorkspace } from "./testing-workspace";

function makeTestAct(overrides: Partial<TestAct> = {}): TestAct {
  return {
    id: makeId<"TestActId">("ta1"),
    dealId: makeId<"DealId">("d1"),
    techRequestId: null,
    actKind: "workup",
    clientName: "Sweet World Confections",
    equipment: "Miwe",
    productName: "Carat Cover Glaze",
    dosage: "12%",
    processParams: "180°C, 15 min",
    recommendation: null,
    auditChecked: null,
    auditRemarks: null,
    auditRecommendation: null,
    result: "success",
    comment: null,
    confirmedBy: "tech-1",
    confirmedAt: "2026-06-21T00:00:00Z",
    sentAt: null,
    ...overrides,
  };
}

const BASE_PROPS = {
  dealId: "d1",
  clientId: "c1",
  dealTitle: "Sweet World Confections — test",
  labelFor: (id: string) =>
    (({ "mgr-1": "J. Carter", "tech-1": "M. Reed" }) as Record<string, string>)[id] ?? id,
  dealTechRequests: [] as TechRequest[],
};

describe("TestingWorkspace", () => {
  it("shows awaiting state when no sent acts", () => {
    render(<TestingWorkspace {...BASE_PROPS} visibility="active" testAct={null} testActs={[]} />);
    expect(screen.getByTestId("awaiting-response")).toBeTruthy();
    expect(screen.getByText(/Awaiting technologist response/)).toBeTruthy();
  });

  it("shows tech-response when sentAt act exists", () => {
    const sentAct = makeTestAct({ sentAt: "2026-06-22T10:00:00Z" });
    render(
      <TestingWorkspace
        {...BASE_PROPS}
        visibility="active"
        testAct={sentAct}
        testActs={[sentAct]}
      />,
    );
    expect(screen.getByTestId("tech-response")).toBeTruthy();
    expect(screen.getByText("Technologist sent a response")).toBeTruthy();
  });

  it("shows act doc block with workup content when sentAt set", () => {
    const sentAct = makeTestAct({ sentAt: "2026-06-22T10:00:00Z" });
    render(
      <TestingWorkspace
        {...BASE_PROPS}
        visibility="active"
        testAct={sentAct}
        testActs={[sentAct]}
      />,
    );
    expect(screen.getByTestId("act-doc-block")).toBeTruthy();
    // Design §12: the document title now includes a number — "Workup act #N".
    expect(screen.getByText(/Workup act #\d+/)).toBeTruthy();
    expect(screen.getByText("Successful")).toBeTruthy();
  });

  it("shows result chip «Partial» for partial result", () => {
    const sentAct = makeTestAct({ sentAt: "2026-06-22T10:00:00Z", result: "partial" });
    render(
      <TestingWorkspace
        {...BASE_PROPS}
        visibility="active"
        testAct={sentAct}
        testActs={[sentAct]}
      />,
    );
    expect(screen.getByText("Partial")).toBeTruthy();
  });

  it("shows result chip «Unsuccessful» for failure result", () => {
    const sentAct = makeTestAct({ sentAt: "2026-06-22T10:00:00Z", result: "failure" });
    render(
      <TestingWorkspace
        {...BASE_PROPS}
        visibility="active"
        testAct={sentAct}
        testActs={[sentAct]}
      />,
    );
    expect(screen.getByText("Unsuccessful")).toBeTruthy();
  });

  it("does NOT show awaiting state when sentAt act exists", () => {
    const sentAct = makeTestAct({ sentAt: "2026-06-22T10:00:00Z" });
    render(
      <TestingWorkspace
        {...BASE_PROPS}
        visibility="active"
        testAct={sentAct}
        testActs={[sentAct]}
      />,
    );
    expect(screen.queryByTestId("awaiting-response")).toBeNull();
  });

  it("does NOT show act-doc-block when act not yet sent", () => {
    const unsent = makeTestAct({ sentAt: null });
    render(
      <TestingWorkspace {...BASE_PROPS} visibility="active" testAct={unsent} testActs={[unsent]} />,
    );
    expect(screen.queryByTestId("act-doc-block")).toBeNull();
    expect(screen.getByTestId("awaiting-response")).toBeTruthy();
  });

  it("renders consult_summary kind label", () => {
    const sentAct = makeTestAct({
      actKind: "consult_summary",
      recommendation: "Reduce the dosage to 8%",
      sentAt: "2026-06-22T10:00:00Z",
    });
    render(
      <TestingWorkspace
        {...BASE_PROPS}
        visibility="active"
        testAct={sentAct}
        testActs={[sentAct]}
      />,
    );
    expect(screen.getByText("Consultation summary")).toBeTruthy();
    expect(screen.getByText("Reduce the dosage to 8%")).toBeTruthy();
  });

  it("renders audit_summary kind label", () => {
    const sentAct = makeTestAct({
      actKind: "audit_summary",
      auditChecked: "Glazing line",
      auditRemarks: "No issues",
      auditRecommendation: "Ready for rollout",
      sentAt: "2026-06-22T10:00:00Z",
    });
    render(
      <TestingWorkspace
        {...BASE_PROPS}
        visibility="active"
        testAct={sentAct}
        testActs={[sentAct]}
      />,
    );
    expect(screen.getByText("Audit summary")).toBeTruthy();
    expect(screen.getByText("Glazing line")).toBeTruthy();
  });

  it("renders tech-request list items when dealTechRequests provided", () => {
    const req: TechRequest = {
      id: makeId<"TechRequestId">("tr1"),
      dealId: makeId<"DealId">("d1"),
      clientId: makeId<"ClientId">("c1"),
      productId: null,
      kind: "consult",
      status: "open",
      note: "Need a consultation about the glaze",
      requestedBy: "mgr-1",
      assignedTo: "tech-1",
      createdAt: "2026-06-20T10:00:00Z",
      deadline: null,
      consultFormat: null,
      demoLocation: null,
      demoAddress: null,
      demoProducts: null,
      auditFocus: null,
    };
    render(
      <TestingWorkspace
        {...BASE_PROPS}
        visibility="active"
        testAct={null}
        testActs={[]}
        dealTechRequests={[req]}
      />,
    );
    expect(screen.getByText(/Need a consultation about the glaze/)).toBeTruthy();
  });
});
