import { describe, expect, it } from "vitest";
import {
  buildSnippet,
  CONVERSATION_TITLE_MAX_LENGTH,
  deriveConversationTitle,
} from "./conversation";

describe("deriveConversationTitle", () => {
  it("a short question becomes the title as-is", () => {
    expect(deriveConversationTitle("What's stuck?")).toBe("What's stuck?");
  });

  it("trims a long question at a word boundary with an ellipsis", () => {
    const long = "Show all deals that are stuck without a next step for manager Smith right now";
    const title = deriveConversationTitle(long);
    expect(title.endsWith("…")).toBe(true);
    // The length without the ellipsis stays within the limit and doesn't cut the last word.
    expect(title.length).toBeLessThanOrEqual(CONVERSATION_TITLE_MAX_LENGTH + 1);
    expect(long.startsWith(title.slice(0, -1).trimEnd())).toBe(true);
  });

  it("takes only the first line of a multi-line question", () => {
    expect(deriveConversationTitle("First question\nsecond line")).toBe("First question");
  });

  it("an empty/blank question falls back to a placeholder title", () => {
    expect(deriveConversationTitle("   ")).toBe("Untitled");
    expect(deriveConversationTitle("")).toBe("Untitled");
  });
});

describe("buildSnippet", () => {
  it("trims text around the first match of the query (case-insensitive)", () => {
    const text = "The funnel has 12 deals total, 7 active, 3 won.";
    const snippet = buildSnippet(text, "ACTIVE", 10);
    expect(snippet.toLowerCase()).toContain("active");
    expect(snippet.startsWith("…")).toBe(true);
  });

  it("returns the start of the text when there is no match", () => {
    const text = "Short text without a match.";
    expect(buildSnippet(text, "nomatch")).toBe(text);
  });

  it("an empty query returns the start of the text", () => {
    expect(buildSnippet("Hello world", "")).toBe("Hello world");
  });

  it("collapses line breaks into spaces", () => {
    expect(buildSnippet("line1\n\nline2", "line2", 20)).not.toContain("\n");
  });
});
