# Save Recipe (S-04) Implementation Plan

## Overview

Persist a completed beer recipe together with its four computed metrics (BLG, SRM/Barwa, IBU, ABV) for the logged-in user, and surface a "Zapisz przepis" action at the end of the wizard. This slice is a full vertical: it **absorbs the unbuilt F-01 persistence foundation** (DB schema + RLS + shared types), adds a **server-validated, server-recomputed** save path, and wires the client save flow that redirects to the saved-recipes route (`/recipes`).

Implements **FR-011** and the save half of **US-01**.

## Current State Analysis

- **Persistence foundation (F-01) does not exist.** There are no `supabase/migrations/`, no `recipes` table, no RLS policies, and no persistence/DTO types in `src/types.ts`. Only `supabase/config.toml` is present. `save-recipe`'s roadmap prerequisite is unbuilt, so this plan must build it.
- **The wizard is complete but dead-ends.** `src/components/recipe/RecipeWizard.tsx` runs six steps via react-hook-form (`useWizardRecipe`). On the last step (`adjuncts`), the "Dalej" button is simply disabled (`WizardStepper.tsx:73`) — there is **no save action, no submit handler, no API call**.
- **Metrics are ready to snapshot.** `computeWizardMetrics(draft)` in `src/lib/recipe-to-calc.ts:107` returns `{ blg, srm, ibu, abv }` each as `CalcResult<number>` — the exact seam the live `MetricsPanel` uses. It is pure TypeScript (safe in the Cloudflare Workers runtime).
- **No JSON API route exists.** All three auth routes (`src/pages/api/auth/*`) use `formData` + `context.redirect`, no Zod, no JSON `Response`. This is the first JSON+Zod route. `/api/*` is **not** in the middleware `PROTECTED_ROUTES` (`src/middleware.ts:4`), so the handler must enforce auth itself.
- **Validation gap vs. PRD.** Today only `basics.name` is enforced at step 0 (`RecipeWizard.tsx:36`). `basics.style` is optional in schema and UI (`BasicsStep.tsx:59`), and "minimum grist" is enforced only inside the calc seam (`recipe-to-calc.ts:84`), not as a save gate. PRD/US-01 require save to block on name + style + minimum grist.
- **Supabase client** is created per request in `src/lib/supabase.ts` via `createClient(headers, cookies)`; returns `null` if env vars are missing. The current user is resolved in middleware and typed on `App.Locals.user` (`src/env.d.ts`).
- **Tooling:** vitest (`npm run test:run`), ESLint type-checked (`npm run lint`), Astro build (`npm run build`), zod 4, react-hook-form 7. CLAUDE.md conventions: migrations under `supabase/migrations/` named `YYYYMMDDHHmmss_short_description.sql`, RLS always on with granular per-operation/per-role policies; shared types in `src/types.ts`; services/helpers in `src/lib/`.

## Desired End State

A logged-in user finishes the six-step wizard, clicks **Zapisz przepis** on the last step, and the recipe is persisted (with the four metrics recomputed server-side) into a `recipes` row owned by their `auth.uid()`. On success they are redirected to `/recipes`. Save is hard-blocked — client and server — unless name, a non-empty style, and at least one malt with a positive amount are present and all four metrics are computable. A user can only ever read/insert their own rows (RLS).

Verify by: applying the migration locally, completing the wizard, saving, and observing a new owned row with correct metric columns; confirming a second user cannot see the row; confirming save is refused (with inline errors) when style is blank, grist is empty, or attenuation is cleared.

### Key Discoveries:

- `computeWizardMetrics` (`src/lib/recipe-to-calc.ts:107`) is the single source of truth for the four metrics — reuse it server-side.
- The insufficient-input sentinel for "no positive malt" already lives in `mapDraftToCalcInput` (`recipe-to-calc.ts:84`) — the save gate's "minimum grist" should align with it.
- `recipeDraftSchema` (`src/lib/recipe-schema.ts:49`) validates structure but intentionally permits in-progress zeros; the save gate needs a stricter superset, not a replacement.
- API auth must be in-handler: middleware redirects HTML and doesn't cover `/api/*`.

## What We're NOT Doing

- No edit or delete of recipes (out of v1 scope — PRD Non-Goals).
- No full saved-recipes list UI — that is S-05 (`saved-recipes-list`). This plan adds only a **minimal `/recipes` placeholder page** so the post-save redirect is not dead.
- No export (S-06).
- No normalized child tables for ingredients — recipe stored as JSONB.
- No generated Supabase database types file — hand-written persistence types per existing convention.
- No change to the calculation engine or the live `MetricsPanel`.
- No "save draft / partial save" — save requires a complete, valid recipe.

## Implementation Approach

