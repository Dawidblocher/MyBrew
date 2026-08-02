# Saved Recipes List (S-05) Implementation Plan

## Overview

Turn the `/recipes` placeholder into the real read-only **saved recipes list** for the logged-in user, and add a read-only **per-recipe detail page**. The list is a responsive card grid — each card shows the recipe name, style, the four saved metrics (BLG, Barwa/SRM, IBU, ABV) and the save date — and links to `/recipes/[id]`, which renders the full recipe (basics, batch, grist, mash, hops, yeast, adjuncts) read-only from the stored draft. No edit or delete (v1 Non-Goal).

Implements **FR-012** and the view half of **US-01**.

## Current State Analysis

- **The persistence + save slice (S-04) is fully done.** The `recipes` table exists with columns `id, user_id, name, style, blg, srm, ibu, abv, data jsonb, created_at`, a `(user_id, created_at desc)` index created _specifically for this list_, and RLS `select`/`insert` policies bound to `auth.uid() = user_id` (no `update`/`delete` — default-deny). See `supabase/migrations/*_create_recipes.sql` and `supabase/migrations/20260609110000_grant_recipes.sql`.
- **`/recipes` is a placeholder** (`src/pages/recipes/index.astro`) that statically renders "Pełna lista zapisanych przepisów pojawi się wkrótce" with a `Nowy przepis` link. This slice replaces it.
- **`/recipes` is already protected.** `src/middleware.ts:4` lists `/recipes` in `PROTECTED_ROUTES`, and `startsWith` already covers `/recipes/[id]`. Unauthenticated users are redirected to `/auth/signin` before the page runs.
- **Reading is naturally server-side.** Astro is `output: "server"` (full SSR). Protected pages like `dashboard.astro` read `Astro.locals.user` directly. A per-request Supabase client (`createClient(request.headers, cookies)` in `src/lib/supabase.ts`) plus RLS means a server-side `select` returns only the current user's rows — **no GET API route is needed**.
- **Shared types exist but skew to the write path.** `src/types.ts` has `RecipeRecord` (camelCase: `userId`, `createdAt`, `data: RecipeDraft`, plus the four metric fields via `RecipeMetricsSnapshot`) and `RecipeInsert` (snake_case, DB-facing). DB rows come back snake_case (`user_id`, `created_at`), so reads need a snake_case→camelCase mapping. There is **no list/summary type** yet.
- **Metric presentation lives only in the wizard.** `MetricsPanel.tsx` defines the labels/units/precision — `BLG` `°BLG` (1dp), `Barwa` `SRM` (1dp), `IBU` `IBU` (0dp), `ABV` `%` (1dp) — but it is a React island bound to `react-hook-form` and formats `CalcResult<number>`. Saved metrics are plain `number` columns, so this isn't directly reusable; the descriptors should be extracted so list/detail render identically to the wizard.
- **No recipe read/query module exists.** The only `recipes` access is the `insert` in `src/pages/api/recipes/index.ts`. There is no `listRecipes`/`getRecipe`.
- **Visual language is glassy cards.** Existing pages use `bg-cosmic`, `rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl`, gradient headings, Polish copy. The new pages should match.
- **Tooling:** vitest (`npm run test:run`), ESLint type-checked (`npm run lint`), Astro build (`npm run build`). CLAUDE.md: Astro for static/layout, React only when interactive; `cn()` for class merging; services/helpers in `src/lib/`; shared types in `src/types.ts`; primary UI language Polish.

## Desired End State

A logged-in user visits `/recipes` and sees a responsive grid of cards — one per saved recipe, newest first — each showing the recipe name, style, the four saved metrics, and the save date. With no recipes they see a friendly empty state with a `Nowy przepis` call-to-action; if the query (or Supabase config) fails they see a distinct error notice rather than a false "empty" state. Clicking a card opens `/recipes/[id]`, a read-only page rendering the complete recipe (basics, batch params, malt bill, mash settings + rests, hop schedule, yeast, adjuncts) plus the four saved metric tiles, with a link back to the list. A user can only ever see their own recipes (RLS); requesting another user's `id` yields a not-found page. No edit or delete affordances appear anywhere.

