# Recipe Edit & Delete (S-07) Implementation Plan

## Overview

Add edit and delete capabilities to saved recipes. Edit re-uses the existing
6-step wizard pre-filled from the saved `data` JSONB; delete prompts with a
shadcn Dialog before permanently removing the row. Both actions appear as icon
buttons on list cards (hover) and as full buttons on the detail page.

Implements roadmap slice **S-07** (post-v1, after S-05).

## Current State Analysis

- `recipes` table has RLS policies for SELECT + INSERT only — no UPDATE or DELETE
  policy and no `updated_at` column.
- `POST /api/recipes` is the only recipe API route; no PUT or DELETE exist.
- `RecipeWizard.tsx` is create-only — hard-coded to POST, no props for initial data
  or recipe ID.
- `/recipes/[id].astro` has export actions but no edit/delete affordances.
- `/recipes/index.astro` renders each card as an `<a>` wrapper — structural change
  required to embed action buttons without nested anchors (invalid HTML).
- No `dialog.tsx` in `src/components/ui/` — must install via
  `npx shadcn@latest add dialog`.
- `buildRecipeInsert()` in `src/lib/recipe-save.ts` validates + computes metrics
  — reusable for updates (same gate as create).
- `getRecipe()` in `src/lib/recipe-queries.ts` returns full `RecipeRecord` including
  `data: RecipeDraft` — the `initialData` source for edit mode.
- `RecipeRecord` in `src/types.ts` lacks `updatedAt`; `mapRowToRecord` in
  `recipe-mappers.ts` must be extended.

## Desired End State

A logged-in user can open any of their saved recipes and either:

- **Edit**: click "Edytuj" → land on `/recipes/[id]/edit` (wizard pre-filled with
  saved data across all 6 steps, live metrics active on load) → save → land on
  `/recipes/[id]` with updated values, updated metrics snapshot, and a fresh
  "Ostatnio edytowano" date shown below the save date.
- **Delete**: click "Usuń" → confirm in a Polish-copy Dialog naming the recipe →
  recipe removed permanently → redirected to `/recipes` list.

Both buttons appear on the detail page (full-text) and as hover icon buttons on
list cards. A second user cannot edit or delete another user's recipe (RLS +
explicit `user_id` filter in queries).

Verify by: editing a recipe's name and a malt amount → detail page shows updated
name, new metric values, and "Ostatnio edytowano" date; deleting → recipe absent
from list; PUT/DELETE as another user → 404/401.

### Key Discoveries:

- RLS UPDATE + DELETE policies are entirely absent — default-deny currently blocks
  all updates and deletes at DB level, regardless of `user_id` filter. Both must
  be added in the new migration alongside the `GRANT`.
- `buildRecipeInsert(draft, userId)` returns `RecipeInsert` (including `user_id`,
  `name`, `style`, `blg`, `srm`, `ibu`, `abv`, `data`) — the PUT handler reuses
  this to validate + recompute metrics, then strips `user_id` from the update
  payload (ownership is already asserted by the `eq("user_id", …)` filter).
- The PUT handler verifies row ownership via the update result itself: calling
  `.update(…).eq("id", id).eq("user_id", userId).select("id").maybeSingle()`
  returns `null` when 0 rows matched — no separate pre-check round trip needed.
- Card restructure is required: `<a>` wrappers cannot contain other `<a>` edit
  links or interactive delete buttons. Cards become `<div class="group relative">`
  with an inner content `<a>` and a positioned action toolbar.
- `lucide-react` is already a project dependency — `Pencil` and `Trash2` icons
  are available without an additional install.

## What We're NOT Doing

- No "save draft" / partial updates on edit — the PUT path requires a fully valid
  recipe (same gate as POST).
- No undo/restore after delete — the Dialog is the only safeguard.
- No pagination, bulk-delete, or search — small-scale persona (PRD).
- No optimistic list update after card-level delete — a full navigation to
  `/recipes` is the post-delete flow.
- No recipe versioning or change history.
- No change to the calc engine or MetricsPanel behavior.

## Implementation Approach

Three phases, building bottom-up: (1) DB migration + type extensions + API routes
for update/delete; (2) wizard edit-mode props + the edit page; (3) shadcn Dialog
install + delete island + action button wiring on detail page and list cards.

## Phase 1: DB + RLS + API Routes

### Overview

Add `updated_at` column, UPDATE + DELETE RLS policies and grants, extend types and
mapper, add two service functions in `recipe-queries.ts`, and add the new `PUT`
and `DELETE` routes at `/api/recipes/[id].ts`.

