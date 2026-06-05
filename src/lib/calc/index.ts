/**
 * Beer-metrics calculation engine — public entry point.
 *
 * Pure, stateless functions that compute BLG, SRM, IBU, and ABV from typed
 * metric-unit inputs. Every function returns a discriminated `CalcResult<T>`:
 * insufficient or invalid input surfaces as `{ ok: false, reason }` — the
 * engine never throws and never returns `NaN`/`Infinity`/`null`. See
 * `README.md` for units, formula provenance, and the full contract.
 */

import { calcABV } from "./abv";
import { blgFromSg } from "./blg";
import { computeGravity } from "./gravity";
import { calcIBU } from "./ibu";
import { calcSRM } from "./srm";
import type { CalcResult, RecipeMetrics, RecipeMetricsInput } from "./types";

export { calcBLG } from "./blg";
export { calcSRM } from "./srm";
export { calcIBU } from "./ibu";
export { calcABV } from "./abv";
export { computeGravity } from "./gravity";

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

export type { Gravity, GravityInput } from "./gravity";

/**
 * Compute all four metrics in one call, sharing gravity.
 *
 * Gravity is derived once from the grist/efficiency/volume and fed to BLG, IBU,
 * and ABV; SRM is computed independently from malt color. Each metric resolves
 * to its own `CalcResult<number>`, so a partial recipe yields the metrics it
 * can (e.g. grist-only → BLG/SRM populated, IBU/ABV `{ ok: false }`). When
 * gravity cannot be derived, the gravity-dependent metrics propagate that
 * `{ ok: false }` reason.
 */
export function computeMetrics(input: RecipeMetricsInput): RecipeMetrics {
  const { malts, volumeL, mashEfficiency, hops, attenuation } = input;

  const gravity = computeGravity({ malts, volumeL, mashEfficiency });

  const blg: CalcResult<number> = gravity.ok ? { ok: true, value: blgFromSg(gravity.value.sg) } : gravity;
  const srm = calcSRM({ malts, volumeL });
  const ibu: CalcResult<number> = gravity.ok ? calcIBU({ hops, volumeL, sg: gravity.value.sg }) : gravity;
  const abv: CalcResult<number> = gravity.ok ? calcABV({ og: gravity.value.sg, attenuation }) : gravity;

  return { blg, srm, ibu, abv };
}
