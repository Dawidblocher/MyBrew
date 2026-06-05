/**
 * Wizard draft → calc-engine input mapping.
 *
 * This is the single seam between the in-memory `RecipeDraft` (`@/types`) and
 * the F-02 calculation engine (`@/lib/calc`). The insufficient-input guards
 * live here so the UI can render `—` instead of `NaN`/`Infinity` before the
 * minimum inputs exist.
 */

import { calcBLG, calcIBU, calcSRM, computeGravity } from "@/lib/calc";
import type { BlgInput, CalcResult, HopAddition } from "@/lib/calc";
import type { HopEntry, RecipeDraft } from "@/types";

/**
 * Approximate whirlpool utilization relative to a full boil addition.
 * Applied as a Tinseth utilization multiplier, not a boil-time substitute.
 */
export const WHIRLPOOL_UTILIZATION_FACTOR = 0.25;

/**
 * Result of mapping a draft to calc inputs: either ready-to-compute engine
 * inputs, or a "not enough input" sentinel when the draft cannot yield numbers.
 */
export type DraftCalcInput = { ok: true; input: BlgInput } | { ok: false; reason: string };

function mashEfficiencyFromDraft(draft: RecipeDraft): number | null {
  const pct = draft.mash.efficiencyPct;
  if (!(Number.isFinite(pct) && pct > 0 && pct <= 100)) {
    return null;
  }
  return pct / 100;
}

function mapDraftHopsToCalc(hops: HopEntry[]): HopAddition[] {
  return hops
    .filter((h) => h.stage !== "dryHop")
    .filter((h) => h.alphaAcidPercent > 0 && h.amountG > 0 && h.timeMin > 0)
    .map((h) => ({
      alphaAcidPercent: h.alphaAcidPercent,
      amountG: h.amountG,
      boilTimeMin: h.timeMin,
      utilizationFactor: h.stage === "whirlpool" ? WHIRLPOOL_UTILIZATION_FACTOR : 1,
    }));
}

/**
 * Translate the current `RecipeDraft` into the engine's `BlgInput` (which also
 * satisfies SRM's `SrmInput`), using mash efficiency from the draft.
 *
 * Returns the insufficient-input sentinel when batch volume is not positive,
 * mash efficiency is outside `(0, 100]`, or no malt has a positive amount.
 * Zero-amount malts are dropped from the grist.
 */
export function mapDraftToCalcInput(draft: RecipeDraft): DraftCalcInput {
  const volumeL = draft.batch.volumeL;
  // Require a finite positive value: `NaN`/`Infinity` from a cleared or
  // overflowing numeric input must route to the sentinel, never to the engine.
  if (!(Number.isFinite(volumeL) && volumeL > 0)) {
    return { ok: false, reason: "Batch volume must be positive." };
  }

  const mashEfficiency = mashEfficiencyFromDraft(draft);
  if (mashEfficiency === null) {
    return { ok: false, reason: "Mash efficiency must be a percentage in (0, 100]." };
  }

  const malts = draft.malts
    .filter((m) => Number.isFinite(m.amountKg) && m.amountKg > 0)
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
    input: { malts, volumeL, mashEfficiency },
  };
}

/** Live metrics surfaced by the wizard in this slice. */
export interface WizardMetrics {
  blg: CalcResult<number>;
  srm: CalcResult<number>;
  ibu: CalcResult<number>;
}

/**
 * Compute the live BLG, SRM, and IBU for a draft. The insufficient-input
 * sentinel from the mapping propagates to all three metrics so the panel shows
 * `—`. Gravity is computed once for IBU; BLG/SRM use the engine as before.
 */
export function computeWizardMetrics(draft: RecipeDraft): WizardMetrics {
  const mapped = mapDraftToCalcInput(draft);
  if (!mapped.ok) {
    return { blg: mapped, srm: mapped, ibu: mapped };
  }

  const { malts, volumeL, mashEfficiency } = mapped.input;
  const gravity = computeGravity({ malts, volumeL, mashEfficiency });
  const hops = mapDraftHopsToCalc(draft.hops);

  return {
    blg: calcBLG({ malts, volumeL, mashEfficiency }),
    srm: calcSRM({ malts, volumeL }),
    ibu: gravity.ok ? calcIBU({ hops, volumeL, sg: gravity.value.sg }) : gravity,
  };
}
