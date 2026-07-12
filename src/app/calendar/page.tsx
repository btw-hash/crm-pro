import { redirect } from "next/navigation";
import { makeId } from "@/domain/shared/id";
import { canSeeTechQueue } from "@/domain/shared/role";
import { type TechRequestKind } from "@/domain/tech-request/tech-request";
import { requireUser } from "@/infrastructure/config/current-user";
import { getContainer } from "@/infrastructure/composition-root";
import { CalendarView, type CalendarEvent, type CalendarDay } from "./_components/calendar-view";

// Time-grid hour scale: 08:00-20:00 (for deterministic time layout).
const TC_DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const TC_MON = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const pad2 = (n: number): string => (n < 10 ? `0${n}` : `${n}`);
const isoOf = (d: Date): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/**
 * Technologist calendar — a weekly/daily planner for tests/site visits/consultations tied
 * to active requests from the tech queue. A section from the design (nav idx19, role
 * technologist); the head of sales can also open it for an overview. Request/client data
 * comes from the ERP circuit.
 *
 * Server component: loads requests/clients (RBAC), computes the days of the week and maps
 * requests to events (a deterministic demo derivative), then passes them to the client
 * <CalendarView>, where all the interactivity lives (the Week/Day switcher, event
 * selection, the new-event form, wrap-up with voice dictation). onClick/useState are not
 * allowed in a server component.
 *
 * Note on the data: a tech request in the ERP has no specific meeting time/place attached
 * (only a `deadline`). The event's start hour, duration, place, and note are a
 * deterministic demo derivative of the request's fields (id/kind), see tcSlot(): once a
 * real schedule exists in the backend, these values will come from there — the
 * presentation stays the same.
 */
export default async function CalendarPage() {
  const user = await requireUser();
  if (!canSeeTechQueue(user.role)) {
    redirect("/");
  }
  const container = getContainer();
  const [requests, clients] = await Promise.all([
    container.listOpenTechRequests(),
    container.listClients(user),
  ]);
  const clientName = new Map(clients.map((c) => [c.id, c.name]));

  // The week containing "today": Monday is the start, 7 day columns.
  const now = new Date();
  const todayIso = isoOf(now);
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const days: CalendarDay[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const iso = isoOf(d);
    return {
      dow: TC_DOW[i] as string,
      dd: d.getDate(),
      mon: d.getMonth(),
      iso,
      today: iso === todayIso,
      weekend: i >= 5,
    };
  });
  const first = days[0];
  const last = days[6];
  const weekLabel =
    first && last ? `${first.dd} ${TC_MON[first.mon]} — ${last.dd} ${TC_MON[last.mon]}` : "";

  // Deterministic demo layout of a request in time: start hour 09..16 and duration 1..3h
  // are derived from a stable hash of the id (a request has no time in the ERP).
  const durByKind: Record<TechRequestKind, number> = {
    onsite: 3,
    audit_req: 3,
    demo: 2,
    consult: 1,
    test: 2,
  };
  // Demo event place by request kind (a request in the ERP has no meeting address).
  const placeByKind: Record<TechRequestKind, string> = {
    onsite: "Client's production site",
    audit_req: "Client's site",
    demo: "CRM Pro lab",
    consult: "Phone / video call",
    test: "CRM Pro lab",
  };
  const hashOf = (id: string): number => {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return h;
  };
  const tcSlot = (id: string, kind: TechRequestKind): { start: number; dur: number } => {
    const start = 9 + (hashOf(id) % 8); // 09:00 … 16:00
    return { start, dur: durByKind[kind] };
  };

  // Lay out active requests across the days of the week: the day comes from the deadline
  // (if it falls within the current week), otherwise we distribute them stably by request index.
  const events: CalendarEvent[] = requests.map((req, i) => {
    let dayIdx = i % 7;
    if (req.deadline) {
      const found = days.findIndex((d) => d.iso === (req.deadline ?? "").slice(0, 10));
      if (found >= 0) dayIdx = found;
    }
    const { start, dur } = tcSlot(req.id, req.kind);
    return {
      id: req.id,
      title: clientName.get(makeId(req.clientId)) ?? req.clientId,
      kind: req.kind,
      iso: days[dayIdx]?.iso ?? todayIso,
      start,
      dur,
      place: placeByKind[req.kind],
      // Note — the tech request's note (its purpose), a demo derivative.
      note: req.note,
    };
  });

  return (
    <div className="scr">
      {/* All calendar interactivity (Week/Day switcher, event selection, the form,
          wrap-up with voice dictation) lives in the client component. The screen title
          renders inside CalendarView so it sits in the same flex row as the action
          block (navigator/switcher/"Schedule"), matching the design reference. */}
      <CalendarView
        title="Calendar"
        breadcrumb="My schedule · consultations, site visits, audits and demos"
        days={days}
        events={events}
        weekLabel={weekLabel}
        todayIso={todayIso}
      />
    </div>
  );
}
