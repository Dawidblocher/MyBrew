import { test as setup } from "@playwright/test";
import { STORAGE_STATE_B } from "../playwright.config";
import { signInAndSaveState } from "./support/sign-in";

const emailB = process.env.E2E_USERNAME_B;
const passwordB = process.env.E2E_PASSWORD_B;
const emailA = process.env.E2E_USERNAME;

setup("authenticate account B", async ({ page }) => {
  if (!emailB || !passwordB) {
    throw new Error("Missing E2E_USERNAME_B / E2E_PASSWORD_B. Add them to .env.test — see .env.example.");
  }

  if (emailB === emailA) {
    throw new Error(
      "E2E_USERNAME_B must differ from E2E_USERNAME — identical accounts make cross-user tests meaningless.",
    );
  }

  await signInAndSaveState(page, emailB, passwordB, STORAGE_STATE_B);
});
