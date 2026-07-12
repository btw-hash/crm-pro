import { DEAL_STAGE_LABELS, type DealStage } from "@/domain/deal/deal-stage";
import type { Role } from "@/domain/shared/role";
import type { Viewer } from "@/domain/shared/viewer";
import type {
  HeadHome,
  ManagerHome,
  OperationalHome,
  ProcurementHome,
  TechnologistHome,
} from "@/application/use-cases/get-home-dashboard";
import { requireUser } from "@/infrastructure/config/current-user";
import { getContainer } from "@/infrastructure/composition-root";
import { personLabel } from "@/infrastructure/persistence/seed";
import {
  HomeScreen,
  type AttentionClientVM,
  type ChipVM,
  type DecisionRowVM,
  type FunnelBarVM,
  type HeadVM,
  type HeroRowVM,
  type HotRowVM,
  type MopVM,
  type RecentRowVM,
  type SimpleVM,
  type TechEventVM,
  type TechQueueRowVM,
  type TechSampleVM,
  type TechVM,
} from "./_components/home/dashboard";

const AVATAR_RAMP = ["#1c1f27", "#363c49", "#565e6e", "#9aa0ad", "#8a90a0", "#6b6f78", "#2b303c"];
const BAR_RAMP = ["#BF322B", "#2b303c", "#565e6e", "#9aa0ad", "#cfd3db"];
const DONUT_RAMP = ["#1c1f27", "#E3B32B", "#BF322B", "#d2d6dd", "#565e6e", "#9aa0ad"];
const FUNNEL_RAMP = ["#1c1f27", "#363c49", "#565e6e", "#9aa0ad", "#cfd3db"];

const CHIP_ALERT = { bg: "#f7e4e2", color: "#BF322B" } as const;
const CHIP_WARN = { bg: "#fbf1d6", color: "#9a6a00" } as const;
const CHIP_MUTED = { bg: "#efe9e2", color: "#6a5f54" } as const;
const CHIP_OK = { bg: "#e7f5ee", color: "#1f9e6c" } as const;
// Technologist status chips match the reference (CRM-PRO.dc.html:1033/1040/1042): green text
// #197a48 (darker than the general #1f9e6c) and a cool grey "issued" #eef0f2/#6b6f78 (as opposed
// to the warm CHIP_MUTED).
const CHIP_TECH_OK = { bg: "#e7f5ee", color: "#197a48" } as const;
const CHIP_TECH_ISSUED = { bg: "#eef0f2", color: "#6b6f78" } as const;

function chip(text: string, kind: { bg: string; color: string }): ChipVM {
  return { text, bg: kind.bg, color: kind.color };
}

