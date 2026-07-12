import { describe, expect, it } from "vitest";
import { PALETTE_COMMANDS, matchQuery, matchingCommands } from "./command-palette-search";

describe("matchQuery", () => {
  it("case-insensitive substring match", () => {
    expect(matchQuery("Croissant & Co Bakery", "croiss")).toBe(true);
    expect(matchQuery("Croissant & Co Bakery", "CROISS")).toBe(true);
    expect(matchQuery("Croissant & Co Bakery", "muffin")).toBe(false);
  });

  it("an empty query matches everything", () => {
    expect(matchQuery("anything at all", "")).toBe(true);
    expect(matchQuery("anything at all", "   ")).toBe(true);
  });
});

describe("matchingCommands", () => {
  it("filters commands by query", () => {
    const hits = matchingCommands("analyt");
    expect(hits).toHaveLength(1);
    expect(hits[0]?.id).toBe("go-analytics");
  });

  it("an empty query — all commands", () => {
    expect(matchingCommands("")).toHaveLength(PALETTE_COMMANDS.length);
  });

  it("all commands lead to existing sections", () => {
    for (const command of PALETTE_COMMANDS) {
      expect(command.href.startsWith("/")).toBe(true);
      expect(command.kind).toBe("command");
    }
  });
});
