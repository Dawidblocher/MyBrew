# Calc Engine + Correctness Harness (F-02) Implementation Plan

## Overview

Build the foundation calculation layer for Beer Recipe Builder: a pure, stateless beer-metrics engine in `src/lib/calc/` that computes all four recipe metrics — **BLG, SRM, IBU, ABV** — from typed inputs, plus a **Vitest correctness harness** that pins each formula to authoritative reference values. This change is the concrete realization of the product's NFR guardrail: _"calculated BLG, ABV, SRM, and IBU must be correct for standard inputs — no silent wrong numbers."_

The engine exposes per-metric functions and an aggregate `computeMetrics(input)`, all returning a discriminated `CalcResult<T>` so insufficient/invalid input surfaces as a typed `{ ok: false }` (the UI renders `—`) instead of `NaN`/`Infinity`. S-01 (`wizard-basics-grist-blg-srm`) is already built through its Phase 3 and is **blocked on this change** for its Phase 4 live-metrics wiring.

## Current State Analysis

The repo is an Astro 6 SSR starter (React 19 islands, Tailwind 4, Supabase auth, Cloudflare adapter). The wizard slice S-01 exists through Phase 3 but the calc engine it imports does not.

- **No `src/lib/calc/` and no test runner.** `package.json` has no Vitest/Jest and no `test` script (`package.json:5-14`). No `*.test.ts` exists anywhere.
- **S-01 input shapes already exist** in `src/types.ts`: `MaltEntry { name, amountKg, colorEbc, extractPercent }`, `BatchParams { volumeL }`, `RecipeDraft` (`src/types.ts:1-21`). These are the _wizard draft_ shapes — not the engine's inputs (the engine gets dedicated types; the wizard maps draft→calc input at its seam).
- **S-01's assumed F-02 contract** (`context/changes/wizard-basics-grist-blg-srm/plan.md:52-59`): pure functions in `src/lib/calc/` (`calcBLG`/`calcSRM` or a `computeMetrics` wrapper), typed input/output, a sentinel for insufficient input, metric units (kg/EBC/L), BLG via gravity-points × efficiency / volume, SRM via MCU → Morey with EBC↔SRM. S-01 isolates the engine to a single mapping boundary (`src/lib/recipe-to-calc.ts`, planned in its Phase 4) so it can adapt if F-02's names differ.
- **ESLint is strict and type-checked** (`eslint.config.js:14-38`): `strictTypeChecked` + `stylisticTypeChecked` with `projectService: true`, so any `*.test.ts` will be type-checked and must satisfy strict rules (test globals must resolve). `tsconfig.json` includes `**/*` (`tsconfig.json:3`) and aliases `@/* → ./src/*`.
- **CI** runs lint + build on push/PR to master (`.github/workflows/ci.yml`); there is no test step yet.
- **Toolchain note:** Vite 7 is pinned via `overrides` (`package.json:62-64`); Vitest must be a version compatible with Vite 7.

### Key Discoveries:

- The engine is **pure math** — it needs no Astro/Cloudflare runtime, so a plain Vitest (node environment) setup is sufficient; no Astro test integration required.
- The four metrics are **not independent at the math level**: IBU (Tinseth) and ABV both need original gravity (OG/SG), which derives from the grist + efficiency + volume — the same computation that produces BLG. Gravity is therefore a shared internal helper computed once.
- The product surfaces metrics **progressively** (SRM/BLG from the grist step, IBU after hops, ABV after yeast), so the aggregate must return _per-metric independent_ results, not all-or-nothing.
- `lessons.md`: don't add dependencies without clear justification — a test runner is a clear, specific need (the NFR guardrail is unverifiable without one); no other runtime deps are added.

## Desired End State

`src/lib/calc/` exports, via a barrel (`index.ts`):

