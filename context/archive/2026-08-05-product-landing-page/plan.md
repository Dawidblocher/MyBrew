# Product Landing Page Implementation Plan

## Overview

Replace the generic "10x Astro Starter" homepage with a real product landing for **Beer Recipe Builder**, written in Polish, that makes the product's promise obvious on arrival (a step-by-step beer recipe wizard with live BLG / ABV / SRM / IBU calculations) and drives a clear next action. The change is presentational and lives almost entirely in `src/components/Welcome.astro`.

## Current State Analysis

The homepage renders `<Layout><Welcome /></Layout>` (`src/pages/index.astro`), so all landing content lives in `src/components/Welcome.astro`. That component is untouched starter boilerplate:

- Hero headline "10x Astro Starter" and an English subtitle about a "production-ready starter".
- English `Sign In` / `Sign Up` buttons hard-linked to `/auth/signin` and `/auth/signup`.
- Three feature cards about the *starter* ("Authentication Ready", "Modern Stack", "Developer Experience"), all English.
- Decorative cosmic orbs + star field that establish the app's visual identity.

Supporting facts discovered during research:

- `/` is **not** a protected route — `src/lib/protected-routes.ts` guards only `/dashboard` and `/recipes`, and `src/middleware.ts` resolves `Astro.locals.user` on every request. So both guests and logged-in users reach `/`, and `Welcome.astro` (an Astro component) can read `Astro.locals.user` directly with no prop plumbing.
- The persistent nav shell (`src/components/AppNav.astro`, S-08) already renders "Twoje przepisy"/"Nowy przepis" for signed-in users and "Zaloguj"/"Zarejestruj" for guests on every non-auth page. The landing CTAs complement the nav; they don't replace it.
- The design system is established and consistent: cosmic dark theme (`bg-cosmic`, owned by `Layout.astro`), gradient headline text (`from-blue-200 via-purple-200 to-pink-200`), glassmorphic cards (`border border-white/10 bg-white/5 backdrop-blur-xl`), purple accent buttons (`bg-purple-600 hover:bg-purple-500`), secondary buttons (`border border-white/20 hover:bg-white/10`).
- `Layout.astro` already owns `bg-cosmic`, viewport height, `lang="pl"`, and a default title of "Beer Recipe Builder"; `<main>` grows to fill. `Welcome.astro` must stay a sibling of the nav inside `<main>` and keep its own `overflow-hidden` wrapper (which is why the orbs are clipped to the hero, not the whole viewport).
- The four metrics BLG / ABV / SRM / IBU are the product's core promise (PRD Business Logic, roadmap north star S-03).

## Desired End State

Visiting `/` shows a Polish product landing that:

- Leads with a product headline and subtitle describing Beer Recipe Builder (recipe wizard + live four-metric calculation), not the starter.
- Surfaces BLG · ABV · SRM · IBU as a visible row of badges/pills in the hero, signaling the concrete promise above the fold.
- Shows an **auth-aware** primary CTA:
  - **Guest:** primary "Zacznij za darmo" → `/auth/signup`, secondary "Zaloguj się" → `/auth/signin`.
  - **Logged-in:** primary "Twoje przepisy" → `/recipes`, secondary "Nowy przepis" → `/recipes/new`.
- Presents three benefit cards reframed to the real product (live calculations; full 6-step wizard; save & view recipes), all in Polish.
- Retains the cosmic orbs + star field visual identity.
- Contains **no** English copy and **no** starter-boilerplate references anywhere on the page.

Verified by: the manual route/state sweep in Phase 2, plus green `npm run lint` and `npm run build`.

### Key Discoveries:

- Landing content is fully contained in `src/components/Welcome.astro` — `src/pages/index.astro` is a 3-line pass-through and does not need to change.
- `Astro.locals.user` is available to `Welcome.astro` for auth-aware CTAs — no redirect logic, no new props (`src/middleware.ts:12`).
- The orbs are clipped by the wrapper's `overflow-hidden` (`src/components/Welcome.astro:1`); keep that wrapper so the decoration stays scoped and never fights the sticky nav.
- Reuse existing style tokens rather than inventing new ones — button, card, and gradient classes are all already in use in this file and in `src/pages/recipes/index.astro`.

