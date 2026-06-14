import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase";
import { buildRecipeInsert } from "@/lib/recipe-save";
import { updateRecipe, deleteRecipe } from "@/lib/recipe-queries";
import type { RecipeDraft } from "@/types";

export const prerender = false;

export const PUT: APIRoute = async (context) => {
  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return Response.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = context.params;
  if (!id) {
    return Response.json({ error: "Missing recipe id" }, { status: 400 });
  }

  let body: RecipeDraft;
  try {
    body = (await context.request.json()) as RecipeDraft;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const built = buildRecipeInsert(body, user.id);
  if (!built.ok) {
    return Response.json({ errors: built.errors }, { status: 400 });
  }

  const { user_id: _userId, ...updatePayload } = built.insert;
  const result = await updateRecipe(supabase, user.id, id, updatePayload);

  if (!result.ok) {
    if (result.notFound) {
      return Response.json({ error: "Recipe not found" }, { status: 404 });
    }
    return Response.json({ error: "Failed to update recipe" }, { status: 500 });
  }

  return Response.json({ id }, { status: 200 });
};

export const DELETE: APIRoute = async (context) => {
  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return Response.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = context.params;
  if (!id) {
    return Response.json({ error: "Missing recipe id" }, { status: 400 });
  }

  const result = await deleteRecipe(supabase, user.id, id);
  if (!result.ok) {
    return Response.json({ error: "Failed to delete recipe" }, { status: 500 });
  }

  return new Response(null, { status: 204 });
};
