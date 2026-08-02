import { expect, type Page } from "@playwright/test";

/**
 * Sign in through the form, confirm the session on a protected route, then
 * persist browser storage for later Playwright projects.
 *
 * The sign-in form is a `client:load` React island over server-rendered markup.
 * Hydration can clear one controlled field after the other was filled, so both
 * must be verified sticky immediately before submit.
 */
export async function signInAndSaveState(page: Page, email: string, password: string, storageStatePath: string) {
  await page.goto("/auth/signin");

  const emailField = page.getByLabel("Email", { exact: true });
  const passwordField = page.getByLabel("Password", { exact: true });

  await expect(async () => {
    await emailField.fill(email);
    await passwordField.fill(password);
    await expect(emailField).toHaveValue(email);
    await expect(passwordField).toHaveValue(password);
  }).toPass();

  await page.getByRole("button", { name: "Sign in" }).click();

  await page.waitForURL("/");

  // A cookie alone proves nothing — confirm it survives a protected route,
  // which is the only thing the saved state is used for.
  await page.goto("/recipes");
  await expect(page).toHaveURL(/\/recipes\/?$/);

  await page.context().storageState({ path: storageStatePath });
}
