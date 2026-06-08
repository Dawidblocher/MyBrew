# Save Recipe (S-04) — Plan Brief

> Full plan: `context/changes/save-recipe/plan.md`

## What & Why

A logged-in home brewer finishes the six-step wizard and persists the completed recipe together with its four computed metrics (BLG / Barwa / IBU / ABV), then is taken to their saved-recipes route. This closes the create→save half of the core product loop (FR-011, US-01). Because the recipe-persistence foundation (F-01) was never built, this slice absorbs it.

## Starting Point

The wizard is fully built (six steps, live metrics via `computeWizardMetrics`) but dead-ends — the last step's "Dalej" is just disabled, with no save action. There is no `recipes` table, no RLS, no persistence types, and no JSON API route in the project yet.

## Desired End State

Clicking "Zapisz przepis" on the last step inserts a `recipes` row owned by `auth.uid()` (full draft as JSONB + four metric columns recomputed server-side) and redirects to `/recipes`. Save is hard-blocked, client and server, unless name, a non-empty style, and ≥1 positive-amount malt are present and all four metrics are computable. Users can only read/insert their own rows.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| F-01 prerequisite | Absorb into this plan (Phase 1) | save-recipe can't function without the schema/RLS/types | Plan |
| Storage shape | Single `recipes` table: JSONB draft + denormalized columns | Trivial save/read for create + read-only-list v1; no over-build | Plan |
| Metric authority | Recompute server-side; ignore client values | Single source of truth; honors "no silent wrong numbers" | Plan |
| Metric storage | Four dedicated numeric columns | List view (S-05) reads them directly, no JSON parsing | Plan |
| Required-field handling | Hard block (no partial save) | No edit in v1, so incomplete rows are unfixable | Plan |
| Minimum grist | ≥1 malt with positive amount | Aligns with the existing calc seam rule | Plan |
| Metric computability | Required to save | Never persist/list a `—` metric | Plan |
| Style | Required at save AND at Basics step | Honors PRD; surfaces requirement early | Plan |
| API auth | In-handler `supabase.auth.getUser()` | `/api/*` isn't middleware-protected; RLS is the backstop | Plan |
| Post-save destination | Redirect to `/recipes` (+ minimal placeholder page) | Matches the product loop; avoids a dead redirect before S-05 | Plan |
| Save affordance | Replace last-step "Dalej" with "Zapisz przepis" | Natural end-of-wizard action; disable during request | Plan |

## Scope

**In scope:** `recipes` migration + RLS; persistence types; `saveRecipeSchema` + `buildRecipeInsert` helper (unit-tested); `POST /api/recipes`; client save flow with in-flight/error states; style enforcement at Basics step; minimal `/recipes` placeholder page.

**Out of scope:** edit/delete; full saved-recipes list UI (S-05); export (S-06); normalized ingredient tables; generated DB types; calc-engine and MetricsPanel changes; partial/draft save.

## Architecture / Approach

Bottom-up: **Phase 1** DB + RLS + types → **Phase 2** shared stricter schema + pure `buildRecipeInsert` (validates, recomputes metrics) + tests → **Phase 3** first JSON+Zod API route (`POST /api/recipes`, in-handler auth, server recompute, insert) → **Phase 4** wizard save button, fetch + redirect, inline errors, style gate, `/recipes` placeholder. Metrics always recomputed server-side; the same gate logic backs the client pre-submit check.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Persistence foundation | `recipes` table + RLS + persistence types | First migration; RLS policy correctness — verified by cross-user isolation |
| 2. Validation + seam | `saveRecipeSchema` + tested `buildRecipeInsert` | Gate drift from calc seam — covered by unit tests |
| 3. Save API route | `POST /api/recipes` (JSON+Zod, auth, recompute, insert) | New API pattern + in-handler auth — verified manually |
| 4. Client save flow | Save button, redirect, errors, style gate, `/recipes` stub | Mapping server errors back to steps; double-submit — guarded by disabled state |

**Prerequisites:** S-03 (wizard complete — in code). F-01 absorbed here. Local Supabase (Docker) for migration verification.
**Estimated effort:** ~2 sessions across 4 phases; Phases 1–3 small, Phase 4 holds most UI work.

## Open Risks & Assumptions

- Calc code must run in the Cloudflare Workers runtime server-side — it's pure TS, expected to be fine.
- The "all metrics computable" gate makes yeast attenuation > 0 an effective save precondition; needs clear Polish error messages naming the offending step.
- The `/recipes` placeholder will be replaced by S-05; minimal effort intentionally.

## Success Criteria (Summary)

- A completed recipe saves and the user lands on `/recipes`, with correct metric columns on an owned row.
- A second user cannot see the first user's recipe (RLS).
- Save is refused (with inline, step-targeted errors) when style is blank, grist is empty, or a metric can't compute.
