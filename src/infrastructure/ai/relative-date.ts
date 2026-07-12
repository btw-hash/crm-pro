/**
 * Deterministic parser of the "next step" due date out of a voice transcript into an
 * ISO date (YYYY-MM-DD), relative to a given "today" date.
 *
 * The source of truth for the date is this CODE, not the LLM: the project's principle
 * is "the AI never invents numbers/dates" (CLAUDE.md). The day is computed
 * deterministically from what was said, and a human confirms it in the form (passive
 * capture). Returns null if the text has no recognizable FUTURE due date (only a past
 * "yesterday", or a bare time of day with no day) OR the date doesn't exist ("February
 * 30th") — better empty than an invented day.
 *
 * Covers the common phrasings of voice input (STT usually returns digits and standard
 * words):
 *  - today / tomorrow / the day after tomorrow;
 *  - "next week" (no specific day) -> Monday of next week;
 *  - "in N days|weeks|months" (N as a digit or a word 1-10, "a"/"an" = 1, "a week and a
 *    half"/"a month and a half"; an unrecognized approximate word ("a few", "about") is
 *    treated as 1 rather than dropping the due date);
 *  - weekday names with a leading marker (on/by/before/next), e.g. "next Tuesday" ->
 *    the nearest future occurrence of that day;
 *  - "<Month> <D>" ("July 5th") and "the <D>th" (day-of-month only) -> nearest future.
 * Time of day (hours) is NOT part of the date — it stays in the next-step text.
 *
 * Note: the due date is searched for across the WHOLE transcript (enough for a typical
 * single-task dictation like "tomorrow call Marina"). In the rare multi-clause
 * utterance with two different dates, the first recognized future date wins — the
 * human corrects it in the form.
 */
export function resolveRelativeDueDate(text: string, today: Date): string | null {
  const t = ` ${normalize(text)} `;

  // Order matters: "the day after tomorrow" contains the substring "tomorrow", so it's
  // checked first.
  if (/\bthe day after tomorrow\b/.test(t)) return addDays(today, 2);
  if (/\btomorrow\b/.test(t)) return addDays(today, 1);
  if (/\btoday\b/.test(t)) return addDays(today, 0);

  // "next week" (no specific day) -> Monday of the nearest future week.
  if (/\bnext week\b/.test(t)) return nextWeekday(today, 1);

  // "in N <unit>": the number is optional (absent = 1), unit is day/week/month.
  const through = t.match(/\bin\s+(?:(\d+|[a-z]+)\s+)?(day|week|month)s?\b(\s+and\s+a\s+half)?/);
  if (through) {
    const token = through[1];
    const unit = through[2];
    const half = through[3];
    if (half) {
      if (unit === "week") return addDays(today, 11);
      if (unit === "month") return addDays(today, 45);
      return addDays(today, 2);
    }
    const parsed = parseCount(token);
    // An unrecognized approximate word ("about", hedges) doesn't drop the due date: ~1.
    const n = parsed === null ? 1 : parsed;
    if (unit === "week") return addDays(today, 7 * n);
    if (unit === "month") return addMonths(today, n);
    return addDays(today, n);
  }

  const weekday = matchWeekday(t);
  if (weekday !== null) return nextWeekday(today, weekday);

  // "<Month> <D>": "July 5th", "March 15". null if the date doesn't exist in the month
  // ("April 31st").
  const dm = t.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/,
  );
  if (dm) {
    const stem = dm[1];
    const day = Number(dm[2]);
    const month = stem ? MONTH_INDEX[stem] : undefined;
    if (month !== undefined && day >= 1 && day <= 31) return nextDayMonth(today, day, month);
  }

  // "the <D>th": a day-of-month with no named month ("the 5th", "the 31st"). null if
  // that day doesn't exist in the month it would fall back to.
  const dn = t.match(/\bthe\s+(\d{1,2})(?:st|nd|rd|th)\b/);
  if (dn) {
    const day = Number(dn[1]);
    if (day >= 1 && day <= 31) return nextDayOfMonth(today, day);
  }

  return null;
}

