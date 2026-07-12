import { describe, expect, it } from "vitest";
import { clientPriority } from "./client-priority";

describe("clientPriority", () => {
  it("derives priority from the ABC category", () => {
    expect(clientPriority("A")).toBe("high");
    expect(clientPriority("B")).toBe("medium");
    expect(clientPriority("C")).toBe("low");
  });
});
