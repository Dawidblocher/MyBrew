import { describe, expect, it } from "vitest";

import { computeWizardMetrics, mapDraftToCalcInput } from "@/lib/recipe-to-calc";
import { defaultRecipeDraft } from "@/lib/recipe-schema";
import type { HopEntry, RecipeDraft } from "@/types";

function draft(overrides: Partial<RecipeDraft> = {}): RecipeDraft {
  return {
    basics: { name: "Test", style: "" },
    batch: { volumeL: 20 },
    malts: [{ name: "Pilsner", amountKg: 5, colorEbc: 4, extractPercent: 80 }],
    mash: defaultRecipeDraft.mash,
    hops: defaultRecipeDraft.hops,
    yeast: defaultRecipeDraft.yeast,
    adjuncts: defaultRecipeDraft.adjuncts,
    ...overrides,
  };
}

const boilHop = (overrides: Partial<HopEntry> = {}): HopEntry => ({
  name: "Magnum",
  alphaAcidPercent: 5,
  amountG: 28,
  stage: "boil",
  timeMin: 60,
  ...overrides,
});

describe("mapDraftToCalcInput — insufficient-input guards", () => {
  it("empty malt list → sentinel", () => {
    const result = mapDraftToCalcInput(draft({ malts: [] }));
    expect(result.ok).toBe(false);
  });

  it("zero volume → sentinel", () => {
    const result = mapDraftToCalcInput(draft({ batch: { volumeL: 0 } }));
    expect(result.ok).toBe(false);
  });

  it("negative volume → sentinel", () => {
    const result = mapDraftToCalcInput(draft({ batch: { volumeL: -5 } }));
    expect(result.ok).toBe(false);
  });

  it("only zero-amount malts → sentinel (no positive-amount malt)", () => {
    const result = mapDraftToCalcInput(
      draft({ malts: [{ name: "Empty", amountKg: 0, colorEbc: 4, extractPercent: 80 }] }),
    );
    expect(result.ok).toBe(false);
  });

  it("NaN volume (cleared numeric input) → sentinel", () => {
    const result = mapDraftToCalcInput(draft({ batch: { volumeL: NaN } }));
    expect(result.ok).toBe(false);
  });

  it("Infinity volume → sentinel", () => {
    const result = mapDraftToCalcInput(draft({ batch: { volumeL: Infinity } }));
    expect(result.ok).toBe(false);
  });

  it("only NaN-amount malts → sentinel (no positive-amount malt)", () => {
    const result = mapDraftToCalcInput(
      draft({ malts: [{ name: "Cleared", amountKg: NaN, colorEbc: 4, extractPercent: 80 }] }),
    );
    expect(result.ok).toBe(false);
  });

  it("zero mash efficiency → sentinel", () => {
    const result = mapDraftToCalcInput(draft({ mash: { ...defaultRecipeDraft.mash, efficiencyPct: 0 } }));
    expect(result.ok).toBe(false);
  });

  it("mash efficiency above 100 → sentinel", () => {
    const result = mapDraftToCalcInput(draft({ mash: { ...defaultRecipeDraft.mash, efficiencyPct: 101 } }));
    expect(result.ok).toBe(false);
  });
});

