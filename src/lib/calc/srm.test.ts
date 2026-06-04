import { describe, expect, it } from "vitest";

import { calcSRM } from "./srm";
import type { SrmInput } from "./types";

/**
 * Golden-vector tolerance for SRM. The Morey power-law and EBC→°L conversion
 * differ slightly across calculators; ±0.5 SRM proves the formula.
 */
const TOLERANCE = 0.5;

function expectOk(input: SrmInput): number {
  const result = calcSRM(input);
  if (!result.ok) {
    throw new Error(`expected ok, got: ${result.reason}`);
  }
  return result.value;
}

describe("calcSRM — golden vectors", () => {
  /**
   * Provenance: 5 kg Pilsner malt @ 4 EBC, 20 L. EBC→°L (/1.97) and metric→
   * imperial (kg→lb, L→gal) → MCU ≈ 4.236 → Morey 1.4922 × MCU^0.6859 ≈ 4.02
   * SRM. Consistent with a pale Pilsner (2–4 SRM). Morey (2000) equation.
   */
  it("single Pilsner malt ≈ 4.0 SRM", () => {
    const srm = expectOk({
      malts: [{ amountKg: 5, colorEbc: 4, extractPercent: 80 }],
      volumeL: 20,
    });
    expect(Math.abs(srm - 4.017)).toBeLessThanOrEqual(TOLERANCE);
  });
});

describe("calcSRM — invariants", () => {
  const base: SrmInput = {
    malts: [{ amountKg: 5, colorEbc: 4, extractPercent: 80 }],
    volumeL: 20,
  };

  it("darker malt → higher SRM", () => {
    const pale = expectOk(base);
    const dark = expectOk({ ...base, malts: [{ amountKg: 5, colorEbc: 60, extractPercent: 80 }] });
    expect(dark).toBeGreaterThan(pale);
  });

  it("more malt → higher SRM", () => {
    const less = expectOk(base);
    const more = expectOk({ ...base, malts: [{ amountKg: 8, colorEbc: 4, extractPercent: 80 }] });
    expect(more).toBeGreaterThan(less);
  });

  it("larger volume (dilution) → lower SRM", () => {
    const concentrated = expectOk(base);
    const diluted = expectOk({ ...base, volumeL: 40 });
    expect(diluted).toBeLessThan(concentrated);
  });

  it("adding a dark specialty malt raises color", () => {
    const baseColor = expectOk(base);
    const withSpecialty = expectOk({
      ...base,
      malts: [
        { amountKg: 5, colorEbc: 4, extractPercent: 80 },
        { amountKg: 0.5, colorEbc: 1000, extractPercent: 70 },
      ],
    });
    expect(withSpecialty).toBeGreaterThan(baseColor);
  });
});

describe("calcSRM — sentinels", () => {
  it("empty grist → { ok: false }", () => {
    expect(calcSRM({ malts: [], volumeL: 20 }).ok).toBe(false);
  });

  it("zero volume → { ok: false }", () => {
    expect(calcSRM({ malts: [{ amountKg: 5, colorEbc: 4, extractPercent: 80 }], volumeL: 0 }).ok).toBe(false);
  });

  it("malt with zero color is ignored → empty grist → { ok: false }", () => {
    expect(calcSRM({ malts: [{ amountKg: 5, colorEbc: 0, extractPercent: 80 }], volumeL: 20 }).ok).toBe(false);
  });
});
