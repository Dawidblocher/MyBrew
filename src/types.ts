export interface MaltEntry {
  name: string;
  amountKg: number;
  colorEbc: number;
  extractPercent: number;
}

export type HopStage = "boil" | "whirlpool" | "dryHop";

export interface MashRest {
  tempC: number;
  durationMin: number;
}

export interface HopEntry {
  name: string;
  alphaAcidPercent: number;
  amountG: number;
  stage: HopStage;
  timeMin: number;
}

export interface MashParams {
  efficiencyPct: number;
  waterToGrainRatio: number;
  rests: MashRest[];
}

export interface BatchParams {
  volumeL: number;
}

export interface RecipeBasics {
  name: string;
  style: string;
}

export interface RecipeDraft {
  basics: RecipeBasics;
  batch: BatchParams;
  malts: MaltEntry[];
  mash: MashParams;
  hops: HopEntry[];
}
