---
project: Beer Recipe Builder
version: 1
status: draft
created: 2026-05-20
context_type: greenfield
product_type: web-app
target_scale:
  users: small
timeline_budget:
  mvp_weeks: 3
  hard_deadline: null
  after_hours_only: true
---

## Vision & Problem Statement

Creating a beer recipe requires many manual calculations — BLG, ABV, SRM, IBU, efficiency, losses, and more — spread across spreadsheets and standalone calculators. There is no single place to define a full recipe (grist, mash schedule, hop additions, yeast, adjuncts) and have parameters computed automatically as inputs change.

The insight: existing home-brewing tools are either too limited (calculator-only, no persistent recipe) or too complex for how a hobbyist actually plans a batch. A simplified, refined UX — a multi-step wizard with live auto-calculations — fills the gap between "spreadsheet + calculator hopping" and heavyweight brewing software.

## User & Persona

**Primary persona:** Home brewer (hobbyist)

- Brews solo, small-batch at home
- Plans recipes individually before brew day
- **Moment they reach for the product:** Designing a new recipe end-to-end — grist → mash → hops → yeast → adjuncts — and wanting saved parameters (BLG, ABV, SRM, IBU) without external calculators
- **Cost today:** Spreadsheet/calculator hopping, error risk, no single place that saves recipes and auto-computes key parameters

## Success Criteria

### Primary

- User logs in, completes the 6-step recipe wizard (basics → grist → mash → hops → yeast → adjuncts), sees auto-calculated BLG/ABV/SRM/IBU, saves the recipe, and can view a read-only list of saved recipes
- **v1 scope cut:** create + save + view only — no edit or delete in v1

### Secondary

- User can export a saved recipe as PDF or JSON

### Guardrails

- Calculated BLG, ABV, SRM, and IBU must be correct for standard inputs — no silent wrong numbers

## User Stories

### US-01: Create and save a complete beer recipe

- **Given** a logged-in home brewer on the app home screen
- **When** they complete all six wizard steps (basics → grist → mash → hops → yeast → adjuncts) and save the recipe
- **Then** the recipe appears in their saved list with BLG, ABV, SRM, and IBU displayed

#### Acceptance Criteria

- All four calculated parameters are visible before save and persist on the saved list entry
- Wizard allows add/reorder/remove on malt, mash-rest, hop, and adjunct lists
- Save is blocked or warned if required fields (name, style, minimum grist) are missing
- No edit or delete actions appear on saved recipes in v1

## Functional Requirements

### Authentication

- FR-001: User can register and log in. Priority: must-have
  > Socrates: No counter-argument; auth is table stakes for account-bound recipe storage.
- FR-002: User can log out. Priority: must-have
  > Socrates: No counter-argument; standard hygiene on shared devices.

### Recipe wizard

- FR-003: User can start a new recipe in the multi-step wizard. Priority: must-have
  > Socrates: No counter-argument; wizard is the entry point for the core value loop.
- FR-004: User can define recipe basics (name, beer style). Priority: must-have
  > Socrates: No counter-argument; name and style are minimal metadata for list and display.
- FR-005: User can configure batch parameters and a dynamic malt list (add, reorder, remove). Priority: must-have
  > Socrates: No counter-argument; grist is the foundation for all four calculated metrics.
- FR-006: User can configure mash efficiency, water-to-grain ratio, and a dynamic mash-rest list. Priority: must-have
  > Socrates: No counter-argument; mash parameters and rests affect efficiency and BLG path.
- FR-007: User can configure a dynamic hop-addition list with stage and timing. Priority: must-have
  > Socrates: No counter-argument; IBU depends on hop schedule detail (stage and timing).
- FR-008: User can select yeast parameters (strain, type, attenuation, fermentation temp range). Priority: must-have
  > Socrates: No counter-argument; ABV requires yeast attenuation input.
- FR-009: User can configure a dynamic adjunct list with stage, timing, and notes. Priority: must-have
  > Socrates: No counter-argument; adjuncts are part of the full recipe model in seed notes.

### Calculations

- FR-010: User can view auto-calculated BLG, ABV, SRM, and IBU that update as recipe inputs change. Priority: must-have
  > Socrates: No counter-argument; live four-metric calculation is the core product promise.

### Persistence

- FR-011: User can save a completed recipe. Priority: must-have
  > Socrates: No counter-argument; without save there is no persistence value.
- FR-012: User can view a read-only list of saved recipes. Priority: must-have
  > Socrates: No counter-argument; read-only list is the minimum way to confirm saved work.

### Export

- FR-013: User can export a saved recipe as PDF or JSON. Priority: nice-to-have
  > Socrates: No counter-argument; already scoped as nice-to-have and does not block MVP.

**Out of v1 scope (not FRs):** edit recipe, delete recipe, share recipes between users

## Non-Functional Requirements

- Primary UI language is Polish
- Calculated BLG, ABV, SRM, and IBU match standard home-brewing formulas for valid inputs (aligns with guardrail — no silent wrong numbers)

## Business Logic

The app computes BLG, ABV, SRM, and IBU from recipe inputs and updates them live as the user edits.

**Inputs consumed (user-facing):** batch parameters (expected finished volume, boil time, evaporation rate, boil/fermentation/hopstand losses); malt bill entries (amount, extract, EBC); mash efficiency, water-to-grain ratio, and mash-rest schedule (temperature, duration); hop additions (amount, alpha acids, stage, timing); yeast attenuation; adjunct entries (amount, stage, optional timing).

**Output:** BLG, ABV, SRM, and IBU — four calculated parameters.

**User encounter:** metrics recalculate whenever the user changes any contributing field during the wizard; no separate "calculate" action. Saved recipes display the same four parameters on the read-only list.

## Access Control

- **Model:** Login required — account-based access (email/password, external identity provider, or passwordless; specific mechanism deferred to implementation)
- **Roles:** Flat user model — no admin/member/guest separation; each user manages their own recipes only
- **MVP scope:** No recipe sharing between users (aligned with non-goals in seed notes)

## Non-Goals

- **Avoid: fermentation management and brew-day scheduling** — MVP covers recipe design and calculation only, not tracking fermentation or brew timeline
- **Avoid: AI-generated recipes** — user authors recipes manually; no generative suggestions
- **Avoid: sharing recipes between users** — single-tenant recipes per account; no team workspaces or public sharing in v1
- **Avoid: native mobile apps** — web-only for v1 (from seed notes)
- **Avoid: advanced reports and recipe analytics** — no dashboards or historical analysis beyond the saved recipe list
- **Avoid: auto-suggesting ingredients based on beer style** — no style-driven ingredient recommendations in v1
- **Avoid: edit and delete recipes in v1** — scoped out in Phase 3; create + save + read-only list only

## Open Questions

No open questions from shaping. Quality cross-check (2026-05-20) recorded all elements present.