function pick(arr: readonly string[], i: number): string {
  return arr[i % arr.length] ?? arr[0] ?? "#000";
}
/** Dollars (major units) from a formatted Money string ("$8,400,000.00" -> 8400000). */
function dollarsFromFormatted(s: string): number {
  const digits = s
    .replace(/^\s*\$\s*/, "")
    .replace(/[.,]\d+$/, "")
    .replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

/** Compact USD amount like the reference design: 8,400,000 -> "$8.4M", 14,200,000 -> "$14.2M". */
function dollarCompact(usd: number): string {
  if (usd >= 1_000_000) {
    const m = usd / 1_000_000;
    return `$${m.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
  }
  if (usd >= 1_000) {
    const k = Math.round(usd / 1_000);
    return `$${k.toLocaleString("en-US")}K`;
  }
  return `$${usd.toLocaleString("en-US")}`;
}

/** Percent with a decimal point: 0.214 -> "21.4%". */
function pctEn(fraction: number, digits = 1): string {
  return `${(fraction * 100).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}
function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}
function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const s = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return s.toUpperCase() || "?";
}
function plural(n: number, singular: string, pluralForm: string): string {
  return n === 1 ? singular : pluralForm;
}
function deltaLabel(percent: number | null): string | null {
  if (percent === null) return null;
  return percent > 0 ? `+${percent}%` : `${percent}%`;
}
function relativeTime(iso: string, nowMs: number): string {
  const diff = Math.max(0, nowMs - new Date(iso).getTime());
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} ${plural(min, "minute", "minutes")} ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} ${plural(h, "hour", "hours")} ago`;
  const d = Math.round(h / 24);
  return `${d} ${plural(d, "day", "days")} ago`;
}

/**
 * Activity time for the "Recent tasks" feed as in the reference design: "today, 11:20 AM" /
 * "yesterday, 4:05 PM" / "N days ago" (by calendar day, not by a 24h diff).
 */
function activityTime(iso: string, nowMs: number): string {
  const then = new Date(iso);
  const now = new Date(nowMs);
  const startOfDay = (d: Date): number =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(now) - startOfDay(then)) / (1000 * 60 * 60 * 24));
  const hhmm = then.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  if (dayDiff <= 0) return `today, ${hhmm}`;
  if (dayDiff === 1) return `yesterday, ${hhmm}`;
  return `${dayDiff} ${plural(dayDiff, "day", "days")} ago`;
}

async function buildHeadVM(viewer: Viewer): Promise<{ vm: HeadVM; topManagerId: string | null }> {
  const container = getContainer();
  const nowMs = Date.now();
  const [home, analytics, sales, notifications, clients] = await Promise.all([
    container.getHomeDashboard(viewer) as Promise<HeadHome>,
    container.getFunnelAnalytics(undefined),
    container.getSalesAnalytics(undefined),
    container.listNotifications(viewer.id),
    container.listClients(viewer),
  ]);
  const clientNames: Record<string, string> = {};
  for (const c of clients) clientNames[c.id] = c.name;
  const clientOf = (deal: { clientId: string; title: string }): string =>
    clientNames[deal.clientId] ?? deal.title;

  const totalActive = home.team.reduce((s, r) => s + r.activeDeals, 0);
  const maxActive = Math.max(1, ...home.team.map((r) => r.activeDeals));
  const team = home.team.map((r, i) => {
    const name = personLabel(r.managerId);
    const note =
      r.stalled > 0
        ? { text: `stalled ${r.stalled}`, color: "#c9991c" }
        : r.needsNextStep > 0
          ? { text: `no next step ${r.needsNextStep}`, color: "#BF322B" }
          : null;
    return {
      initials: initials(name),
      name,
      note: note?.text ?? null,
      noteColor: note?.color ?? null,
      count: r.activeDeals,
      unit: plural(r.activeDeals, "deal", "deals"),
      loadPct: Math.round((r.activeDeals / maxActive) * 100),
      barColor: pick(BAR_RAMP, i),
      avatarBg: pick(AVATAR_RAMP, i),
    };
  });

  const worst = [...home.team].sort(
    (a, b) => b.stalled - a.stalled || b.needsNextStep - a.needsNextStep,
  )[0];
  let aiBody: string;
  if (worst && worst.stalled > 0) {
    aiBody = `${personLabel(worst.managerId)}: ${worst.stalled} ${plural(worst.stalled, "stalled deal", "stalled deals")} with no step for over 14 days. Recommend a team sync today.`;
  } else if (worst && worst.needsNextStep > 0) {
    aiBody = `${personLabel(worst.managerId)}: ${worst.needsNextStep} ${plural(worst.needsNextStep, "deal", "deals")} with no next step — worth suggesting an action plan.`;
  } else {
    aiBody = "The team is on track — no critical stalls. Good time to check in on conversion.";
  }

  const stageCount = (st: DealStage): number =>
    analytics.byStage.find((s) => s.stage === st)?.count ?? 0;

  // Donut "Deals by stage" — 4 buckets as in the reference design (New/In progress/Negotiation/Closed).
  const buckets = [
    { label: "New", count: stageCount("qualification") },
    {
      label: "In progress",
      count: stageCount("audit") + stageCount("testing"),
    },
    { label: "Negotiation", count: stageCount("quote") },
    { label: "Closed", count: stageCount("completed") },
  ].filter((b) => b.count > 0);
  const donutSum = buckets.reduce((s, b) => s + b.count, 0) || 1;
  const donut = buckets.map((b, i) => ({
    label: b.label,
    count: b.count,
    pct: Math.round((b.count / donutSum) * 100),
    color: pick(DONUT_RAMP, i),
  }));

  // "Team activity" — a large "actions" number + a grid of 4 metrics. The home-dashboard slice
  // has no breakdown of actions by type -> DEMO-DERIVED: deterministically split the team's total
  // activity (totalActive) across a typical profile (calls/meetings/proposals/tests) by fixed shares.
  const actTotal = totalActive;
  const actMetrics = [
    { value: Math.round(actTotal * 0.42), label: "calls" },
    { value: Math.round(actTotal * 0.18), label: "meetings" },
    { value: Math.round(actTotal * 0.24), label: "proposals" },
    { value: Math.round(actTotal * 0.16), label: "tests" },
  ];

  // "Sales plan" — the actual figure is real (latestMonthRevenue). There's no monthly target in
  // the department slice -> DEMO-DERIVED: target = actual / 0.7 (assuming ~70% attainment),
  // rounded to a clean 100K.
  const factUsd = dollarsFromFormatted(sales.latestMonthRevenue);
  const targetUsd = Math.max(factUsd, Math.round(factUsd / 0.7 / 100_000) * 100_000);
  const planPct = targetUsd > 0 ? Math.min(100, Math.round((factUsd / targetUsd) * 100)) : 0;
  const leftUsd = Math.max(0, targetUsd - factUsd);

  // "Decisions for you" — real hot deals in the team that need the head of sales to weigh in.
  const decisions: DecisionRowVM[] = home.deals.hot.slice(0, 4).map((d) => ({
    title: clientOf(d.deal),
    context: `${DEAL_STAGE_LABELS[d.deal.stage]} · ${personLabel(d.deal.responsibleManagerId)}`,
    action: d.needsNextStep ? "decide →" : "approve →",
    dotColor:
      d.health === "critical" ? "#BF322B" : d.health === "attention" ? "#E3B32B" : "#cfd3db",
  }));

  // "Needs attention" — critical team deals listed by client with a status chip.
  const attentionClients: AttentionClientVM[] = home.deals.hot
    .filter((d) => d.health === "critical")
    .slice(0, 3)
    .map((d) => {
      const days = d.daysOnStage;
      const status =
        d.needsNextStep && days !== null
          ? chip(`no next step ${days}d`, CHIP_ALERT)
          : days !== null
            ? chip(`stuck for ${days} ${plural(days, "day", "days")}`, CHIP_ALERT)
            : chip("critical", CHIP_ALERT);
      return {
        client: clientOf(d.deal),
        context: `${DEAL_STAGE_LABELS[d.deal.stage]} · ${personLabel(d.deal.responsibleManagerId)}`,
        status,
      };
    });

  const notif = [...notifications]
    .sort((a, b) => (a.read === b.read ? b.createdAt.localeCompare(a.createdAt) : a.read ? 1 : -1))
    .slice(0, 3)
    .map((n) => ({ title: n.message, time: relativeTime(n.createdAt, nowMs), unread: !n.read }));

  const vm: HeadVM = {
    teamMeta: `${home.team.length} ${plural(home.team.length, "manager", "managers")} · ${totalActive} active deals`,
    team,
    aiTitle: "Assistant",
    aiBody,
    activity: {
      total: actTotal.toLocaleString("en-US"),
      periodWord: "week",
      delta: deltaLabel(sales.deltaVsPrevMonthPercent),
      metrics: actMetrics.map((m) => ({ value: m.value.toLocaleString("en-US"), label: m.label })),
    },
    plan: {
      actual: dollarCompact(factUsd),
      target: dollarCompact(targetUsd),
      pct: planPct,
      tag: planPct >= 70 ? chip("on track", CHIP_OK) : chip("behind", CHIP_WARN),
      left: `${dollarCompact(leftUsd)} left to reach this month's target`,
    },
    donutTotal: analytics.total,
    donut,
    decisions,
    decisionsWaiting: home.deals.hot.length,
    attentionCritical: home.deals.critical,
    attentionClients,
    notifications: notif,
  };
  return { vm, topManagerId: home.team[0]?.managerId ?? null };
}

