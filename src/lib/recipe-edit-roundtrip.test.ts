import { describe, expect, it } from "vitest";

import { createFakeSupabase } from "@/lib/__tests__/fake-supabase";
import { recipeRow } from "@/lib/__tests__/fixtures";
import type { RecipeRecordRow } from "@/lib/recipe-mappers";
import { getRecipe, updateRecipe } from "@/lib/recipe-queries";
import { buildRecipeInsert } from "@/lib/recipe-save";
import { computeWizardMetrics } from "@/lib/recipe-to-calc";
import type { RecipeDraft, RecipeRecord } from "@/types";

/**
 * App edit path: getRecipe → record.data as form initialData → buildRecipeInsert
 * → updateRecipe (no user_id, same as the PUT handler) → getRecipe.
 */
async function editAndRead(seed: RecipeRecordRow, mutate?: (data: RecipeDraft) => RecipeDraft) {
  const fake = createFakeSupabase([seed]);
  const before = await getRecipe(fake, seed.user_id, seed.id);
  if (!before) throw new Error("expected seeded recipe");

  const draftForSave = mutate ? mutate(structuredClone(before.data)) : before.data;
  const built = buildRecipeInsert(draftForSave, seed.user_id);
  if (!built.ok) return { before, after: null as RecipeRecord | null, built };

  const { user_id: _userId, ...payload } = built.insert;
  const updated = await updateRecipe(fake, seed.user_id, seed.id, payload);
  if (!updated.ok) return { before, after: null as RecipeRecord | null, built };

  const after = await getRecipe(fake, seed.user_id, seed.id);
  return { before, after, built };
}

describe("recipe edit round-trip", () => {
  it("re-saving read data without changes is idempotent for data and metrics", async () => {
    const seed = recipeRow();
    const { before, after, built } = await editAndRead(seed);

    expect(built.ok).toBe(true);
    expect(after).not.toBeNull();
    if (!after) throw new Error("expected successful edit round-trip");

    expect(after.data).toEqual(before.data);
    expect(after.blg).toBeCloseTo(before.blg, 5);
    expect(after.srm).toBeCloseTo(before.srm, 5);
    expect(after.ibu).toBeCloseTo(before.ibu, 5);
    expect(after.abv).toBeCloseTo(before.abv, 5);
  });

  it("mutating a single metric-affecting field updates only that field and recomputes metrics", async () => {
    const seed = recipeRow();
    const nextAmountKg = seed.data.malts[0].amountKg + 1;

    const { before, after, built } = await editAndRead(seed, (data) => ({
      ...data,
      malts: data.malts.map((malt, index) => (index === 0 ? { ...malt, amountKg: nextAmountKg } : malt)),
    }));

    expect(built.ok).toBe(true);
    expect(after).not.toBeNull();
    if (!after) throw new Error("expected successful edit round-trip");

    const expectedData: RecipeDraft = {
      ...before.data,
      malts: before.data.malts.map((malt, index) => (index === 0 ? { ...malt, amountKg: nextAmountKg } : malt)),
    };
    expect(after.data).toEqual(expectedData);

    expect(after.blg).not.toBeCloseTo(before.blg, 5);
    const expected = computeWizardMetrics(after.data);
    if (!expected.blg.ok || !expected.srm.ok || !expected.ibu.ok || !expected.abv.ok) {
      throw new Error("expected metrics for mutated draft");
    }
    expect(after.blg).toBeCloseTo(expected.blg.value, 5);
    expect(after.srm).toBeCloseTo(expected.srm.value, 5);
    expect(after.ibu).toBeCloseTo(expected.ibu.value, 5);
    expect(after.abv).toBeCloseTo(expected.abv.value, 5);
  });

  it("metric columns match computeWizardMetrics of the persisted after.data", async () => {
    const seed = recipeRow();
    const { after, built } = await editAndRead(seed, (data) => ({
      ...data,
      malts: data.malts.map((malt, index) => (index === 0 ? { ...malt, amountKg: malt.amountKg + 1.5 } : malt)),
    }));

    expect(built.ok).toBe(true);
    expect(after).not.toBeNull();
    if (!after) throw new Error("expected successful edit round-trip");

    const fromPersisted = computeWizardMetrics(after.data);
    if (!fromPersisted.blg.ok || !fromPersisted.srm.ok || !fromPersisted.ibu.ok || !fromPersisted.abv.ok) {
      throw new Error("expected metrics from persisted data");
    }

    expect(after.blg).toBeCloseTo(fromPersisted.blg.value, 5);
    expect(after.srm).toBeCloseTo(fromPersisted.srm.value, 5);
    expect(after.ibu).toBeCloseTo(fromPersisted.ibu.value, 5);
    expect(after.abv).toBeCloseTo(fromPersisted.abv.value, 5);
  });

  it("update stamps updatedAt later than seeded created_at and leaves createdAt untouched", async () => {
    const seed = recipeRow();
    const { before, after, built } = await editAndRead(seed);

    expect(built.ok).toBe(true);
    expect(after).not.toBeNull();
    if (!after) throw new Error("expected successful edit round-trip");

    expect(after.createdAt).toBe(before.createdAt);
    expect(after.createdAt).toBe(seed.created_at);
    expect(after.updatedAt).not.toBe(seed.created_at);
    expect(new Date(after.updatedAt).getTime()).toBeGreaterThan(new Date(seed.created_at).getTime());
  });
});

/**
 * Characterizes how save reacts to jsonb that no longer matches today's draft
 * shape. Fields are chosen outside the metrics engine (`recipe-to-calc.ts`
 * reads efficiencyPct / attenuationPct / volume / malts / hops — not these),
 * so a silent rewrite is not masked by a metrics error.
 *
 * Observed today: `z.coerce.number` turns `null` into `0` and saves; a missing
 * key fails validation. Do not "fix" the coercion here — Phase 5 records it.
 */
describe("degraded jsonb characterization", () => {
  it("null mash.waterToGrainRatio coerces to 0 and saves successfully", () => {
    const seed = recipeRow({ data: { mash: { waterToGrainRatio: 3 } } });
    const data = structuredClone(seed.data);
    const degraded = {
      ...data,
      mash: { ...data.mash, waterToGrainRatio: null },
    } as unknown as RecipeDraft;

    const result = buildRecipeInsert(degraded, seed.user_id);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.insert.data.mash.waterToGrainRatio).toBe(0);
  });

  it("missing mash.waterToGrainRatio rejects with field mash.waterToGrainRatio", () => {
    const seed = recipeRow({ data: { mash: { waterToGrainRatio: 3 } } });
    const degraded = structuredClone(seed.data);
    delete (degraded.mash as { waterToGrainRatio?: number }).waterToGrainRatio;

    const result = buildRecipeInsert(degraded, seed.user_id);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual([{ field: "mash.waterToGrainRatio", message: "Podaj stosunek woda/słód" }]);
  });
});
