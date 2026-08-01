import { describe, expect, it } from "vitest";

import { createFakeSupabase } from "@/lib/__tests__/fake-supabase";
import { draftWithHops } from "@/lib/__tests__/fixtures";
import type { RecipeRecordRow } from "@/lib/recipe-mappers";
import { getRecipe, listRecipes } from "@/lib/recipe-queries";

const USER_A = "user-a";
const USER_B = "user-b";

const RECIPE_A_ID = "recipe-a";
const RECIPE_B_ID = "recipe-b";

function seedRow(overrides: Pick<RecipeRecordRow, "id" | "user_id" | "name">): RecipeRecordRow {
  const draft = draftWithHops({ basics: { name: overrides.name, style: "American IPA" } });
  const now = "2026-08-01T10:00:00.000Z";

  return {
    id: overrides.id,
    user_id: overrides.user_id,
    name: overrides.name,
    style: "American IPA",
    blg: 12,
    srm: 8,
    ibu: 40,
    abv: 5.5,
    data: draft,
    created_at: now,
    updated_at: now,
  };
}

const SEED: RecipeRecordRow[] = [
  seedRow({ id: RECIPE_A_ID, user_id: USER_A, name: "A's IPA" }),
  seedRow({ id: RECIPE_B_ID, user_id: USER_B, name: "B's Stout" }),
];

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