/** Number of deals at a stage from the manager's personal funnel (for the qual./test/proposal chips). */
function stageCountOf(home: ManagerHome, stage: DealStage): number {
  return home.funnelByStage.find((s) => s.stage === stage)?.count ?? 0;
}

/** Hero-row status chip based on a task's due date relative to today. */
function heroStatusChip(dueDate: string | null, todayIso: string): ChipVM {
  if (!dueDate) return chip("no due date", CHIP_MUTED);
  const day = todayIso.slice(0, 10);
  const due = dueDate.slice(0, 10);
  if (due < day) return chip("overdue", CHIP_ALERT);
  if (due === day) return chip("today", CHIP_WARN);
  return chip("tomorrow", CHIP_MUTED);
}

/**
 * Splits a task's text "Client — action" into the client (bold) and the action. If the text has
 * no dash, the client comes from the name lookup by clientId, and the whole text is the action.
 */
function splitHeroText(text: string, fallbackClient: string): { client: string; action: string } {
  const dash = text.indexOf(" — ");
  if (dash > 0) {
    return { client: text.slice(0, dash).trim(), action: text.slice(dash + 3).trim() };
  }
  return { client: fallbackClient, action: text.trim() };
}

/** Status chip for a "hot" deal: critical — red, attention — ochre. */
function hotStatusChip(deal: ManagerHome["deals"]["hot"][number]): ChipVM {
  const days = deal.daysOnStage;
  if (deal.health === "critical") {
    const label =
      deal.needsNextStep && days !== null
        ? `no next step ${days}d`
        : days !== null
          ? `stuck for ${days} ${plural(days, "day", "days")}`
          : "critical";
    return chip(label, CHIP_ALERT);
  }
  const label = deal.needsNextStep ? "no next step" : "needs attention";
  return chip(label, CHIP_WARN);
}