Build bottom-up across four phases: (1) persistence foundation, (2) a shared save-validation + server seam, (3) the JSON API route, (4) the client save flow. Metrics are always **recomputed server-side** from the submitted draft and stored in dedicated numeric columns; the full draft is stored as JSONB. Validation is a single stricter schema (`saveRecipeSchema`) reused on both client (pre-submit gate) and server (authoritative check), plus a metric-computability check.

## Critical Implementation Details

- **Metric integrity:** the API ignores any client-sent metric values and recomputes via `computeWizardMetrics(draft)`. If any of the four results is `{ ok: false }`, the save is rejected (400) — this enforces the "no silent wrong numbers" guardrail end-to-end. Because the same uncomputable condition would surface as `—` in the UI, the client gate must mirror it so the user is blocked before the request.
- **Auth ordering:** resolve `supabase.auth.getUser()` first and return 401 before any parsing/DB work; store `user_id` from the verified session, never from the request body.

## Phase 1: Persistence Foundation (F-01)

### Overview

Create the `recipes` table with RLS and the shared persistence types. This is the absorbed F-01 foundation.

### Changes Required:

#### 1. Recipes migration

**File**: `supabase/migrations/<YYYYMMDDHHmmss>_create_recipes.sql` (new)

**Intent**: Create a single `recipes` table that stores the full recipe draft as JSONB alongside denormalized columns the read-only list (S-05) needs, then enable RLS with granular per-operation, per-role policies scoped to the owner.

**Contract**: Columns — `id uuid pk default gen_random_uuid()`, `user_id uuid not null references auth.users(id) on delete cascade`, `name text not null`, `style text not null`, `blg numeric not null`, `srm numeric not null`, `ibu numeric not null`, `abv numeric not null`, `data jsonb not null` (the full `RecipeDraft`), `created_at timestamptz not null default now()`. Index on `(user_id, created_at desc)` for the list. `alter table ... enable row level security`. Policies for the `authenticated` role: `select`, `insert` (with `with check (auth.uid() = user_id)`), each `using`/`with check` bound to `auth.uid() = user_id`. No `update`/`delete` policies (v1 has neither) — RLS default-deny covers them. Follow CLAUDE.md naming + RLS conventions.

#### 2. Shared persistence types

**File**: `src/types.ts`

**Intent**: Add the persisted-recipe entity and the insert payload shape so API and (future) list code share one contract. Keep `RecipeDraft` as the in-memory draft.

**Contract**: `RecipeMetricsSnapshot = { blg: number; srm: number; ibu: number; abv: number }`. `RecipeRecord` = persisted row: `id`, `userId`, `name`, `style`, the snapshot fields, `createdAt`, `data: RecipeDraft`. `RecipeInsert` = server-built insert payload: `user_id`, `name`, `style`, `blg`, `srm`, `ibu`, `abv`, `data` (snake_case to match the table; this is the only DB-facing shape).

### Success Criteria:

#### Automated Verification:

- Migration applies cleanly to a local DB: `npx supabase db reset` (or `npx supabase migration up`)
- Type checking passes: `npm run lint`
- Build passes: `npm run build`

#### Manual Verification:

- In Supabase Studio, the `recipes` table exists with RLS enabled and the listed policies.
- Inserting a row as one user and querying as another returns nothing (RLS isolation).

**Implementation Note**: After automated verification passes, pause for manual confirmation before Phase 2.

---

## Phase 2: Save Validation + Server Seam

### Overview

Add the stricter save schema and a pure helper that validates a draft, recomputes metrics, and produces the insert payload — reusable by the API and the client gate.

### Changes Required:

#### 1. Save schema

**File**: `src/lib/recipe-schema.ts`

**Intent**: Define `saveRecipeSchema` as a stricter superset of `recipeDraftSchema` that enforces the save gate: non-empty name (already), **non-empty style**, and **at least one malt with a positive amount**. Structure of the rest stays as the draft schema.

