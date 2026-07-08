import { defaultRecipeDraft } from "@/lib/recipe-schema";
import type { HopEntry, RecipeDraft } from "@/types";

export type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;

const baseDraft: RecipeDraft = {
  ...defaultRecipeDraft,
  basics: { name: "Test", style: "" },
  batch: { volumeL: 20 },
  malts: [{ name: "Pilsner", amountKg: 5, colorEbc: 4, extractPercent: 80 }],
};

/** Valid grist draft with deep-merge overrides — default hops empty (seam tests). */
export function draft(overrides?: DeepPartial<RecipeDraft>): RecipeDraft {
  const base = structuredClone(baseDraft);
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