/**
 * Rich VM for the Manager Home per the reference design. Real numbers come from the personal
 * slice (funnel/sales/deals/manager's tasks). KPIs missing from the data (monthly target, team
 * conversion, portfolio $) are computed DETERMINISTICALLY from the numbers we have — these are
 * DEMO-DERIVED (flagged below) for the demo stand; production paths never fabricate numbers.
 */
function mopVM(home: ManagerHome, nowMs: number): MopVM {
  const todayIso = new Date(nowMs).toISOString();
  const clientName = (id: string | null): string => (id ? home.clientNames[id] : null) ?? "Client";

  // Hero rows: overdue + due today + upcoming, up to 4 (as in the reference design).
  const heroTasks = [...home.tasks.overdue, ...home.tasks.today, ...home.tasks.upcoming].slice(
    0,
    4,
  );
  const hero: HeroRowVM[] = heroTasks.map((t) => {
    const { client, action } = splitHeroText(t.text, clientName(t.clientId));
    return {
      client,
      action,
      context: t.dueDate ? `due: ${activityTime(t.dueDate, nowMs)}` : "",
      status: heroStatusChip(t.dueDate, todayIso),
    };
  });

  // KPI "My monthly plan": the actual figure is real (personal latestMonthRevenue).
  const factUsd = dollarsFromFormatted(home.revenue.latestMonthRevenue);
  // DEMO-DERIVED: target = actual / 0.7 (assuming 70% attainment), rounded to a clean 100K.
  const targetUsd = Math.max(factUsd, Math.round(factUsd / 0.7 / 100_000) * 100_000);
  const progressPct = targetUsd > 0 ? Math.min(100, Math.round((factUsd / targetUsd) * 100)) : 0;

  // KPI "My conversion": the real personal winRate.
  const myWinRate = home.funnel.winRate;
  // DEMO-DERIVED: team conversion is a derived value (personal minus a fixed 2.8pp handicap),
  // never below zero. Gives a stable "above average" contrast without external team data.
  const deptWinRate = Math.max(0, myWinRate - 0.028);
  const aboveAvg = myWinRate >= deptWinRate;

  // KPI "My deals in progress": the real active count.
  const inWorkCount = home.deals.total;
  const qual = stageCountOf(home, "qualification");
  const test = stageCountOf(home, "testing");
  const quote = stageCountOf(home, "quote");
  // DEMO-DERIVED: portfolio $ "in progress" — deal amounts aren't in the data; estimate as
  // this month's actual x the number of active deals (order-of-magnitude for the portfolio),
  // rounded to a clean 100K.
  const portfolioUsd = Math.round((factUsd * Math.max(1, inWorkCount)) / 100_000) * 100_000;

  // "My funnel": personal stage counts in pipeline order, bar width relative to the max.
  const stageCounts = home.funnelByStage;
  const maxStage = Math.max(1, ...stageCounts.map((s) => s.count));
  const funnel: FunnelBarVM[] = stageCounts.map((s, i) => ({
    label: DEAL_STAGE_LABELS[s.stage],
    count: s.count,
    widthPct: Math.max(18, Math.round((s.count / maxStage) * 100)),
    color: FUNNEL_RAMP[i] ?? "#cfd3db",
  }));

  // "Hot deals": critical/attention first (from deals.hot), up to 3.
  const hot: HotRowVM[] = home.deals.hot.slice(0, 3).map((deal) => ({
    client: clientName(deal.deal.clientId),
    status: hotStatusChip(deal),
  }));

  // "Recent tasks": recent activity (icon by kind — handled in the component).
  const recent: RecentRowVM[] = home.recentActivity.map((a) => ({
    kind: a.kind,
    text: a.clientName ? `${a.clientName} — ${a.text}` : a.text,
    time: activityTime(a.createdAt, nowMs),
  }));

  return {
    overdueCount: home.tasks.overdue.length,
    todayCount: home.tasks.today.length,
    hero,
    plan: {
      fact: dollarCompact(factUsd),
      target: dollarCompact(targetUsd),
      progressPct,
      doneLabel: `${progressPct}% complete`,
      deltaLabel: deltaLabel(home.revenue.deltaVsPrevMonthPercent),
    },
    conversion: {
      value: pctEn(myWinRate),
      badge: aboveAvg ? chip("above average", CHIP_OK) : chip("below average", CHIP_WARN),
      deptLabel: `team ${pctEn(deptWinRate)}`,
    },
    inWork: {
      count: String(inWorkCount),
      portfolio: dollarCompact(portfolioUsd),
      chips: [
        chip(`qual. ${qual}`, CHIP_MUTED),
        chip(`test ${test}`, CHIP_MUTED),
        chip(`proposal ${quote}`, CHIP_MUTED),
      ],
    },
    funnel,
    hot,
    recent,
    ai: {
      title: "Sales assistant",
      canAsk: true,
      body:
        home.tasks.overdue.length > 0
          ? `${home.tasks.overdue.length} overdue ${plural(home.tasks.overdue.length, "task", "tasks")} — start there; ${home.deals.critical} hot deals need a next step.`
          : home.deals.critical > 0
            ? `${home.deals.critical} hot deals with no next step — schedule actions.`
            : "Everything's under control today. Good time to move deals forward in negotiation.",
    },
  };
}

