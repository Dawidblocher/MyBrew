import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";
import { defineConfig, devices } from "@playwright/test";

const rootDir = import.meta.dirname;

/**
 * Load env files with an explicit priority:
 * 1. `.env` fills unset keys (base Supabase / shared config)
 * 2. `.env.test` overrides those keys (E2E credentials and test-only overrides)
 *
 * `process.loadEnvFile()` never overwrites an already-set key, so a second call
 * cannot make `.env.test` win. Both files are gitignored.
 */
function applyEnvFile(fileName: string, { override }: { override: boolean }) {
  const envPath = path.join(rootDir, fileName);
  if (!existsSync(envPath)) return;
  for (const [key, value] of Object.entries(parseEnv(readFileSync(envPath, "utf8")))) {
    if (override || process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

applyEnvFile(".env", { override: false });
applyEnvFile(".env.test", { override: true });

/** Signed-in browser state produced by the `setup` project (see `tests/auth.setup.ts`). */
export const STORAGE_STATE = path.join(rootDir, "playwright/.auth/user.json");

/** Guest-only specs must not run under signed-in projects (storageState would defeat redirects). */
const GUEST_SPEC = /auth-read-boundary\.spec\.ts/;

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:4321";

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./tests",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
  },

  /* Configure projects for major browsers */
  projects: [
    /* Logs in once and writes STORAGE_STATE; every signed-in browser project depends on it. */
    { name: "setup", testMatch: /.*\.setup\.ts/ },

    /**
     * Unauthenticated Chromium — no storageState, no setup dependency.
     * Asserts SSR redirects and independent API session checks for guests.
     */
    {
      name: "guest",
      testMatch: GUEST_SPEC,
      use: { ...devices["Desktop Chrome"] },
    },

    {
      name: "chromium",
      testIgnore: GUEST_SPEC,
      use: { ...devices["Desktop Chrome"], storageState: STORAGE_STATE },
      dependencies: ["setup"],
    },

    {
      name: "firefox",
      testIgnore: GUEST_SPEC,
      use: { ...devices["Desktop Firefox"], storageState: STORAGE_STATE },
      dependencies: ["setup"],
    },

    {
      name: "webkit",
      testIgnore: GUEST_SPEC,
      use: { ...devices["Desktop Safari"], storageState: STORAGE_STATE },
      dependencies: ["setup"],
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