### Changes Required:

#### 1. Migration: updated_at + RLS + grants

**File**: `supabase/migrations/20260614100000_add_recipe_edit_delete.sql` (new)

**Intent**: Extend the `recipes` table and its RLS to allow owner-scoped updates
and deletes; add `updated_at` so the detail page can show when a recipe was last
changed.

**Contract**: Steps in order:
1. `ALTER TABLE public.recipes ADD COLUMN updated_at timestamptz;`
2. `UPDATE public.recipes SET updated_at = created_at;` (backfill existing rows)
3. `ALTER TABLE public.recipes ALTER COLUMN updated_at SET NOT NULL;`
4. `ALTER TABLE public.recipes ALTER COLUMN updated_at SET DEFAULT now();`
5. UPDATE RLS policy for `authenticated`: `USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`.
6. DELETE RLS policy for `authenticated`: `USING (auth.uid() = user_id)`.
7. `GRANT UPDATE, DELETE ON public.recipes TO authenticated;` (not to `anon`).

#### 2. RecipeRecord type + mapper extension

**File**: `src/types.ts` and `src/lib/recipe-mappers.ts`

**Intent**: Surface `updatedAt` on `RecipeRecord` so the detail page can render
the last-edited date; extend the DB row interface and mapper to include the new
column.

**Contract**: In `src/types.ts`, add `updatedAt: string` to `RecipeRecord`. In
`recipe-mappers.ts`, add `updated_at: string` to `RecipeRecordRow`; add
`updatedAt: row.updated_at` to `mapRowToRecord`.

#### 3. Mapper test extension

**File**: `src/lib/recipe-mappers.test.ts`

**Intent**: Pin the new `updatedAt` field in the mapper contract so the seam
doesn't silently drop it.

**Contract**: In the existing `mapRowToRecord` test case, add `updated_at` to the
input row fixture and assert `updatedAt` on the output entity.

#### 4. Service functions: updateRecipe + deleteRecipe

**File**: `src/lib/recipe-queries.ts`

**Intent**: Wrap the Supabase UPDATE and DELETE operations behind named functions
that surface explicit not-found and error states so the API routes return correct
HTTP statuses.

**Contract**:
- `updateRecipe(supabase, userId, id, payload)` where `payload` is
  `{ name, style, blg, srm, ibu, abv, data }` (no `user_id`). Calls
  `.update({ ...payload, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId).select("id").maybeSingle()`.
  Returns `{ ok: true }` when a row is returned; `{ ok: false, notFound: true }`
  when `data === null`; `{ ok: false, notFound: false }` on DB error.
- `deleteRecipe(supabase, userId, id)` calls
  `.delete().eq("id", id).eq("user_id", userId)`. Returns `{ ok: boolean }`
  (`false` on DB error only; 0-rows-deleted is `ok: true` — DELETE is idempotent).

#### 5. API routes: PUT + DELETE /api/recipes/[id]

**File**: `src/pages/api/recipes/[id].ts` (new)

**Intent**: Accept owner-authenticated update and delete requests; validate +
recompute metrics on update via the existing `buildRecipeInsert` seam; return
correct HTTP statuses.

**Contract**: `export const prerender = false; export const PUT: APIRoute; export const DELETE: APIRoute`.

PUT flow: `createClient` (null → 500); `supabase.auth.getUser()` (no user → 401);
parse `context.params.id`; parse JSON body (malformed → 400);
`buildRecipeInsert(body, user.id)` (not ok → 400 with errors); call
`updateRecipe(supabase, user.id, id, omitUserIdFromInsert(insert))`;
`notFound` → 404; `!ok` → 500; else → 200 `{ id }`.

DELETE flow: `createClient` (null → 500); `supabase.auth.getUser()` (no user →
401); parse `id`; `deleteRecipe(supabase, user.id, id)`; `!ok` → 500; else →
204 (no body).

### Success Criteria:

#### Automated Verification:

- Migration applies cleanly: `npx supabase db reset` (or `npx supabase migration up`)
- Unit tests pass (mapper test extended): `npm run test:run`
- Type checking passes: `npm run lint`
- Build passes: `npm run build`

#### Manual Verification:

- In Supabase Studio: `recipes` table has `updated_at` column; UPDATE and DELETE
  RLS policies are active.
- `PUT /api/recipes/<id>` with valid body as owner returns 200 `{ id }` and
  updates the row (verify `updated_at` changed in Studio).
