/**
 * ABV (alcohol by volume) from original gravity and yeast attenuation.
 *
 * OG (as SG) is supplied by the caller — the aggregate feeds the gravity it
 * computes; a standalone caller supplies measured OG.
 */

import type { AbvInput, CalcResult } from "./types";

/**
 * Compute ABV%: derive `FG_points = OG_points × (1 − attenuation)`, then
 * `ABV% = (OG − FG) × 131.25`.
 *
 * Provenance: standard apparent-attenuation ABV formula (e.g. Palmer,
 * "How to Brew"). Returns `{ ok: false }` for OG ≤ 1.0 or attenuation
 * outside (0, 1].
 */
export function calcABV(input: AbvInput): CalcResult<number> {
  const { og, attenuation } = input;

  if (!(og > 1)) {
    return { ok: false, reason: "Original gravity must be greater than 1.0." };
  }
  if (!(attenuation > 0 && attenuation <= 1)) {
    return { ok: false, reason: "Attenuation must be a fraction in (0, 1]." };
  }

  const ogPoints = (og - 1) * 1000;
  const fgPoints = ogPoints * (1 - attenuation);
  const fg = 1 + fgPoints / 1000;

  return { ok: true, value: (og - fg) * 131.25 };
}