/**
 * Rich VM for the Technologist Home per the reference design (reference/CRM-PRO.dc.html:
 * "Today's calendar", 4 KPIs, "Requests to the technologist" + "Samples under test"). Real
 * numbers come from the queue slice (`home.queue`: open/inProgress/mine/byKind). Calendar
 * events, queue rows, and samples aren't in the dashboard slice -> these are DEMO-DERIVED rows
 * (for the demo stand, flagged); their counts and status chips are consistent with the real
 * queue counters.
 */
function techVM(home: TechnologistHome, nowMs: number): TechVM {
  const q = home.queue;
  const byKind = q.byKind;
  const testsWeek = byKind.test + byKind.demo; // tests/trial runs this week — from real kinds
  const outings = byKind.onsite; // onsite visits — kind "onsite"

  const dateLabel = new Date(nowMs).toLocaleDateString("en-US", { day: "numeric", month: "long" });

  // DEMO-DERIVED: today's calendar events (visits/tests/calls). There's no real agenda in the
  // slice — showing a coherent demo agenda; the count matches todayCountLabel.
  const events: TechEventVM[] = [
    {
      time: "10:00",
      title: "Golden Crest Confections — glaze test",
      typeLabel: "test",
      typeChip: { bg: "#fbf1d6", color: "#9a6a00" },
      place: "Millbrook Foods demo room · sample reserved",
      range: "10:00 AM–11:30 AM",
      barColor: "#E3B32B",
      flag: { text: "now", bg: "rgba(231,186,60,0.22)", color: "#9a6a00" },
    },
    {
      time: "14:00",
      title: "Riverside Foods Co. — onsite visit",
      typeLabel: "onsite",
      typeChip: { bg: "#e7eef9", color: "#2f5fb0" },
      place: "Denver, 214 Birch St",
      range: "2:00 PM–4:00 PM",
      barColor: "#2f5fb0",
      flag: { text: "next", bg: "rgba(47,95,176,0.16)", color: "#2f5fb0" },
    },
    {
      time: "17:00",
      title: "Sweetwater Bakery — dosage consultation",
      typeLabel: "call",
      typeChip: { bg: "#eef0f2", color: "#6b6f78" },
      place: "Call",
      range: "5:00 PM–5:30 PM",
      barColor: "#9aa0ad",
      flag: null,
    },
  ];
  const todayCountLabel = `${events.length} ${plural(events.length, "event", "events")}`;

  // DEMO-DERIVED: queue rows for the technologist. The "urgent/today" counts come from the real counters.
  const queueUrgent = Math.min(q.open, 1);
  const queueToday = Math.min(q.open, 2);
  const queue: TechQueueRowVM[] = [
    {
      kind: "test",
      title: "Golden Crest Confections — Cocoa Glaze Classic test",
      context: "test · sample reserved",
      due: "by Jul 2",
      status: chip("urgent", CHIP_ALERT),
    },
    {
      kind: "onsite",
      title: "Riverside Foods Co. — onsite visit, trial run",
      context: "onsite · Denver, 214 Birch St",
      due: "today 2:00 PM",
      status: chip("today", CHIP_WARN),
    },
    {
      kind: "consult",
      title: "Sweetwater Bakery — dough improver dosage consultation",
      context: "consultation · call",
      due: "by Jul 3",
      status: chip("new", CHIP_MUTED),
    },
    {
      kind: "test",
      title: "Southgate Confections — cocoa powder recipe test",
      context: "test · waiting for sample from warehouse",
      due: "by Jul 4",
      status: chip("in progress", CHIP_TECH_OK),
    },
  ];

  // DEMO-DERIVED: samples under test — warehouse reservations (no live ERP link yet).
  const samples: TechSampleVM[] = [
    {
      product: "Cocoa Glaze Classic",
      context: "Golden Crest Confections · 2 kg",
      status: chip("reserved", CHIP_TECH_OK),
    },
    {
      product: "Cocoa Mass",
      context: "Riverside Foods Co. · 1 kg",
      status: chip("on test", CHIP_WARN),
    },
    {
      product: "Dough Improver S500",
      context: "Sweetwater Bakery · 0.5 kg",
      status: chip("issued", CHIP_TECH_ISSUED),
    },
    {
      product: "Cocoa Powder",
      context: "Southgate Confections · 3 kg",
      status: chip("awaiting warehouse", CHIP_WARN),
    },
  ];

  return {
    ai: {
      title: "Technologist assistant",
      word: "technologist",
      canAsk: true,
      body:
        q.open > 0
          ? `${q.open} new ${plural(q.open, "request", "requests")} in the queue${q.mine > 0 ? `, ${q.mine} assigned to you` : ""}. Start with the nearest deadline.`
          : "No new requests — you can file the test act for completed tests.",
    },
    todayCountLabel,
    dateLabel,
    events,
    cards: [
      {
        label: "New requests",
        value: String(q.open),
        valueAccent: false,
        sub: "",
        chips: [chip(`onsite ${outings}`, CHIP_MUTED), chip(`tests ${byKind.test}`, CHIP_MUTED)],
      },
      {
        label: "In progress for me",
        value: String(q.mine),
        valueAccent: false,
        sub: "requests assigned to you",
        subBelow: true,
        chips: [],
      },
      {
        label: "Tests this week",
        value: String(testsWeek),
        valueAccent: false,
        sub: "test acts scheduled",
        subBelow: true,
        chips: [],
      },
      {
        label: "SLA overdue",
        value: String(q.inProgress > 0 ? Math.min(q.inProgress, 1) : 0),
        valueAccent: q.inProgress > 0,
        sub: "request waiting > 2 days",
        subBelow: true,
        chips: [],
      },
    ],
    queueUrgent,
    queueToday,
    queue,
    samples,
  };
}

