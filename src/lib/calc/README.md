# `@/lib/calc` — Beer-metrics calculation engine

Pure, stateless functions that compute the four recipe metrics — **BLG, SRM,
IBU, ABV** — from typed metric-unit inputs. This is the realization of the
product guardrail: _calculated metrics must be correct for standard inputs —
no silent wrong numbers._

Consumers (S-01/S-02/S-03 wizard, recipe persistence) import from the barrel
(`@/lib/calc`) and map their own shapes onto the dedicated calc inputs. The
engine does **not** depend on `@/types` (`RecipeDraft`) or any DB entity.

## Public API

```ts
import {
  calcBLG,
  calcSRM,
  calcIBU,
  calcABV,
  computeMetrics,
} from "@/lib/calc";
```

| Function                | Input               | Returns               |
| ----------------------- | ------------------- | --------------------- |
| `calcBLG(input)`        | `BlgInput`          | `CalcResult<number>`  |
| `calcSRM(input)`        | `SrmInput`          | `CalcResult<number>`  |
| `calcIBU(input)`        | `IbuInput`          | `CalcResult<number>`  |
| `calcABV(input)`        | `AbvInput`          | `CalcResult<number>`  |
| `computeMetrics(input)` | `RecipeMetricsInput`| `RecipeMetrics`       |

`computeMetrics` computes gravity **once** and feeds BLG/IBU/ABV (SRM is
computed independently). Each metric in `RecipeMetrics` is its own
`CalcResult<number>`, so a **partial recipe** yields the metrics it can and
`{ ok: false }` for the rest (e.g. grist-only → BLG/SRM resolve, IBU/ABV do
not).

## The `CalcResult` contract

```ts
type CalcResult<T> = { ok: true; value: T } | { ok: false; reason: string };
```

The engine **never throws** and **never returns `NaN`/`Infinity`/`null`**.
Insufficient or invalid input is reported as `{ ok: false, reason }` — the UI
renders a sentinel (`—`). This keeps the live-recompute hot path
exception-free.

## Units (canonical metric)

- Malt: `amountKg` (kg), `colorEbc` (EBC), `extractPercent` (%, e.g. 80)
- Batch: `volumeL` (liters)
- Mash: `mashEfficiency` (fraction in `(0, 1]`)
- Hops: `alphaAcidPercent` (%), `amountG` (g), `boilTimeMin` (min)
- Yeast: `attenuation` (fraction in `(0, 1]`)
- Gravity (`IbuInput.sg`, `AbvInput.og`): specific gravity, e.g. `1.050`

Internal imperial conversions (e.g. Morey MCU uses lb/gal) are an
implementation detail, never an input/output unit. Outputs are full precision —
**rounding/formatting is the consumer's concern.**

## Pinned formula standards

These are the contract the Vitest harness (`*.test.ts`) enforces against cited
golden vectors within a documented per-metric tolerance. Changing a formula is
a contract change and must move its golden vectors with it.

- **Gravity (shared root):** extract = `Σ amountKg × extractPercent/100 ×
  mashEfficiency`; points = `384 × extract / volumeL`; `SG = 1 + points/1000`.
  (Palmer, _How to Brew_ — extract-potential / PPG method.)
- **BLG:** `259 − 259/SG` (°Plato/°Balling hydrometer approximation).
- **SRM:** Morey `1.4922 × MCU^0.6859`, MCU = `Σ (°L × lb) / gal` with
  `°L = EBC/1.97`. (Morey 2000; Daniels, _Designing Great Beers_.)
- **IBU:** Tinseth `Σ AA_decimal × mass_g × utilization × 1000 / volumeL`,
  `utilization = 1.65 × 0.000125^(SG−1) × (1 − e^(−0.04·t))/4.15`.
- **ABV:** `FG_points = OG_points × (1 − attenuation)`; `ABV% =
  (OG − FG) × 131.25`.

## Guards (when each returns `{ ok: false }`)

- **BLG/gravity:** empty grist (no malt with positive amount + extract),
  non-positive volume, efficiency outside `(0, 1]`.
- **SRM:** empty grist (no malt with positive amount + color), non-positive
  volume.
- **IBU:** non-positive volume, `SG < 1.0`, no valid hop addition (each needs
  positive alpha, mass, and boil time).
- **ABV:** `OG ≤ 1.0`, attenuation outside `(0, 1]`.
