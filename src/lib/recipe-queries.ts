import type { createClient } from "@/lib/supabase";
import { mapRowToListItem, mapRowToRecord, type RecipeListRow, type RecipeRecordRow } from "@/lib/recipe-mappers";
import type { RecipeListItem, RecipeRecord } from "@/types";

type SupabaseClient = NonNullable<ReturnType<typeof createClient>>;

export async function listRecipes(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ ok: true; items: RecipeListItem[] } | { ok: false }> {
  const { data, error } = await supabase
    .from("recipes")
    .select("id, name, style, blg, srm, ibu, abv, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return { ok: false };
  return { ok: true, items: (data as RecipeListRow[]).map(mapRowToListItem) };
}

export async function getRecipe(supabase: SupabaseClient, userId: string, id: string): Promise<RecipeRecord | null> {
  const response = await supabase.from("recipes").select("*").eq("user_id", userId).eq("id", id).maybeSingle();

  if (response.error || !response.data) return null;
  return mapRowToRecord(response.data as RecipeRecordRow);
}
