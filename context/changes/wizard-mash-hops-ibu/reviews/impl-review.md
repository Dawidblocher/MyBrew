<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Kreator — zacieranie i chmiel z IBU na żywo (S-02)

- **Plan**: context/changes/wizard-mash-hops-ibu/plan.md
- **Scope**: All phases (1–4)
- **Date**: 2026-06-06
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 3 warnings, 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING ⚠️ |
| Scope Discipline | WARNING ⚠️ |
| Safety & Quality | PASS ✅ |
| Architecture | PASS ✅ |
| Pattern Consistency | PASS ✅ |
| Success Criteria | PASS ✅ |

## Findings

### F1 — Custom HopStageSelect instead of native `<select>`

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence / Scope Discipline
- **Location**: src/components/recipe/HopStageSelect.tsx, HopRow.tsx:116–128
- **Detail**: Plan Phase 4 specified a native styled `<select>` for hop stage (“What We're NOT Doing” excludes shadcn Select). Implementation uses a custom button + listbox dropdown (`HopStageSelect.tsx`) wired via `Controller`. Functionally correct — PL labels map to `boil`/`whirlpool`/`dryHop` — but deviates from the planned UI artifact.
- **Fix A ⭐ Recommended**: Add a one-line note to plan Phase 4 or `change.md` documenting the intentional deviation and rationale (e.g. Windows native dropdown unreadable).
  - Strength: Preserves working UX; updates source of truth for future reviews.
  - Tradeoff: Plan becomes slightly stale on UI detail.
  - Confidence: HIGH — deviation is localized and behavior-validated.
  - Blind spot: None significant.
- **Fix B**: Revert to native `<select>` with `color-scheme: dark`
  - Strength: Matches plan literally.
  - Tradeoff: May regress dropdown readability on Windows.
  - Confidence: LOW — prior manual QA rejected native styling.
  - Blind spot: Other browsers/OS may behave differently.
- **Decision**: SKIPPED

### F2 — Hops step validation is dead code

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence / Reliability
- **Location**: src/components/recipe/RecipeWizard.tsx:45–47, WizardStepper.tsx:73
- **Detail**: Plan requires `validateWizardStep(hopsStepSchema, …)` on the hops step. `WizardStepper` disables „Dalej” when `isLastStep` (line 73), and Chmiel is the final step — so `handleNext` never runs hops validation on user action. The branch is unreachable until a save/finish action replaces disabled Dalej (S-04).
- **Fix A ⭐ Recommended**: Leave as-is; add a TODO in `RecipeWizard` noting hops validation will wire to save in S-04.
  - Strength: Matches current v1 scope (no save yet); validation code is ready.
  - Tradeoff: Dead code until S-04.
  - Confidence: HIGH — `isLastStep` disable predates this slice.
  - Blind spot: None significant.
- **Fix B**: Enable Dalej on last step now (no-op advance) so validation runs
  - Strength: Makes hops validation reachable immediately.
  - Tradeoff: Confusing UX — „Dalej” with nowhere to go.
  - Confidence: MEDIUM — needs copy/behavior design.
  - Blind spot: User expectation for final-step button label.
- **Decision**: FIXED via Fix A

### F3 — validateWizardStep does not map array field errors

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality / Reliability
- **Location**: src/lib/wizard-step-validation.ts:23–28, RecipeWizard.tsx:43–47
- **Detail**: `validateWizardStep` only calls `setError` when `issue.path` is in the whitelisted `fieldPaths`. Hops step passes `[]`; mash step passes only `["mash.efficiencyPct"]`. Invalid array rows (e.g. alpha > 100, `NaN` from cleared numeric input) block Zod but show no field-level error. Same pattern inherited from grist step. Recorded in `lessons.md` but not yet fixed.
- **Fix**: Extend `validateWizardStep` to map all Zod `issue.path` values (including indexed paths like `hops.0.alphaAcidPercent`) to `FieldPath`, regardless of whitelist.
- **Decision**: FIXED

### F4 — utilizationFactor not clamped in engine

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality / Data safety
- **Location**: src/lib/calc/ibu.ts:48, src/lib/calc/types.ts:51–55
- **Detail**: `utilizationFactor` is documented as `[0, 1]` but applied raw with `(h.utilizationFactor ?? 1)`. Out-of-range values could yield inflated or negative IBU. Wizard seam only supplies `1` or `0.25` today; risk is for future engine consumers.
- **Fix**: Clamp to `[0, 1]` in `calcIBU` or reject invalid factors with `{ ok: false }`.
- **Decision**: FIXED

### F5 — Uncommitted gravity reuse optimization

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality / Performance
- **Location**: src/lib/recipe-to-calc.ts:109 (working tree, unstaged)
- **Detail**: Working tree replaces `calcBLG(...)` with `blgFromSg(gravity.value.sg)` so gravity is computed once for both BLG and IBU. Correct, mirrors `computeMetrics` pattern; tests still pass. Not yet committed.
- **Fix**: Commit the staged optimization with the change close-out or include in a follow-up commit.
- **Decision**: FIXED
