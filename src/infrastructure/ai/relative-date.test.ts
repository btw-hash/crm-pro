import { describe, expect, it } from "vitest";
import { resolveRelativeDueDate } from "./relative-date";

// Fixed "today" — Tuesday, June 30, 2026. All expectations are deterministic.
const TODAY = new Date(2026, 5, 30);

/** Parses "YYYY-MM-DD" into local midnight (for checking weekday and offset). */
function parseIso(iso: string): Date {
  const [y = 0, m = 1, d = 1] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Offset of the result from today, in days. */
function gapDays(iso: string): number {
  const start = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
  return Math.round((parseIso(iso).getTime() - start.getTime()) / 86_400_000);
}

describe("resolveRelativeDueDate", () => {
  describe("today / tomorrow / the day after tomorrow", () => {
    it('"tomorrow" -> +1 day', () => {
      expect(resolveRelativeDueDate("tomorrow call Marina at 5 pm", TODAY)).toBe("2026-07-01");
    });

    it('"the day after tomorrow" -> +2 days (not confused by the "tomorrow" substring)', () => {
      expect(resolveRelativeDueDate("the day after tomorrow send the proposal", TODAY)).toBe(
        "2026-07-02",
      );
    });

    it('"today" -> the same day', () => {
      expect(resolveRelativeDueDate("today call the client back", TODAY)).toBe("2026-06-30");
    });

    it("a false hit inside another word is not counted (word boundary)", () => {
      // Intentionally not covered — null is better (the human sets it) than a wrong date.
      expect(resolveRelativeDueDate("posted about Tomorrowland tickets", TODAY)).toBeNull();
    });
  });

  describe('"in N ..."', () => {
    it('"in a week" (no number) -> +7', () => {
      expect(resolveRelativeDueDate("let's talk in a week", TODAY)).toBe("2026-07-07");
    });

    it('"in 3 days" (digit) -> +3', () => {
      expect(resolveRelativeDueDate("remind me in 3 days", TODAY)).toBe("2026-07-03");
    });

    it('"in two days" (word) -> +2', () => {
      expect(resolveRelativeDueDate("drop by in two days", TODAY)).toBe("2026-07-02");
    });

    it('"in 2 weeks" -> +14', () => {
      expect(resolveRelativeDueDate("in 2 weeks check in", TODAY)).toBe("2026-07-14");
    });

    it('"in a month" -> +1 month', () => {
      expect(resolveRelativeDueDate("come back to this in a month", TODAY)).toBe("2026-07-30");
    });

    it('"in a day" -> +1', () => {
      expect(resolveRelativeDueDate("call back in a day", TODAY)).toBe("2026-07-01");
    });
  });

  describe("weekdays (nearest future)", () => {
    it.each([
      ["on monday", 1],
      ["on tuesday", 2],
      ["on wednesday", 3],
      ["on thursday", 4],
      ["on friday", 5],
      ["on saturday", 6],
      ["on sunday", 0],
    ])('"%s" -> the nearest future occurrence of that weekday', (phrase, dow) => {
      const iso = resolveRelativeDueDate(`we need to ${phrase} send the invoice`, TODAY);
      expect(iso).not.toBeNull();
      expect(parseIso(iso as string).getDay()).toBe(dow);
      const gap = gapDays(iso as string);
      expect(gap).toBeGreaterThan(0);
      expect(gap).toBeLessThanOrEqual(7);
    });

    it('"by" and "before" markers are also recognized', () => {
      expect(resolveRelativeDueDate("by friday prepare it", TODAY)).toBe(
        resolveRelativeDueDate("on friday prepare it", TODAY),
      );
      expect(
        resolveRelativeDueDate("before wednesday I'll send the invoice", TODAY),
      ).not.toBeNull();
    });

    it("a weekday with no leading marker is not matched (avoids false hits)", () => {
      expect(resolveRelativeDueDate("we discussed Wednesday's specials", TODAY)).toBeNull();
    });
  });

  describe("a specific calendar date", () => {
    it('"July 5th" (hasn\'t happened yet) -> this year', () => {
      expect(resolveRelativeDueDate("invoice due july 5th", TODAY)).toBe("2026-07-05");
    });

    it('"March 15th" (already passed) -> next year', () => {
      expect(resolveRelativeDueDate("annual review march 15th", TODAY)).toBe("2027-03-15");
    });

    it('"May 5th" parses fine (no ambiguity with the modal "may")', () => {
      expect(resolveRelativeDueDate("meeting may 5th", TODAY)).toBe("2027-05-05");
    });

    it('"the 5th" -> nearest future day-of-month', () => {
      expect(resolveRelativeDueDate("payment due on the 5th", TODAY)).toBe("2026-07-05");
    });
  });

  describe("no future due date -> null", () => {
    it('only a time of day ("at 5 pm") is not a date', () => {
      expect(resolveRelativeDueDate("call kent at 5 pm", TODAY)).toBeNull();
    });

    it('the past ("yesterday") doesn\'t give a due date', () => {
      expect(resolveRelativeDueDate("we spoke yesterday about pricing", TODAY)).toBeNull();
    });

    it("empty / no markers -> null", () => {
      expect(resolveRelativeDueDate("the client is still thinking", TODAY)).toBeNull();
      expect(resolveRelativeDueDate("", TODAY)).toBeNull();
    });

    it('"get in touch soon" — not a due date (no time unit)', () => {
      expect(resolveRelativeDueDate("get in touch soon", TODAY)).toBeNull();
    });
  });

  describe("future takes priority over past in the same sentence", () => {
    it('"we spoke yesterday, I\'ll send the proposal tomorrow" -> tomorrow', () => {
      expect(
        resolveRelativeDueDate("we spoke yesterday, I'll send the proposal tomorrow", TODAY),
      ).toBe("2026-07-01");
    });
  });

  it("input is case-insensitive", () => {
    expect(resolveRelativeDueDate("TOMORROW call Marina", TODAY)).toBe("2026-07-01");
  });

  describe("dates that don't exist -> null (never invented)", () => {
    it('"February 30th" -> null (not a JS-overflow March 2nd)', () => {
      expect(resolveRelativeDueDate("payment due february 30th", TODAY)).toBeNull();
    });

    it('"April 31st" -> null (April has 30 days)', () => {
      expect(resolveRelativeDueDate("shipment april 31st", TODAY)).toBeNull();
    });

    it('"the 31st" -> the nearest month that has a 31st (July), not August 1st', () => {
      // Today is June 30 (30 days) -> the nearest 31st is July 31.
      expect(resolveRelativeDueDate("close it by the 31st", TODAY)).toBe("2026-07-31");
    });
  });

  describe("addMonths: clamps the day to the month length (no overflow)", () => {
    it('"in a month" from January 31st -> February 28th, not March 3rd', () => {
      const jan31 = new Date(2026, 0, 31);
      expect(resolveRelativeDueDate("call back in a month", jan31)).toBe("2026-02-28");
    });

    it('"in 2 months" from December 31st -> February 28th', () => {
      const dec31 = new Date(2025, 11, 31);
      expect(resolveRelativeDueDate("get back to me in 2 months", dec31)).toBe("2026-02-28");
    });
  });

  describe('markers "by"/"before" and the "next" qualifier', () => {
    it('"by Tuesday" === "on Tuesday"', () => {
      expect(resolveRelativeDueDate("by tuesday prepare it", TODAY)).toBe(
        resolveRelativeDueDate("on tuesday prepare it", TODAY),
      );
    });

    it('"before Friday" is recognized as the nearest Friday', () => {
      const iso = resolveRelativeDueDate("before friday I'll send the invoice", TODAY);
      expect(iso).not.toBeNull();
      expect(parseIso(iso as string).getDay()).toBe(5);
    });

    it('"next Tuesday" is recognized (the nearest Tuesday), not null', () => {
      const iso = resolveRelativeDueDate("let's talk next tuesday", TODAY);
      expect(iso).not.toBeNull();
      expect(parseIso(iso as string).getDay()).toBe(2);
      const g = gapDays(iso as string);
      expect(g).toBeGreaterThan(0);
      expect(g).toBeLessThanOrEqual(7);
    });

    it('"next week" -> Monday of next week', () => {
      const iso = resolveRelativeDueDate("next week I'll send the proposal", TODAY);
      expect(iso).not.toBeNull();
      expect(parseIso(iso as string).getDay()).toBe(1);
    });
  });

  describe("weekday false hit with no leading marker is suppressed", () => {
    it('a bare mention ("Wednesday\'s specials") -> null', () => {
      expect(resolveRelativeDueDate("we discussed wednesday's specials", TODAY)).toBeNull();
    });

    it('"on Wednesday" is still recognized as Wednesday', () => {
      const iso = resolveRelativeDueDate("on wednesday we have a call", TODAY);
      expect(iso).not.toBeNull();
      expect(parseIso(iso as string).getDay()).toBe(3);
    });
  });

  describe('"in" — approximate phrasing and fractions don\'t drop the due date', () => {
    it('"in a week and a half" -> +11 days', () => {
      expect(resolveRelativeDueDate("we'll be back in a week and a half", TODAY)).toBe(
        "2026-07-11",
      );
    });

    it('"in about a month" -> +1 month (an approximate word ~ 1)', () => {
      expect(resolveRelativeDueDate("remind me in about a month", TODAY)).toBe("2026-07-30");
    });

    it('"in a few days" -> +1 day (the due date is not dropped)', () => {
      expect(resolveRelativeDueDate("drop by in a few days", TODAY)).toBe("2026-07-01");
    });
  });
});
