import { describe, expect, it } from "vitest";

import { DEFAULT_MASH_EFFICIENCY, computeWizardMetrics, mapDraftToCalcInput } from "@/lib/recipe-to-calc";
import type { RecipeDraft } from "@/types";

function draft(overrides: Partial<RecipeDraft> = {}): RecipeDraft {
  return {
    basics: { name: "Test", style: "" },
    batch: { volumeL: 20 },
    malts: [{ name: "Pilsner", amountKg: 5, colorEbc: 4, extractPercent: 80 }],
    ...overrides,
  };
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
});

describe("mapDraftToCalcInput — valid mapping", () => {
  it("valid draft → calc input with default efficiency applied and EBC/volume passed through", () => {
    const result = mapDraftToCalcInput(draft());
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");

    expect(result.input.mashEfficiency).toBe(DEFAULT_MASH_EFFICIENCY);
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
  it("propagates the insufficient-input sentinel to both metrics", () => {
    const { blg, srm } = computeWizardMetrics(draft({ malts: [] }));
    expect(blg.ok).toBe(false);
    expect(srm.ok).toBe(false);
  });

  it("valid draft → both BLG and SRM resolve to real values", () => {
    const { blg, srm } = computeWizardMetrics(draft());
    expect(blg.ok).toBe(true);
    expect(srm.ok).toBe(true);
    if (blg.ok) expect(blg.value).toBeGreaterThan(0);
    if (srm.ok) expect(srm.value).toBeGreaterThan(0);
  });
});
