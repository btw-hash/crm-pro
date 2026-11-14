import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { HomeScreen, type HeadVM, type MopVM, type SimpleVM, type TechVM } from "./dashboard";

const HEAD: HeadVM = {
  teamMeta: "4 managers · 445 active deals",
  team: [
    {
      initials: "DO",
      name: "Daniel Owens",
      note: null,
      noteColor: null,
      count: 5,
      unit: "deals",
      loadPct: 80,
      barColor: "#2b303c",
      avatarBg: "#2b303c",
    },
  ],
  aiTitle: "Assistant",
  aiBody: "insight body",
  activity: {
    total: "1,240",
    periodWord: "week",
    delta: "+12%",
    metrics: [
      { value: "520", label: "calls" },
      { value: "220", label: "meetings" },
      { value: "300", label: "proposals" },
      { value: "200", label: "tests" },
    ],
  },
  plan: {
    actual: "$8.4M",
    target: "$12.0M",
    pct: 70,
    tag: { text: "on track", bg: "#e7f5ee", color: "#1f9e6c" },
    left: "$3.6M remaining to the monthly goal",
  },
  donutTotal: 20,
  donut: [
    { label: "Audit", count: 8, pct: 40, color: "#BF322B" },
    { label: "Test", count: 12, pct: 60, color: "#2b303c" },
  ],
  decisions: [
    {
      title: "«Golden Wheat»",
      context: "Proposal approval · Reed",
      action: "approve →",
      dotColor: "#BF322B",
    },
  ],
  decisionsWaiting: 4,
  attentionCritical: 2,
  attentionClients: [
    {
      client: "Kestrel Cocoa",
      context: "Technologist's response · Reed",
      status: { text: "no step in 16d", bg: "#f7e4e2", color: "#BF322B" },
    },
  ],
  notifications: [{ title: "New notification", time: "5 min ago", unread: true }],
};

function renderHead() {
  return render(
    <HomeScreen role="head" greeting="Good afternoon" subtitle="snapshot" data={{ head: HEAD }} />,
  );
}

