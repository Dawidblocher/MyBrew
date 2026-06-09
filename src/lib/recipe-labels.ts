import type { AdjunctStage, HopStage } from "@/types";

export const HOP_STAGE_LABELS: Record<HopStage, string> = {
  boil: "Gotowanie",
  whirlpool: "Whirlpool",
  dryHop: "Chmielenie na zimno",
};

export const ADJUNCT_STAGE_LABELS: Record<AdjunctStage, string> = {
  mash: "Zacieranie",
  boil: "Gotowanie",
  whirlpool: "Whirlpool",
  fermentation: "Fermentacja",
};
