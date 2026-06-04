/**
 * Wizard draft → calc-engine input mapping.
 *
 * This is the single seam between the in-memory `RecipeDraft` (`@/types`) and
 * the F-02 calculation engine (`@/lib/calc`). The insufficient-input guards
 * live here so the UI can render `—` instead of `NaN`/`Infinity` before the
 * minimum inputs exist.
 */

import { calcBLG, calcSRM } from "@/lib/calc";
import type { BlgInput, CalcResult } from "@/lib/calc";
import type { RecipeDraft } from "@/types";

/**
 * Mash efficiency used to compute BLG in S-01. Mash efficiency is an S-02 user
 * input (FR-006); until that slice lands it is fixed at this single constant.
 * Replaced by user input in S-02.
 */
export const DEFAULT_MASH_EFFICIENCY = 0.75;

/**
 * Result of mapping a draft to calc inputs: either ready-to-compute engine
 * inputs, or a "not enough input" sentinel when the draft cannot yield numbers.
 */
export type DraftCalcInput = { ok: true; input: BlgInput } | { ok: false; reason: string };

/**
 * Translate the current `RecipeDraft` into the engine's `BlgInput` (which also
 * satisfies SRM's `SrmInput`), applying {@link DEFAULT_MASH_EFFICIENCY}.
 *
 * Returns the insufficient-input sentinel when batch volume is not positive or
 * no malt has a positive amount. Zero-amount malts are dropped from the grist.
 */
export function mapDraftToCalcInput(draft: RecipeDraft): DraftCalcInput {
  const volumeL = draft.batch.volumeL;
  if (!(volumeL > 0)) {
    return { ok: false, reason: "Batch volume must be positive." };
  }

  const malts = draft.malts
    .filter((m) => m.amountKg > 0)
    .map((m) => ({
      amountKg: m.amountKg,
      colorEbc: m.colorEbc,
      extractPercent: m.extractPercent,
    }));

  if (malts.length === 0) {
    return { ok: false, reason: "Grist must contain at least one malt with a positive amount." };
  }

  return {
    ok: true,
    input: { malts, volumeL, mashEfficiency: DEFAULT_MASH_EFFICIENCY },
  };
}

/** Live metrics surfaced by the wizard in this slice (S-01). */
export interface WizardMetrics {
  blg: CalcResult<number>;
  srm: CalcResult<number>;
}

/**
 * Compute the live BLG and SRM for a draft. The insufficient-input sentinel
 * from the mapping propagates to both metrics so the panel shows `—`.
 */
export function computeWizardMetrics(draft: RecipeDraft): WizardMetrics {
  const mapped = mapDraftToCalcInput(draft);
  if (!mapped.ok) {
    return { blg: mapped, srm: mapped };
  }

  const { malts, volumeL, mashEfficiency } = mapped.input;
  return {
    blg: calcBLG({ malts, volumeL, mashEfficiency }),
    srm: calcSRM({ malts, volumeL }),
  };
}
