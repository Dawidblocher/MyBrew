# Saved Recipes List (S-05) — Plan Brief

> Full plan: `context/changes/saved-recipes-list/plan.md`

## What & Why

Build the read-only **saved recipes list** so users can finally see the recipes they save — closing the create→save→view loop (FR-012). The `/recipes` route is currently a placeholder; this slice makes it real and adds a per-recipe detail page so users can review the full recipe they designed.

## Starting Point

The save slice (S-04) is fully done: the `recipes` table, its `(user_id, created_at desc)` index, RLS `select` policy, and the `RecipeRecord`/`RecipeMetricsSnapshot` types all exist, and saving redirects to `/recipes` — which today only shows a "coming soon" placeholder. No read query module exists yet, and metric presentation lives only inside the wizard's React `MetricsPanel`.

## Desired End State

`/recipes` shows the user's saved recipes as a responsive card grid (name, style, four metrics, save date), newest first, with a friendly empty-state CTA and a real error notice on failure. Each card links to `/recipes/[id]`, a read-only page rendering the complete recipe (basics, batch, grist, mash + rests, hops, yeast, adjuncts) plus the saved metric tiles. Users only ever see their own recipes; no edit/delete anywhere.

## Key Decisions Made

| Decision           | Choice                                     | Why (1 sentence)                                                                             | Source |
| ------------------ | ------------------------------------------ | -------------------------------------------------------------------------------------------- | ------ |
| Read mechanism     | Server-side SSR query (no API route)       | RLS + per-request client makes SSR reads self-scoping; matches the `dashboard.astro` pattern | Plan   |
| List layout        | Responsive card grid                       | Matches the existing glassy-card aesthetic; metrics read well as a 4-tile row                | Plan   |
| Card fields        | Name + style + 4 metrics + save date       | Date distinguishes recipe iterations and reflects the created_at ordering                    | Plan   |
| Empty/error states | Empty-state CTA + distinct error notice    | Guides first-run users into the wizard; never masks a failure as "empty"                     | Plan   |
| Entry interaction  | Cards link to a detail page                | User wants to drill into the full recipe, not just metrics                                   | Plan   |
| Detail depth       | Full recipe, all sections read-only        | The natural payoff of a detail link; all data already in the `data` JSONB                    | Plan   |
| Metrics on read    | Show saved snapshot columns (no recompute) | Preserves the exact numbers shown at save time; keeps reads decoupled from the calc engine   | Plan   |

## Scope

**In scope:** read-only list page (cards), per-recipe read-only detail page, a `recipe-queries` read module + pure row→entity mapper, shared metric descriptors + reusable metric-tiles component, empty/error/not-found states.

**Out of scope:** edit/delete (v1 Non-Goal), export (S-06), GET/JSON API route, pagination/search/filter, metric recompute, any change to the save path, wizard, or calc engine.

## Architecture / Approach

Two SSR Astro pages under `src/pages/recipes/`. `index.astro` calls `listRecipes(supabase, userId)` and renders the card grid; `[id].astro` calls `getRecipe(supabase, userId, id)` and renders the full recipe from the `data` JSONB. A pure `recipe-mappers.ts` converts snake_case DB rows to camelCase entities (unit-tested); `recipe-metrics.ts` holds the metric descriptors (extracted from `MetricsPanel`) consumed by a reusable `RecipeMetricTiles.astro`. RLS handles ownership; the existing middleware already protects `/recipes/*`.

## Phases at a Glance

| Phase          | What it delivers                                                               | Key risk                                                          |
| -------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| 1. Read layer  | Query module, pure mapper (+tests), metric descriptors, metric-tiles component | Descriptor extraction accidentally changing `MetricsPanel` output |
| 2. List page   | Real `/recipes` card grid with empty + error states                            | Falsely showing "empty" on a query/config failure                 |
| 3. Detail page | `/recipes/[id]` full read-only recipe + not-found handling                     | Leaking existence of another user's recipe                        |

**Prerequisites:** S-04 done (table, RLS, types, save flow) — satisfied.
**Estimated effort:** ~1 session across 3 phases.

## Open Risks & Assumptions

- Assumes the small-scale persona needs no pagination/search in v1 (per PRD `target_scale.users: small`).
- Assumes the saved `data` JSONB always conforms to `RecipeDraft` (guaranteed by the S-04 save gate); detail rendering should still tolerate empty optional lists.
- Detail not-found is rendered as a 404 page (chosen over a silent redirect) so missing/forbidden ids don't masquerade as the list.

## Success Criteria (Summary)

- A user sees their saved recipes (newest first) with correct metrics and dates, and can open any one to view the full recipe read-only.
- New users get an empty-state CTA; failures show an error notice; users never see others' recipes.
- No edit/delete actions appear anywhere in the list or detail views.
