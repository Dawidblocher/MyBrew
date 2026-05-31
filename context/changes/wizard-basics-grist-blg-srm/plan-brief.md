# Kreator — podstawy i zasyp z BLG/SRM na żywo (S-01) — Plan Brief

> Full plan: `context/changes/wizard-basics-grist-blg-srm/plan.md`

## What & Why

Build the first vertical product slice: a multi-step recipe wizard where a logged-in home brewer enters recipe basics (name, style), configures batch parameters and a dynamic malt list (add/reorder/remove), and watches **BLG and SRM recompute live** as inputs change (FR-003/004/005/010). This proves the core product promise — live, correct metrics from real recipe inputs — for the first two of the eventual six wizard steps.

## Starting Point

The repo is an Astro 6 SSR starter with Supabase auth only. No product layer exists: no `src/types.ts`, no calc engine, no test runner, and only the shadcn `button`. React islands mount via `client:load` on Astro pages; route protection is a prefix list in `src/middleware.ts`; existing forms use plain `useState`.

## Desired End State

At `/recipes/new` (protected), a two-step wizard (Basics → Grist & batch) shows a persistent BLG/SRM panel. Entering a name, a positive batch volume, and at least one malt (amount/EBC/extract) makes SRM and BLG display live, updating on every keystroke; before minimum inputs exist the metrics read `—` (never NaN/Infinity). The malt list supports add, up/down reorder, and remove. Unit tests cover the wizard→engine mapping; lint and build pass.

## Key Decisions Made

| Decision | Choice | Why | Source |
| --- | --- | --- | --- |
| F-02 (calc engine) handling | Separate prerequisite change; S-01 consumes its contract | Keeps roadmap's foundation/slice split; S-01 codes against a defined `src/lib/calc/` interface | Plan |
| Calc engine shape (F-02 contract) | Pure functions in `src/lib/calc/`, typed input/output | Trivially testable, no hidden state, extensible per metric | Plan |
| Formulas / units | Gravity-points (BLG) + Morey (SRM); metric, EBC→SRM | De-facto home-brew standards; matches Polish persona conventions | Plan |
| Wizard shell | Extensible stepper, 2 steps active now | S-02/S-03 add steps via config array, no nav rewrite | Plan |
| Form & state | React Hook Form + zod (`useFieldArray`), wrapped in `useWizardRecipe()` hook | RHF owns state (supersedes a reducer); built for dynamic arrays + validation reused at save | Plan |
| Reorder UX | Up/down buttons (no drag-drop) | Zero new deps, keyboard-accessible | Plan |
| Incomplete-input display | Placeholder `—` until valid; guards prevent NaN | Honors "no silent wrong numbers" guardrail | Plan |
| BLG before mash step | Default efficiency constant (75%), replaced by user input in S-02 | Mash efficiency is FR-006/S-02; SRM is efficiency-independent | Plan |
| Routing | Protected `/recipes/new`, linked from dashboard | Composes with `/recipes` list/detail in later slices | Plan |
| Testing this slice | Vitest unit tests for mapping + wizard logic; manual UI check | Formula correctness is F-02's harness; this covers the glue | Plan |

## Scope

**In scope:** protected `/recipes/new` page + React wizard island; extensible stepper; Basics step; Grist & batch step with dynamic malt list; live BLG/SRM panel with placeholder behavior; draft→calc-input mapping; unit tests.

**Out of scope:** the calc engine itself (F-02); persistence/save (S-04, F-01); mash/hops/yeast/adjuncts steps (S-02/S-03); edit/delete/export; drag-drop; unit toggle.

## Architecture / Approach

One React island (`RecipeWizard`) on a protected Astro page. RHF (via `useWizardRecipe()`) is the single source of truth; `useFieldArray` drives the malt list; a step config array powers a reusable stepper. A persistent `MetricsPanel` watches form values (`useWatch`), maps the draft to the F-02 engine inputs (applying default efficiency + insufficient-input guards), and renders BLG/SRM. The engine is an external dependency touched only at the single mapping boundary.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Foundation & routing | Deps, shadcn primitives, `src/types.ts`, protected `/recipes/new` + island, dashboard link | Middleware/route wiring regressions |
| 2. Wizard shell & basics | Extensible stepper, `useWizardRecipe()` hook + zod schema, Basics step | Over-engineering the step abstraction |
| 3. Grist & batch + malt list | Batch volume input, malt rows with add/move/remove + validation | Field-array reorder/remove edge cases |
| 4. Live metrics + tests | Draft→calc mapping with guards, persistent BLG/SRM panel, Vitest tests | Mapping mismatch vs F-02's actual contract |

**Prerequisites:** F-02 (`calc-engine-harness`) implemented first — `/10x-implement` for S-01 is gated on it. Logged-in auth already exists.
**Estimated effort:** ~2–3 after-hours sessions across 4 phases.

## Open Risks & Assumptions

- **F-02 must land first.** S-01's live metrics are inert until the calc engine exists; the assumed contract (function names/shape) may need a small adaptation at the mapping boundary when F-02 ships.
- **Default efficiency (75%) for BLG** is an interim value; BLG figures will shift once S-02 makes efficiency user-configurable.
- **Style as free text** in v1; a curated style list is a later enhancement.

## Success Criteria (Summary)

- A logged-in user can start a recipe, enter basics + batch + malts, and see BLG and SRM update live.
- Metrics never show silent wrong numbers — `—` until inputs are valid.
- Malt list add/reorder/remove works and recomputes metrics immediately; lint, build, and unit tests pass.