Verify by: signing in, saving one or more recipes via the wizard, seeing them on `/recipes` newest-first with correct metrics and dates, opening a detail page and confirming every entered section renders, confirming a second user sees an empty list and a 404 on the first user's `id`, and confirming a brand-new user sees the empty-state CTA.

### Key Discoveries:

- RLS makes server-side reads safe and self-scoping — `select` returns only owner rows, and a get-by-`id` for a non-owner returns zero rows (→ not-found), so no manual `user_id` filter is strictly required, though an explicit `.eq("user_id", user.id)` is cheap defense-in-depth.
- The `(user_id, created_at desc)` index already exists for `order("created_at", { ascending: false })` — newest-first ordering is free.
- The full recipe payload is the `data` JSONB column (`RecipeDraft`); the detail page renders from `data`, while the four metric tiles use the dedicated numeric columns (the saved snapshot — never recompute on read).
- Metric labels/units/precision should be extracted from `MetricsPanel.tsx` into one descriptor so list, detail, and wizard never drift.
- `/recipes/[id]` is already auth-protected by the existing middleware prefix match; no middleware change needed.

## What We're NOT Doing

- No edit or delete of recipes (v1 Non-Goal) — no such buttons on list or detail.
- No export (that is S-06, `recipe-export`).
- No GET/JSON API route — reads happen server-side in the Astro pages.
- No pagination / search / filtering — the small-scale persona (PRD `target_scale.users: small`) doesn't need it in v1.
- No recompute of metrics on read — display the saved snapshot columns.
- No changes to the save path, the wizard, the calc engine, or `MetricsPanel`'s behavior (only a non-behavioral extraction of metric descriptors).
- No normalized ingredient tables — detail reads the `data` JSONB.

## Implementation Approach

Build bottom-up in three phases: (1) a read layer — a pure row→entity mapper, a `recipe-queries` module wrapping the Supabase reads, a shared metric-descriptor util, and a reusable metric-tiles component; (2) the list page consuming the list query; (3) the detail page consuming the get-by-id query. Both pages are SSR Astro pages that build a Supabase client per request and rely on RLS for ownership. Metrics are read from the stored numeric columns; the full recipe is read from the `data` JSONB.

## Critical Implementation Details

- **Saved snapshot, not live recompute:** the four metrics shown on both pages come from the `blg/srm/ibu/abv` columns (what was saved), not from `computeWizardMetrics(data)`. This preserves the exact numbers the user saw at save time and keeps the read path free of calc-engine coupling.
- **Not-found vs. forbidden are indistinguishable by design:** RLS returns zero rows for both a non-existent `id` and another user's `id`. The detail page treats "no row" uniformly as not-found (render a 404 page or redirect to `/recipes`) — never leak whether an `id` exists for someone else.
- **Degraded Supabase config:** `createClient` returns `null` when env vars are missing. The list page must render the error notice (not an empty list) in that case, mirroring the rest of the app's graceful-degradation posture.

## Phase 1: Read Layer (Queries, Mapping, Metric Presentation)

### Overview

Add the read-side building blocks shared by both pages: a list/summary type, a pure row→entity mapper (unit-tested), a `recipe-queries` module, a shared metric descriptor util, and a reusable metric-tiles component.

### Changes Required:

#### 1. List item type

**File**: `src/types.ts`

**Intent**: Add a lightweight type for list rows so the list query doesn't carry the heavy `data` JSONB it doesn't render.

**Contract**: `RecipeListItem extends RecipeMetricsSnapshot` with `id: string`, `name: string`, `style: string`, `createdAt: string`. (Reuse existing `RecipeMetricsSnapshot` for the four metrics; do not duplicate metric fields. `RecipeRecord` stays the full detail shape.)

#### 2. Pure row → entity mapping

**File**: `src/lib/recipe-mappers.ts` (new)

