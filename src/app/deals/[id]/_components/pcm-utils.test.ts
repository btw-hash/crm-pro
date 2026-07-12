import { describe, expect, it } from "vitest";
import { downsample, floatToPcm16, mergeFloat32 } from "./pcm-utils";

describe("mergeFloat32", () => {
  it("concatenates chunks in order", () => {
    const out = mergeFloat32([new Float32Array([1, 2]), new Float32Array([3])]);
    expect(Array.from(out)).toEqual([1, 2, 3]);
  });

  it("empty list → empty array", () => {
    expect(mergeFloat32([]).length).toBe(0);
  });
});

describe("downsample", () => {
  it("48000→16000 gives a third of the length and preserves a constant signal's value", () => {
    const input = new Float32Array(48_000).fill(0.5);
    const out = downsample(input, 48_000, 16_000);
    expect(out.length).toBe(16_000);
    expect(out[0]).toBeCloseTo(0.5);
    expect(out[15_999]).toBeCloseTo(0.5);
  });

  it("targetRate >= inputRate → array unchanged", () => {
    const input = new Float32Array([0.1, 0.2]);
    expect(downsample(input, 16_000, 16_000)).toBe(input);
  });
});

describe("floatToPcm16", () => {
  it("encodes as 16-bit LE with out-of-range clipping", () => {
    const buffer = floatToPcm16(new Float32Array([0, 1, -1, 2]));
    const view = new DataView(buffer);
    expect(buffer.byteLength).toBe(8);
    expect(view.getInt16(0, true)).toBe(0);
    expect(view.getInt16(2, true)).toBe(0x7fff); // 1 → maximum
    expect(view.getInt16(4, true)).toBe(-0x8000); // -1 → minimum
    expect(view.getInt16(6, true)).toBe(0x7fff); // 2 clips to maximum
  });
});
