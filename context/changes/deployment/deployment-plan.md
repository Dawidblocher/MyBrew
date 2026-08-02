# Cloudflare Deployment Plan — Beer Recipe Builder

## Context

The app is built with Astro 6 SSR + `@astrojs/cloudflare` v13.5.0 and a `wrangler.jsonc` is already present. However, the full deployment pipeline has never been run. This plan takes the project from "adapter installed" to a live, auto-deploying production URL on Cloudflare Workers with secrets set, Supabase auth configured for the production domain, and CI/CD wired up.

Deployment model: **Cloudflare Workers + Assets** (not Pages) — the existing `wrangler.jsonc` uses `"main": "@astrojs/cloudflare/entrypoints/server"` + `"assets": { "directory": "./dist" }`, which is the current recommended Workers pattern.

---

## Phase 1 — Code fixes (pre-deploy) [ ]

These are small correctness fixes that need to land before the first deploy.

### 1a. Add `export const prerender = false` to all auth API routes [ ]

Per CLAUDE.md convention ("API routes must export `const prerender = false`"). Currently missing from all three routes.

Files to update:

- `src/pages/api/auth/signin.ts`
- `src/pages/api/auth/signup.ts`
- `src/pages/api/auth/signout.ts`

Add as the first exported constant in each file:

```ts
export const prerender = false;
```

### 1b. Rename Workers project in `wrangler.jsonc` [ ]

Current name `"10x-astro-starter"` is the scaffold default. Rename to `"beer-recipe-builder"` (used as the `*.workers.dev` subdomain).

File: `wrangler.jsonc`, field: `"name"`

### 1c. Add `deploy` script to `package.json` [ ]

```json
"deploy": "astro build && wrangler deploy"
```

This keeps build + deploy atomic. Existing scripts remain unchanged.

### 1d. Create `.dev.vars.example` [ ]

Template file for local Cloudflare dev. Committed to repo (no secrets).

```
SUPABASE_URL=
SUPABASE_KEY=
```

**Edge case — workerd vs Node dev server:** `npm run dev` uses Vite's Node dev server (fast iteration). `npm run preview` uses workerd via `@astrojs/cloudflare`'s Vite Cloudflare plugin and reads `.dev.vars`. Use `preview` to test Cloudflare-specific behavior (bindings, env vars via the CF runtime) before deploying.

---

## Phase 2 — Local environment setup [ ]

### 2a. Authenticate wrangler [ ]

```bash
npx wrangler login
```

Opens browser OAuth flow. Stores token in `~/.wrangler/config/`. Verify with:

```bash
npx wrangler whoami
```

### 2b. Create `.dev.vars` from example [ ]

```bash
# Windows PowerShell
Copy-Item .env.example .dev.vars
# Then fill in real values from .env
```

`.dev.vars` is already in `.gitignore` (line 21).

### 2c. Verify build succeeds locally [ ]

```bash
npm run build
```

Check `dist/` is created. Watch for bundle size warnings — free tier limit is 3 MB. If the Worker script size is reported in build output, confirm it is under 3 MB.

**Edge case — bundle size:** If `wrangler deploy` later reports "Worker size exceeds limit," run `npx wrangler deploy --dry-run` to get exact size before hitting the limit live. The `nodejs_compat` flag is already set in `wrangler.jsonc`, which adds ~200 KB of polyfills.

---

## Phase 3 — First deployment [ ]

### 3a. Deploy to Cloudflare Workers [ ]

```bash
npx wrangler deploy
```

This reads `wrangler.jsonc`, uploads `dist/` as assets, and publishes the Worker. Note the generated URL — it will be `https://beer-recipe-builder.<your-account>.workers.dev`.

**Edge case — "Missing entry-point" error:** If wrangler can't find the server entry, run `npm run build` first (wrangler deploy doesn't auto-build). The `astro build` step outputs the Worker entry at `dist/_worker.js`.

**Edge case — account_id not in wrangler.jsonc:** If wrangler prompts for an account, add `"account_id": "<id>"` to `wrangler.jsonc` (find it via `npx wrangler whoami`).

### 3b. Set production secrets [ ]

```bash
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_KEY
```

Each command prompts for the value interactively (not echoed to terminal). Confirm via:

```bash
npx wrangler secret list
```

**Edge case — secrets not picked up:** Cloudflare Workers secrets are available as environment variables at runtime but **not** via `import.meta.env` (which is inlined at build time). The project correctly imports via `astro:env/server` which reads from the runtime bindings — this is safe. Do not switch to `import.meta.env` for these values.

---

## Phase 4 — Supabase auth configuration [ ]

After the first deploy, the Workers URL must be registered with Supabase or auth redirects will fail.

### 4a. Add production URL to Supabase allowed redirect URLs [ ]