**Intent**: Centralize the snake_case DB row → camelCase entity conversion in pure, testable functions so the query module and tests share one source of truth.

**Contract**: Two pure functions — `mapRowToListItem(row): RecipeListItem` and `mapRowToRecord(row): RecipeRecord` — mapping `user_id`→`userId`, `created_at`→`createdAt`, passing through `name`, `style`, the four metrics, and (for the record) `data`. Accept a typed row shape (snake_case) as input; no I/O.

#### 3. Recipe read queries

**File**: `src/lib/recipe-queries.ts` (new)

**Intent**: Wrap the two Supabase reads behind named functions the pages call, returning mapped entities and surfacing failure explicitly so the list page can show its error notice.

**Contract**: Two functions taking the per-request Supabase client (the non-null return of `createClient`):

- `listRecipes(supabase, userId): Promise<{ ok: true; items: RecipeListItem[] } | { ok: false }>` — `select("id, name, style, blg, srm, ibu, abv, created_at").eq("user_id", userId).order("created_at", { ascending: false })`; on error return `{ ok: false }`, else map rows via `mapRowToListItem`.
- `getRecipe(supabase, userId, id): Promise<RecipeRecord | null>` — `select("*").eq("user_id", userId).eq("id", id).maybeSingle()`; return `null` on no row or error, else `mapRowToRecord`. (RLS also scopes these; the explicit `eq("user_id", …)` is defense-in-depth.)

#### 4. Shared metric descriptors + number formatting

**File**: `src/lib/recipe-metrics.ts` (new) and `src/components/recipe/MetricsPanel.tsx` (refactor)

**Intent**: Extract the metric labels/units/precision into one descriptor list and a number formatter so list, detail, and the wizard render identical metric presentation. Refactor `MetricsPanel` to consume the descriptors without changing its rendered output.

**Contract**: In `recipe-metrics.ts`: an ordered `METRIC_DESCRIPTORS` array of `{ key: keyof RecipeMetricsSnapshot; label: string; unit: string; fractionDigits: number }` for BLG/Barwa/IBU/ABV (matching current `MetricsPanel` values), plus `formatMetricValue(value: number, fractionDigits: number): string` (returns the placeholder `"—"` for non-finite input, else `value.toFixed`). `MetricsPanel` imports the descriptors/placeholder and keeps its `CalcResult`-aware formatting wrapper. Do not change `MetricsPanel`'s DOM or precision.

#### 5. Reusable metric tiles component (read-only)

**File**: `src/components/recipe/RecipeMetricTiles.astro` (new)

**Intent**: A static Astro component that renders the four saved metrics as tiles, reused by both the list cards and the detail page so saved-metric presentation is consistent and Polish-labeled.

**Contract**: Props: a `RecipeMetricsSnapshot` (plus an optional `size`/`compact` flag if the list cards want denser tiles than the detail page). Iterates `METRIC_DESCRIPTORS`, formats each via `formatMetricValue`, renders tiles styled to match `MetricsPanel`'s tile look (`rounded-xl border border-white/10 bg-white/5`, uppercase label, `tabular-nums` value, unit). No interactivity.

#### 6. Unit tests for the mapper

**File**: `src/lib/recipe-mappers.test.ts` (new)

**Intent**: Lock the row→entity contract (the snake_case→camelCase seam is the one piece of read logic worth pinning).

