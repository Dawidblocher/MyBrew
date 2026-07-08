import { describe, expect, it } from "vitest";

import { boilHop, draft } from "@/lib/__tests__/fixtures";
import { calcABV, calcIBU, computeGravity, computeMetrics } from "@/lib/calc";
import type { RecipeMetricsInput } from "@/lib/calc";
import { computeWizardMetrics, mapDraftToCalcInput, WHIRLPOOL_UTILIZATION_FACTOR } from "@/lib/recipe-to-calc";
import { defaultRecipeDraft } from "@/lib/recipe-schema";
import type { RecipeDraft } from "@/types";

/** Golden-vector tolerances — provenance: src/lib/calc/{blg,srm,ibu,abv}.test.ts */
const TOLERANCE = { blg: 0.3, srm: 0.5, ibu: 1.0, abv: 0.2 } as const;

/** Replicates private `mapDraftHopsToCalc` for parity tests without exporting it. */
function hopsFromDraft(hops: RecipeDraft["hops"]): RecipeMetricsInput["hops"] {
  return hops
    .filter((h) => h.stage !== "dryHop")
    .filter((h) => h.alphaAcidPercent > 0 && h.amountG > 0 && h.timeMin > 0)
    .map((h) => ({
      alphaAcidPercent: h.alphaAcidPercent,
      amountG: h.amountG,
      boilTimeMin: h.timeMin,
      utilizationFactor: h.stage === "whirlpool" ? WHIRLPOOL_UTILIZATION_FACTOR : 1,
    }));
}

function metricsInputFromDraft(d: RecipeDraft): RecipeMetricsInput | null {
  const mapped = mapDraftToCalcInput(d);
  if (!mapped.ok) return null;

  const att = d.yeast.attenuationPct;
  if (!(Number.isFinite(att) && att > 0 && att <= 100)) return null;

  return {
    malts: mapped.input.malts,
    volumeL: mapped.input.volumeL,
    mashEfficiency: mapped.input.mashEfficiency,
    hops: hopsFromDraft(d.hops),
    attenuation: att / 100,
  };
}

function expectClose(actual: number, expected: number, tolerance: number) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}

/** Draft matching engine golden vectors (5 kg pale @ 80%, 20 L, 75% eff, 60-min boil hop). */
function goldenDraft(overrides?: Parameters<typeof draft>[0]): RecipeDraft {
  return draft({
    hops: [boilHop()],
    yeast: { ...defaultRecipeDraft.yeast, attenuationPct: 75 },
    ...overrides,
  });
}

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

describe("computeWizardMetrics — golden vector through full draft", () => {
  /**
   * Provenance: src/lib/calc/blg.test.ts, srm.test.ts, ibu.test.ts, abv.test.ts —
   * 5 kg pale malt @ 80% extract, 75% mash efficiency, 20 L, 60-min boil hop.
   */
  it("full draft → BLG ≈ 14.1, SRM ≈ 4.0, IBU ≈ 16.2, ABV ≈ 4.9", () => {
    const d = goldenDraft();
    const { blg, srm, ibu, abv } = computeWizardMetrics(d);

    expect(blg.ok).toBe(true);
    expect(srm.ok).toBe(true);
    expect(ibu.ok).toBe(true);
    expect(abv.ok).toBe(true);
    if (!blg.ok || !srm.ok || !ibu.ok || !abv.ok) return;

    expectClose(blg.value, 14.106, TOLERANCE.blg);
    expectClose(srm.value, 4.017, TOLERANCE.srm);

    const mapped = mapDraftToCalcInput(d);
    if (!mapped.ok) throw new Error("expected mapped input");
    const gravity = computeGravity(mapped.input);
    if (!gravity.ok) throw new Error("expected gravity");

    // IBU/ABV oracles use OG from this grist (≈1.058), not ibu/abv.test.ts fixed SG 1.050.
    const ibuOracle = calcIBU({
      hops: [{ alphaAcidPercent: 5, amountG: 28, boilTimeMin: 60 }],
      volumeL: 20,
      sg: gravity.value.sg,
    });
    if (!ibuOracle.ok) throw new Error("expected ibu oracle");
    expectClose(ibu.value, ibuOracle.value, TOLERANCE.ibu);

    const abvOracle = calcABV({ og: gravity.value.sg, attenuation: 0.75 });
    if (!abvOracle.ok) throw new Error("expected abv oracle");
    expectClose(abv.value, abvOracle.value, TOLERANCE.abv);
  });
});