**Contract**: `saveRecipeSchema` validates the full `RecipeDraft` with: `basics.style` → `trim().min(1)`; `malts` → refine that `≥1` entry has `amountKg > 0` (aligning with `mapDraftToCalcInput`'s rule). Export it; do not weaken existing draft/step schemas.

#### 2. Save mapping/validation helper

**File**: `src/lib/recipe-save.ts` (new)

**Intent**: One server-and-client-shared function that turns a candidate draft into either a ready `RecipeInsert` (with server-recomputed metrics) or a structured failure listing what's missing — so the gate logic exists in exactly one place.

**Contract**: `buildRecipeInsert(draft, userId): { ok: true; insert: RecipeInsert } | { ok: false; errors: SaveValidationError[] }` where `SaveValidationError = { field: string; message: string }`. Steps: run `saveRecipeSchema.safeParse`; if it fails, map Zod issues to errors. Then call `computeWizardMetrics(draft)`; if any of the four is `{ ok: false }`, append a per-metric error (Polish message naming the offending input, e.g. attenuation for ABV). On full success, return the insert with the four numeric metric values. Pure (no I/O); `userId` passed in.

#### 3. Unit tests for the gate

**File**: `src/lib/recipe-save.test.ts` (new)

**Intent**: Lock the save-gate contract: valid draft → insert with correct metrics; blank style → error; no positive malt → error; cleared attenuation (ABV uncomputable) → error.

**Contract**: vitest cases covering each branch above, asserting `ok` and the presence/shape of `errors` and metric values.

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm run test:run`
- Type checking passes: `npm run lint`

#### Manual Verification:

- (none — pure logic covered by unit tests)

**Implementation Note**: After automated verification passes, pause for manual confirmation before Phase 3.

---

## Phase 3: Save API Route

### Overview

Add the first JSON+Zod API route to persist a recipe for the authenticated user.

### Changes Required:

#### 1. POST /api/recipes

**File**: `src/pages/api/recipes/index.ts` (new)

**Intent**: Accept a recipe draft as JSON, enforce auth in-handler, validate + recompute via the Phase 2 helper, insert the owned row, and return a JSON result. This establishes the project's JSON API pattern (vs. the auth routes' formData+redirect).

**Contract**: `export const prerender = false;` and `export const POST: APIRoute`. Flow: create client via `createClient(context.request.headers, context.cookies)`; if `null` → `500` JSON (Supabase not configured). `const { data: { user } } = await supabase.auth.getUser()`; if no user → `401` JSON. Parse `await context.request.json()` (guard malformed JSON → `400`). Call `buildRecipeInsert(body, user.id)`; on `!ok` → `400` JSON with `errors`. Insert the payload (`supabase.from("recipes").insert(insert).select("id").single()`); on DB error → `500`. On success → `201` with `{ id }`. All responses `Response.json(...)` (or `new Response` with `content-type`).

### Success Criteria:

#### Automated Verification:

- Type checking passes: `npm run lint`
- Build passes: `npm run build`

#### Manual Verification:

- `POST /api/recipes` with a valid body as a logged-in user returns `201 {id}` and creates an owned row.
- Unauthenticated request returns `401`.
- Body with blank style / no positive malt / cleared attenuation returns `400` with the expected `errors`.

**Implementation Note**: After automated verification passes, pause for manual confirmation before Phase 4.

---

## Phase 4: Client Save Flow + UX

### Overview

Surface the save action at the end of the wizard, wire it to the API, show in-flight/error states, redirect on success, and add the `/recipes` placeholder so the redirect lands somewhere. Also enforce style at the Basics step.

### Changes Required:

#### 1. Stepper save affordance

**File**: `src/components/recipe/WizardStepper.tsx`

**Intent**: On the last step, replace the disabled "Dalej" with a primary "Zapisz przepis" button that reflects saving state; keep "Dalej" for non-final steps.

**Contract**: Add optional props `onSave: () => void`, `isSaving: boolean`. When `isLastStep`, render the Save button (disabled while `isSaving`, with a saving label) instead of the Next button; otherwise unchanged.

#### 2. Wizard save state + handler

**File**: `src/components/recipe/RecipeWizard.tsx`

**Intent**: Add save state, a `handleSave` that runs the client gate, POSTs to `/api/recipes`, and on success redirects to `/recipes`; on failure surfaces inline errors (mapping field errors back onto the form / steps where possible).

**Contract**: New state for `isSaving` and `saveErrors`. `handleSave`: build draft via `form.getValues()`; run `buildRecipeInsert(draft, "")` (or a client-only validate variant) to gate before sending; if invalid, set errors / `form.setError` and route the user to the offending step; else `fetch("/api/recipes", { method: "POST", body: JSON.stringify(draft) })`; on `201` → `window.location.href = "/recipes"`; on `400` → render returned `errors`; on `401` → redirect to `/auth/signin`; on other → generic error. Pass `onSave`/`isSaving` to `WizardStepper`. Render a save-error region.

#### 3. Enforce style at Basics step

**File**: `src/components/recipe/RecipeWizard.tsx` and `src/components/recipe/steps/BasicsStep.tsx`

**Intent**: Surface the new style requirement early: validate `basics.style` when leaving step 0, and update the Basics field copy/error display from "Opcjonalnie" to required.

**Contract**: In `handleNext` step 0, also `form.trigger("basics.style")` (or trigger both name+style). In `BasicsStep`, wire `basics.style` through a controller with `FieldError` and drop the "Opcjonalnie" hint. (Requires `saveRecipeSchema`-level style rule from Phase 2; the resolver schema `recipeDraftSchema` may also tighten `style` to `min(1)` — decide to keep draft permissive and rely on step-trigger + save gate to avoid blocking earlier steps. Use step-level trigger against a small style check rather than loosening the draft resolver.)

#### 4. Minimal /recipes placeholder page

**File**: `src/pages/recipes/index.astro` (new)

**Intent**: Give the post-save redirect a real destination until S-05 builds the full list. Protected (already covered by `/recipes` in `PROTECTED_ROUTES`).

**Contract**: An Astro page using `Layout` that shows a simple "Twoje przepisy" heading and a "Zapisano przepis"/placeholder message plus a link back to `/recipes/new`. No data fetching required (S-05 owns the list).

### Success Criteria:

#### Automated Verification:

- Type checking passes: `npm run lint`
- Build passes: `npm run build`
- Unit tests pass: `npm run test:run`

#### Manual Verification:

- Completing the wizard and clicking "Zapisz przepis" creates a row and redirects to `/recipes`.
- Save button is disabled while the request is in flight (no double-submit).
- Leaving step 0 with a blank style shows a required-field error.
- Saving with empty grist / cleared attenuation shows inline errors and routes to the offending step; no row is created.
- Logged-out save attempt redirects to sign-in.

**Implementation Note**: After automated verification passes, pause for manual confirmation. This completes the slice.

---

## Testing Strategy

### Unit Tests:

- `recipe-save.ts`: valid draft → insert + correct metrics; blank style; no positive malt; uncomputable ABV (cleared attenuation); each metric mapped correctly.

### Integration Tests:

- Manual end-to-end (no integration harness in repo): wizard → save → row created → RLS isolation between users.

### Manual Testing Steps:

1. Apply migration (`npx supabase db reset`); sign in.
2. Complete all six steps with valid data; verify live metrics show numbers.
3. Click "Zapisz przepis"; confirm redirect to `/recipes` and a new owned row with matching metric columns.
4. Sign in as a second user; confirm the first user's row is not visible.
5. Retry save with blank style, empty grist, and cleared attenuation; confirm each is blocked with a clear message and no row is created.
6. Attempt `POST /api/recipes` while logged out; confirm `401`.

## Performance Considerations

Negligible: a single insert per save; metrics recompute is O(list sizes) pure arithmetic. The `(user_id, created_at desc)` index supports the future list cheaply.

## Migration Notes

First migration in the project. After merge, the CI build and any deploy environment need the `recipes` table applied (and repo secrets `SUPABASE_URL`/`SUPABASE_KEY` already exist per CLAUDE.md). No existing data to migrate.

## References

- Roadmap: `context/foundation/roadmap.md` (S-04 + F-01)
- PRD: `context/foundation/prd.md` (FR-011, US-01, Access Control)
- Calc seam: `src/lib/recipe-to-calc.ts`
- Schema: `src/lib/recipe-schema.ts`
- Wizard: `src/components/recipe/RecipeWizard.tsx`, `WizardStepper.tsx`
- API baseline: `src/pages/api/auth/signin.ts`
- Supabase/middleware: `src/lib/supabase.ts`, `src/middleware.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Persistence Foundation (F-01)

#### Automated

- [x] 1.1 Migration applies cleanly to a local DB (`npx supabase db reset`)
- [x] 1.2 Type checking passes (`npm run lint`)
- [x] 1.3 Build passes (`npm run build`)

#### Manual

- [x] 1.4 `recipes` table exists with RLS enabled and listed policies
- [x] 1.5 Cross-user query returns nothing (RLS isolation)

### Phase 2: Save Validation + Server Seam

#### Automated

- [x] 2.1 Unit tests pass (`npm run test:run`)
- [x] 2.2 Type checking passes (`npm run lint`)

### Phase 3: Save API Route

#### Automated

- [x] 3.1 Type checking passes (`npm run lint`)
- [x] 3.2 Build passes (`npm run build`)

#### Manual

- [ ] 3.3 Valid authenticated POST returns `201 {id}` and creates an owned row
- [ ] 3.4 Unauthenticated POST returns `401`
- [ ] 3.5 Invalid bodies (blank style / no positive malt / cleared attenuation) return `400` with expected errors

### Phase 4: Client Save Flow + UX

#### Automated

- [x] 4.1 Type checking passes (`npm run lint`)
- [x] 4.2 Build passes (`npm run build`)
- [x] 4.3 Unit tests pass (`npm run test:run`)

#### Manual

- [ ] 4.4 Completing the wizard + save creates a row and redirects to `/recipes`
- [ ] 4.5 Save button disabled while in flight (no double-submit)
- [ ] 4.6 Blank style on leaving step 0 shows a required error
- [ ] 4.7 Empty grist / cleared attenuation blocks save with inline errors routed to the offending step; no row created
- [ ] 4.8 Logged-out save attempt redirects to sign-in