- `calcBLG`, `calcSRM`, `calcIBU`, `calcABV` — each taking a dedicated, typed input and returning `CalcResult<number>`.
- `computeMetrics(input)` — returns `{ blg, srm, ibu, abv }`, each an independent `CalcResult<number>`, computing shared gravity once.
- `CalcResult<T>`, the per-metric input types, and the aggregate input/output types from `types.ts`.

`npm test` runs the Vitest suite; the harness asserts each formula against cited authoritative reference values (within tolerance) plus invariant and sentinel cases; CI runs lint, build, **and** tests on every push/PR. All formulas compute in canonical metric units at full precision (formatting is the consumer's concern).

Verify: `npm test` is green with golden-vector coverage for all four metrics; `npm run lint` and `npm run build` pass; CI shows a passing test job; a follow-up `/10x-implement` of S-01 Phase 4 can import the named functions from `@/lib/calc` and complete.

## What We're NOT Doing

- **No UI, no wizard wiring.** S-01 owns the draft→calc mapping (`recipe-to-calc.ts`), the metrics panel, and live recompute. This change ships only the engine + harness.
- **No formatting/rounding for display** — engine returns full-precision numbers; consumers round.
- **No persistence, no DB entity coupling.** The engine does not import F-01 schema/entity types; inputs are dedicated calc types.
- **No unit toggle / imperial inputs** — canonical metric (kg, L, EBC, %AA, attenuation as fraction). Internal imperial conversions (e.g. Morey MCU) are an implementation detail, never an input/output unit.
- **No `RecipeDraft` coupling** — the engine must not import from `src/types.ts`; the mapping lives on the wizard side.
- **No new runtime dependencies** beyond the Vitest dev toolchain.
- **No coverage-threshold gating** — CI runs the suite; enforced coverage minimums are deferred.

## Implementation Approach

A per-metric module layout under `src/lib/calc/`: `gravity.ts` (shared OG/SG helper), `blg.ts`, `srm.ts`, `ibu.ts`, `abv.ts`, `types.ts` (the contract), and `index.ts` (barrel + `computeMetrics`). Every public function is pure and returns `CalcResult<number>`; insufficient or invalid input returns `{ ok: false, reason }` rather than throwing — this keeps the live-recompute hot path exception-free and is the mechanism that prevents silent wrong numbers.

Vitest is added as the test runner (node environment, Vite-7-compatible). Each metric gets a co-located `*.test.ts` containing (a) **golden vectors** — reference values from authoritative home-brewing sources with documented provenance, asserted within an explicit tolerance — and (b) **invariants** — monotonicity, bounds, and `{ ok: false }` sentinel cases. CI gains a test job after lint+build, and ESLint/tsconfig are adjusted so test files type-check cleanly under the strict config.

The build proceeds bottom-up so each phase is independently verifiable: infra + contract types first, then the grist-only metrics (gravity, BLG, SRM), then the gravity-dependent metrics (IBU, ABV), then the aggregate that ties them together behind the API S-01 imports.

## Critical Implementation Details

- **Gravity is the shared root, and ordering matters.** A single `computeGravity(grist input)` derives OG/SG from total fermentable extract (Σ per-malt `amountKg × extractPercent/100 × mashEfficiency`) over volume, expressed as gravity points → SG. BLG is `259 − 259/SG` (°Plato/Balling). IBU's Tinseth utilization depends on SG (bigness factor `1.65 × 0.000125^(SG−1)`), and ABV needs OG. So `computeMetrics` computes gravity once and feeds BLG, IBU, and ABV; the standalone `calcIBU`/`calcABV` take the gravity they need as part of their typed input (supplied by the caller/mapping). This is the one non-obvious coupling in an otherwise independent set.
- **Pinned formula standards (these are the contract the harness enforces).** BLG: gravity-points → SG → °Plato (`259 − 259/SG`). SRM: Morey `1.4922 × MCU^0.6859`, with malt color converted EBC→°Lovibond (`°L ≈ EBC/1.97`) and metric kg/L converted to lb/gal for MCU; output is SRM. IBU: Tinseth (`IBU = Σ AA_decimal × mass_g × utilization × 1000 / volumeL`, where `utilization = bignessFactor × boilTimeFactor`, `boilTimeFactor = (1 − e^(−0.04·t))/4.15`). ABV: `FG_points = OG_points × (1 − attenuation)`, `ABV% = (OG − FG) × 131.25`. Any change to these formulas is a contract change and must move the golden vectors with it.
- **`{ ok: false }` is the only "empty" signal — never `NaN`/`Infinity`/`null`.** Each function guards its own preconditions (non-empty grist with positive amounts, positive volume, positive alpha/mass/time for IBU, attenuation in (0,1] for ABV) and returns a `reason` string. The harness asserts these guards explicitly.
- **Tolerance, not equality, in golden vectors.** Reference calculators differ in rounding; assert `Math.abs(actual − expected) <= tolerance` with a per-metric tolerance documented next to the vectors, so the suite proves "correct formula" without brittle exact-match failures.

## Phase 1: Test infrastructure + contract types + scaffolding

### Overview

Stand up the Vitest runner (cleanly integrated with the strict ESLint config and CI), and define the engine's contract types and module skeleton, so later phases only fill in formulas and tests.

### Changes Required:

#### 1. Vitest toolchain

**File**: `package.json`, `vitest.config.ts` (new)

**Intent**: Add a test runner so the correctness guardrail is executable. Justified per `lessons.md` (clear, specific need; no runtime deps added).

**Contract**: Add devDeps `vitest` (version compatible with the pinned Vite 7) and `@vitest/coverage-*` only if trivially needed (otherwise omit). Add scripts `"test": "vitest"` and `"test:run": "vitest run"`. `vitest.config.ts` sets the `node` test environment, `globals: true`, and resolves the `@/*` alias to `./src/*` (mirror `tsconfig.json` paths so test imports match app imports).

#### 2. Lint/type-check cleanliness for tests

**File**: `eslint.config.js`, `tsconfig.json` (and/or `tsconfig` test settings)

**Intent**: Ensure `*.test.ts` files satisfy the strict, type-checked ESLint config without weakening app rules.

**Contract**: Make Vitest globals (`describe`/`it`/`expect`) type-resolve — preferred: `"types": ["vitest/globals"]` in tsconfig `compilerOptions` (or explicit imports from `vitest` in each test file if cleaner under `projectService`). Confirm `projectService` includes test files; add a narrowly-scoped ESLint override for `**/*.test.ts` only if a strict rule genuinely conflicts with test patterns (avoid blanket relaxations).

#### 3. CI test gate

**File**: `.github/workflows/ci.yml`

**Intent**: Make correctness gate merges, not just local runs.

**Contract**: Add a `npm run test:run` step after the existing lint and build steps (same job or a parallel job). Tests must not require Supabase env vars (engine is pure); keep the existing lint+build behavior intact.

#### 4. Contract types

**File**: `src/lib/calc/types.ts` (new)

**Intent**: Define the engine's public contract — the result wrapper, per-metric inputs, and aggregate input/output — decoupled from `RecipeDraft` and any DB entity.

**Contract**: Export `CalcResult<T> = { ok: true; value: T } | { ok: false; reason: string }`. Export per-metric input types (`BlgInput`, `SrmInput`, `IbuInput`, `AbvInput`) and a `RecipeMetricsInput` aggregate, plus a `RecipeMetrics = { blg: CalcResult<number>; srm: CalcResult<number>; ibu: CalcResult<number>; abv: CalcResult<number> }` output type. Inputs use canonical metric units (malt `amountKg`/`colorEbc`/`extractPercent`, `volumeL`, `mashEfficiency` fraction, hop `alphaAcidPercent`/`amountG`/`boilTimeMin`, yeast `attenuation` fraction). Do **not** import from `@/types`.

#### 5. Barrel + smoke test

**File**: `src/lib/calc/index.ts` (new), `src/lib/calc/index.test.ts` (new)

**Intent**: Establish the single import entry point and prove the runner works end-to-end (locally and in CI).

**Contract**: `index.ts` re-exports the contract types (function exports added in later phases). `index.test.ts` is a minimal passing test (e.g. asserts the `CalcResult` discriminator narrows correctly) so Phase 1 produces a green `npm test`.

### Success Criteria:

#### Automated Verification:

- Dependencies install cleanly: `npm install`
- Tests run and pass: `npm run test:run`
- Build passes: `npm run build`
- Linting passes (including test files): `npm run lint`

#### Manual Verification:

- CI run on a pushed branch shows a passing test step after lint+build.
- `vitest.config.ts` alias works: a test can `import` from `@/lib/calc` without path errors.

**Implementation Note**: After this phase and all automated verification passes, pause for human confirmation before proceeding.

---

## Phase 2: Gravity + BLG + SRM

### Overview

Implement the grist-derived metrics — shared gravity, BLG, and SRM — and pin them with golden vectors and invariants.

### Changes Required:

#### 1. Shared gravity helper

**File**: `src/lib/calc/gravity.ts` (new)

**Intent**: Compute original gravity (OG points / SG) from the grist, efficiency, and volume — the shared root for BLG, IBU, and ABV.

**Contract**: A pure helper deriving total fermentable extract (Σ `amountKg × extractPercent/100 × mashEfficiency`) over `volumeL` into gravity points and SG. Returns `CalcResult` (or a typed sufficiency check the metric functions consume), with `{ ok: false }` for empty grist / non-positive volume. Internal to the module (not necessarily on the public barrel).

#### 2. BLG

**File**: `src/lib/calc/blg.ts` (new)

**Intent**: Surface gravity as °BLG (≈ °Plato/Balling).

**Contract**: `calcBLG(input: BlgInput): CalcResult<number>` using `259 − 259/SG` from the shared gravity helper. Full precision; guards insufficient grist/volume.

#### 3. SRM

**File**: `src/lib/calc/srm.ts` (new)

**Intent**: Compute beer color via the Morey equation from malt color and amounts.

**Contract**: `calcSRM(input: SrmInput): CalcResult<number>` = `1.4922 × MCU^0.6859`, MCU from EBC→°L (`/1.97`) and metric→imperial (kg/L → lb/gal) conversions; output SRM. Independent of efficiency. Guards empty grist / non-positive volume.

#### 4. Harness — BLG & SRM

**File**: `src/lib/calc/blg.test.ts` (new), `src/lib/calc/srm.test.ts` (new)

**Intent**: Prove correctness against trusted references and lock invariants.

**Contract**: Golden vectors with cited provenance (authoritative brewing source/calculator) asserted within a documented per-metric tolerance; invariants (more extract → higher BLG; more/darker malt → higher SRM; bounds); sentinel cases (empty grist, zero volume → `{ ok: false }`).

### Success Criteria:

#### Automated Verification:

- Tests pass: `npm run test:run`
- Build passes: `npm run build`
- Linting passes: `npm run lint`

#### Manual Verification:

- BLG and SRM golden values match the cited references within the stated tolerance (spot-check one vector by hand).
- Provenance for each golden vector is recorded in the test file.

**Implementation Note**: Pause for human confirmation after automated verification passes.

---

## Phase 3: IBU + ABV

### Overview

Implement the gravity-dependent metrics — IBU (Tinseth) and ABV (attenuation-based) — and pin them with golden vectors and invariants.

### Changes Required:

#### 1. IBU

**File**: `src/lib/calc/ibu.ts` (new)

**Intent**: Compute bitterness from the hop schedule via the Tinseth model.

**Contract**: `calcIBU(input: IbuInput): CalcResult<number>` summing per-addition `AA_decimal × amountG × utilization × 1000 / volumeL`, where `utilization = bignessFactor(SG) × boilTimeFactor(t)`, `boilTimeFactor = (1 − e^(−0.04·t))/4.15`. SG arrives via the typed input (supplied by caller/aggregate). Guards: positive volume, at least one valid addition (positive alpha/mass/time). Full precision.

#### 2. ABV

**File**: `src/lib/calc/abv.ts` (new)

**Intent**: Compute alcohol by volume from original gravity and yeast attenuation.

**Contract**: `calcABV(input: AbvInput): CalcResult<number>` deriving `FG_points = OG_points × (1 − attenuation)` then `ABV% = (OG − FG) × 131.25`. OG/SG arrives via typed input. Guards: OG present, `attenuation ∈ (0,1]`. Full precision.

#### 3. Harness — IBU & ABV

**File**: `src/lib/calc/ibu.test.ts` (new), `src/lib/calc/abv.test.ts` (new)

**Intent**: Prove correctness and lock invariants for the gravity-dependent metrics.

**Contract**: Golden vectors with cited provenance asserted within documented tolerance; invariants (longer boil/more alpha/more mass → higher IBU; higher attenuation → higher ABV; bounds); sentinel cases (no hops, zero volume, attenuation 0 / out of range → `{ ok: false }`).

### Success Criteria:

#### Automated Verification:

- Tests pass: `npm run test:run`
- Build passes: `npm run build`
- Linting passes: `npm run lint`

#### Manual Verification:

- IBU and ABV golden values match cited references within tolerance (spot-check one vector each by hand).
- Provenance recorded for each golden vector.

**Implementation Note**: Pause for human confirmation after automated verification passes.

---

## Phase 4: Aggregate + barrel finalize

### Overview

Tie the metrics together behind `computeMetrics`, finalize the public barrel to match the API S-01 imports, and test partial-input behavior.

### Changes Required:

#### 1. Aggregate

**File**: `src/lib/calc/index.ts` (extend)

**Intent**: One call that computes all four metrics, sharing gravity, and returns independent per-metric results.

**Contract**: `computeMetrics(input: RecipeMetricsInput): RecipeMetrics` computes gravity once, feeds BLG/IBU/ABV, computes SRM independently, and returns `{ blg, srm, ibu, abv }` each as its own `CalcResult<number>` — so a partial recipe yields the metrics it can and `{ ok: false }` for the rest. Barrel also re-exports `calcBLG`/`calcSRM`/`calcIBU`/`calcABV` and all contract types.

#### 2. Aggregate harness

**File**: `src/lib/calc/index.test.ts` (extend)

**Intent**: Verify independence and the partial-recipe contract.

**Contract**: Tests asserting: full valid input → all four `{ ok: true }` matching the per-metric results; grist-only input → BLG/SRM `{ ok: true }`, IBU/ABV `{ ok: false }`; empty input → all `{ ok: false }`; gravity computed once is consistent with standalone `calcBLG`.

#### 3. Contract note for consumers

**File**: `src/lib/calc/README.md` (new) or a header comment in `index.ts`

**Intent**: Document the public API, units, the `CalcResult` contract, and the pinned formula standards so S-01/S-02/S-03 (and `/10x-plan-review`) consume it without re-deriving.

**Contract**: A short note: exported functions/types, canonical units, `{ ok, value | reason }` semantics, per-metric formula + provenance, and the "engine never throws / never returns NaN" guarantee.

### Success Criteria:

#### Automated Verification:

- Tests pass: `npm run test:run`
- Build passes: `npm run build`
- Linting passes: `npm run lint`

#### Manual Verification:

- `computeMetrics` returns independent results for a grist-only input (BLG/SRM populated, IBU/ABV `{ ok: false }`).
- A scratch import of `calcBLG`/`computeMetrics` from `@/lib/calc` resolves and matches S-01's assumed contract names.

**Implementation Note**: Pause for human confirmation after automated verification passes.

---

## Testing Strategy

### Unit Tests:

- **Golden vectors** per metric (BLG, SRM, IBU, ABV) from cited authoritative references, asserted within a documented tolerance — the correctness oracle.
- **Invariants** per metric: monotonicity (e.g. more extract → higher BLG, longer boil → higher IBU, higher attenuation → higher ABV), output bounds, and unit sanity.
- **Sentinel/guard cases**: empty grist, non-positive volume, no valid hops, attenuation out of range → `{ ok: false }` (never `NaN`/`Infinity`/throw).
- **Aggregate**: partial-input independence and gravity-shared consistency.

### Integration Tests:

- None in this change — the engine is a leaf module. The wizard↔engine integration seam is tested in S-01's `recipe-to-calc.test.ts`.

### Manual Testing Steps:

1. Run `npm test` in watch mode; confirm all four metrics' suites are green.
2. Hand-verify one golden vector per metric against the cited source.
3. From a scratch file, `import { computeMetrics } from "@/lib/calc"`, pass a grist-only input, and confirm BLG/SRM resolve while IBU/ABV report `{ ok: false }`.

## Performance Considerations

The engine is trivial pure arithmetic over single-digit ingredient counts; it runs on every wizard keystroke in S-01 but needs no memoization at this scale. If a hotspot ever appears, the consumer memoizes on watched inputs (S-01's concern), not the engine.

## Migration Notes

None — new module and test tooling only; no schema, data, or runtime-config changes. CI gains a test step but existing lint+build behavior is unchanged.

## References

- Roadmap foundation: `context/foundation/roadmap.md` (F-02, lines 77–88)
- PRD: `context/foundation/prd.md` (FR-010, Business Logic lines 111–119, Guardrails line 44, NFR line 109)
- Consumer + assumed contract: `context/changes/wizard-basics-grist-blg-srm/plan.md` (lines 52–59, Phase 4 lines 225–255; hard gate note lines 306–307)
- Existing input shapes (wizard draft, not engine input): `src/types.ts:1-21`
- Conventions: `CLAUDE.md`; `context/foundation/lessons.md` (no deps without justification)
- Toolchain constraints: `eslint.config.js:14-38` (strict type-checked), `package.json:62-64` (Vite 7 pin), `.github/workflows/ci.yml` (lint+build)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Test infrastructure + contract types + scaffolding

#### Automated

- [x] 1.1 Dependencies install cleanly: `npm install`
- [x] 1.2 Tests run and pass: `npm run test:run`
- [x] 1.3 Build passes: `npm run build`
- [x] 1.4 Linting passes (including test files): `npm run lint`

#### Manual

- [ ] 1.5 CI run shows a passing test step after lint+build
- [ ] 1.6 `@/lib/calc` alias resolves in a test import

### Phase 2: Gravity + BLG + SRM

#### Automated

- [ ] 2.1 Tests pass: `npm run test:run`
- [ ] 2.2 Build passes: `npm run build`
- [ ] 2.3 Linting passes: `npm run lint`

#### Manual

- [ ] 2.4 BLG & SRM golden values match cited references within tolerance (hand spot-check)
- [ ] 2.5 Provenance recorded for each golden vector

### Phase 3: IBU + ABV

#### Automated

- [ ] 3.1 Tests pass: `npm run test:run`
- [ ] 3.2 Build passes: `npm run build`
- [ ] 3.3 Linting passes: `npm run lint`

#### Manual

- [ ] 3.4 IBU & ABV golden values match cited references within tolerance (hand spot-check)
- [ ] 3.5 Provenance recorded for each golden vector

### Phase 4: Aggregate + barrel finalize

#### Automated

- [ ] 4.1 Tests pass: `npm run test:run`
- [ ] 4.2 Build passes: `npm run build`
- [ ] 4.3 Linting passes: `npm run lint`

#### Manual

- [ ] 4.4 `computeMetrics` returns independent results for grist-only input
- [ ] 4.5 `@/lib/calc` exports match S-01's assumed contract names
