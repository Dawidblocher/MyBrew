import { describe, expect, it } from "vitest";

import { calcBLG } from "./blg";
import type { BlgInput } from "./types";

/**
 * Golden-vector tolerance for BLG. Calculators differ slightly in extract
 * potential and the Plato↔SG conversion; ±0.3 °P proves the formula without
 * brittle exact-match failures.
 */
const TOLERANCE = 0.3;

function expectOk(input: BlgInput): number {
  const result = calcBLG(input);
  if (!result.ok) {
    throw new Error(`expected ok, got: ${result.reason}`);
  }
  return result.value;
}

describe("calcBLG — golden vectors", () => {
  /**
   * Provenance: 5 kg pale malt @ 80% extract (≈ 37 PPG, a textbook pale-malt
   * value), 75% mash efficiency, 20 L. Gravity-points method (Palmer) →
   * SG 1.0576 → °P = 259 − 259/SG ≈ 14.11. Cross-checks against Brewer's
   * Friend (~14 °P) within tolerance.
   */
  it("single pale malt, standard batch ≈ 14.1 °BLG", () => {
    const blg = expectOk({
      malts: [{ amountKg: 5, colorEbc: 4, extractPercent: 80 }],
      volumeL: 20,
      mashEfficiency: 0.75,
    });
    expect(Math.abs(blg - 14.106)).toBeLessThanOrEqual(TOLERANCE);
  });
});

describe("calcBLG — invariants", () => {
  const base: BlgInput = {
    malts: [{ amountKg: 5, colorEbc: 4, extractPercent: 80 }],
    volumeL: 20,
    mashEfficiency: 0.75,
  };

  it("more extract (more malt) → higher BLG", () => {
    const low = expectOk(base);
    const high = expectOk({ ...base, malts: [{ amountKg: 7, colorEbc: 4, extractPercent: 80 }] });
    expect(high).toBeGreaterThan(low);
  });

  it("larger volume (more dilution) → lower BLG", () => {
    const concentrated = expectOk(base);
    const diluted = expectOk({ ...base, volumeL: 30 });
    expect(diluted).toBeLessThan(concentrated);
  });

  it("higher efficiency → higher BLG", () => {
    const low = expectOk({ ...base, mashEfficiency: 0.6 });
    const high = expectOk({ ...base, mashEfficiency: 0.85 });
    expect(high).toBeGreaterThan(low);
  });

  it("BLG is positive for a real grist", () => {
    expect(expectOk(base)).toBeGreaterThan(0);
  });
});

describe("calcBLG — sentinels", () => {
  it("empty grist → { ok: false }", () => {
    expect(calcBLG({ malts: [], volumeL: 20, mashEfficiency: 0.75 }).ok).toBe(false);
  });

  it("zero volume → { ok: false }", () => {
    const r = calcBLG({ malts: [{ amountKg: 5, colorEbc: 4, extractPercent: 80 }], volumeL: 0, mashEfficiency: 0.75 });
    expect(r.ok).toBe(false);
  });

  it("out-of-range efficiency → { ok: false }", () => {
    const r = calcBLG({ malts: [{ amountKg: 5, colorEbc: 4, extractPercent: 80 }], volumeL: 20, mashEfficiency: 1.5 });
    expect(r.ok).toBe(false);
  });

  it("malt with zero amount is ignored → empty grist → { ok: false }", () => {
    const r = calcBLG({ malts: [{ amountKg: 0, colorEbc: 4, extractPercent: 80 }], volumeL: 20, mashEfficiency: 0.75 });
    expect(r.ok).toBe(false);
  });
});
