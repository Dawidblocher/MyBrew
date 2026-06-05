import { describe, expect, it } from "vitest";

import { calcIBU } from "./ibu";
import type { IbuInput } from "./types";

/**
 * Golden-vector tolerance for IBU. Tinseth implementations vary slightly in
 * rounding; ±1.0 IBU proves the formula.
 */
const TOLERANCE = 1.0;

function expectOk(input: IbuInput): number {
  const result = calcIBU(input);
  if (!result.ok) {
    throw new Error(`expected ok, got: ${result.reason}`);
  }
  return result.value;
}

describe("calcIBU — golden vectors", () => {
  /**
   * Provenance: Tinseth model. 28 g @ 5% AA, 60 min boil, SG 1.050, 20 L.
   * bigness(1.050) ≈ 1.0528, boilTimeFactor(60) ≈ 0.2191 → utilization ≈ 0.2307;
   * AA mg/L = (28 × 0.05 × 1000)/20 = 70 → IBU ≈ 16.15. Matches Tinseth's own
   * worked example scaled to metric (1 oz/6%/60min/1.050/5gal ≈ 21 IBU).
   */
  it("single 60-min addition ≈ 16.2 IBU", () => {
    const ibu = expectOk({
      hops: [{ alphaAcidPercent: 5, amountG: 28, boilTimeMin: 60 }],
      volumeL: 20,
      sg: 1.05,
    });
    expect(Math.abs(ibu - 16.15)).toBeLessThanOrEqual(TOLERANCE);
  });

  const goldenHop = { alphaAcidPercent: 5, amountG: 28, boilTimeMin: 60 };
  const goldenInput: IbuInput = { hops: [goldenHop], volumeL: 20, sg: 1.05 };

  it("omitted utilizationFactor matches default (regression)", () => {
    const baseline = expectOk(goldenInput);
    const explicit = expectOk({
      ...goldenInput,
      hops: [{ ...goldenHop, utilizationFactor: 1 }],
    });
    expect(explicit).toBeCloseTo(baseline, 10);
  });

  it("utilizationFactor 0.25 yields ~1/4 contribution", () => {
    const baseline = expectOk(goldenInput);
    const scaled = expectOk({
      ...goldenInput,
      hops: [{ ...goldenHop, utilizationFactor: 0.25 }],
    });
    expect(scaled).toBeCloseTo(baseline * 0.25, 1);
  });

  it("utilizationFactor 0 yields zero contribution from that addition", () => {
    const result = calcIBU({
      ...goldenInput,
      hops: [{ ...goldenHop, utilizationFactor: 0 }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(0);
    }
  });

  it("golden ~16.2 IBU unchanged with explicit factor 1.0", () => {
    const ibu = expectOk({
      ...goldenInput,
      hops: [{ ...goldenHop, utilizationFactor: 1 }],
    });
    expect(Math.abs(ibu - 16.15)).toBeLessThanOrEqual(TOLERANCE);
  });
});

describe("calcIBU — invariants", () => {
  const base: IbuInput = {
    hops: [{ alphaAcidPercent: 5, amountG: 28, boilTimeMin: 60 }],
    volumeL: 20,
    sg: 1.05,
  };

  it("longer boil → higher IBU", () => {
    const short = expectOk({ ...base, hops: [{ alphaAcidPercent: 5, amountG: 28, boilTimeMin: 15 }] });
    const long = expectOk(base);
    expect(long).toBeGreaterThan(short);
  });

  it("more alpha acid → higher IBU", () => {
    const low = expectOk(base);
    const high = expectOk({ ...base, hops: [{ alphaAcidPercent: 10, amountG: 28, boilTimeMin: 60 }] });
    expect(high).toBeGreaterThan(low);
  });

  it("more hop mass → higher IBU", () => {
    const less = expectOk(base);
    const more = expectOk({ ...base, hops: [{ alphaAcidPercent: 5, amountG: 56, boilTimeMin: 60 }] });
    expect(more).toBeGreaterThan(less);
  });

  it("higher gravity → lower utilization → lower IBU", () => {
    const lowGravity = expectOk({ ...base, sg: 1.04 });
    const highGravity = expectOk({ ...base, sg: 1.08 });
    expect(highGravity).toBeLessThan(lowGravity);
  });

  it("multiple additions sum", () => {
    const single = expectOk(base);
    const both = expectOk({
      ...base,
      hops: [
        { alphaAcidPercent: 5, amountG: 28, boilTimeMin: 60 },
        { alphaAcidPercent: 5, amountG: 28, boilTimeMin: 15 },
      ],
    });
    expect(both).toBeGreaterThan(single);
  });

  it("IBU is positive for a real schedule", () => {
    expect(expectOk(base)).toBeGreaterThan(0);
  });
});

describe("calcIBU — sentinels", () => {
  it("no hops → { ok: false }", () => {
    expect(calcIBU({ hops: [], volumeL: 20, sg: 1.05 }).ok).toBe(false);
  });

  it("zero volume → { ok: false }", () => {
    expect(calcIBU({ hops: [{ alphaAcidPercent: 5, amountG: 28, boilTimeMin: 60 }], volumeL: 0, sg: 1.05 }).ok).toBe(
      false,
    );
  });

  it("SG below 1.0 → { ok: false }", () => {
    expect(calcIBU({ hops: [{ alphaAcidPercent: 5, amountG: 28, boilTimeMin: 60 }], volumeL: 20, sg: 0.99 }).ok).toBe(
      false,
    );
  });

  it("hop with zero boil time is ignored → no valid hops → { ok: false }", () => {
    expect(calcIBU({ hops: [{ alphaAcidPercent: 5, amountG: 28, boilTimeMin: 0 }], volumeL: 20, sg: 1.05 }).ok).toBe(
      false,
    );
  });
});
