import { expect, test, type APIRequestContext, type BrowserContext } from "@playwright/test";
import { draftWithHops } from "@/lib/__tests__/fixtures";
import { STORAGE_STATE, STORAGE_STATE_B } from "../playwright.config";

/**
 * Cross-user IDOR on recipe mutations (test-plan Risk #2).
 * Runs only in the `crossuser` project — builds both identities via explicit contexts.
 *
 * Shared seed: B's recipe is the attack target for PUT + DELETE, so cases run serially.
 */
test.describe.configure({ mode: "serial" });

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const nameB = `IDOR-victim-B-${runId}`;
const nameA = `IDOR-owner-A-${runId}`;
const attackName = `IDOR-attacker-A-${runId}`;

let requestA: APIRequestContext;
let requestB: APIRequestContext;
let browserB: BrowserContext;
let recipeIdB: string;
let recipeIdA: string;
let origin = "";
let seeded = false;

async function createRecipe(request: APIRequestContext, name: string): Promise<string> {
  const response = await request.post("/api/recipes", {
    headers: { Origin: origin },
    data: draftWithHops({ basics: { name, style: "American IPA" } }),
  });
  expect(response.status(), await response.text()).toBe(201);
  const body = (await response.json()) as { id: string };
  expect(body.id).toBeTruthy();
  return body.id;
}

test.beforeAll(async ({ playwright, browser, baseURL }) => {
  expect(baseURL).toBeTruthy();
  origin = baseURL ?? "";

  requestA = await playwright.request.newContext({
    baseURL: origin,
    storageState: STORAGE_STATE,
  });
  requestB = await playwright.request.newContext({
    baseURL: origin,
    storageState: STORAGE_STATE_B,
  });
  browserB = await browser.newContext({ storageState: STORAGE_STATE_B });

  recipeIdB = await createRecipe(requestB, nameB);
  recipeIdA = await createRecipe(requestA, nameA);
  seeded = true;
});

test.afterAll(async () => {
  if (!seeded) return;

  // Resilient cleanup: B's target may already be gone after the positive-control DELETE.
  await requestB.delete(`/api/recipes/${recipeIdB}`, { headers: { Origin: origin } }).catch(() => undefined);
  await requestA.delete(`/api/recipes/${recipeIdA}`, { headers: { Origin: origin } }).catch(() => undefined);
  await browserB.close();
  await requestA.dispose();
  await requestB.dispose();
});

test("positive control: A can PUT own recipe", async () => {
  const response = await requestA.put(`/api/recipes/${recipeIdA}`, {
    headers: { Origin: origin },
    data: draftWithHops({ basics: { name: `${nameA}-updated`, style: "American IPA" } }),
  });
  expect(response.status(), await response.text()).toBe(200);
  await expect(response.json()).resolves.toEqual({ id: recipeIdA });
});

test("PUT attack: A cannot overwrite B's recipe", async () => {
  const response = await requestA.put(`/api/recipes/${recipeIdB}`, {
    headers: { Origin: origin },
    data: draftWithHops({ basics: { name: attackName, style: "American IPA" } }),
  });
  expect(response.status(), await response.text()).toBe(404);
  await expect(response.json()).resolves.toEqual({ error: "Recipe not found" });

  const page = await browserB.newPage();
  await page.goto(`/recipes/${recipeIdB}`);
  // Role+name avoids Astro toolbar `<h1>`s that also sit in the document.
  await expect(page.getByRole("heading", { name: nameB })).toBeVisible();
  await expect(page.getByText(attackName)).toHaveCount(0);
  await page.close();
});

test("DELETE attack: A gets 204 (S-07 idempotency) but B's recipe survives", async () => {
  // 204 is intentional idempotency from S-07 — not proof of ownership.
  // Proof is that B's page still renders the original name.
  const response = await requestA.delete(`/api/recipes/${recipeIdB}`, {
    headers: { Origin: origin },
  });
  expect(response.status(), await response.text()).toBe(204);

  const page = await browserB.newPage();
  await page.goto(`/recipes/${recipeIdB}`);
  await expect(page.getByRole("heading", { name: nameB })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Nie znaleziono przepisu" })).toHaveCount(0);
  await page.close();
});

test("positive control: B can DELETE own recipe", async () => {
  const response = await requestB.delete(`/api/recipes/${recipeIdB}`, {
    headers: { Origin: origin },
  });
  expect(response.status(), await response.text()).toBe(204);

  const page = await browserB.newPage();
  await page.goto(`/recipes/${recipeIdB}`);
  await expect(page.getByRole("heading", { name: "Nie znaleziono przepisu" })).toBeVisible();
  await page.close();
});
