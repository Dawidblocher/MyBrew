import { describe, expect, it } from "vitest";

import { calcBLG, computeMetrics } from "@/lib/calc";
import type { CalcResult, RecipeMetricsInput } from "@/lib/calc";

/** Identity-typed pass-through so the union isn't narrowed to a literal. */
function asResult<T>(result: CalcResult<T>): CalcResult<T> {
  return result;
}

describe("CalcResult discriminator", () => {
  it("narrows to the value on ok: true", () => {
    const result = asResult<number>({ ok: true, value: 12.5 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(12.5);
    } else {
      throw new Error("expected ok result");
    }
  });

  it("narrows to the reason on ok: false", () => {
    const result = asResult<number>({ ok: false, reason: "insufficient input" });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected error result");
    } else {
      expect(result.reason).toBe("insufficient input");
    }
  });
});

describe("computeMetrics — aggregate contract", () => {
  const fullInput: RecipeMetricsInput = {
    malts: [{ amountKg: 5, colorEbc: 8, extractPercent: 80 }],
    volumeL: 20,
    mashEfficiency: 0.75,
    hops: [{ alphaAcidPercent: 5, amountG: 28, boilTimeMin: 60 }],
    attenuation: 0.75,
  };

  it("full valid input → all four metrics { ok: true }", () => {
    const { blg, srm, ibu, abv } = computeMetrics(fullInput);
    expect(blg.ok).toBe(true);
    expect(srm.ok).toBe(true);
    expect(ibu.ok).toBe(true);
    expect(abv.ok).toBe(true);
  });

  it("grist-only input → BLG/SRM resolve, IBU/ABV { ok: false }", () => {
    const { blg, srm, ibu, abv } = computeMetrics({
      ...fullInput,
      hops: [],
      attenuation: 0,
    });
    expect(blg.ok).toBe(true);
    expect(srm.ok).toBe(true);
    expect(ibu.ok).toBe(false);
    expect(abv.ok).toBe(false);
  });

  it("empty input → all four { ok: false }", () => {
    const { blg, srm, ibu, abv } = computeMetrics({
      malts: [],
      volumeL: 0,
      mashEfficiency: 0.75,
      hops: [],
      attenuation: 0,
    });
    expect(blg.ok).toBe(false);
    expect(srm.ok).toBe(false);
    expect(ibu.ok).toBe(false);
    expect(abv.ok).toBe(false);
  });

  it("aggregate BLG matches standalone calcBLG (gravity computed once is consistent)", () => {
    const aggregate = computeMetrics(fullInput);
    const standalone = calcBLG({
      malts: fullInput.malts,
      volumeL: fullInput.volumeL,
      mashEfficiency: fullInput.mashEfficiency,
    });
    if (!aggregate.blg.ok || !standalone.ok) {
      throw new Error("expected both BLG results to be ok");
    }
    expect(aggregate.blg.value).toBe(standalone.value);
  });

  it("metrics resolve independently — a missing hop schedule doesn't block BLG/SRM/ABV", () => {
    const { blg, srm, ibu, abv } = computeMetrics({ ...fullInput, hops: [] });
    expect(blg.ok).toBe(true);
    expect(srm.ok).toBe(true);
    expect(ibu.ok).toBe(false);
    expect(abv.ok).toBe(true);
  });
});
