"use client";

import { useLayoutEffect, useRef } from "react";

export interface ParsedNumber {
  readonly prefix: string;
  readonly target: number;
  readonly decimals: number;
  readonly grouped: boolean;
  readonly suffix: string;
}

/** Splits "$374,530.00" or "1,040 kg" into the number and the text around it. */
export function parseNumber(text: string): ParsedNumber | null {
  const m = /^([^\d-]*)(-?\d[\d,]*(?:\.\d+)?)(.*)$/s.exec(text);
  if (!m) return null;
  const [, prefix = "", raw = "", suffix = ""] = m;
  const target = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(target)) return null;
  const dot = raw.indexOf(".");
  return {
    prefix,
    target,
    decimals: dot === -1 ? 0 : raw.length - dot - 1,
    grouped: raw.includes(","),
    suffix,
  };
}

export function formatNumber(p: ParsedNumber, value: number): string {
  const body = p.grouped
    ? value.toLocaleString("en-US", {
        minimumFractionDigits: p.decimals,
        maximumFractionDigits: p.decimals,
      })
    : value.toFixed(p.decimals);
  return p.prefix + body + p.suffix;
}

/**
 * A figure that counts up to its value when it first appears. The server renders
 * the final text, so without JavaScript, and under reduced motion, nothing changes.
 */
export function CountUp({ value, duration = 900 }: { value: string | number; duration?: number }) {
  const text = String(value);
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const parsed = parseNumber(text);
    if (!el || !parsed || parsed.target === 0) return;
    if (typeof window.matchMedia !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let start: number | null = null;
    el.textContent = formatNumber(parsed, 0);
    const step = (now: number) => {
      start ??= now;
      const k = Math.min(1, (now - start) / duration);
      if (k === 1) {
        el.textContent = text;
        return;
      }
      el.textContent = formatNumber(parsed, parsed.target * (1 - Math.pow(1 - k, 3)));
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      el.textContent = text;
    };
  }, [text, duration]);

  return (
    <span ref={ref} style={{ fontVariantNumeric: "tabular-nums" }}>
      {text}
    </span>
  );
}