/** Lowercases the text and collapses multi-word approximate quantifiers to one token. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/\ba couple of\b/g, "couple")
    .replace(/\ba couple\b/g, "couple")
    .replace(/\ba few\b/g, "few")
    .replace(/\babout an?\b/g, "about");
}

/** Count word for "in N ...": a digit, or a word 1-10; undefined -> 1; otherwise null. */
function parseCount(token: string | undefined): number | null {
  if (token === undefined) return 1;
  if (/^\d+$/.test(token)) {
    const n = Number(token);
    return n > 0 && n < 366 ? n : null;
  }
  return WORD_COUNT[token] ?? null;
}

const WORD_COUNT: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  couple: 2,
  pair: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

/** Month stem (as captured from the text) -> month index (0-11). */
const MONTH_INDEX: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

/** Weekday name -> Date.getDay() index (0=Sun, 1=Mon ... 6=Sat). */
const WEEKDAY_INDEX: Record<string, number> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 0,
};

/**
 * A weekday name with a leading marker (on/by/before/next) and an optional "next"
 * qualifier. Requiring a leading marker avoids false hits on a bare mention of a
 * weekday inside an unrelated sentence ("we discussed Wednesday's specials").
 */
const WEEKDAY_RE =
  /\b(?:on|by|before|next)\s+(?:next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/;

function matchWeekday(t: string): number | null {
  const m = t.match(WEEKDAY_RE);
  return m && m[1] ? (WEEKDAY_INDEX[m[1]] ?? null) : null;
}

/** Nearest future weekday (the same day as today -> next week). */
function nextWeekday(today: Date, targetDow: number): string {
  const diff = (targetDow - today.getDay() + 7) % 7;
  return addDays(today, diff === 0 ? 7 : diff);
}

/** Nearest future "<Month> D"; null if that date doesn't exist in the month ("April 31st"). */
function nextDayMonth(today: Date, day: number, month: number): string | null {
  const year = today.getFullYear();
  const thisYear = validDate(year, month, day);
  if (thisYear && !beforeToday(thisYear, today)) return fmt(thisYear);
  const nextYear = validDate(year + 1, month, day);
  return nextYear ? fmt(nextYear) : null;
}

/** Nearest future day-of-month; null if that day doesn't exist in the fallback month ("the 31st" in June). */
function nextDayOfMonth(today: Date, day: number): string | null {
  const y = today.getFullYear();
  const m = today.getMonth();
  const thisMonth = validDate(y, m, day);
  if (thisMonth && !beforeToday(thisMonth, today)) return fmt(thisMonth);
  const nextMonth = validDate(y, m + 1, day);
  return nextMonth ? fmt(nextMonth) : null;
}

/**
 * A Date for year/month/day, or null if the day "overflowed" into the next month (a
 * date that doesn't exist, like February 30th / April 31st). JS Date silently
 * normalizes overflow — caught here by checking getDate().
 */
function validDate(year: number, month: number, day: number): Date | null {
  const d = new Date(year, month, day);
  return d.getDate() === day ? d : null;
}

function beforeToday(cand: Date, today: Date): boolean {
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return cand.getTime() < startOfToday.getTime();
}

function addDays(today: Date, n: number): string {
  return fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate() + n));
}

/** +N months, clamping the day to the target month's length (Jan 31 + 1 month -> Feb 28/29, not Mar 3). */
function addMonths(today: Date, n: number): string {
  const year = today.getFullYear();
  const month = today.getMonth() + n;
  const lastDay = new Date(year, month + 1, 0).getDate();
  return fmt(new Date(year, month, Math.min(today.getDate(), lastDay)));
}

/** Local date -> "YYYY-MM-DD" (no UTC shift: compatible with input[type=date]). */
function fmt(date: Date): string {
  const pad = (x: number): string => String(x).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
