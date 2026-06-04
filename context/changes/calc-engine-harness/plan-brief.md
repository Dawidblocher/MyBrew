# Calc Engine + Correctness Harness (F-02) — Plan Brief

> Full plan: `context/changes/calc-engine-harness/plan.md`

## What & Why

Build the foundation calculation layer for Beer Recipe Builder: a pure, stateless metrics engine in `src/lib/calc/` computing **BLG, SRM, IBU, ABV** from typed inputs, plus a **Vitest correctness harness** that pins each formula to authoritative reference values. This is the executable form of the product's core NFR guardrail — _"calculated metrics must be correct for standard inputs — no silent wrong numbers"_ — and it unblocks S-01, which is built through Phase 3 and waiting on this engine for its live-metrics wiring.

## Starting Point

Astro 6 SSR starter with Supabase auth and the S-01 wizard built through Phase 3. There is **no `src/lib/calc/` and no test runner** — `package.json` has no Vitest and no `test` script. The wizard's draft shapes exist in `src/types.ts`, but the engine's inputs are separate. ESLint is strict + type-checked (`projectService`), Vite 7 is pinned, and CI runs lint+build only.

## Desired End State

`src/lib/calc/` exports `calcBLG`/`calcSRM`/`calcIBU`/`calcABV` and an aggregate `computeMetrics(input)` returning `{ blg, srm, ibu, abv }` — each a discriminated `CalcResult<number>` (`{ ok: true, value }` or `{ ok: false, reason }`), in canonical metric units at full precision. `npm test` runs golden-vector + invariant suites for all four metrics; CI gates merges on lint+build+test. S-01 Phase 4 can then import the named functions from `@/lib/calc` and finish.

## Key Decisions Made

| Decision | Choice | Why | Source |
| --- | --- | --- | --- |
| Formula scope | Implement all four (BLG/SRM/IBU/ABV) + full harness now | One-shot complete engine; every slice just consumes it (conscious override of roadmap's per-slice intent) | Plan |
| Insufficient-input contract | Discriminated `CalcResult<T>` | Type-safe, carries a `reason`, scales to 4 metrics + aggregate; UI maps to `—` | Plan |
| Engine input | Dedicated calc input types, decoupled from `RecipeDraft` | Engine independent of UI/DB; reusable at save/export; unit-testable | Plan |
| Module layout | One file per metric + `types.ts` + `index.ts` barrel | Clean per-metric ownership, single entry point matching S-01's imports | Plan |
| Correctness oracle | Golden vectors (cited, tolerance-asserted) + invariants | Vectors prove the formula; invariants catch regression classes | Plan |
| Units & precision | Canonical metric, full-precision output | One source of truth, no precision loss; UI formats | Plan |
| Aggregate behavior | Per-metric independent results | Partial recipe yields available metrics — matches progressive wizard | Plan |
| Test/CI wiring | `npm test` + CI gate + lint-clean test files | Correctness actually gates merges | Plan |
| Formula standards | BLG `259−259/SG`; SRM Morey; IBU Tinseth; ABV `(OG−FG)×131.25` | De-facto home-brew standards; gravity computed once and shared | Plan |

## Scope

**In scope:** `src/lib/calc/` engine (gravity helper, four metrics, aggregate, contract types); Vitest toolchain + config; ESLint/tsconfig adjustments for test files; CI test gate; golden-vector + invariant harness for all four metrics; a short consumer-facing API/contract note.

**Out of scope:** wizard UI and draft→calc mapping (S-01); display formatting/rounding; persistence / DB-entity coupling (F-01); unit toggle / imperial inputs; coverage-threshold gating; any new runtime dependency.

## Architecture / Approach

Per-metric pure modules under `src/lib/calc/`: `gravity.ts` (shared OG/SG root), `blg.ts`, `srm.ts`, `ibu.ts`, `abv.ts`, `types.ts` (contract), `index.ts` (barrel + `computeMetrics`). Gravity is the one cross-metric coupling — BLG, IBU (Tinseth bigness needs SG), and ABV all derive from it, so `computeMetrics` computes it once. Every function returns `CalcResult` and never throws or returns `NaN`. Vitest (node env, Vite-7-compatible) runs co-located `*.test.ts` golden-vector + invariant suites, gated in CI after lint+build.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Infra + contract types | Vitest wired (config, scripts, CI gate, lint-clean tests), `types.ts` + barrel, smoke test | Vitest↔Vite-7/strict-ESLint integration friction |
| 2. Gravity + BLG + SRM | Shared gravity, BLG, SRM + golden vectors/invariants | Sourcing trustworthy reference values; metric↔imperial conversion in Morey |
| 3. IBU + ABV | Tinseth IBU, attenuation ABV + golden vectors/invariants | Tinseth utilization details; FG-from-attenuation correctness |
| 4. Aggregate + barrel | `computeMetrics` (independent results), finalized exports, partial-input tests, API note | Aggregate diverging from per-metric results |

**Prerequisites:** none — auth/frontend exist in baseline; this is a leaf foundation module. (S-01 depends on _this_, not vice versa.)
**Estimated effort:** ~2–3 after-hours sessions across 4 phases.

## Open Risks & Assumptions

- **Golden-vector provenance is the linchpin** — the harness only proves correctness if reference values come from trustworthy sources; each vector must cite its origin and tolerance.
- **"All four formulas now" overrides the roadmap's per-slice intent** — accepted trade-off: IBU/ABV are built before S-02/S-03 exist, so their input types may need minor adaptation when those slices wire them up.
- **Engine names must match S-01's assumed contract** (`calcBLG`/`calcSRM`/`computeMetrics` in `@/lib/calc`); S-01 isolates this to one mapping seam if adaptation is needed.

## Success Criteria (Summary)

- All four metrics compute correctly against cited references (within tolerance); `npm test`, lint, and build pass, and CI gates on tests.
- The engine never emits silent wrong numbers — insufficient/invalid input returns `{ ok: false }`, never `NaN`/`Infinity`/throw.
- S-01 Phase 4 can import the engine from `@/lib/calc` and complete its live-metrics wiring.
