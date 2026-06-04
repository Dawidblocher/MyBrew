/**
 * BLG (°Balling ≈ °Plato) — extract concentration of the wort.
 */

import { computeGravity } from "./gravity";
import type { BlgInput, CalcResult } from "./types";

/**
 * Convert specific gravity to °Plato/°Balling via the standard hydrometer
 * approximation `259 − 259/SG`. Provenance: common brewing conversion
 * (e.g. Brewer's Friend Plato↔SG).
 */
export function blgFromSg(sg: number): number {
  return 259 - 259 / sg;
}

/**
 * Compute °BLG from the grist, efficiency, and volume.
 *
 * Returns `{ ok: false }` when gravity cannot be derived (empty grist,
 * non-positive volume, out-of-range efficiency).
 */
export function calcBLG(input: BlgInput): CalcResult<number> {
  const gravity = computeGravity(input);
  if (!gravity.ok) {
    return gravity;
  }
  return { ok: true, value: blgFromSg(gravity.value.sg) };
}
