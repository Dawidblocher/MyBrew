/**
 * IBU (bitterness) via the Tinseth model.
 *
 * Boil gravity (SG) is supplied by the caller — the aggregate feeds the same
 * gravity it computes for BLG/ABV; a standalone caller supplies measured SG.
 */

import type { CalcResult, IbuInput } from "./types";

/**
 * Tinseth "bigness factor": gravity's effect on hop utilization.
 * `1.65 × 0.000125^(SG − 1)` — utilization drops as wort gets denser.
 */
function bignessFactor(sg: number): number {
  return 1.65 * 0.000125 ** (sg - 1);
}

/** Tinseth boil-time factor: `(1 − e^(−0.04·t)) / 4.15`. */
function boilTimeFactor(minutes: number): number {
  return (1 - Math.exp(-0.04 * minutes)) / 4.15;
}

function clampUtilizationFactor(factor: number | undefined): number {
  const raw = factor ?? 1;
  if (!Number.isFinite(raw)) return 1;
  return Math.min(1, Math.max(0, raw));
}

/**
 * Compute total IBU as the sum over additions of
 * `AA_decimal × mass_g × utilization × 1000 / volumeL`, where
 * `utilization = bignessFactor(SG) × boilTimeFactor(t) × (utilizationFactor ?? 1)`.
 *
 * Provenance: Glenn Tinseth's IBU model (realbeer.com). Returns `{ ok: false }`
 * for non-positive volume, SG below 1.0, or no valid hop addition.
 */
export function calcIBU(input: IbuInput): CalcResult<number> {
  const { hops, volumeL, sg } = input;

  if (!(volumeL > 0)) {
    return { ok: false, reason: "Batch volume must be positive." };
  }
  if (!(sg >= 1)) {
    return { ok: false, reason: "Specific gravity must be at least 1.0." };
  }

  const validHops = hops.filter((h) => h.alphaAcidPercent > 0 && h.amountG > 0 && h.boilTimeMin > 0);
  if (validHops.length === 0) {
    return { ok: false, reason: "At least one hop addition with positive alpha, mass, and boil time is required." };
  }

  const bigness = bignessFactor(sg);
  const ibu = validHops.reduce((sum, h) => {
    const utilization = bigness * boilTimeFactor(h.boilTimeMin) * clampUtilizationFactor(h.utilizationFactor);
    const aaDecimal = h.alphaAcidPercent / 100;
    return sum + (aaDecimal * h.amountG * utilization * 1000) / volumeL;
  }, 0);

  return { ok: true, value: ibu };
}
