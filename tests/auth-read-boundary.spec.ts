import { expect, test } from "@playwright/test";

/**
 * Guest session boundary (test-plan Risk #4).
 * Runs only in the `guest` project — no storageState, no setup dependency.
 */
const protectedPaths = [
  "/recipes",
  "/recipes/new",
  "/recipes/nieistniejacy-id",
  "/recipes/nieistniejacy-id/edit",
  "/dashboard",
] as const;

for (const pathname of protectedPaths) {
  test(`guest is redirected from ${pathname} to sign-in`, async ({ page }) => {
    await page.goto(pathname);
    await expect(page).toHaveURL(/\/auth\/signin\/?$/);
  });
}

test("POST /api/recipes returns 401 without a session", async ({ request, baseURL }) => {
  expect(baseURL).toBeTruthy();
  // Same-origin Origin so Vite's CSRF guard does not short-circuit before getUser().
  const response = await request.post("/api/recipes", {
    headers: { Origin: baseURL ?? "" },
  });
  expect(response.status()).toBe(401);
  await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
});

test("GET /api/recipes returns 404 — no read API surface", async ({ request }) => {
  // Astro returns 404 (not 405) when the route exists but exports no GET handler.
  const response = await request.get("/api/recipes");
  expect(response.status()).toBe(404);
});
