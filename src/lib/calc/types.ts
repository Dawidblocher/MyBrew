/**
 * Public contract for the beer-metrics calculation engine.
 *
 * All inputs use canonical metric units. The engine is decoupled from the
 * wizard `RecipeDraft` (`@/types`) and from any DB entity — callers map their
 * own shapes onto these dedicated calc inputs at their seam.
 */

/**
 * Discriminated result wrapper. The engine never throws and never returns
 * `NaN`/`Infinity`/`null`: insufficient or invalid input surfaces as
 * `{ ok: false, reason }` so consumers render a sentinel (e.g. `—`).
 */
export type CalcResult<T> = { ok: true; value: T } | { ok: false; reason: string };

/** A single fermentable in the grist. */
export interface CalcMalt {
  /** Mass in kilograms. */
  amountKg: number;
  /** Color in EBC. */
  colorEbc: number;
  /** Extract potential as a percentage (e.g. 80 for 80%). */
  extractPercent: number;
}

/** Input to {@link calcBLG}: grist + efficiency + volume. */
export interface BlgInput {
  malts: CalcMalt[];
  /** Batch volume in liters. */
  volumeL: number;
  /** Mash efficiency as a fraction in (0,1]. */
  mashEfficiency: number;
}

/** Input to {@link calcSRM}: grist color + volume (efficiency-independent). */
export interface SrmInput {
  malts: CalcMalt[];
  /** Batch volume in liters. */
  volumeL: number;
}

/** A single hop addition in the boil. */
export interface HopAddition {
  /** Alpha-acid content as a percentage (e.g. 5.5 for 5.5% AA). */
  alphaAcidPercent: number;
  /** Mass in grams. */
  amountG: number;
  /** Boil time in minutes. */
  boilTimeMin: number;
  /**
   * Dimensionless utilization multiplier in `[0, 1]`, default `1.0`.
   * Scales Tinseth utilization for a single addition (e.g. whirlpool vs boil)
   * without encoding stage semantics in the engine.
   */
  utilizationFactor?: number;
}

/** Input to {@link calcIBU}: hop schedule + volume + boil gravity. */
export interface IbuInput {
  hops: HopAddition[];
  /** Batch volume in liters. */
  volumeL: number;
  /** Specific gravity of the boil (e.g. 1.050). Supplied by the caller. */
  sg: number;
}

/** Input to {@link calcABV}: original gravity + yeast attenuation. */
export interface AbvInput {
  /** Original specific gravity (e.g. 1.050). Supplied by the caller. */
  og: number;
  /** Apparent attenuation as a fraction in (0,1]. */
  attenuation: number;
}

/** Aggregate input to {@link computeMetrics}. */
export interface RecipeMetricsInput {
  malts: CalcMalt[];
  /** Batch volume in liters. */
  volumeL: number;
  /** Mash efficiency as a fraction in (0,1]. */
  mashEfficiency: number;
  hops: HopAddition[];
  /** Apparent attenuation as a fraction in (0,1]. */
  attenuation: number;
}

/** Aggregate output: each metric resolves independently. */
export interface RecipeMetrics {
  blg: CalcResult<number>;
  srm: CalcResult<number>;
  ibu: CalcResult<number>;
  abv: CalcResult<number>;
}
