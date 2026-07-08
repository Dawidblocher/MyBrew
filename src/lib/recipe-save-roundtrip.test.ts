import { describe, expect, it } from "vitest";

import { createFakeSupabase } from "@/lib/__tests__/fake-supabase";
import { draftWithHops } from "@/lib/__tests__/fixtures";
import { getRecipe } from "@/lib/recipe-queries";
import { buildRecipeInsert } from "@/lib/recipe-save";
import { computeWizardMetrics } from "@/lib/recipe-to-calc";
import type { RecipeDraft } from "@/types";

const USER_ID = "user-roundtrip-test";

async function saveAndRead(draft: RecipeDraft, userId = USER_ID) {
  const built = buildRecipeInsert(draft, userId);
  if (!built.ok) return { built, record: null };

  const fake = createFakeSupabase();
  const { data, error } = await fake.from("recipes").insert(built.insert).select("id").single<{ id: string }>();

  if (error) return { built, record: null };

  const record = await getRecipe(fake, userId, data.id);
  return { built, record };
}

describe("recipe save round-trip", () => {
  it("insert → getRecipe preserves parsed data and server metrics", async () => {
    const draft = draftWithHops();
    const expected = computeWizardMetrics(draft);
    const { built, record } = await saveAndRead(draft);

    expect(built.ok).toBe(true);
    if (!built.ok || !record) throw new Error("expected successful round-trip");

    expect(record.data).toEqual(built.insert.data);
    expect(record.name).toBe(built.insert.data.basics.name);
    expect(record.style).toBe(built.insert.data.basics.style);

    if (expected.blg.ok && expected.srm.ok && expected.ibu.ok && expected.abv.ok) {
      expect(record.blg).toBeCloseTo(expected.blg.value, 5);
      expect(record.srm).toBeCloseTo(expected.srm.value, 5);
      expect(record.ibu).toBeCloseTo(expected.ibu.value, 5);
      expect(record.abv).toBeCloseTo(expected.abv.value, 5);
    }
  });

  it("server metrics ignore client-injected metric keys on draft body", () => {
    const draft = draftWithHops();
    const poisoned = {
      ...draft,
      blg: 999,
      srm: 888,
      ibu: 777,
      abv: 666,
    } as RecipeDraft;

    const expected = computeWizardMetrics(draft);
    const result = buildRecipeInsert(poisoned, USER_ID);

    expect(result.ok).toBe(true);
    if (!result.ok || !expected.blg.ok || !expected.srm.ok || !expected.ibu.ok || !expected.abv.ok) return;

    expect(result.insert.blg).toBe(expected.blg.value);
    expect(result.insert.srm).toBe(expected.srm.value);
    expect(result.insert.ibu).toBe(expected.ibu.value);
    expect(result.insert.abv).toBe(expected.abv.value);
    expect(result.insert.blg).not.toBe(999);
  });

  it("strips unknown keys from parsed.data (intentional Zod default, not .strict())", () => {
    const draft = draftWithHops();
    const withUnknown = {
      ...draft,
      rogueTopLevel: "remove-me",
      basics: { ...draft.basics, rogueBasics: "remove-me-too" },
    } as unknown as RecipeDraft;

    const result = buildRecipeInsert(withUnknown, USER_ID);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.insert.data).not.toHaveProperty("rogueTopLevel");
    expect(result.insert.data.basics).not.toHaveProperty("rogueBasics");
  });
});