describe("computeWizardMetrics — plausible-but-wrong (seam↔engine asymmetry)", () => {
  it("malt with amountKg>0 but extractPercent:0 → seam ok, BLG fail", () => {
    const d = draft({ malts: [{ name: "Bad", amountKg: 5, colorEbc: 4, extractPercent: 0 }] });

    expect(mapDraftToCalcInput(d).ok).toBe(true);
    expect(computeWizardMetrics(d).blg.ok).toBe(false);
  });

  it("malt with colorEbc:0 → seam ok, SRM fail", () => {
    const d = draft({ malts: [{ name: "Bad", amountKg: 5, colorEbc: 0, extractPercent: 80 }] });

    expect(mapDraftToCalcInput(d).ok).toBe(true);
    expect(computeWizardMetrics(d).srm.ok).toBe(false);
  });

  it("mixed grist (valid + zero-extract) → BLG lower than full contributing grist", () => {
    const fullGrist = goldenDraft({
      malts: [
        { name: "Pilsner", amountKg: 5, colorEbc: 4, extractPercent: 80 },
        { name: "Munich", amountKg: 2, colorEbc: 15, extractPercent: 80 },
      ],
    });
    const silentDrop = goldenDraft({
      malts: [
        { name: "Pilsner", amountKg: 5, colorEbc: 4, extractPercent: 80 },
        { name: "Ghost", amountKg: 2, colorEbc: 15, extractPercent: 0 },
      ],
    });

    expect(mapDraftToCalcInput(fullGrist).ok).toBe(true);
    expect(mapDraftToCalcInput(silentDrop).ok).toBe(true);

    const fullBlg = computeWizardMetrics(fullGrist).blg;
    const dropBlg = computeWizardMetrics(silentDrop).blg;
    expect(fullBlg.ok).toBe(true);
    expect(dropBlg.ok).toBe(true);
    if (fullBlg.ok && dropBlg.ok) {
      expect(dropBlg.value).toBeLessThan(fullBlg.value);
    }
  });

  it("typo extractPercent 8 vs 80 → no sentinel, BLG ok but significantly lower", () => {
    const correct = draft({ malts: [{ name: "Pilsner", amountKg: 5, colorEbc: 4, extractPercent: 80 }] });
    const typo = draft({ malts: [{ name: "Pilsner", amountKg: 5, colorEbc: 4, extractPercent: 8 }] });

    expect(mapDraftToCalcInput(correct).ok).toBe(true);
    expect(mapDraftToCalcInput(typo).ok).toBe(true);

    const correctBlg = computeWizardMetrics(correct).blg;
    const typoBlg = computeWizardMetrics(typo).blg;
    expect(correctBlg.ok).toBe(true);
    expect(typoBlg.ok).toBe(true);
    if (correctBlg.ok && typoBlg.ok) {
      expect(typoBlg.value).toBeLessThan(correctBlg.value * 0.5);
    }
  });
});

describe("computeWizardMetrics — unit conversions and hop mapping", () => {
  it("efficiencyPct 75 → same BLG as mashEfficiency 0.75 in computeMetrics", () => {
    const d = draft({ mash: { ...defaultRecipeDraft.mash, efficiencyPct: 75 } });
    const wizard = computeWizardMetrics(d).blg;
    const direct = computeMetrics({
      malts: [{ amountKg: 5, colorEbc: 4, extractPercent: 80 }],
      volumeL: 20,
      mashEfficiency: 0.75,
      hops: [],
      attenuation: 0.75,
    }).blg;

    expect(wizard.ok).toBe(true);
    expect(direct.ok).toBe(true);
    if (wizard.ok && direct.ok) {
      expect(wizard.value).toBe(direct.value);
    }
  });

  it("attenuationPct 80 → ABV matches attenuation fraction 0.8", () => {
    const d = goldenDraft({ yeast: { ...defaultRecipeDraft.yeast, attenuationPct: 80 } });
    const wizard = computeWizardMetrics(d).abv;

    const input = metricsInputFromDraft(d);
    expect(input).not.toBeNull();
    if (!input) return;

    const direct = computeMetrics(input).abv;
    expect(wizard.ok).toBe(true);
    expect(direct.ok).toBe(true);
    if (wizard.ok && direct.ok) {
      expect(wizard.value).toBe(direct.value);
    }
  });

  it("whirlpool hop IBU ≈ boil IBU × WHIRLPOOL_UTILIZATION_FACTOR", () => {
    const boil = computeWizardMetrics(goldenDraft({ hops: [boilHop({ stage: "boil" })] }));
    const whirlpool = computeWizardMetrics(goldenDraft({ hops: [boilHop({ stage: "whirlpool" })] }));

    expect(boil.ibu.ok).toBe(true);
    expect(whirlpool.ibu.ok).toBe(true);
    if (boil.ibu.ok && whirlpool.ibu.ok) {
      expectClose(whirlpool.ibu.value, boil.ibu.value * WHIRLPOOL_UTILIZATION_FACTOR, TOLERANCE.ibu);
    }
  });

  it("dryHop addition does not affect IBU", () => {
    const without = computeWizardMetrics(goldenDraft({ hops: [] }));
    const withDryHop = computeWizardMetrics(goldenDraft({ hops: [boilHop({ stage: "dryHop" })] }));

    expect(without.ibu.ok).toBe(false);
    expect(withDryHop.ibu.ok).toBe(false);
  });

  it("hop with timeMin:0 is filtered out → IBU fail", () => {
    const { ibu } = computeWizardMetrics(goldenDraft({ hops: [boilHop({ timeMin: 0 })] }));
    expect(ibu.ok).toBe(false);
  });
});

describe("computeWizardMetrics — parity with computeMetrics", () => {
  const parityDrafts: RecipeDraft[] = [
    goldenDraft(),
    draft({ hops: [boilHop()], yeast: { ...defaultRecipeDraft.yeast, attenuationPct: 75 } }),
    goldenDraft({ mash: { ...defaultRecipeDraft.mash, efficiencyPct: 65 } }),
    goldenDraft({ hops: [boilHop({ stage: "whirlpool" })] }),
  ];

  it.each(parityDrafts.map((d, i) => [i, d] as const))("draft variant %i matches computeMetrics", (_i, d) => {
    const mapped = mapDraftToCalcInput(d);
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;

    const input = metricsInputFromDraft(d);
    expect(input).not.toBeNull();
    if (!input) return;

    const wizard = computeWizardMetrics(d);
    const direct = computeMetrics(input);

    for (const key of ["blg", "srm", "ibu", "abv"] as const) {
      expect(wizard[key].ok).toBe(direct[key].ok);
      if (wizard[key].ok && direct[key].ok) {
        expectClose(wizard[key].value, direct[key].value, TOLERANCE[key]);
      }
    }
  });
});
