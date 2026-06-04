import { describe, expect, it } from "vitest";

import { calcABV } from "./abv";
import type { AbvInput } from "./types";

/**
 * Golden-vector tolerance for ABV. The ×131.25 factor is an approximation;
 * ±0.2 %ABV proves the formula.
 */
const TOLERANCE = 0.2;

function expectOk(input: AbvInput): number {
  const result = calcABV(input);
  if (!result.ok) {
    throw new Error(`expected ok, got: ${result.reason}`);
  }
  return result.value;
}

describe("calcABV — golden vectors", () => {
  /**
   * Provenance: standard apparent-attenuation ABV. OG 1.050, 75% attenuation →
   * FG points = 50 × 0.25 = 12.5 → FG 1.0125 → ABV = (1.050 − 1.0125) × 131.25
   * ≈ 4.92%. Matches Brewer's Friend / Palmer for OG 1.050 / FG 1.0125.
   */
  it("OG 1.050 at 75% attenuation ≈ 4.9% ABV", () => {
    const abv = expectOk({ og: 1.05, attenuation: 0.75 });
    expect(Math.abs(abv - 4.922)).toBeLessThanOrEqual(TOLERANCE);
  });
});

describe("calcABV — invariants", () => {
  it("higher attenuation → higher ABV", () => {
    const low = expectOk({ og: 1.05, attenuation: 0.65 });
    const high = expectOk({ og: 1.05, attenuation: 0.85 });
    expect(high).toBeGreaterThan(low);
  });

  it("higher OG → higher ABV", () => {
    const low = expectOk({ og: 1.04, attenuation: 0.75 });
    const high = expectOk({ og: 1.07, attenuation: 0.75 });
    expect(high).toBeGreaterThan(low);
  });

  it("full attenuation (1.0) yields the maximum ABV for a given OG", () => {
    const partial = expectOk({ og: 1.05, attenuation: 0.75 });
    const full = expectOk({ og: 1.05, attenuation: 1 });
    expect(full).toBeGreaterThan(partial);
  });

  it("ABV is positive for a real ferment", () => {
    expect(expectOk({ og: 1.05, attenuation: 0.75 })).toBeGreaterThan(0);
  });
});

describe("calcABV — sentinels", () => {
  it("OG ≤ 1.0 → { ok: false }", () => {
    expect(calcABV({ og: 1, attenuation: 0.75 }).ok).toBe(false);
  });

  it("attenuation 0 → { ok: false }", () => {
    expect(calcABV({ og: 1.05, attenuation: 0 }).ok).toBe(false);
  });

  it("attenuation above 1 → { ok: false }", () => {
    expect(calcABV({ og: 1.05, attenuation: 1.2 }).ok).toBe(false);
  });
});
