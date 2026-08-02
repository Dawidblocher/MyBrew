# Recipe Edit & Delete — Plan Brief

> Full plan: `context/changes/recipe-edit-delete/plan.md`

## What & Why

Saved recipes are currently read-only (v1 scope cut). This slice adds the two
missing lifecycle actions: **edit** (re-open in the wizard, change anything, save
with fresh metrics) and **delete** (permanent removal after a confirmation dialog).
Both were explicitly deferred from v1; S-05 (list page) is the prerequisite and is
complete.

## Starting Point

The `recipes` table exists with SELECT + INSERT RLS only — no UPDATE or DELETE
policy. The wizard (`RecipeWizard.tsx`) is create-only. The detail page has export
buttons but no edit/delete affordances. No shadcn Dialog component is installed.
The list page renders each card as an `<a>` wrapper, which must be restructured to
host action buttons.

## Desired End State

A user on `/recipes/[id]` sees "Edytuj" and "Usuń przepis" buttons. Clicking
"Edytuj" opens `/recipes/[id]/edit` — the existing wizard pre-filled with all 6
steps and live metrics active from load — and on save redirects back to the detail
page with updated values and a "Ostatnio edytowano" timestamp. Clicking "Usuń"
opens a Dialog naming the recipe; confirming permanently removes it and redirects
to `/recipes`. The same actions are accessible as hover icons on list cards (pencil

- trash). A second user cannot affect another user's recipes.

## Key Decisions Made

| Decision                       | Choice                              | Why (1 sentence)                                                                                                            | Source |
| ------------------------------ | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------ |
| Edit UI: wizard vs single-page | Wizard (re-use existing)            | Zero duplicate form code — all 6 steps, validation, and live metrics already exist; edit mode = passing `initialData` prop. | Plan   |
| Delete confirmation            | shadcn Dialog                       | Matches glassy UI aesthetic; native `window.confirm()` cannot render Polish copy or match app styling.                      | Plan   |
| Edit/delete entry points       | Detail page + list card hover icons | Detail page is the natural review-before-act location; icon buttons on cards avoid cluttering the list at rest.             | Plan   |
| Post-edit navigation           | `/recipes/[id]` detail page         | User immediately sees the updated result; returning to the list loses the "just edited" context.                            | Plan   |
| Post-delete navigation         | `/recipes` list                     | Recipe is gone — the list is the only valid destination.                                                                    | Plan   |
| `updated_at` column            | Yes, backfilled from `created_at`   | Enables "Ostatnio edytowano" on the detail page; costs one migration + one column.                                          | Plan   |
| `updated_at` UI placement      | Detail page only                    | Cards already carry name/style/4 metrics/date; a second date competes for space.                                            | Plan   |
| Card action style              | Icon buttons on hover               | Cards stay clean at rest; `focus-within` fallback covers keyboard and touch.                                                | Plan   |

## Scope

**In scope:**

- DB migration: `updated_at` column + UPDATE + DELETE RLS policies + grants
- `PUT /api/recipes/[id]` and `DELETE /api/recipes/[id]` routes
- Wizard edit mode (`recipeId` + `initialData` props; PUT on save)
- `/recipes/[id]/edit.astro` edit page
- shadcn Dialog install + `DeleteRecipeDialog` React island (compact + full variants)
- Edit link + delete Dialog on detail page, with "Ostatnio edytowano" date
- List card restructure + hover icon toolbar (pencil + trash)

**Out of scope:**

- Save-draft / partial edit (same strict validation gate as create)
- Undo/restore after delete
- Bulk delete, search, pagination
- Recipe versioning or change history

## Architecture / Approach

Phases build bottom-up. The existing `buildRecipeInsert()` seam validates +
recomputes metrics for both POST and PUT — no new validation logic. Ownership is
enforced at two layers: RLS policy (`auth.uid() = user_id`) and an explicit
`.eq("user_id", userId)` filter in each query. The PUT handler detects not-found
via `maybeSingle()` on the `.update().select()` chain (null = 0 rows matched).
Delete is idempotent (204 whether or not the row existed). The React `DeleteRecipeDialog`
island handles the Dialog + fetch + redirect client-side; the edit link is a plain
`<a>` (no interactivity needed).

## Phases at a Glance

| Phase                           | What it delivers                                                                            | Key risk                                                                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 1. DB + RLS + API Routes        | Migration (updated_at, RLS, grants) + service functions + PUT/DELETE routes                 | Migration must be applied before code deploy — PUT returns 500 without the column                                                 |
| 2. Wizard Edit Mode + Edit Page | `RecipeWizard` edit props + `useWizardRecipe` initial data + `/recipes/[id]/edit.astro`     | Wizard form `defaultValues` must be set at hook instantiation — not patched post-mount — or live metrics won't populate on load   |
| 3. Delete UI + Action Wiring    | shadcn Dialog install + `DeleteRecipeDialog` island + detail/list wiring + card restructure | Card restructure (from `<a>` wrapper to `div` + inner link) changes the existing list DOM — visual regression risk on card styles |

**Prerequisites:** S-05 fully implemented (list + detail pages in place) — ✓ done.
**Estimated effort:** ~2–3 sessions across 3 phases.

## Open Risks & Assumptions

- Supabase migration must be applied to any deployed project before the code lands
  — the PUT route calls `.update()` on a column (`updated_at`) that doesn't exist
  yet without the migration.
- Card hover icons are invisible on pure touch devices (no `:hover` state). The
  `focus-within` fallback covers keyboard navigation; touch users can still reach
  edit/delete via the detail page. A `@media (hover: none)` always-visible rule
  could be added if touch UX is a concern.

## Success Criteria (Summary)

- User can edit any owned recipe through the wizard and see updated values + metrics
  on the detail page immediately after saving.
- User can delete any owned recipe via a named Polish confirmation Dialog and the
  recipe is permanently gone from the list.
- A second user cannot edit or delete another user's recipe (RLS + query filter).
