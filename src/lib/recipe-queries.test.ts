import { describe, expect, it } from "vitest";

import { createFakeSupabase } from "@/lib/__tests__/fake-supabase";
import { draftWithHops, recipeRow } from "@/lib/__tests__/fixtures";
import type { RecipeRecordRow } from "@/lib/recipe-mappers";
import { deleteRecipe, getRecipe, listRecipes, updateRecipe } from "@/lib/recipe-queries";
import { buildRecipeInsert } from "@/lib/recipe-save";
import type { RecipeInsert } from "@/types";

const USER_A = "user-a";
const USER_B = "user-b";

const RECIPE_A_ID = "recipe-a";
const RECIPE_B_ID = "recipe-b";

const SEED: RecipeRecordRow[] = [
  recipeRow({ id: RECIPE_A_ID, user_id: USER_A, data: { basics: { name: "A's IPA" } } }),
  recipeRow({ id: RECIPE_B_ID, user_id: USER_B, data: { basics: { name: "B's Stout" } } }),
];

/** Same shape the PUT handler passes after stripping `user_id` from `buildRecipeInsert`. */
function updatePayload(name: string): Omit<RecipeInsert, "user_id"> {
  const built = buildRecipeInsert(draftWithHops({ basics: { name, style: "American IPA" } }), "ignored");
  if (!built.ok) throw new Error("fixture draft failed validation");
  const { user_id: _userId, ...payload } = built.insert;
  return payload;
}

describe("recipe-queries cross-user isolation", () => {
  it("listRecipes returns only the caller's recipes", async () => {
    const fake = createFakeSupabase(SEED);

    const result = await listRecipes(fake, USER_A);

    expect(result).toEqual({
      ok: true,
      items: [
        expect.objectContaining({
          id: RECIPE_A_ID,
          name: "A's IPA",
        }),
      ],
    });
    if (!result.ok) throw new Error("expected ok list");
    expect(result.items).toHaveLength(1);
    expect(result.items.map((item) => item.id)).not.toContain(RECIPE_B_ID);
  });

  it("getRecipe returns null for another user's recipe id", async () => {
    const fake = createFakeSupabase(SEED);

    const record = await getRecipe(fake, USER_A, RECIPE_B_ID);

    expect(record).toBeNull();
  });

  it("getRecipe returns the caller's own recipe", async () => {
    const fake = createFakeSupabase(SEED);

    const record = await getRecipe(fake, USER_A, RECIPE_A_ID);

    expect(record).not.toBeNull();
    expect(record).toEqual(
      expect.objectContaining({
        id: RECIPE_A_ID,
        userId: USER_A,
        name: "A's IPA",
      }),
    );
  });
});

describe("recipe-queries cross-user mutations", () => {
  it("updateRecipe does not modify another user's recipe", async () => {
    const fake = createFakeSupabase(SEED);
    const victimBefore = fake._rows.find((row) => row.id === RECIPE_B_ID);
    expect(victimBefore).toBeDefined();
    if (!victimBefore) throw new Error("expected seeded recipe B");
    const victimSnapshot = structuredClone(victimBefore);
    const payload = updatePayload("Attacker's rewrite");

    const result = await updateRecipe(fake, USER_A, RECIPE_B_ID, payload);

    expect(result).toEqual({ ok: false, notFound: true });
    const victimAfter = fake._rows.find((row) => row.id === RECIPE_B_ID);
    expect(victimAfter).toBeDefined();
    if (!victimAfter) throw new Error("expected recipe B to remain");
    expect(victimAfter.name).toBe(victimSnapshot.name);
    expect(victimAfter.data).toEqual(victimSnapshot.data);
  });

  it("updateRecipe modifies the caller's own recipe", async () => {
    const fake = createFakeSupabase(SEED);
    const payload = updatePayload("A's revised IPA");

    const result = await updateRecipe(fake, USER_A, RECIPE_A_ID, payload);

    expect(result).toEqual({ ok: true });
    const ownRow = fake._rows.find((row) => row.id === RECIPE_A_ID);
    expect(ownRow).toBeDefined();
    if (!ownRow) throw new Error("expected recipe A to remain");
    expect(ownRow.name).toBe("A's revised IPA");
    expect(ownRow.data.basics.name).toBe("A's revised IPA");
  });

  it("deleteRecipe leaves another user's recipe in place", async () => {
    const fake = createFakeSupabase(SEED);

    const result = await deleteRecipe(fake, USER_A, RECIPE_B_ID);

    expect(result).toEqual({ ok: true });
    expect(fake._rows.some((row) => row.id === RECIPE_B_ID)).toBe(true);
  });

  it("deleteRecipe removes only the caller's own recipe", async () => {
    const fake = createFakeSupabase(SEED);

    const result = await deleteRecipe(fake, USER_A, RECIPE_A_ID);

    expect(result).toEqual({ ok: true });
    expect(fake._rows.some((row) => row.id === RECIPE_A_ID)).toBe(false);
    expect(fake._rows.some((row) => row.id === RECIPE_B_ID)).toBe(true);
  });
});
