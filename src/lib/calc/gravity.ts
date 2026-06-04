/**
 * Shared original-gravity helper — the math root for BLG, IBU, and ABV.
 *
 * Internal to the engine (not on the public barrel). The aggregate computes
 * gravity once and feeds it to the gravity-dependent metrics.
 */

import type { CalcMalt, CalcResult } from "./types";

/**
 * Sucrose extract potential in metric units: gravity points per (kg of extract
 * per liter). Derived from 46 PPG (1 lb sucrose in 1 US gal → SG 1.046):
 * 46 / (0.45359237 kg / 3.785411784 L) ≈ 384. Provenance: Palmer, "How to
 * Brew", extract-potential / PPG method.
 */
export const EXTRACT_POINTS_PER_KG_PER_L = 384;

export interface Gravity {
  /** Gravity points (e.g. 50 for SG 1.050). */
  points: number;
  /** Specific gravity (e.g. 1.050). */
  sg: number;
}

export interface GravityInput {
  malts: CalcMalt[];
  /** Batch volume in liters. */
  volumeL: number;
  /** Mash efficiency as a fraction in (0,1]. */
  mashEfficiency: number;
}

/**
 * Compute original gravity from the grist, efficiency, and volume.
 *
 * Total fermentable extract = Σ `amountKg × extractPercent/100 × mashEfficiency`
 * (sucrose-equivalent kg). Gravity points = `384 × extractKg / volumeL`.
 * Returns `{ ok: false }` for empty grist, non-positive volume, or
 * out-of-range efficiency — never `NaN`/`Infinity`.
 */
export function computeGravity(input: GravityInput): CalcResult<Gravity> {
  const { malts, volumeL, mashEfficiency } = input;

  if (!(volumeL > 0)) {
    return { ok: false, reason: "Batch volume must be positive." };
  }
  if (!(mashEfficiency > 0 && mashEfficiency <= 1)) {
    return { ok: false, reason: "Mash efficiency must be a fraction in (0, 1]." };
  }

  const validMalts = malts.filter((m) => m.amountKg > 0 && m.extractPercent > 0);
  if (validMalts.length === 0) {
    return { ok: false, reason: "Grist must contain at least one malt with positive amount and extract." };
  }

  const extractKg = validMalts.reduce((sum, m) => sum + m.amountKg * (m.extractPercent / 100) * mashEfficiency, 0);
  const points = (EXTRACT_POINTS_PER_KG_PER_L * extractKg) / volumeL;
  const sg = 1 + points / 1000;

  return { ok: true, value: { points, sg } };
}
