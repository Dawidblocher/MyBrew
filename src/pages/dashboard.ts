import type { APIRoute } from "astro";

export const prerender = false;

// Legacy route kept in PROTECTED_ROUTES; the recipe list is the signed-in home.
export const GET: APIRoute = ({ redirect }) => redirect("/recipes");
