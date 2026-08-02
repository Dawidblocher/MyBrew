import { expect, type Locator, type Page } from "@playwright/test";

/**
 * The sign-in form is a `client:load` React island over server-rendered markup.
 * Hydration can land after the first fill and reset the controlled input, so
 * retry until the value sticks.
 */
async function fillWhenHydrated(field: Locator, value: string) {
  await expect(async () => {
    await field.fill(value);
    await expect(field).toHaveValue(value);
  }).toPass();
}

/**
 * Sign in through the form, confirm the session on a protected route, then
 * persist browser storage for later Playwright projects.
 */
export async function signInAndSaveState(page: Page, email: string, password: string, storageStatePath: string) {
  await page.goto("/auth/signin");

  await fillWhenHydrated(page.getByLabel("Email", { exact: true }), email);
  await fillWhenHydrated(page.getByLabel("Password", { exact: true }), password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await page.waitForURL("/");

  // A cookie alone proves nothing — confirm it survives a protected route,
  // which is the only thing the saved state is used for.
  await page.goto("/recipes");
  await expect(page).toHaveURL(/\/recipes\/?$/);

  await page.context().storageState({ path: storageStatePath });
}