In the Supabase dashboard → Authentication → URL Configuration:

- **Site URL**: `https://beer-recipe-builder.<account>.workers.dev`
- **Redirect URLs**: add `https://beer-recipe-builder.<account>.workers.dev/**`

**Edge case — email confirmation links broken in production:** Supabase sends confirmation emails with a redirect URL. If Site URL is not set correctly, clicking the link lands on a 404 or the wrong domain. Test by signing up with a real email after deploy.

### 4b. Verify email confirmation UX in production [ ]

`src/pages/auth/confirm-email.astro` uses `import.meta.env.DEV` to switch between "auto-confirmed" (dev) and "check your email" (prod) messaging. This compiles correctly at build time — verify the production page shows the "check email" message, not the dev-only success state.

---

## Phase 5 — CI/CD deployment pipeline [ ]

### 5a. Create Cloudflare API token [ ]

In Cloudflare dashboard → Profile → API Tokens:

- Create token with template: "Edit Cloudflare Workers"
- Scope: All accounts / All zones (or restrict to specific account)
- Copy the token — it's shown only once

### 5b. Add secrets to GitHub repository [ ]

In GitHub → Settings → Secrets and variables → Actions, add:

- `CLOUDFLARE_API_TOKEN` — the token from 5a
- `CLOUDFLARE_ACCOUNT_ID` — from `npx wrangler whoami`

(The existing `SUPABASE_URL` and `SUPABASE_KEY` secrets are already present for the build step.)

### 5c. Update `.github/workflows/ci.yml` to add deploy step [ ]

Add a deploy job that runs after CI passes, only on pushes to `master`:

```yaml
deploy:
  needs: ci
  runs-on: ubuntu-latest
  if: github.ref == 'refs/heads/master' && github.event_name == 'push'
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 22
        cache: npm
    - run: npm ci
    - run: npm run build
      env:
        SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
        SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
    - run: npx wrangler deploy
      env:
        CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

**Edge case — deploy runs on PRs:** The `if: github.event_name == 'push'` guard ensures only pushes to master trigger deploy, not PR builds. The `needs: ci` ensures lint+build must pass first.

**Edge case — secrets not available in forked PRs:** GitHub Actions doesn't expose repo secrets to forked PRs by default. This is the correct behavior — only maintainer-merged commits deploy.

---

## Phase 6 — Verification [ ]

### 6a. Live smoke test [ ]

After CI deploy completes:

1. Open the Workers URL in a browser
2. Verify the home page loads
3. Sign up with a real email → confirm email receives correctly
4. Sign in → verify redirect to `/dashboard`
5. Sign out → verify redirect to home

### 6b. Stream live logs [ ]

```bash
npx wrangler tail --format json
```

Watch for errors during the smoke test. Look for:

- Supabase connection errors (missing secrets, wrong URL)
- 500 responses on auth routes
- CPU time warnings

**Edge case — cold start latency:** First request after idle may be 200-400ms due to Supabase connection overhead. This is acceptable for MVP. If noticeable, note it as a known behavior (Hyperdrive is the mitigation path, deferred per infrastructure.md).

### 6c. Rollback drill (optional, recommended) [ ]

Verify rollback works before you need it:

```bash
npx wrangler deployments list
npx wrangler rollback [VERSION_ID]
```

Note: rollback reverts Worker code only — does not revert any Supabase schema changes.

---

## Edge Cases Summary

| Risk                                     | Mitigation built into plan                          |
| ---------------------------------------- | --------------------------------------------------- |
| Secrets leaked via `import.meta.env`     | `astro:env/server` already used — noted in Phase 3b |
| Auth redirect broken in production       | Supabase Site URL config in Phase 4a                |
| Email confirmation UX wrong in prod      | Verified in Phase 4b                                |
| Bundle size exceeds 3 MB free limit      | Dry-run check noted in Phase 2c                     |
| Deploy triggers on PRs                   | `github.event_name == 'push'` guard in Phase 5c     |
| Cold start / Supabase latency            | Accepted for MVP, noted in Phase 6b                 |
| `prerender` missing on API routes        | Fixed in Phase 1a                                   |
| Workers project name is scaffold default | Fixed in Phase 1b                                   |

---

## Critical Files Modified

| File                            | Change                               |
| ------------------------------- | ------------------------------------ |
| `src/pages/api/auth/signin.ts`  | Add `export const prerender = false` |
| `src/pages/api/auth/signup.ts`  | Add `export const prerender = false` |
| `src/pages/api/auth/signout.ts` | Add `export const prerender = false` |
| `wrangler.jsonc`                | Rename `"name"` field                |
| `package.json`                  | Add `"deploy"` script                |
| `.dev.vars.example`             | Create new file (committed)          |
| `.github/workflows/ci.yml`      | Add `deploy` job                     |
