/**
 * Beer-metrics calculation engine — public entry point.
 *
 * Per-metric functions and the aggregate `computeMetrics` are added in later
 * phases; this barrel currently re-exports the contract types.
 */

export type {
  CalcResult,
  CalcMalt,
  BlgInput,
  SrmInput,
  HopAddition,
  IbuInput,
  AbvInput,
  RecipeMetricsInput,
  RecipeMetrics,
} from "./types";