**Contract**: vitest cases asserting `mapRowToListItem` and `mapRowToRecord` correctly rename `user_id`/`created_at` and pass through metrics, `name`, `style`, and (record only) `data`.

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm run test:run`
- Type checking passes: `npm run lint`
- Build passes: `npm run build`

#### Manual Verification:

- The wizard's live `MetricsPanel` still shows the same four metrics with unchanged labels/units/precision (no regression from the descriptor extraction).

**Implementation Note**: After automated verification passes, pause for manual confirmation before Phase 2.

---

## Phase 2: Saved Recipes List Page

### Overview

Replace the `/recipes` placeholder with the real card-grid list, empty state, and error notice.

### Changes Required:

#### 1. Saved recipes list page

**File**: `src/pages/recipes/index.astro` (replace placeholder)

**Intent**: Server-render the current user's saved recipes as a responsive card grid (newest first), with a friendly empty-state CTA and a distinct error notice, each card linking to its detail page.

**Contract**: In frontmatter: read `Astro.locals.user` (middleware guarantees presence on this protected route) and build the client via `createClient(Astro.request.headers, Astro.cookies)`. If the client is `null` → render the **error notice** state. Else call `listRecipes(supabase, user.id)`; on `{ ok: false }` → error notice; on `{ ok: true, items: [] }` → **empty state** ("Nie masz jeszcze przepisów" + `Nowy przepis` button linking `/recipes/new`); on non-empty → a grid (`grid gap-* sm:grid-cols-2 lg:grid-cols-3` or similar) of cards. Each **card** is an `<a href={`/recipes/${item.id}`}>` showing: name (heading), style (subtitle), `<RecipeMetricTiles>` (compact), and the save date formatted via `new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" })`. Match the existing glassy card aesthetic (`bg-cosmic`, `rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl`, gradient heading). Page wrapped in `Layout` with a Polish `title` ("Twoje przepisy"). Keep a top-level `Nowy przepis` action visible in all non-empty states too. No edit/delete affordances.

### Success Criteria:

#### Automated Verification:

- Type checking passes: `npm run lint`
- Build passes: `npm run build`

#### Manual Verification:

- A user with saved recipes sees them as cards, newest first, with correct name/style/metrics and a Polish-formatted date.
- Each card navigates to the matching `/recipes/[id]`.
- A user with no recipes sees the empty-state CTA (not an error), and the CTA opens the wizard.
- With Supabase env vars unset (or a forced query error), the page shows the error notice rather than a false empty list.
- A second user does not see the first user's recipes.

**Implementation Note**: After automated verification passes, pause for manual confirmation before Phase 3.

---

## Phase 3: Recipe Detail Page

### Overview

Add `/recipes/[id]`, a read-only page rendering the full saved recipe plus the four metric tiles, with not-found handling and a link back to the list.

### Changes Required:

#### 1. Recipe detail page

**File**: `src/pages/recipes/[id].astro` (new)