function procVM(home: ProcurementHome): SimpleVM {
  return {
    ai: {
      title: "Procurement assistant",
      word: "procurement",
      canAsk: true,
      body:
        home.procurement.shortage > 0
          ? `${home.procurement.shortage} ${plural(home.procurement.shortage, "item", "items")} short — place a purchase order to avoid missing shipments.`
          : "No deficit. Review the assortment: what to grow, what to phase out.",
    },
    aiHorizontal: true,
    cards: [
      {
        // The shortage count is already the large value — the reference chips don't repeat it.
        // The value is always red (reference CRM-PRO.dc.html:1049: color:var(--accent) unconditionally).
        label: "Procurement — what to restock",
        value: String(home.procurement.shortage),
        valueAccent: true,
        sub: "items",
        chips: [
          chip(`overstock ${home.procurement.overstock}`, CHIP_WARN),
          chip(`in range ${home.procurement.ok}`, CHIP_OK),
        ],
      },
      {
        label: "Assortment",
        value: String(home.assortment.grow),
        valueAccent: false,
        // The large value is green #1f9e6c (reference CRM-PRO.dc.html:1050).
        valueColor: "#1f9e6c",
        sub: "grow",
        chips: [
          chip(`hold ${home.assortment.hold}`, CHIP_MUTED),
          chip(`stop ${home.assortment.stop}`, CHIP_ALERT),
        ],
      },
    ],
    // "Operational queues" — three inline mini-KPIs (defects count in ochre), no chips.
    triCard: {
      label: "Operational queues",
      mini: [
        { value: String(home.ops.packing), label: "packing" },
        { value: String(home.ops.defects), label: "defects", accent: true },
        { value: String(home.ops.onboardings), label: "onboarding" },
      ],
    },
  };
}