- `DELETE /api/recipes/<id>` as owner returns 204 and removes the row.
- Same requests as a second (authenticated) user return 404.
- `PUT` with blank style / no positive malt returns 400 with `errors`.

**Implementation Note**: After completing this phase and all automated verification
passes, pause here for manual confirmation before proceeding to Phase 2. Phase
blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items
live in the `## Progress` section at the bottom of the plan.

---

## Phase 2: Wizard Edit Mode + Edit Page

### Overview

Add optional edit-mode props to `RecipeWizard` and `useWizardRecipe`, then wire a
new `/recipes/[id]/edit.astro` page that fetches the recipe server-side and
renders the wizard pre-filled.

### Changes Required:

#### 1. useWizardRecipe hook — optional initialData

**File**: `src/components/hooks/useWizardRecipe.ts`

**Intent**: Allow the wizard to start from existing recipe data instead of blank
defaults when in edit mode.

**Contract**: Add an optional `initialData?: RecipeDraft` parameter. Pass
`initialData ?? defaultRecipeDraft` as `defaultValues` to `useForm`. No other
behavioral change.

#### 2. RecipeWizard — edit mode props + PUT on save

**File**: `src/components/recipe/RecipeWizard.tsx`

**Intent**: Support edit mode — accept a recipe ID and initial data, switch the
save call from POST to PUT, redirect to the detail page on success, and show an
"Edytuj przepis" heading instead of the create heading.

**Contract**: Add props `recipeId?: string` and `initialData?: RecipeDraft`. Pass
`initialData` to `useWizardRecipe(initialData)`.

In `handleSave`:
- If `recipeId` is set: `fetch("/api/recipes/${recipeId}", { method: "PUT", … })`;
  on 200 → `window.location.href = "/recipes/${recipeId}"`.
- If not: existing `POST /api/recipes` path, on 201 → `window.location.href = "/recipes"`.
- 404 response in edit mode → redirect to `/recipes` (row gone or access lost).

Update the wizard's page/section heading to "Edytuj przepis" when `recipeId` is
set; otherwise keep the existing create heading.

#### 3. Edit page

**File**: `src/pages/recipes/[id]/edit.astro` (new)

**Intent**: A server-side protected page that fetches the owned recipe and renders
the wizard in edit mode pre-filled with saved data.

**Contract**: Frontmatter: read `Astro.locals.user` (middleware guarantees presence
on this route); `createClient(Astro.request.headers, Astro.cookies)` — if null,
`return Astro.redirect("/auth/signin")`; read `Astro.params.id`; call
`getRecipe(supabase, user.id, id)` — if null, set `Astro.response.status = 404`
and render a "Nie znaleziono przepisu" not-found page (same pattern as
`/recipes/[id].astro`). Else render `Layout` with
`title={"Edytuj: " + record.name}` and
`<RecipeWizard client:load recipeId={id} initialData={record.data} />`.

### Success Criteria:

#### Automated Verification:

- Type checking passes: `npm run lint`
- Build passes: `npm run build`

#### Manual Verification:

- Opening `/recipes/[id]/edit` for an owned recipe loads the wizard with all 6
  steps pre-populated (name, style, batch, malts, mash rests, hops, yeast,
  adjuncts match the saved values).
- Live metrics show correct values on load (not "—") because form defaults are set.
- Changing a field and saving redirects to `/recipes/[id]` with updated values
  and a new "Ostatnio edytowano" date.
- Opening another user's edit URL returns the not-found page.
- Edit with blank style or cleared attenuation is blocked with inline errors (same
  gate as create).

**Implementation Note**: After completing this phase and all automated verification
passes, pause here for manual confirmation before proceeding to Phase 3. Phase
blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items
live in the `## Progress` section at the bottom of the plan.

---

## Phase 3: Delete UI + Action Wiring (Detail Page + List Cards)

### Overview

Install the shadcn Dialog component, build a `DeleteRecipeDialog` React island with
compact/full variants, add edit + delete actions to the detail page, and restructure
list cards to host icon hover buttons without nested anchors.

### Changes Required:

#### 1. Install shadcn Dialog

**File**: (dependency install — `src/components/ui/dialog.tsx` produced)

**Intent**: Make the shadcn Dialog component available for the delete confirmation
modal, matching the project's existing shadcn/ui aesthetic.

**Contract**: Run `npx shadcn@latest add dialog`. This creates
`src/components/ui/dialog.tsx`. No other source files change.

#### 2. DeleteRecipeDialog component

