import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase";
import { buildRecipeInsert } from "@/lib/recipe-save";
import type { RecipeDraft } from "@/types";

export const prerender = false;

export const POST: APIRoute = async (context) => {
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

  const { data, error } = await supabase.from("recipes").insert(built.insert).select("id").single<{ id: string }>();

  if (error) {
    console.error("recipes insert failed:", error);
    return Response.json(
      {
        error: "Failed to save recipe",
        ...(import.meta.env.DEV ? { detail: error.message, code: error.code } : {}),
      },
      { status: 500 },
    );
  }

  return Response.json({ id: data.id }, { status: 201 });
};
