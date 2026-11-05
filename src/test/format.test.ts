import { describe, expect, it } from "vitest";
import { initials, pct, pct0, seriesFromMap, signed } from "../lib/format";

describe("probability formatting", () => {
  it("formats with one decimal", () => {
    expect(pct(0.6123)).toBe("61.2%");
    expect(pct(0.5)).toBe("50.0%");
    expect(pct0(0.6149)).toBe("61%");
  });
  it("never shows impossible certainty", () => {
    expect(pct(0.99999)).toBe("99.9%");
    expect(pct(0.00001)).toBe("0.1%");
    expect(pct(1)).toBe("100.0%");
    expect(pct(0)).toBe("0.0%");
  });
  it("handles bad input", () => {
    expect(pct(NaN)).toBe("50.0%");
    expect(pct(2)).toBe("100.0%");
  });
  it("signs numbers", () => {
    expect(signed(1.234)).toBe("+1.23");
    expect(signed(-1.234)).toBe("-1.23");
  });
  it("series odds are symmetric and monotone", () => {
    for (const bo of [1, 3, 5] as const) {
      expect(seriesFromMap(0.5, bo)).toBeCloseTo(0.5, 10);
      expect(seriesFromMap(0.62, bo) + seriesFromMap(0.38, bo)).toBeCloseTo(1, 10);
    }
    expect(seriesFromMap(0.6, 5)).toBeGreaterThan(seriesFromMap(0.6, 3));
    expect(seriesFromMap(0.6, 3)).toBeGreaterThan(0.6);
  });
  it("makes initials", () => {
    expect(initials("Team Vitality")).toBe("TV");
    expect(initials("LOUD")).toBe("LO");
    expect(initials("")).toBe("?");
  });
});
