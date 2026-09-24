import type { APIRoute } from "astro";
import { toPolishAuthError } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const email = form.get("email") as string;
  const password = form.get("password") as string;

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return context.redirect(
      `/auth/signup?error=${encodeURIComponent(toPolishAuthError("Supabase is not configured"))}`,
    );
  }
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return context.redirect(`/auth/signup?error=${encodeURIComponent(toPolishAuthError(error.message))}`);
  }

  return context.redirect("/auth/confirm-email");
};
