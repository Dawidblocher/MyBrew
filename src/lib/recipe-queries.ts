import type { createClient } from "@/lib/supabase";
import { mapRowToListItem, mapRowToRecord, type RecipeListRow, type RecipeRecordRow } from "@/lib/recipe-mappers";
import type { RecipeInsert, RecipeListItem, RecipeRecord } from "@/types";

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

type RecipeUpdatePayload = Omit<RecipeInsert, "user_id">;

export async function updateRecipe(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  payload: RecipeUpdatePayload,
): Promise<{ ok: true } | { ok: false; notFound: boolean; dbError?: string }> {
  const { data, error } = await supabase
    .from("recipes")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .select("id");

  if (error) {
    console.error("recipes update failed:", error);
    return { ok: false, notFound: false, dbError: error.message };
  }
  if (data.length === 0) return { ok: false, notFound: true };
  return { ok: true };
}

export async function deleteRecipe(supabase: SupabaseClient, userId: string, id: string): Promise<{ ok: boolean }> {
  const { error } = await supabase.from("recipes").delete().eq("id", id).eq("user_id", userId);

  return { ok: !error };
}
