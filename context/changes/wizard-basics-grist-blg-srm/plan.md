# Kreator — podstawy i zasyp z BLG/SRM na żywo (S-01) Implementation Plan

## Overview

Build the first vertical product slice of Beer Recipe Builder: a multi-step **recipe wizard** where a logged-in home brewer starts a new recipe, enters basics (name, style), configures batch parameters and a **dynamic malt list** (add / reorder / remove), and sees **BLG and SRM recompute live** as inputs change (FR-003, FR-004, FR-005, FR-010).

This slice delivers the wizard UI, its in-memory state, and the live wiring to the calculation engine. It **consumes** the calc engine through a defined contract; it does **not** build the engine — that is F-02 (`calc-engine-harness`), a separate prerequisite change. Persistence (save) is out of scope (S-04).

## Current State Analysis

The repo is an Astro 6 SSR starter with Supabase auth — the product layer does not exist yet.

- React islands mount via Astro pages with `client:load` (e.g. `src/pages/auth/signin.astro:16` → `src/components/auth/SignInForm.tsx`).
- Route protection is a simple prefix list in middleware: `src/middleware.ts:4` (`PROTECTED_ROUTES = ["/dashboard"]`).
- shadcn/ui has only `src/components/ui/button.tsx`; `cn()` helper at `src/lib/utils.ts:4`.
- Existing forms use plain `useState` + a manual `validate()` (`SignInForm.tsx:18`). No React Hook Form, no direct `zod`.
- **`src/types.ts` does not exist.** Only `src/env.d.ts` types `App.Locals.user`.
- **No calc engine and no test runner** anywhere (no Vitest/Jest, no `*.test.ts`, no `test` script in `package.json`).
- `src/components/hooks/` does not exist yet (CLAUDE.md wants extracted hooks there).

### Key Discoveries:

- Island + props pattern is the template to follow: `src/pages/auth/signin.astro:6,16` passes props into a `client:load` React component.
- Middleware protection is additive — add a `/recipes` prefix to `PROTECTED_ROUTES` (`src/middleware.ts:4`).
- CLAUDE.md conventions to honor: API/validation via `zod`; extract hooks to `src/components/hooks/`; shared types in `src/types.ts`; shadcn `new-york`; merge classes with `cn()`; no Next.js directives.
- `lessons.md`: do not add dependencies (e.g. lodash) without clear justification — prefer native JS/TS.
- **BLG depends on mash efficiency, but mash efficiency is FR-006 / S-02.** S-01 therefore computes BLG with a documented default efficiency constant; S-02 replaces it with a user input. SRM (color) is independent of efficiency and is fully live in this slice.

## Desired End State

A logged-in user navigates to `/recipes/new`, sees a two-step wizard (Basics → Grist & batch) with a persistent BLG/SRM panel. Filling in name/style, batch volume, and at least one malt with amount/EBC/extract makes **SRM** and **BLG** display real, live-updating values; before minimum inputs exist the metrics read `—` (never `NaN`/`Infinity`). Add/up/down/remove on the malt list works and recomputes metrics immediately. Reordering and editing are keyboard-accessible. The slice has Vitest unit tests for the wizard→calc-input mapping and the wizard state logic, and `npm run lint` + `npm run build` pass.

Verify: load `/recipes/new` while logged in; confirm the stepper, both steps, the dynamic list, and the live placeholder→value transition for BLG and SRM.

## What We're NOT Doing