**Intent**: Server-render one owned recipe in full, read-only, from the stored draft; render the saved metric tiles; handle not-found uniformly (missing id, other user's id, or query/config failure).

**Contract**: Frontmatter: read `Astro.locals.user`; build client via `createClient(...)`; if `null` → treat as not-found. Read `Astro.params.id`; call `getRecipe(supabase, user.id, id)`. If `null` → return a 404 response (`Astro.response.status = 404` with a "Nie znaleziono przepisu" page **or** `return Astro.redirect("/recipes")` — choose 404 page to avoid masking). Else render, from `record.data` (`RecipeDraft`), read-only sections with Polish headings: **Podstawy** (name, style), **Parametry warki** (batch volume), **Zasyp** (malt bill: name, amount kg, EBC, extract %), **Zacieranie** (efficiency %, water-to-grain ratio, rest list: temp/duration), **Chmiel** (hop list: name, alpha %, amount g, stage label, time), **Drożdże** (strain, type, attenuation %, ferment temp range), **Dodatki** (adjunct list: name, stage label, time, notes). Render `<RecipeMetricTiles>` from the snapshot columns on `record`. Use Polish labels for enum stages (`HopStage`, `AdjunctStage`). Provide a "Wróć do listy" link to `/recipes`. Match the glassy card aesthetic and wrap in `Layout` with the recipe name as `title`. No edit/delete affordances. Empty optional lists (e.g. no rests/adjuncts) render a small "—"/"brak" rather than an empty section.

### Success Criteria:

#### Automated Verification:

- Type checking passes: `npm run lint`
- Build passes: `npm run build`

#### Manual Verification:

- Opening a saved recipe's detail page shows every section the user entered (basics, batch, grist, mash + rests, hops, yeast, adjuncts) with correct values and Polish labels.
- The four metric tiles match the values shown on the list card (the saved snapshot).
- Requesting a non-existent `id`, a malformed `id`, or another user's `id` shows the not-found page (no data leak).
- The "Wróć do listy" link returns to `/recipes`; no edit/delete controls are present.

**Implementation Note**: After automated verification passes, pause for manual confirmation. This completes the slice.

---

## Testing Strategy

### Unit Tests:

- `recipe-mappers.ts`: `mapRowToListItem` and `mapRowToRecord` rename snake_case→camelCase and pass through metrics/`name`/`style`/`data` correctly.

### Integration Tests:

- Manual end-to-end (no integration harness in repo): save → list → detail → RLS isolation + not-found between users.

### Manual Testing Steps:

1. Sign in; save 2–3 recipes via the wizard with distinct names/styles and varied lists (some with rests/adjuncts, some without).
2. Visit `/recipes`; confirm cards appear newest-first with correct name/style/metrics and Polish dates.
3. Click a card; confirm the detail page renders all entered sections and the metric tiles match the card.
4. Visit `/recipes/[bogus-id]`; confirm the not-found page.
5. Sign in as a second user; confirm an empty-state CTA on `/recipes` and a not-found page on the first user's recipe `id`.
6. Unset Supabase env vars (or force a query error); confirm the list shows the error notice, not an empty list.

## Performance Considerations

Negligible at the PRD's small scale: one indexed `select` per list view (covered by `(user_id, created_at desc)`), one `maybeSingle` per detail view. The list projection omits the `data` JSONB to keep payloads small.

## Migration Notes

No schema changes — the table, index, RLS, and grants already exist from S-04. Pure application-layer addition.

## References

- Roadmap: `context/foundation/roadmap.md` (S-05)
- PRD: `context/foundation/prd.md` (FR-012, US-01, Access Control)
- Prior slice (table, types, save path): `context/changes/save-recipe/plan.md`
- Table grants: `supabase/migrations/20260609110000_grant_recipes.sql`
- Metric presentation source: `src/components/recipe/MetricsPanel.tsx`
- Supabase client + middleware: `src/lib/supabase.ts`, `src/middleware.ts`
- Protected page pattern: `src/pages/dashboard.astro`
- Shared types: `src/types.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Read Layer (Queries, Mapping, Metric Presentation)

#### Automated

- [x] 1.1 Unit tests pass (`npm run test:run`) — 8da61ea
- [x] 1.2 Type checking passes (`npm run lint`) — 8da61ea
- [x] 1.3 Build passes (`npm run build`) — 8da61ea

#### Manual

- [x] 1.4 Wizard `MetricsPanel` unchanged after descriptor extraction (same labels/units/precision) — 8da61ea

### Phase 2: Saved Recipes List Page

#### Automated

- [x] 2.1 Type checking passes (`npm run lint`) — 40b8b64
- [x] 2.2 Build passes (`npm run build`) — 40b8b64

#### Manual

- [x] 2.3 Saved recipes render as cards, newest-first, with correct name/style/metrics/date — 40b8b64
- [x] 2.4 Each card navigates to the matching `/recipes/[id]` — 40b8b64
- [x] 2.5 No-recipes user sees the empty-state CTA that opens the wizard — 40b8b64
- [x] 2.6 Supabase config/query failure shows the error notice (not a false empty list) — 40b8b64
- [x] 2.7 A second user does not see the first user's recipes — 40b8b64

### Phase 3: Recipe Detail Page

#### Automated

- [x] 3.1 Type checking passes (`npm run lint`) — bdf3381
- [x] 3.2 Build passes (`npm run build`) — bdf3381

#### Manual

- [x] 3.3 Detail page renders all entered sections with correct values and Polish labels — bdf3381
- [x] 3.4 Metric tiles match the list card (saved snapshot) — bdf3381
- [x] 3.5 Non-existent / malformed / other-user `id` shows the not-found page (no data leak) — bdf3381
- [x] 3.6 "Wróć do listy" returns to `/recipes`; no edit/delete controls present — bdf3381