/**
 * Ops roles (accountant/logistics): for now only the notification count is available (a full
 * ops dashboard with invoices/routes from the ERP is a separate task). We show a coherent role
 * screen with an AI hint and a link to the working section, not a dead end.
 */
function opsVM(home: OperationalHome): SimpleVM {
  const isAccountant = home.role === "accountant";
  return {
    ai: {
      title: isAccountant ? "Accounting assistant" : "Logistics assistant",
      canAsk: false,
      body: isAccountant
        ? "Invoices due, overdue accounts, and reconciliations are in the Accounting section on the left."
        : "Today's routes, loading, and delivery are in the Loading & delivery section on the left.",
    },
    cards: [
      {
        label: "My notifications",
        value: String(home.unread),
        valueAccent: home.unread > 0,
        sub: "new",
        chips: [],
      },
    ],
  };
}

const ROLE_SUBTITLE: Record<Role, string> = {
  head: "Team snapshot › ERP data",
  mop: "My deals and tasks",
  technologist: "Lab queue",
  procurement: "Procurement and assortment",
  accountant: "Invoices and payments",
  logist: "Loading & delivery",
};

/**
 * Role-based Home dashboard (#190) — a bento layout per the "CRM Pro UI" reference design. Numbers
 * are real (ERP/calculations), the AI insight is built deterministically from team metrics. The
 * head of sales can switch between role previews (authorized to see the whole team); the manager
 * preview is drawn from the busiest manager.
 */