- **Not** building the calc engine or formula tests — that is F-02 (this plan codes against its contract).
- **No persistence / save** — no DB writes, no Supabase migration, no `recipes` table (that's S-04 / F-01).
- **No mash step** (efficiency, water-to-grain ratio, mash rests) — S-02; S-01 uses a default efficiency for BLG.
- **No hops/IBU, yeast/ABV, adjuncts** — S-02 / S-03.
- **No edit/delete, no export** — out of v1 / later slices.
- **No drag-and-drop reordering** — up/down buttons only (avoids a new dependency).
- **No save-time required-field gating** (name/style/min grist block) — that lives with save in S-04.
- **No unit toggle** — metric only (kg, L, EBC; gravity as BLG).

## Implementation Approach

A single React wizard island is mounted on a protected Astro page at `/recipes/new`. **React Hook Form owns all form state** (so it supersedes a separate reducer): a custom `useWizardRecipe()` hook in `src/components/hooks/` configures RHF with a `zodResolver`, default values, and `useFieldArray` for the malt list (add / move / remove). Live metrics are derived by watching form values (`useWatch`), mapping the current draft to the F-02 calc engine's input contract, and rendering the results in a persistent panel.

The stepper is built as a small reusable shell (step indicator + next/back navigation) driven by a step config array, so S-02/S-03 add steps by extending the array rather than rewriting navigation. Only steps 1 (Basics) and 2 (Grist & batch) are wired now.

The calc engine is treated as an external dependency with this **assumed F-02 contract** (defines what F-02 must ship, and what S-01 imports from `src/lib/calc/`):

- Pure, stateless functions in `src/lib/calc/`, e.g. `calcBLG(input)` and `calcSRM(input)`, plus a typed input/output contract type.
- BLG via extract gravity-points × efficiency / volume, expressed in °BLG (≈ °Plato/Balling); SRM via MCU → Morey, with EBC↔SRM conversion for malt color inputs.
- Metric units throughout (malt kg, color EBC, volume L); gravity surfaced as BLG.
- Functions return a sentinel (e.g. `null`) or the caller guards for insufficient/invalid input (empty malt list, non-positive volume) so the UI can show `—`.

If F-02's published contract differs in naming/shape when it lands, S-01 adapts at the single mapping boundary (Phase 4) — no other phase depends on the engine internals.

## Critical Implementation Details

- **Default mash efficiency in S-01.** BLG cannot be computed without efficiency, which is an S-02 input. Define a single named constant (default `0.75` / 75%) used as the efficiency input to `calcBLG` in this slice, in one place, clearly marked as "replaced by user input in S-02." SRM does not use it.
- **Insufficient-input guards live at the mapping boundary.** The recipe→calc-input mapping must return "not enough input" (so the panel shows `—`) when there is no malt with a positive amount or batch volume is not positive — this is what keeps `NaN`/`Infinity` off screen and satisfies the "no silent wrong numbers" guardrail.
- **RHF replaces the reducer.** Do not introduce a separate `useReducer`; the draft state's single source of truth is the RHF form. The "custom hook" requirement is met by `useWizardRecipe()` wrapping RHF setup.

## Phase 1: Foundation & routing

### Overview

Stand up dependencies, UI primitives, shared types, and the protected route + island mount so later phases have a place to build.

### Changes Required:

#### 1. Dependencies

**File**: `package.json`

**Intent**: Add the form/validation stack the wizard needs. Justified per `lessons.md` because the multi-step dynamic-array form and reusable validation schema are a strong, specific need.

**Contract**: Add runtime deps `react-hook-form`, `zod`, `@hookform/resolvers` (install latest via `npm install`). No version pinning beyond what npm resolves.

#### 2. shadcn/ui primitives

**File**: `src/components/ui/` (generated)

**Intent**: Install the form/layout primitives the wizard renders.

**Contract**: `npx shadcn@latest add input label card` (new-york). Components land under `src/components/ui/` and use `cn()`. (No `select` — style is free-text Input in v1; add `select` in S-02 when a curated style list / mash-rest selectors need it.)

#### 3. Shared wizard types

**File**: `src/types.ts` (new)

**Intent**: Define the in-memory wizard recipe-draft shape used across the wizard and the calc mapping. DB/entity types are F-01 and are out of scope.

**Contract**: Export `MaltEntry` (amount kg, color EBC, extract %), `BatchParams` (batch/finished volume L), `RecipeBasics` (name, style), and a `RecipeDraft` aggregate. Keep this file self-contained — define only draft types here and do **not** import from `src/lib/calc/`. The F-02 calc input/output types are imported solely inside Phase 4's `recipe-to-calc.ts`, so F-02 is touched at exactly one seam and Phases 1–3 build without it.

#### 4. Protected page + island mount

**File**: `src/pages/recipes/new.astro` (new)

**Intent**: Server-rendered page that mounts the wizard React island, following the auth signin pattern.

**Contract**: Astro page using `Layout.astro`, renders `<RecipeWizard client:load />`. No data fetching.

#### 5. Route protection + entry link

**File**: `src/middleware.ts`, dashboard page

**Intent**: Require auth for the wizard and give users a way in.

**Contract**: Add `"/recipes"` to `PROTECTED_ROUTES` in `src/middleware.ts:4`. Add a "Nowy przepis" link to `/recipes/new` on `src/pages/dashboard.astro`.

### Success Criteria:

#### Automated Verification:

- Dependencies install cleanly: `npm install`
- Type checking / build passes: `npm run build`
- Linting passes: `npm run lint`

#### Manual Verification:

- Visiting `/recipes/new` while logged out redirects to `/auth/signin`.
- Visiting `/recipes/new` while logged in renders an (empty) wizard island.
- The dashboard shows a working "Nowy przepis" link.

---

## Phase 2: Wizard shell & basics step

### Overview

Build the reusable, extensible stepper and the form backbone, then wire Step 1 (Basics).

### Changes Required:

#### 1. Wizard form hook

**File**: `src/components/hooks/useWizardRecipe.ts` (new)

**Intent**: Single source of truth for the recipe draft via RHF; exposes form methods and the malt field array. Honors CLAUDE.md "extract hooks to src/components/hooks/".

**Contract**: Configures `useForm<RecipeDraft>` with `zodResolver(recipeDraftSchema)`, sensible `defaultValues` (empty malt list, blank basics), and returns the RHF instance plus a `useFieldArray` handle for malts (with append / move / remove helpers).

#### 2. Validation schema

**File**: `src/lib/recipe-schema.ts` (new)

**Intent**: One zod schema for the draft, reused later at save (S-04).

**Contract**: `recipeDraftSchema` validating basics (name required; style optional free text in v1 — no gating), batch volume (positive number), and the malt array (each: positive amount, non-negative EBC, extract % within plausible bounds). Numeric coercion for text inputs.

#### 3. Stepper shell

**File**: `src/components/recipe/WizardStepper.tsx` (new) and `src/components/recipe/RecipeWizard.tsx` (new)

**Intent**: `RecipeWizard` is the island root: owns the form hook, current-step state, the persistent metrics panel slot, and renders the active step. `WizardStepper` renders the step indicator + next/back nav from a step config array.

**Contract**: Step config is an ordered array of `{ id, label, component }`; navigation advances/retreats an index; "next" can run per-step validation via RHF `trigger`. Built so adding steps 3–6 later is array-only. Mounted as the default export consumed by `new.astro`.

#### 4. Basics step

**File**: `src/components/recipe/steps/BasicsStep.tsx` (new)

**Intent**: Step 1 — recipe name and beer style.

**Contract**: RHF-controlled `Input` for name and an `Input` (free text) for style, with inline validation messages. (Style stays free text in v1; a curated select is a later enhancement.)

### Success Criteria:

#### Automated Verification:

- Build passes: `npm run build`
- Linting passes: `npm run lint`

#### Manual Verification:

- The stepper shows two steps and Basics is active first.
- "Next" is blocked (with a message) when name is empty; allowed once valid.
- Back/next preserve entered values.

---

## Phase 3: Grist & batch step + dynamic malt list

### Overview

Build Step 2: batch parameters and the dynamic malt list with add / reorder / remove.

### Changes Required:

#### 1. Grist & batch step

**File**: `src/components/recipe/steps/GristStep.tsx` (new)

**Intent**: Step 2 — batch volume input plus the malt list editor.

**Contract**: RHF-controlled numeric `Input` for batch/finished volume (L). Renders the malt list from `useFieldArray`. (Only the batch param BLG/SRM consume — volume — is included now; additional batch params like losses/evaporation arrive with the slices that need them.)

#### 2. Malt list rows + controls

**File**: `src/components/recipe/MaltList.tsx` (new), `src/components/recipe/MaltRow.tsx` (new)

**Intent**: One editable row per malt with reorder/remove, plus an add control.

**Contract**: Each row: numeric inputs for amount (kg), color (EBC), extract (%); up/down buttons calling field-array `move` (disabled at ends); remove (×) calling `remove`; an "Dodaj słód" button calling `append` with empty defaults. Per-field validation messages from the zod schema. Keyboard-accessible buttons.

### Success Criteria:

#### Automated Verification:

- Build passes: `npm run build`
- Linting passes: `npm run lint`

#### Manual Verification:

- Add creates a new empty malt row; remove deletes the correct row.
- Up/down reorder rows correctly and are disabled at the list ends.
- Invalid numeric entries (negative amount, empty volume) show validation messages.

---

## Phase 4: Live metrics integration + tests

### Overview

Map the draft to the calc engine's inputs, render BLG/SRM live in a persistent panel with placeholder behavior, and add unit tests for the risky glue.

### Changes Required:

#### 1. Draft → calc-input mapping

**File**: `src/lib/recipe-to-calc.ts` (new)

**Intent**: Translate the current `RecipeDraft` into the F-02 engine input contract, applying the default efficiency constant and the insufficient-input guards.

**Contract**: A pure function `mapDraftToCalcInput(draft)` returning either calc inputs or a "not enough input" sentinel when no malt has a positive amount or volume ≤ 0. Defines the `DEFAULT_MASH_EFFICIENCY` constant (0.75), marked as replaced by user input in S-02. Calls `calcBLG`/`calcSRM` (or a thin `computeMetrics` wrapper) from `src/lib/calc/`.

#### 2. Persistent metrics panel

**File**: `src/components/recipe/MetricsPanel.tsx` (new)

**Intent**: Always-visible BLG + SRM display that updates live across both steps.

**Contract**: Uses RHF `useWatch` on the draft, runs the mapping, and renders BLG and SRM values; renders `—` when the mapping returns the insufficient-input sentinel (so it never shows `NaN`/`Infinity`). Mounted in `RecipeWizard` outside the per-step area so it persists. Placeholder state on the Basics step reads as intentional (labeled units, dashes).

#### 3. Unit tests

**File**: `src/lib/recipe-to-calc.test.ts` (new); optionally `src/components/hooks/useWizardRecipe` logic test

**Intent**: Cover the wizard→engine mapping and guard logic (the real bug surface in this slice); formula correctness is F-02's harness.

**Contract**: Vitest tests asserting: empty list → sentinel; zero/blank volume → sentinel; a valid draft → expected calc-input shape (efficiency applied, EBC passed through); malt with zero amount ignored. Add a `test` script to `package.json` if F-02 has not already (F-02 introduces Vitest; reuse its config).

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm run test` (or `npx vitest run`)
- Build passes: `npm run build`
- Linting passes: `npm run lint`

#### Manual Verification:

- With no malts / blank volume, BLG and SRM show `—`.
- Adding a malt with amount/EBC/extract and a positive volume makes SRM and BLG show real values.
- Editing any contributing field updates BLG/SRM immediately (no separate "calculate" action).
- Removing all malts returns the metrics to `—`.

---

## Testing Strategy

### Unit Tests:

- `mapDraftToCalcInput`: insufficient-input sentinel cases (empty list, zero-amount malts, non-positive volume); valid mapping (efficiency constant applied, EBC/volume passed through).
- Wizard state logic where extractable (field-array add/move/remove behavior, per-step validation gating).

### Integration Tests:

- None automated in this slice (component/DOM tests deferred). The mapping unit tests cover the integration seam with the engine.

### Manual Testing Steps:

1. Log in, open `/recipes/new`; confirm redirect when logged out.
2. On Basics, confirm next is gated on a valid name; metrics show `—`.
3. On Grist & batch, set volume and add a malt; watch SRM then BLG populate.
4. Edit amount/EBC/extract/volume and confirm live recompute.
5. Add several malts, reorder with up/down, remove some; confirm metrics track and ends disable correctly.
6. Clear malts/volume; confirm metrics return to `—` (never NaN).

## Performance Considerations

Recalculation runs on each watched-field change. At realistic malt counts (single digits) the pure calc functions are trivial; no memoization needed initially. If a hotspot appears later, memoize the mapping result on the watched draft.

## Migration Notes

None — no persistence or schema changes in this slice.

## References

- Roadmap slice: `context/foundation/roadmap.md` (S-01, lines 92–102)
- PRD: `context/foundation/prd.md` (FR-003/004/005/010, Business Logic, Guardrails)
- Prerequisite contract: F-02 `calc-engine-harness` (calc engine in `src/lib/calc/`)
  - **Hard gate**: `/10x-implement` for S-01 MUST NOT start until F-02's `src/lib/calc/` contract is committed (functions + input/output types). As of this plan there is no `context/changes/calc-engine-harness/` folder and no `src/lib/calc/` — confirm or create the F-02 change first, otherwise every phase's `npm run build` (and Phase 4's `npm run test`) fails on a missing module.
- Island pattern: `src/pages/auth/signin.astro:16`, `src/components/auth/SignInForm.tsx`
- Route protection: `src/middleware.ts:4`
- Conventions: `CLAUDE.md`; `context/foundation/lessons.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Foundation & routing

#### Automated

- [x] 1.1 Dependencies install cleanly: `npm install` — ed93160
- [x] 1.2 Type checking / build passes: `npm run build` — ed93160
- [x] 1.3 Linting passes: `npm run lint` — ed93160

#### Manual

- [x] 1.4 `/recipes/new` redirects to signin when logged out — ed93160
- [x] 1.5 `/recipes/new` renders the wizard island when logged in — ed93160
- [x] 1.6 Dashboard shows a working "Nowy przepis" link — ed93160

### Phase 2: Wizard shell & basics step

#### Automated

- [x] 2.1 Build passes: `npm run build` — 747c0da
- [x] 2.2 Linting passes: `npm run lint` — 747c0da

#### Manual

- [x] 2.3 Stepper shows two steps with Basics active first — 747c0da
- [x] 2.4 Next is gated on a valid name, allowed once valid — 747c0da
- [x] 2.5 Back/next preserve entered values — 747c0da

### Phase 3: Grist & batch step + dynamic malt list

#### Automated

- [x] 3.1 Build passes: `npm run build` — ecc920c
- [x] 3.2 Linting passes: `npm run lint` — ecc920c

#### Manual

- [x] 3.3 Add creates an empty row; remove deletes the correct row — ecc920c
- [x] 3.4 Up/down reorder correctly and disable at list ends — ecc920c
- [x] 3.5 Invalid numeric entries show validation messages — ecc920c

### Phase 4: Live metrics integration + tests

#### Automated

- [ ] 4.1 Unit tests pass: `npm run test` (or `npx vitest run`)
- [ ] 4.2 Build passes: `npm run build`
- [ ] 4.3 Linting passes: `npm run lint`

#### Manual

- [ ] 4.4 No malts / blank volume → BLG and SRM show `—`
- [ ] 4.5 Valid malt + volume → SRM and BLG show real values
- [ ] 4.6 Editing any contributing field updates metrics immediately
- [ ] 4.7 Removing all malts returns metrics to `—`