describe("mapDraftToCalcInput — valid mapping", () => {
  it("valid draft → calc input with mash efficiency from draft and EBC/volume passed through", () => {
    const result = mapDraftToCalcInput(draft());
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");

    expect(result.input.mashEfficiency).toBe(0.75);
    expect(result.input.volumeL).toBe(20);
    expect(result.input.malts).toEqual([{ amountKg: 5, colorEbc: 4, extractPercent: 80 }]);
  });

  it("zero-amount malt is dropped while positive-amount malts remain", () => {
    const result = mapDraftToCalcInput(
      draft({
        malts: [
          { name: "Empty", amountKg: 0, colorEbc: 10, extractPercent: 80 },
          { name: "Pilsner", amountKg: 4, colorEbc: 4, extractPercent: 80 },
        ],
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");

    expect(result.input.malts).toEqual([{ amountKg: 4, colorEbc: 4, extractPercent: 80 }]);
  });
});

describe("computeWizardMetrics", () => {
  it("propagates the insufficient-input sentinel to all metrics", () => {
    const { blg, srm, ibu, abv } = computeWizardMetrics(draft({ malts: [] }));
    expect(blg.ok).toBe(false);
    expect(srm.ok).toBe(false);
    expect(ibu.ok).toBe(false);
    expect(abv.ok).toBe(false);
  });

  it("valid draft → BLG and SRM resolve to real values", () => {
    const { blg, srm } = computeWizardMetrics(draft());
    expect(blg.ok).toBe(true);
    expect(srm.ok).toBe(true);
    if (blg.ok) expect(blg.value).toBeGreaterThan(0);
    if (srm.ok) expect(srm.value).toBeGreaterThan(0);
  });

  it("NaN volume → all metrics return the sentinel (never NaN/Infinity)", () => {
    const { blg, srm, ibu, abv } = computeWizardMetrics(draft({ batch: { volumeL: NaN } }));
    expect(blg.ok).toBe(false);
    expect(srm.ok).toBe(false);
    expect(ibu.ok).toBe(false);
    expect(abv.ok).toBe(false);
  });

  it("empty hop list → ibu { ok: false }", () => {
    const { ibu } = computeWizardMetrics(draft({ hops: [] }));
    expect(ibu.ok).toBe(false);
  });

  it("boil hop addition → IBU > 0", () => {
    const { ibu } = computeWizardMetrics(draft({ hops: [boilHop()] }));
    expect(ibu.ok).toBe(true);
    if (ibu.ok) expect(ibu.value).toBeGreaterThan(0);
  });

  it("whirlpool yields lower IBU than boil for same params", () => {
    const boil = computeWizardMetrics(draft({ hops: [boilHop({ stage: "boil" })] }));
    const whirlpool = computeWizardMetrics(draft({ hops: [boilHop({ stage: "whirlpool" })] }));
    expect(boil.ibu.ok).toBe(true);
    expect(whirlpool.ibu.ok).toBe(true);
    if (boil.ibu.ok && whirlpool.ibu.ok) {
      expect(whirlpool.ibu.value).toBeLessThan(boil.ibu.value);
    }
  });

  it("dry hop does not contribute to IBU", () => {
    const without = computeWizardMetrics(draft({ hops: [] }));
    const withDryHop = computeWizardMetrics(draft({ hops: [boilHop({ stage: "dryHop" })] }));
    expect(without.ibu.ok).toBe(false);
    expect(withDryHop.ibu.ok).toBe(false);
  });

  it("mash efficiency from input affects BLG", () => {
    const low = computeWizardMetrics(draft({ mash: { ...defaultRecipeDraft.mash, efficiencyPct: 65 } }));
    const high = computeWizardMetrics(draft({ mash: { ...defaultRecipeDraft.mash, efficiencyPct: 85 } }));
    expect(low.blg.ok).toBe(true);
    expect(high.blg.ok).toBe(true);
    if (low.blg.ok && high.blg.ok) {
      expect(high.blg.value).toBeGreaterThan(low.blg.value);
    }
  });

  it("invalid mash efficiency → sentinel for all metrics", () => {
    const zero = computeWizardMetrics(draft({ mash: { ...defaultRecipeDraft.mash, efficiencyPct: 0 } }));
    const over = computeWizardMetrics(draft({ mash: { ...defaultRecipeDraft.mash, efficiencyPct: 150 } }));
    expect(zero.blg.ok).toBe(false);
    expect(zero.ibu.ok).toBe(false);
    expect(zero.abv.ok).toBe(false);
    expect(over.blg.ok).toBe(false);
    expect(over.ibu.ok).toBe(false);
    expect(over.abv.ok).toBe(false);
  });
});

describe("computeWizardMetrics — ABV", () => {
  it("default attenuation (75) with valid grist → abv.ok and value > 0", () => {
    const { abv } = computeWizardMetrics(draft());
    expect(abv.ok).toBe(true);
    if (abv.ok) expect(abv.value).toBeGreaterThan(0);
  });

  it("higher attenuation → higher ABV", () => {
    const low = computeWizardMetrics(draft({ yeast: { ...defaultRecipeDraft.yeast, attenuationPct: 70 } }));
    const high = computeWizardMetrics(draft({ yeast: { ...defaultRecipeDraft.yeast, attenuationPct: 85 } }));
    expect(low.abv.ok).toBe(true);
    expect(high.abv.ok).toBe(true);
    if (low.abv.ok && high.abv.ok) {
      expect(high.abv.value).toBeGreaterThan(low.abv.value);
    }
  });

  it("attenuation 0 → abv sentinel despite valid BLG", () => {
    const { blg, abv } = computeWizardMetrics(draft({ yeast: { ...defaultRecipeDraft.yeast, attenuationPct: 0 } }));
    expect(blg.ok).toBe(true);
    expect(abv.ok).toBe(false);
  });

  it("attenuation above 100 → abv sentinel despite valid BLG", () => {
    const { blg, abv } = computeWizardMetrics(draft({ yeast: { ...defaultRecipeDraft.yeast, attenuationPct: 101 } }));
    expect(blg.ok).toBe(true);
    expect(abv.ok).toBe(false);
  });

  it("empty grist → abv sentinel", () => {
    const { abv } = computeWizardMetrics(draft({ malts: [] }));
    expect(abv.ok).toBe(false);
  });

  it("adjuncts do not affect ABV", () => {
    const without = computeWizardMetrics(draft());
    const withAdjuncts = computeWizardMetrics(
      draft({
        adjuncts: [{ name: "Cukier", stage: "boil", timeMin: 10, notes: "test" }],
      }),
    );
    expect(without.abv.ok).toBe(true);
    expect(withAdjuncts.abv.ok).toBe(true);
    if (without.abv.ok && withAdjuncts.abv.ok) {
      expect(withAdjuncts.abv.value).toBe(without.abv.value);
    }
  });
});
