/**
 * SRM (beer color) via the Morey equation.
 *
 * Efficiency-independent: color comes from malt amounts and their EBC color,
 * not from extract yield.
 */

import type { CalcResult, SrmInput } from "./types";

/** EBC ≈ 1.97 × °Lovibond, so °L ≈ EBC / 1.97. */
const EBC_PER_LOVIBOND = 1.97;
const KG_PER_LB = 0.45359237;
const L_PER_GAL = 3.785411784;

/**
 * Compute SRM = `1.4922 × MCU^0.6859`, where MCU is the Malt Color Unit sum
 * `Σ (°L × weight_lb) / volume_gal`. Malt color is converted EBC→°L and metric
 * kg/L is converted to lb/gal for the (imperial) Morey formula — these
 * conversions are an internal detail, never an input/output unit.
 *
 * Provenance: Morey (2000) SRM equation; MCU from Daniels, "Designing Great
 * Beers". Returns `{ ok: false }` for empty grist / non-positive volume.
 */
export function calcSRM(input: SrmInput): CalcResult<number> {
  const { malts, volumeL } = input;

  if (!(volumeL > 0)) {
    return { ok: false, reason: "Batch volume must be positive." };
  }

  const validMalts = malts.filter((m) => m.amountKg > 0 && m.colorEbc > 0);
  if (validMalts.length === 0) {
    return { ok: false, reason: "Grist must contain at least one malt with positive amount and color." };
  }

  const volumeGal = volumeL / L_PER_GAL;
  const mcu = validMalts.reduce((sum, m) => {
    const lovibond = m.colorEbc / EBC_PER_LOVIBOND;
    const weightLb = m.amountKg / KG_PER_LB;
    return sum + (lovibond * weightLb) / volumeGal;
  }, 0);

  return { ok: true, value: 1.4922 * mcu ** 0.6859 };
}
