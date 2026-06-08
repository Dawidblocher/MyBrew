import { saveRecipeSchema } from "@/lib/recipe-schema";
import { computeWizardMetrics } from "@/lib/recipe-to-calc";
import type { RecipeDraft, RecipeInsert } from "@/types";

export interface SaveValidationError {
  field: string;
  message: string;
}

const METRIC_KEYS = ["blg", "srm", "ibu", "abv"] as const;

const METRIC_LABELS: Record<(typeof METRIC_KEYS)[number], string> = {
  blg: "BLG",
  srm: "Barwa (SRM)",
  ibu: "IBU",
  abv: "ABV",
};

export function buildRecipeInsert(
  draft: RecipeDraft,
  userId: string,
): { ok: true; insert: RecipeInsert } | { ok: false; errors: SaveValidationError[] } {
  const parsed = saveRecipeSchema.safeParse(draft);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    };
  }

  const metrics = computeWizardMetrics(draft);

  if (!metrics.blg.ok || !metrics.srm.ok || !metrics.ibu.ok || !metrics.abv.ok) {
    const errors: SaveValidationError[] = [];
    for (const key of METRIC_KEYS) {
      const result = metrics[key];
      if (!result.ok) {
        errors.push({
          field: `metrics.${key}`,
          message: result.reason || `Nie można obliczyć ${METRIC_LABELS[key]}`,
        });
      }
    }
    return { ok: false, errors };
  }

  return {
    ok: true,
    insert: {
      user_id: userId,
      name: parsed.data.basics.name,
      style: parsed.data.basics.style,
      blg: metrics.blg.value,
      srm: metrics.srm.value,
      ibu: metrics.ibu.value,
      abv: metrics.abv.value,
      data: parsed.data,
    },
  };
}