## What We're NOT Doing

- No redirect of logged-in users away from `/` (decided: show the landing with app-action CTAs instead).
- No changes to `src/pages/index.astro`, `Layout.astro`, `AppNav.astro`, `middleware.ts`, or any route protection.
- No changes to data, API routes, calculations, or auth.
- No new automated tests (no Playwright spec, no snapshot) and no `tsc --noEmit` gate (per `lessons.md`).
- No new dependencies (per `lessons.md`).
- No "how it works" section or standalone metrics showcase section (content kept to hero + benefit cards).
- No translation of auth pages or dashboard body copy (out of this slice's scope).

## Implementation Approach

Rewrite `Welcome.astro` in place. Add a small frontmatter script that reads `Astro.locals.user` and derives the CTA set (label + href for primary/secondary) plus a display email if needed. Keep the existing decorative layers (orbs, star field, `overflow-hidden` wrapper) and the overall hero → cards structure, swapping all copy to Polish product content and adding the metric badges row. Reuse existing Tailwind tokens for buttons, cards, and gradient text so the page stays visually consistent with the rest of the app.

## Phase 1: Rewrite the landing content

### Overview

Replace all boilerplate in `Welcome.astro` with the Polish product landing: product hero, metric badges, auth-aware CTAs, and three reframed benefit cards. Remove every English string and starter reference.

### Changes Required:

#### 1. Auth-aware CTA logic

**File**: `src/components/Welcome.astro` (frontmatter)

**Intent**: Read the current session so the hero can render app-action CTAs for logged-in users and signup/signin CTAs for guests, with no redirect and no new props.

**Contract**: Add a component script (`---` block, currently absent) that reads `const { user } = Astro.locals;` and derives a primary/secondary CTA pair — guest: `{ label: "Zacznij za darmo", href: "/auth/signup" }` + `{ label: "Zaloguj się", href: "/auth/signin" }`; signed-in: `{ label: "Twoje przepisy", href: "/recipes" }` + `{ label: "Nowy przepis", href: "/recipes/new" }`. `Astro.locals.user` typing already exists via `src/env.d.ts`.

#### 2. Product hero with metric badges

**File**: `src/components/Welcome.astro` (hero block)

**Intent**: Replace the "10x Astro Starter" headline and English subtitle with a Polish product hero that names the product promise and shows the four metrics as badges above the fold.

**Contract**: Polish headline (product name / promise) using the existing gradient text classes; Polish subtitle describing the wizard + live calculations; a row of four pill/badge elements labeled `BLG`, `ABV`, `SRM`, `IBU` with a short "na żywo" cue (reuse glassmorphic/border tokens for the pills). Keep the orbs, star field, and `overflow-hidden` wrapper intact.

#### 3. Auth-aware CTA buttons

**File**: `src/components/Welcome.astro` (CTA block)

**Intent**: Render the derived primary (emphasized) and secondary CTA buttons in place of the two equal-weight English buttons.

**Contract**: Primary button uses the accent style (`bg-purple-600 hover:bg-purple-500`); secondary uses the outline style (`border border-white/20 hover:bg-white/10`). Labels and hrefs come from the CTA pair derived in change #1.

#### 4. Reframed benefit cards

**File**: `src/components/Welcome.astro` (feature cards grid)

**Intent**: Replace the three starter feature cards with three product benefit cards in Polish.

**Contract**: Keep the existing 3-up responsive card grid and glassmorphic card styling. New card themes: (a) obliczenia na żywo — BLG/ABV/SRM/IBU aktualizowane w trakcie; (b) pełny kreator krok po kroku — podstawy → zasyp → zacieranie → chmiel → drożdże → dodatki; (c) zapis i przegląd przepisów. Swap the SVG icons for ones that fit the themes or keep neutral existing ones — no new icon dependency.

### Success Criteria:

#### Automated Verification:

- Linting passes: `npm run lint`
- Production build succeeds: `npm run build`

#### Manual Verification:

- Visiting `/` as a **guest** shows the Polish product hero, the BLG/ABV/SRM/IBU badges, primary "Zacznij za darmo" (→ `/auth/signup`) and secondary "Zaloguj się" (→ `/auth/signin`).
- No English copy and no "10x Astro Starter" / starter-boilerplate text remains anywhere on the page.
- The three benefit cards describe the real product (live calculations, wizard, save/view) in Polish.
- Cosmic orbs and star field still render and stay scoped to the hero area (no full-page overflow, no scrollbar regression).

**Implementation Note**: After completing this phase and automated verification passes, pause for manual confirmation before proceeding to Phase 2.

---

## Phase 2: Verification sweep

### Overview

Confirm the auth-aware behavior and responsive rendering across states, and confirm no boilerplate leaked through.

### Changes Required:

#### 1. Route/state sweep (no code changes expected)

**File**: n/a — verification only; fix `src/components/Welcome.astro` if issues surface.

**Intent**: Exercise `/` in both auth states and at mobile width to confirm the CTA branching and layout hold.

**Contract**: Guest and logged-in passes of `/`, plus a narrow-viewport (≈375px) pass; any defect found is fixed in `Welcome.astro` only.

### Success Criteria:

#### Automated Verification:

- Linting passes: `npm run lint`
- Production build succeeds: `npm run build`

#### Manual Verification:

- Visiting `/` as a **logged-in** user shows primary "Twoje przepisy" (→ `/recipes`) and secondary "Nowy przepis" (→ `/recipes/new`) instead of the signup/signin CTAs.
- At ≈375px width the hero, badges, CTA buttons, and benefit cards stack cleanly with no horizontal scroll.
- The nav shell (`AppNav`) still renders correctly above the landing in both states (no regression from this change).

**Implementation Note**: This phase closes the change; confirm both auth states manually before marking done.

---

## Testing Strategy

### Unit Tests:

- None. This is a presentational Astro component with no extractable logic beyond trivial CTA selection; the project has no component-render test harness and the slice's scope excludes adding one.

### Manual Testing Steps:

1. Run `npm run dev`; open `/` while signed out — verify Polish hero, metric badges, and guest CTAs with correct hrefs.
2. Sign in, return to `/` — verify CTAs switch to "Twoje przepisy" / "Nowy przepis" with correct hrefs.
3. Resize to ≈375px — verify clean stacking and no horizontal scrollbar.
4. Scan the full page — confirm no English text and no starter-boilerplate references remain.

## Performance Considerations

None. The page ships no client JS (CTAs are plain `<a>` links; branching happens at SSR time), matching the zero-JS posture of the nav shell.

## Migration Notes

None — no data or schema involved.

## References

- Roadmap slice: `context/foundation/roadmap.md` (S-09, lines 196–207)
- PRD (product promise, Polish UI): `context/foundation/prd.md`
- Nav shell it complements: `context/archive/2026-08-04-app-navigation-shell/plan-brief.md`
- Component to rewrite: `src/components/Welcome.astro`
- Auth state source: `src/middleware.ts:12`, `src/lib/protected-routes.ts`
- Lessons applied: `context/foundation/lessons.md` (no `tsc --noEmit` gate; no new deps)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Rewrite the landing content

#### Automated

- [x] 1.1 Linting passes: `npm run lint` — a90952a
- [x] 1.2 Production build succeeds: `npm run build` — a90952a

#### Manual

- [x] 1.3 Guest `/` shows Polish hero, BLG/ABV/SRM/IBU badges, and correct guest CTAs — a90952a
- [x] 1.4 No English copy or starter-boilerplate text remains on the page — a90952a
- [x] 1.5 Three benefit cards describe the real product in Polish — a90952a
- [x] 1.6 Cosmic orbs and star field still render, scoped to the hero (no scrollbar regression) — a90952a

### Phase 2: Verification sweep

#### Automated

- [x] 2.1 Linting passes: `npm run lint` — 2c14d13
- [x] 2.2 Production build succeeds: `npm run build` — 2c14d13

#### Manual

- [x] 2.3 Logged-in `/` shows "Twoje przepisy" / "Nowy przepis" CTAs with correct hrefs — 2c14d13
- [x] 2.4 At ≈375px width everything stacks cleanly with no horizontal scroll — 2c14d13
- [x] 2.5 `AppNav` still renders correctly above the landing in both auth states — 2c14d13
