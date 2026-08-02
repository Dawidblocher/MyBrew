import { test as setup } from "@playwright/test";
import { STORAGE_STATE } from "../playwright.config";
import { signInAndSaveState } from "./support/sign-in";

const email = process.env.E2E_USERNAME;
const password = process.env.E2E_PASSWORD;

setup("authenticate", async ({ page }) => {
  if (!email || !password) {
    throw new Error("Missing E2E_USERNAME / E2E_PASSWORD. Add them to .env.test — see .env.example.");
  }

  await signInAndSaveState(page, email, password, STORAGE_STATE);
});
