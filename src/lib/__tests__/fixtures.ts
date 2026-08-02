import type { CalcResult } from "@/lib/calc";
import type { RecipeRecordRow } from "@/lib/recipe-mappers";
import { defaultRecipeDraft } from "@/lib/recipe-schema";
import { computeWizardMetrics } from "@/lib/recipe-to-calc";
import type { HopEntry, RecipeDraft } from "@/types";

export type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;

const baseDraft: RecipeDraft = {
  ...defaultRecipeDraft,
  basics: { name: "Test", style: "" },
  batch: { volumeL: 20 },
  malts: [{ name: "Pilsner", amountKg: 5, colorEbc: 4, extractPercent: 80 }],
};

function mergeDraft(base: RecipeDraft, overrides?: DeepPartial<RecipeDraft>): RecipeDraft {
  if (!overrides) return base;

  return {
    ...base,
    ...overrides,
    basics: overrides.basics ? { ...base.basics, ...overrides.basics } : base.basics,
    batch: overrides.batch ? { ...base.batch, ...overrides.batch } : base.batch,
    mash: overrides.mash ? { ...base.mash, ...overrides.mash } : base.mash,
    yeast: overrides.yeast ? { ...base.yeast, ...overrides.yeast } : base.yeast,
    malts: overrides.malts ?? base.malts,
    hops: overrides.hops ?? base.hops,
    adjuncts: overrides.adjuncts ?? base.adjuncts,
  };
}

/** Valid grist draft with deep-merge overrides — default hops empty (seam tests). */
export function draft(overrides?: DeepPartial<RecipeDraft>): RecipeDraft {
  return mergeDraft(structuredClone(baseDraft), overrides);
}

/** Full save-ready draft: styled basics + boil hop (round-trip / save tests). */
export function draftWithHops(overrides?: DeepPartial<RecipeDraft>): RecipeDraft {
  return draft({
    basics: { name: "Test IPA", style: "American IPA" },
    hops: [boilHop()],
    ...overrides,
  });
}

export function boilHop(overrides: Partial<HopEntry> = {}): HopEntry {
  return {
    name: "Magnum",
    alphaAcidPercent: 5,
    amountG: 28,
    stage: "boil",
    timeMin: 60,
    ...overrides,
  };
}

/** Alias for `boilHop`. */
export const hop = boilHop;

/**
 * Fixed, past timestamps. `updateRecipe` stamps `updated_at` with the current
 * clock, so a row seeded with `new Date()` could land in the same millisecond
 * and make assertions on the edit stamp flaky.
 */
const SEEDED_AT = "2026-06-01T09:00:00.000Z";

/** Column overrides for `recipeRow`; `data` merges deeply, everything else replaces. */
export interface RecipeRowOverrides extends Partial<Omit<RecipeRecordRow, "data">> {
  data?: DeepPartial<RecipeDraft>;
}

function metricColumn(computed: CalcResult<number>, override: number | undefined, label: string): number {
  if (override !== undefined) return override;
  if (!computed.ok) {
    throw new Error(
      `recipeRow: cannot compute ${label} for the seeded draft (${computed.reason}) — pass it explicitly`,
    );
  }
  return computed.value;
}

/**
 * DB row seed for query/round-trip tests. `name`/`style` follow `data.basics`
 * and the metric columns default to `computeWizardMetrics(data)`, so re-saving
 * the seeded draft is a no-op — that is what makes idempotence falsifiable.
 */
export function recipeRow(overrides: RecipeRowOverrides = {}): RecipeRecordRow {
  const { data: dataOverrides, blg, srm, ibu, abv, ...columns } = overrides;
  const data = mergeDraft(draftWithHops(), dataOverrides);
  const metrics = computeWizardMetrics(data);

  return {
    id: "recipe-1",
    user_id: "user-1",
    name: data.basics.name,
    style: data.basics.style,
    blg: metricColumn(metrics.blg, blg, "BLG"),
    srm: metricColumn(metrics.srm, srm, "SRM"),
    ibu: metricColumn(metrics.ibu, ibu, "IBU"),
    abv: metricColumn(metrics.abv, abv, "ABV"),
    data,
    created_at: SEEDED_AT,
    updated_at: SEEDED_AT,
    ...columns,
  };
}