**File**: `src/components/recipe/DeleteRecipeDialog.tsx` (new)

**Intent**: A reusable React island that shows a trigger button and a confirmation
Dialog; on confirm, calls `DELETE /api/recipes/:id` and redirects to `/recipes`.

**Contract**: Props: `id: string`, `recipeName: string`, `compact?: boolean`.

- `compact` false (detail page): trigger is a `Button` variant `"destructive"`
  with text "Usuń przepis".
- `compact` true (card icon): trigger is a `Button` variant `"ghost"` `size="icon"`
  with a `Trash2` Lucide icon and `aria-label="Usuń przepis"`.

Dialog content (all Polish): title "Usuń przepis", body text warning that the
action is permanent and naming `recipeName`, two buttons — "Anuluj" (closes dialog,
no action) and "Usuń" (destructive variant, triggers the fetch). On confirm:
`fetch("/api/recipes/${id}", { method: "DELETE" })`; on 204 →
`window.location.href = "/recipes"`; on error → show an inline error message
inside the Dialog (do not close or redirect).

#### 3. Detail page — edit link + delete dialog

**File**: `src/pages/recipes/[id].astro`

**Intent**: Add "Edytuj" and "Usuń przepis" action buttons to the detail page
alongside the existing export actions, and show the "Ostatnio edytowano" date
when the recipe has been modified.

**Contract**: In the detail page header/actions area (near `RecipeExportActions`),
add a row: `<a href={`/recipes/${record.id}/edit`}>` using a `Button` with
`variant="outline"` and label "Edytuj", then
`<DeleteRecipeDialog client:load id={record.id} recipeName={record.name} />`
(no `compact` prop — full destructive button). Below the "Zapisano" date, add
`{record.updatedAt > record.createdAt && <p>Ostatnio edytowano: {intlDate(record.updatedAt)}</p>}`
formatted via `new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" })`.

#### 4. List page — card restructure + hover icon toolbar

**File**: `src/pages/recipes/index.astro`

**Intent**: Restructure each recipe card from an `<a>` wrapper to a relative `div`
container with an inner content link and a positioned hover icon toolbar, to allow
embedding the edit link and delete island without invalid nested anchors.

**Contract**: Each card becomes:
```
<div class="group relative rounded-2xl border border-white/10 bg-white/10 ...">
  <a href="/recipes/${item.id}" class="block p-...">
    <!-- existing: name, style, metrics, date -->
  </a>
  <div class="absolute top-3 right-3 flex gap-1
              opacity-0 group-hover:opacity-100 focus-within:opacity-100
              transition-opacity">
    <a href="/recipes/${item.id}/edit">
      <Button variant="ghost" size="icon" aria-label="Edytuj przepis">
        <Pencil size={16} />
      </Button>
    </a>
    <DeleteRecipeDialog client:load id={item.id} recipeName={item.name} compact />
  </div>
</div>
```
The outer glassy card styles (currently on the `<a>`) move to the `<div>`. The inner `<a>` takes `class="block"` and the same padding. `Pencil` and `Trash2` come from `lucide-react` (already a project dependency).

### Success Criteria:

#### Automated Verification:

- Type checking passes: `npm run lint`
- Build passes: `npm run build`

#### Manual Verification:

- Detail page: "Edytuj" button navigates to the edit wizard.
- Detail page: "Usuń przepis" button opens the Dialog with the correct recipe name
  and Polish copy; confirming deletes the row and redirects to `/recipes`.
- Detail page: "Ostatnio edytowano" date appears after an edit; not shown on
  unmodified recipes (when `updatedAt === createdAt`).
- List cards: hovering reveals pencil + trash icon buttons; pencil navigates to
  the edit wizard; trash opens the delete Dialog.
- Deleting via the detail page removes the recipe from the list.
- Deleting via a list card icon removes only that recipe; the rest remain.
- A second user's edit/delete buttons lead to not-found or have no effect.

**Implementation Note**: After completing this phase and all automated verification
passes, pause here for manual confirmation. This completes the slice.

---

## Testing Strategy

### Unit Tests:

- `recipe-mappers.test.ts`: extend the existing `mapRowToRecord` test to assert
  `updatedAt` is mapped from `updated_at` (Phase 1).
- No new unit test files required: `buildRecipeInsert` is already tested in
  `recipe-save.test.ts` and is unchanged. The new service functions
  (`updateRecipe`, `deleteRecipe`) are thin Supabase wrappers verified manually.

### Integration Tests:

- Manual end-to-end (no integration harness in repo): edit → save → verify updated
  values + metrics + `updated_at`; delete → verify row gone + redirect;
  cross-user attempts → 404 on PUT, no-op on DELETE.

### Manual Testing Steps:

1. Apply migration (`npx supabase db reset`); sign in as user A.
2. Edit a recipe: change name + one malt amount → save → confirm detail page shows
   new name, new metric values, and "Ostatnio edytowano" date.
3. Delete a recipe from the detail page: Dialog shows correct name → confirm →
   redirected to list → recipe absent.
4. Delete a recipe from a list card hover icon: confirm same flow.
5. Sign in as user B: `PUT /api/recipes/<user-A-id>` → 404;
   `DELETE /api/recipes/<user-A-id>` → 204 but user A's row still exists.
6. Edit with blank style → blocked inline; edit with attenuation cleared → ABV
   uncomputable, save blocked.

## Performance Considerations

Negligible at PRD small scale: a single UPDATE or DELETE per action. The existing
`(user_id, created_at desc)` index is unaffected. `updated_at` adds one column to
each row; no additional index needed.

## Migration Notes

Single migration (`20260614100000_add_recipe_edit_delete.sql`) adds `updated_at`
to the existing `recipes` table and backfills with `created_at`. Existing rows
remain valid; no data loss or type changes on existing columns. After merge,
apply the migration on any deployed Supabase project before deploying the app
code (PUT would return 500 without the column).

## References

- Roadmap: `context/foundation/roadmap.md` (S-07)
- Prior slices: `context/changes/save-recipe/plan.md`,
  `context/changes/saved-recipes-list/plan.md`
- Save gate (reused for update): `src/lib/recipe-save.ts`
- Query module (extended): `src/lib/recipe-queries.ts`
- Types + mapper: `src/types.ts`, `src/lib/recipe-mappers.ts`
- Wizard: `src/components/recipe/RecipeWizard.tsx`,
  `src/components/hooks/useWizardRecipe.ts`
- Detail page: `src/pages/recipes/[id].astro`
- List page: `src/pages/recipes/index.astro`
- shadcn Dialog: `npx shadcn@latest add dialog`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: DB + RLS + API Routes

#### Automated

- [x] 1.1 Migration applies cleanly (`npx supabase db reset` or `npx supabase migration up`) — ff069af
- [x] 1.2 Unit tests pass (`npm run test:run`) — ff069af
- [x] 1.3 Type checking passes (`npm run lint`) — ff069af
- [x] 1.4 Build passes (`npm run build`) — ff069af

#### Manual

- [x] 1.5 `recipes` table has `updated_at` column + UPDATE + DELETE RLS policies active — ff069af
- [x] 1.6 `PUT /api/recipes/<id>` as owner returns 200 `{ id }` and updates the row — ff069af
- [x] 1.7 `DELETE /api/recipes/<id>` as owner returns 204 and removes the row — ff069af
- [x] 1.8 Second-user PUT returns 404; second-user DELETE leaves the original row intact — ff069af
- [x] 1.9 PUT with blank style / no positive malt returns 400 with `errors` — ff069af

### Phase 2: Wizard Edit Mode + Edit Page

#### Automated

- [x] 2.1 Type checking passes (`npm run lint`) — 544a742
- [x] 2.2 Build passes (`npm run build`) — 544a742

#### Manual

- [x] 2.3 `/recipes/[id]/edit` loads wizard with all 6 steps pre-populated — 544a742
- [x] 2.4 Live metrics show correct values on load (not "—") — 544a742
- [x] 2.5 Saving edit redirects to `/recipes/[id]` with updated values + "Ostatnio edytowano" date — 544a742
- [x] 2.6 Another user's edit URL returns the not-found page — 544a742
- [x] 2.7 Edit with blank style / cleared attenuation blocked with inline errors — 544a742

### Phase 3: Delete UI + Action Wiring

#### Automated

- [x] 3.1 Type checking passes (`npm run lint`)
- [x] 3.2 Build passes (`npm run build`)

#### Manual

- [x] 3.3 Detail page "Edytuj" navigates to the edit wizard
- [x] 3.4 Detail page "Usuń przepis" Dialog works; confirming deletes + redirects to `/recipes`
- [x] 3.5 "Ostatnio edytowano" shows after edit; absent on unmodified recipes
- [x] 3.6 List card hover reveals pencil + trash icons; both work correctly
- [x] 3.7 Deleting from list card removes only that recipe; others remain
