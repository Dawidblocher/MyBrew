<!-- IMPL-REVIEW-REPORT -->

# Implementation Review: Kreator — podstawy i zasyp z BLG/SRM na żywo (S-01)

- **Plan**: context/changes/wizard-basics-grist-blg-srm/plan.md
- **Scope**: All 4 phases (full plan)
- **Date**: 2026-06-05
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 4 warnings, 3 observations

## Verdicts

| Dimension           | Verdict |
| ------------------- | ------- |
| Plan Adherence      | WARNING |
| Scope Discipline    | WARNING |
| Safety & Quality    | WARNING |
| Architecture        | WARNING |
| Pattern Consistency | PASS    |
| Success Criteria    | PASS    |

Success criteria evidence: `npm run test:run` → 51/51 pass; `npm run lint` → clean (only a non-error astro-eslint-parser warning); `npm run build` → success.

## Findings

### F1 — Grist-step validation is unreachable dead code

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: src/components/recipe/RecipeWizard.tsx:30-37
- **Detail**: The grist branch of `handleNext` (validateWizardStep with gristStepSchema) can never run: "Dalej" is `disabled={isLastStep}` (WizardStepper.tsx:73) and grist IS the last step (index 1 of 2). So gristStepSchema's positive-volume rule, validateWizardStep, and src/lib/wizard-step-validation.ts are dead. Save/finish is correctly out of scope (S-04), so there is nothing to advance to on the last step.
- **Fix A ⭐ Recommended**: Remove the dead grist branch, gristStepSchema, and src/lib/wizard-step-validation.ts; keep field-level RHF validation as the only feedback on the last step.
  - Strength: Deletes ~40 lines of code that give false confidence; matches "no save gate in S-01" scope.
  - Tradeoff: Loses an extraction S-02 might reuse — but S-02 can reintroduce it when a real middle-step gate exists.
  - Confidence: HIGH — verified button disabled on step 2.
  - Blind spot: Whether S-02's design already assumed this helper exists.
- **Fix B**: Keep the helper but make grist validation actually fire — pass malt field paths and trigger on blur/submit instead of a disabled Next.
  - Strength: Preserves the extension point for S-02's multi-step gates.
  - Tradeoff: Adds wiring for a gate the 2-step flow doesn't need; must decide where it fires.
  - Confidence: MED — depends on intended last-step UX.
  - Blind spot: No terminal action exists yet to hang submit-validation on.
- **Decision**: SKIPPED

### F2 — Malt field array not centralized in useWizardRecipe (+ dead exports)

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Architecture
- **Location**: src/components/hooks/useWizardRecipe.ts:15-27, src/components/recipe/MaltList.tsx:10
- **Detail**: Plan makes useWizardRecipe the owner of the malt field array. The hook exposes malts + appendEmpty, but RecipeWizard.tsx:19 destructures only `{ form }` and MaltList.tsx:10 instantiates its own useFieldArray. The hook's malts/appendEmpty are dead exports; "single source of truth" seam drifted. Behavior is correct (RHF shares state via FormProvider).
- **Fix A ⭐ Recommended**: Drop unused malts/appendEmpty from useWizardRecipe; let MaltList keep its context-bound useFieldArray.
  - Strength: Valid RHF pattern; removes dead code with least churn.
  - Tradeoff: Diverges from plan's literal "hook owns the array."
  - Confidence: HIGH — FormProvider already shares the form.
  - Blind spot: None significant.
- **Fix B**: Wire MaltList to consume the hook's malts handle; delete its local useFieldArray.
  - Strength: Matches plan intent; one field-array instance.
  - Tradeoff: More plumbing.
  - Confidence: MED — confirm a single useFieldArray drives all rows.
  - Blind spot: Whether move/remove indices stay correct after rewire.
- **Decision**: FIXED via Fix A

### F3 — MetricsPanel watches the entire form (re-render hotspot)

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/recipe/MetricsPanel.tsx:39
- **Detail**: `useWatch({ control })` subscribes to all form values; every keystroke in basics.name/style recomputes BLG/SRM even though metrics only depend on batch + malts. Trivial at current scale, but unnecessary.
- **Fix**: Scope the watch — `useWatch({ control, name: ["batch", "malts"] })` — and shape the draft from those slices.
- **Decision**: FIXED

### F4 — Unplanned `name` field on MaltEntry (scope addition)

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: src/types.ts:2, src/lib/recipe-schema.ts:5, src/components/recipe/MaltRow.tsx:41-53
- **Detail**: Plan's malt contract was amount(kg)/color(EBC)/extract(%) only. Implementation threads an extra `name: string` through types, schema, MaltRow UI, and tests. Benign and arguably natural (named malts), but EXTRA scope not in the plan.
- **Fix A ⭐ Recommended**: Keep it and add a one-line addendum to the plan's malt contract so source of truth matches reality.
- **Fix B**: Remove the name field to stay strictly within S-01 scope.
- **Decision**: FIXED via Fix A (plan addendum added 2026-06-05)

### F5 — No explicit NaN/Infinity test cases

- **Severity**: 🔭 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/recipe-to-calc.test.ts
- **Detail**: "Never show NaN/Infinity" is the slice's headline guardrail. Tests cover empty list, zero/negative volume, zero-amount malts — but no draft with NaN (cleared numeric field) or Infinity is asserted to yield a sentinel. Guard holds today (verified), but untested.
- **Fix**: Add cases — `{ volumeL: NaN }`, malt `{ amountKg: NaN }` — asserting both metrics return ok:false.
- **Decision**: FIXED — added NaN/Infinity cases (mapDraftToCalcInput + computeWizardMetrics); the Infinity case exposed a real gap (`Infinity > 0` slipped past the guards), fixed by requiring `Number.isFinite` in the mapping. 55/55 tests pass.

### F6 — NaN not actually sanitized before mapping (fragile)

- **Severity**: 🔭 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/recipe/MetricsPanel.tsx:42-49, 9-11
- **Detail**: `?? 0` reads like sanitization but NaN is not nullish (NaN ?? 0 === NaN), so cleared inputs pass NaN into computeWizardMetrics. Caught downstream by `> 0` guards; formatMetric trusts result.ok with no Number.isFinite backstop. Works now; fragile to future mapping changes.
- **Fix**: Use `Number.isFinite(x) ? x : 0` when shaping the draft, and add a `Number.isFinite(result.value)` guard in formatMetric.
- **Decision**: FIXED — added `Number.isFinite(result.value)` backstop in formatMetric. The mapping-layer finiteness guard (F5) plus the scoped, fully-typed useWatch (F3) made the panel's `?? 0` shaping unnecessary; simplified it away.

### F7 — Empty grist passes schema with no message; dead basicsStepSchema export

- **Severity**: 🔭 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/recipe-schema.ts:28-33, :26
- **Detail**: gristStepSchema.malts has no `.min(1)`, so an empty grist is "valid" (no message; metrics correctly show —). Also basicsStepSchema (line 26) is exported but never used. Both minor; both tie into F1 — if the grist gate is removed, gristStepSchema goes with it.
- **Fix**: If a grist gate stays (F1 Fix B), add `.min(1, "Dodaj co najmniej jeden słód")`; otherwise remove gristStepSchema + basicsStepSchema with F1.
- **Decision**: FIXED (partial) — removed the unused basicsStepSchema export. gristStepSchema and the empty-grist `.min(1)` message left as-is (F1 skipped).