describe("HomeScreen — head of sales' interactive bento dashboard (#300)", () => {
  it("head of sales' tiles are marked with an entrance-animation class", () => {
    const { container } = renderHead();
    // The 8 tiles of the head of sales layout animate on load.
    expect(container.querySelectorAll(".bento-tile").length).toBeGreaterThanOrEqual(8);
  });

  it("renders the head of sales reference's rows 2-3 sections", () => {
    renderHead();
    expect(screen.getByText("Team activity")).toBeInTheDocument();
    expect(screen.getByText("Sales plan")).toBeInTheDocument();
    expect(screen.getByText("Deals by stage")).toBeInTheDocument();
    expect(screen.getByText("Decisions on you")).toBeInTheDocument();
    expect(screen.getByText("Needs attention")).toBeInTheDocument();
    // The "Needs attention" client list + the "4 waiting" chip in "Decisions".
    expect(screen.getByText("Kestrel Cocoa")).toBeInTheDocument();
    expect(screen.getByText("4 waiting")).toBeInTheDocument();
    expect(screen.getByText("2 critical")).toBeInTheDocument();
  });

  it("the donut drills down: hovering a segment shows its count in the center", () => {
    renderHead();
    // By default the center shows the overall total.
    expect(screen.getByText("20")).toBeInTheDocument();
    // Hovering the "Test" segment's legend → the center shows the segment's count (12).
    fireEvent.mouseEnter(screen.getByText(/Test 60%/));
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.queryByText("20")).not.toBeInTheDocument();
  });

  it("team rows have a load tooltip", () => {
    renderHead();
    expect(screen.getByTitle("Load 80%")).toBeInTheDocument();
  });

  it("card headers have decorative period/horizon segment toggles", () => {
    renderHead();
    // "Team activity" → Week/Month; "Sales plan" → Month/Quarter/Year.
    expect(screen.getByRole("button", { name: "Week" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quarter" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Year" })).toBeInTheDocument();
    // Clicking "Year" toggles the active segment (client-side state, no crashes).
    fireEvent.click(screen.getByRole("button", { name: "Year" }));
    expect(screen.getByRole("button", { name: "Year" })).toBeInTheDocument();
  });

  it("the activity delta badge is always present (including when delta=null)", () => {
    render(
      <HomeScreen
        role="head"
        greeting="Good afternoon"
        subtitle="snapshot"
        data={{ head: { ...HEAD, activity: { ...HEAD.activity, delta: null } } }}
      />,
    );
    // A "—" placeholder instead of a disappearing badge.
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});

const TECH: TechVM = {
  ai: {
    title: "Technologist assistant",
    word: "technologist",
    body: "technologist insight body",
    canAsk: true,
  },
  todayCountLabel: "3 events",
  dateLabel: "July 1",
  events: [
    {
      time: "10:00",
      title: "Kestrel Cocoa — glaze test",
      typeLabel: "test",
      typeChip: { bg: "#fbf1d6", color: "#9a6a00" },
      place: "Millbrook Foods showroom",
      range: "10:00–11:30",
      barColor: "#E3B32B",
      flag: { text: "now", bg: "rgba(231,186,60,0.22)", color: "#9a6a00" },
    },
  ],
  cards: [
    { label: "New requests", value: "7", valueAccent: false, sub: "", chips: [] },
    {
      label: "SLA overdue",
      value: "1",
      valueAccent: true,
      sub: "request waiting > 2 days",
      subBelow: true,
      chips: [],
    },
  ],
  queueUrgent: 1,
  queueToday: 2,
  queue: [
    {
      kind: "test",
      title: "Kestrel Cocoa — Coverlux Cover Glaze test",
      context: "test · sample reserved",
      due: "by Jul 2",
      status: { text: "urgent", bg: "#f7e4e2", color: "#BF322B" },
    },
  ],
  samples: [
    {
      product: "Coverlux Cover Glaze",
      context: "Kestrel Cocoa · 2 kg",
      status: { text: "reserved", bg: "#e7f5ee", color: "#1f9e6c" },
    },
  ],
};

describe("HomeScreen — technologist layout (reference)", () => {
  it("renders a 3-row bento: calendar, KPIs, queue + samples", () => {
    render(
      <HomeScreen
        role="technologist"
        greeting="Good afternoon"
        subtitle="snapshot"
        data={{ technologist: TECH }}
      />,
    );
    expect(screen.getByText("Today's calendar")).toBeInTheDocument();
    expect(screen.getByText("Tech request queue")).toBeInTheDocument();
    expect(screen.getByText("Samples for testing")).toBeInTheDocument();
    // The word "technologist" is rendered in an ochre span, the "Ask the assistant" button is present (canAsk).
    expect(screen.getByText("technologist")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ask the assistant" })).toBeInTheDocument();
    // Queue chips and the sample's product.
    expect(screen.getByText("urgent 1")).toBeInTheDocument();
    expect(screen.getByText("Coverlux Cover Glaze")).toBeInTheDocument();
  });

  it('the "Today\'s calendar" row is clickable: a tooltip + navigation to the calendar', () => {
    push.mockClear();
    render(
      <HomeScreen
        role="technologist"
        greeting="Good afternoon"
        subtitle="snapshot"
        data={{ technologist: TECH }}
      />,
    );
    const row = screen.getByTitle("Open in calendar");
    expect(row).toBeInTheDocument();
    fireEvent.click(row);
    expect(push).toHaveBeenCalledWith("/calendar");
  });
});

const PROC: SimpleVM = {
  ai: { title: "Procurement assistant", word: "procurement", body: "insight body", canAsk: true },
  aiHorizontal: true,
  cards: [
    {
      label: "Procurement — what to reorder",
      value: "12",
      valueAccent: true,
      sub: "items",
      chips: [
        { text: "overstock 5", bg: "#fbf1d6", color: "#9a6a00" },
        { text: "OK 84", bg: "#e7f5ee", color: "#1f9e6c" },
      ],
    },
  ],
  triCard: {
    label: "Operational queues",
    mini: [
      { value: "11", label: "packing" },
      { value: "3", label: "defect", accent: true },
      { value: "5", label: "onboarding" },
    ],
  },
};

describe("HomeScreen — procurement layout (reference)", () => {
  it('a horizontal AI tile with a button + a trio of inline KPIs "Operational queues"', () => {
    render(
      <HomeScreen
        role="procurement"
        greeting="Good afternoon"
        subtitle="snapshot"
        data={{ procurement: PROC }}
      />,
    );
    // The word "procurement" in ochre + a button (canAsk:true).
    expect(screen.getByText("procurement")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ask the assistant" })).toBeInTheDocument();
    // The trio of inline KPIs.
    expect(screen.getByText("Operational queues")).toBeInTheDocument();
    expect(screen.getByText("packing")).toBeInTheDocument();
    expect(screen.getByText("defect")).toBeInTheDocument();
    expect(screen.getByText("onboarding")).toBeInTheDocument();
    // No extra "shortage" chip on the procurement card.
    expect(screen.queryByText(/shortage/)).not.toBeInTheDocument();
  });
});

const MOP: MopVM = {
  overdueCount: 2,
  todayCount: 5,
  hero: [
    {
      client: "Kestrel Cocoa",
      action: "call about test results",
      context: "test finished 16 days ago · cocoa mass",
      status: { text: "overdue", bg: "#f7e4e2", color: "#BF322B" },
    },
  ],
  plan: {
    fact: "$8.4M",
    target: "$12.0M",
    progressPct: 70,
    doneLabel: "70% done",
    deltaLabel: "+9%",
  },
  conversion: {
    value: "21.4%",
    badge: { text: "above average", bg: "#e7f5ee", color: "#1f9e6c" },
    deptLabel: "dept 18.6%",
  },
  inWork: {
    count: "38",
    portfolio: "$14.2M",
    chips: [
      { text: "qual. 12", bg: "#efe9e2", color: "#6a5f54" },
      { text: "test 9", bg: "#efe9e2", color: "#6a5f54" },
      { text: "proposal 6", bg: "#efe9e2", color: "#6a5f54" },
    ],
  },
  funnel: [
    { label: "Qualification", count: 41, widthPct: 72, color: "#363c49" },
    { label: "Completed", count: 9, widthPct: 19, color: "#cfd3db" },
  ],
  hot: [
    {
      client: "Kestrel Cocoa",
      status: { text: "no step in 16d", bg: "#f7e4e2", color: "#BF322B" },
    },
  ],
  recent: [
    { kind: "call", text: "Ridgeline Pastries — discussed volume", time: "today, 11:20 AM" },
  ],
  ai: { title: "Sales assistant", body: "sales insight body", canAsk: true },
};

describe("HomeScreen — manager layout (reference)", () => {
  function renderMop() {
    return render(
      <HomeScreen
        role="mop"
        greeting="Good afternoon"
        subtitle="My deals and tasks"
        data={{ mop: MOP }}
      />,
    );
  }

  it("renders the reference sections and key values", () => {
    renderMop();
    expect(screen.getByText("My deals for today")).toBeInTheDocument();
    expect(screen.getByText("My plan for the month")).toBeInTheDocument();
    expect(screen.getByText("My conversion")).toBeInTheDocument();
    expect(screen.getByText("My deals in progress")).toBeInTheDocument();
    expect(screen.getByText("My funnel")).toBeInTheDocument();
    expect(screen.getByText("Hot deals")).toBeInTheDocument();
    expect(screen.getByText("Recent activity")).toBeInTheDocument();
    // Deals-header chips
    expect(screen.getByText("overdue 2")).toBeInTheDocument();
    expect(screen.getByText("today 5")).toBeInTheDocument();
    // KPI numbers
    expect(screen.getByText("21.4%")).toBeInTheDocument();
    expect(screen.getByText("above average")).toBeInTheDocument();
  });

  it('the "Sales assistant" AI tile has a working button (canAsk for the manager)', () => {
    renderMop();
    // "sales" is rendered in an ochre span — check by substring.
    expect(screen.getByText("sales")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ask the assistant" })).toBeInTheDocument();
  });
});