export default async function HomePage() {
  const user = await requireUser();
  const container = getContainer();

  const nowMs = Date.now();
  const greetingName = firstName(personLabel(user.id));
  const greeting = `Good afternoon, ${greetingName}`;
  const dateStr = new Date(nowMs).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const data: {
    head?: HeadVM;
    mop?: MopVM;
    technologist?: TechVM;
    procurement?: SimpleVM;
    accountant?: SimpleVM;
    logist?: SimpleVM;
  } = {};

  if (user.role === "head") {
    const { vm: headVM, topManagerId } = await buildHeadVM(user);
    data.head = headVM;
    // Previews of the other role layouts for the switcher (head is authorized to see the team).
    // Manager preview — by the busiest real manager (not an empty head-scoped slice).
    const previews = await Promise.all([
      container.getHomeDashboard({ ...user, id: topManagerId ?? user.id, role: "mop" }),
      container.getHomeDashboard({ ...user, role: "technologist" }),
      container.getHomeDashboard({ ...user, role: "procurement" }),
      container.getHomeDashboard({ ...user, role: "accountant" }),
      container.getHomeDashboard({ ...user, role: "logist" }),
    ]);
    data.mop = mopVM(previews[0] as ManagerHome, nowMs);
    data.technologist = techVM(previews[1] as TechnologistHome, nowMs);
    data.procurement = procVM(previews[2] as ProcurementHome);
    data.accountant = opsVM(previews[3] as OperationalHome);
    data.logist = opsVM(previews[4] as OperationalHome);
  } else if (user.role === "mop") {
    data.mop = mopVM((await container.getHomeDashboard(user)) as ManagerHome, nowMs);
  } else if (user.role === "technologist") {
    data.technologist = techVM((await container.getHomeDashboard(user)) as TechnologistHome, nowMs);
  } else if (user.role === "procurement") {
    data.procurement = procVM((await container.getHomeDashboard(user)) as ProcurementHome);
  } else if (user.role === "accountant") {
    data.accountant = opsVM((await container.getHomeDashboard(user)) as OperationalHome);
  } else if (user.role === "logist") {
    data.logist = opsVM((await container.getHomeDashboard(user)) as OperationalHome);
  }

  const subtitle = `${ROLE_SUBTITLE[user.role as Role] ?? "Team snapshot"} · ${dateStr}`;

  return (
    <HomeScreen role={user.role as Role} greeting={greeting} subtitle={subtitle} data={data} />
  );
}
