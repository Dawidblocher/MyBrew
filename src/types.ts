export interface MaltEntry {
  name: string;
  amountKg: number;
  colorEbc: number;
  extractPercent: number;
}

export type HopStage = "boil" | "whirlpool" | "dryHop";

export type AdjunctStage = "mash" | "boil" | "whirlpool" | "fermentation";

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

export interface YeastParams {
  strain: string;
  type: string;
  attenuationPct: number;
  fermTempMinC: number;
  fermTempMaxC: number;
}

export interface AdjunctEntry {
  name: string;
  stage: AdjunctStage;
  timeMin: number;
  notes: string;
}

export interface RecipeDraft {
  basics: RecipeBasics;
  batch: BatchParams;
  malts: MaltEntry[];
  mash: MashParams;
  hops: HopEntry[];
  yeast: YeastParams;
  adjuncts: AdjunctEntry[];
}

export interface RecipeMetricsSnapshot {
  blg: number;
  srm: number;
  ibu: number;
  abv: number;
}

export interface RecipeListItem extends RecipeMetricsSnapshot {
  id: string;
  name: string;
  style: string;
  createdAt: string;
}

export interface RecipeRecord extends RecipeMetricsSnapshot {
  id: string;
  userId: string;
  name: string;
  style: string;
  createdAt: string;
  updatedAt: string;
  data: RecipeDraft;
}

/** Server-built insert payload (snake_case matches the `recipes` table). */
export interface RecipeInsert {
  user_id: string;
  name: string;
  style: string;
  blg: number;
  srm: number;
  ibu: number;
  abv: number;
  data: RecipeDraft;
}
