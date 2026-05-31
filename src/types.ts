export interface MaltEntry {
  amountKg: number;
  colorEbc: number;
  extractPercent: number;
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
}
