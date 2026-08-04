# App Navigation Shell Implementation Plan

## Overview

Lift navigation out of the homepage and into `Layout.astro` as a persistent, sticky, Polish-language app shell, so every route in the product exposes the same bar: brand linking to `/`, permanent access to "Twoje przepisy" and "Nowy przepis", the signed-in user's e-mail, and sign-out. The active section is visually highlighted, and the bar collapses to a menu on narrow screens.

This is roadmap slice **S-08** (`context/foundation/roadmap.md:183-194`). It changes no data, no API routes, and no calculation logic.

## Current State Analysis

Navigation today exists in exactly one place and is reachable from exactly one route.

- `src/layouts/Layout.astro` is nav-free: a bare HTML document, the config-status `Banner` list, and a `<slot />`. It declares `lang="en"` (`Layout.astro:14`) on an app whose UI is Polish, and defaults `title` to `"10x Astro Starter"` (`Layout.astro:10`), which leaks the starter's name into browser tabs and bookmarks on any page that doesn't pass a title.
- `src/components/Topbar.astro` is the only nav-like component. It renders the user e-mail, a `/dashboard` link and a sign-out form when signed in, or "Not signed in" plus sign-in/sign-up links otherwise. All labels are English. It is imported and rendered **only** in `src/components/Welcome.astro:2,28`, so it appears on `/` and nowhere else. It never links to `/recipes`.
- Every page owns its own full-viewport background wrapper, in three variants:
  - `bg-cosmic flex min-h-screen items-center justify-center p-4` — `dashboard.astro:8`, `auth/signin.astro:9`, `auth/signup.astro`, `auth/confirm-email.astro`, `recipes/new.astro:7`, and both 404 branches (`recipes/[id].astro:28`, `recipes/[id]/edit.astro:23`).
  - `bg-cosmic min-h-screen p-4 sm:p-8` — `recipes/index.astro:28`, `recipes/[id].astro:45`.
  - `bg-cosmic min-h-screen p-4 md:p-8` — `recipes/[id]/edit.astro:40`.
  - `bg-cosmic relative min-h-screen w-full overflow-hidden` with decorative orbs and a star field, plus an inner `relative z-10 p-4 sm:p-8` — `Welcome.astro:5,27`, unique to the homepage.
- Sign-out is a native HTML form POST to `/api/auth/signout`, with no JavaScript, duplicated in `Topbar.astro:16` and `dashboard.astro:23`. The endpoint redirects to `/` (`src/pages/api/auth/signout.ts:11`).
- `src/middleware.ts:12` attaches the Supabase `User` to `context.locals.user` on every request, so `email` and `id` are available server-side on any page without extra work. `src/lib/protected-routes.ts:1` guards the `/dashboard` and `/recipes` prefixes.
- Available UI primitives: `src/components/ui/` has `button`, `card`, `dialog`, `input`, `label`. `lucide-react` is a dependency. No dropdown-menu or sheet component is installed.

### Key Discoveries:

- **`Layout.astro` is a clean insertion point** — it renders no nav and no layout classes at all, so adding the shell there cannot collide with existing layout code.
- **The background and viewport-height contract lives on the pages, not the layout** — a naive nav insertion makes every page `nav height + 100vh` tall, producing a scrollbar on all ten routes, leaving the nav strip without `bg-cosmic` behind it, and pushing the six centered-card pages visually off-center.
- **`html, body { height: 100% }` is hard-coded** in `Layout.astro:42-48`. This interacts with both `min-h-screen` and `position: sticky` and must be verified rather than assumed.
- **Page cards use `backdrop-blur-xl`** (e.g. `recipes/index.astro:78`), which creates stacking contexts — a sticky nav needs an explicit z-index and its own translucent background, not transparency.
- **`Welcome.astro` wraps its content in `overflow-hidden`** (`Welcome.astro:5`). An `overflow: hidden` ancestor silently breaks `position: sticky`, so the nav must be a sibling of that wrapper, never a descendant.
- **`src/lib/protected-routes.ts` + `protected-routes.test.ts` is the established pattern** for pathname logic: a tiny pure module in `src/lib/` with a table-driven Vitest spec. The active-link resolver fits that pattern exactly and gives this UX slice a real automated gate.
- **`context/foundation/test-plan.md` §5 explicitly excludes UI snapshot tests and static-page tests**, and scopes Playwright to auth boundaries and IDOR. The gate for product slices is `npm run lint` + `npm run build` + manual verification.
- **`context/foundation/lessons.md` records that `npx tsc --noEmit` already fails** on pre-existing errors, and that a type gate is a separate change with its own budget. It is therefore deliberately absent from the success criteria below.
- **The Polish UI language is a PRD requirement** (`context/foundation/prd.md:108`), so every string the shell introduces is Polish, replacing the current English `Topbar` labels.

## Desired End State

Every route except `/auth/*` renders one sticky navigation bar at the top of the viewport, above the cosmic background which the layout now owns. Signed-in users see the brand, "Twoje przepisy", "Nowy przepis", their e-mail, and a "Wyloguj się" control; guests see the brand plus "Zaloguj" and "Zarejestruj". Exactly one nav item is highlighted per route, with `/recipes/{id}` and `/recipes/{id}/edit` highlighting "Twoje przepisy" and `/recipes/new` highlighting "Nowy przepis". Below the `sm` breakpoint the links collapse behind a keyboard-accessible hamburger. No page gains a spurious scrollbar, centered cards remain centered in the space below the nav, the homepage keeps its orbs and star field, and browser tabs show the product name instead of "10x Astro Starter".

Verify by loading each of the ten routes signed-in and as a guest, at desktop and 375px widths, and confirming the bar, the highlight, the collapse, and the absence of layout regressions.

## What We're NOT Doing

- **No landing page rewrite.** `Welcome.astro`'s hero copy, feature cards, and CTAs still say "10x Astro Starter" and remain English. That is roadmap slice S-09 (`product-landing-page`). This change only removes `<Topbar />` from it and adjusts its outermost wrapper classes.
- **No translation of the auth pages or the dashboard body copy.** "Sign in", "Sign up", and the dashboard's English text stay as they are; only the shell's own strings are Polish.
- **No "Dashboard" link in the nav.** The S-08 outcome enumerates brand, "Twoje przepisy", "Nowy przepis", e-mail, and sign-out — not a dashboard entry. `/dashboard` stays reachable by URL and still receives the shell.
- **No aggressive de-duplication of page-level links.** The list header CTA, the empty-state CTA, and the detail page's "← Wróć do listy" all stay; only the dashboard's now-duplicated sign-out button is removed.
- **No changes to data, API routes, `middleware.ts`, or `protected-routes.ts`.** Route protection semantics are untouched.
- **No return-to-intended-page handling after sign-in.** Guests never see links into protected areas, so the dead-end case doesn't arise.
- **No UI snapshot or component tests, and no new Playwright specs.** Per `context/foundation/test-plan.md` §5. The existing `guest` project is re-run as a regression check only.
- **No type-check gate.** See `context/foundation/lessons.md` — `tsc --noEmit` has pre-existing failures and fixing them is a separate change.

## Implementation Approach

The shell is built inside-out, so each phase is verifiable on its own.

First, the pathname logic is extracted into a pure `src/lib/` module with unit tests, mirroring `protected-routes.ts`. This is where the only genuinely error-prone part of the feature lives — deciding which single item is active — and it is the one part that a cheap automated test can actually cover.

Second, the shell and the viewport contract land together in one phase. `Layout.astro` takes ownership of `bg-cosmic` and `min-h-screen` as a flex column, renders the nav as the first row and the `<slot />` as the growing remainder, and every page wrapper drops its own background and height in exchange for `flex-1`. `Topbar.astro` is deleted and `Welcome.astro` reconciled in the same phase, because splitting them would leave the homepage with two stacked bars and every route with a doubled background.

Third, the responsive collapse is layered onto the finished nav using `<details>`/`<summary>`, keeping the shell entirely JavaScript-free.

Fourth, the redundant dashboard sign-out is removed and the whole surface is swept, including the existing guest Playwright project — worth running because the shell newly reads `locals.user` on every page and must not perturb the auth boundary.

## Critical Implementation Details

**Sticky positioning is fragile here, for two independent reasons.** `Layout.astro:42-48` hard-codes `html, body { height: 100% }`; combined with a flex column and `min-h-screen` this can leave the document non-scrolling, in which case `sticky top-0` silently has nothing to stick against. If that happens, relax the rule to `min-height: 100%` rather than reaching for `overflow` rules, which would break sticky more thoroughly. Separately, `Welcome.astro:5` applies `overflow-hidden`, and any `overflow: hidden` ancestor disables sticky in descendants — so the nav must be rendered as a sibling of the page content wrapper inside the layout, never inside a page.

**The nav needs an explicit z-index and its own opaque-ish background.** Page cards use `backdrop-blur-xl`, which establishes stacking contexts; content scrolling under a fully transparent bar would read as a rendering bug.

**Ordering within Phase 2 matters.** Inserting the nav into `Layout.astro` while `Welcome.astro` still renders `<Topbar />` puts two bars on the homepage, and migrating page wrappers before the layout owns `bg-cosmic` leaves routes with no background at all. Land the layout contract, the `Welcome` reconciliation, and the page migration as one unit.

## Phase 1: Nav model and active-state resolver

### Overview

Extract the nav item definitions and the active-item resolution into a tested, pure module before any markup exists, following the `protected-routes.ts` precedent.

### Changes Required:

#### 1. Nav item model and resolver

**File**: `src/lib/nav-items.ts` (new)

**Intent**: Own the single source of truth for what the nav contains in each auth state, which route counts as the active section, and which paths the shell must not render on. Keeping this out of the `.astro` component makes the only tricky logic in the feature unit-testable.

**Contract**: Exports a `NavItem` type (`href`, `label`), the brand target, the signed-in item list (`/recipes` → "Twoje przepisy", `/recipes/new` → "Nowy przepis"), the guest item list (`/auth/signin` → "Zaloguj", `/auth/signup` → "Zarejestruj"), a predicate for shell-suppressed paths (`/auth` and anything beneath it), and the resolver. Matching must be segment-aware so `/recipesfoo` does not match `/recipes`, and longest-match must win so `/recipes/new` resolves to "Nowy przepis" rather than "Twoje przepisy". Trailing slashes are normalized. The brand is deliberately excluded from active resolution.

```ts
export function resolveActiveHref(pathname: string, items: readonly NavItem[]): string | null;
export function isNavSuppressedPath(pathname: string): boolean;
```

#### 2. Resolver unit tests

**File**: `src/lib/nav-items.test.ts` (new)

**Intent**: Pin the resolution rules that the highlight depends on, especially the two cases a naive implementation gets wrong.

**Contract**: Table-driven `it.each` cases in the style of `src/lib/protected-routes.test.ts`. Must cover: `/recipes` and `/recipes/` → `/recipes`; `/recipes/new` → `/recipes/new`; `/recipes/abc-123` and `/recipes/abc-123/edit` → `/recipes`; `/recipesfoo`, `/`, and `/dashboard` → `null`. Plus suppression: `/auth/signin`, `/auth/signup`, `/auth/confirm-email` suppressed; `/`, `/dashboard`, `/recipes` not suppressed.

### Success Criteria:

#### Automated Verification:

- Linting passes: `npm run lint`
- Unit tests pass, including the new resolver spec: `npm run test:run`
- Build passes: `npm run build`

#### Manual Verification:

- Item labels and hrefs match the S-08 outcome: brand → `/`, "Twoje przepisy", "Nowy przepis", and the guest pair "Zaloguj" / "Zarejestruj"

**Implementation Note**: After completing this phase and all automated verification passes, pause for manual confirmation from the human before proceeding.

---

## Phase 2: The shell — `AppNav.astro` and the `Layout.astro` viewport contract

### Overview

Build the desktop nav, move background and viewport-height ownership into the layout, migrate all ten page wrappers, retire `Topbar.astro`, and reconcile `Welcome.astro`. This phase is deliberately atomic — every part of it is load-bearing for the others.

### Changes Required:

#### 1. The navigation component

**File**: `src/components/AppNav.astro` (new)

**Intent**: Render the persistent bar for the current auth state and route, with no client-side JavaScript. Reads `Astro.locals.user` and `Astro.url.pathname` directly, so no page needs to pass props.

**Contract**: Returns nothing when `isNavSuppressedPath(pathname)` is true. Otherwise renders a `<header>` containing a `<nav>`: the brand ("Beer Recipe Builder") linking to `/`; then either the signed-in items plus the user's e-mail and a sign-out `<form method="POST" action="/api/auth/signout">` with the label "Wyloguj się", or the guest items. The active item — from `resolveActiveHref` — receives a distinct visual treatment and `aria-current="page"`. Styling follows the established glassy idiom (`border-white/10`, `bg-white/5`, `backdrop-blur`, `text-blue-100/70`, purple hover accents) and is `sticky top-0` with a z-index above the pages' `backdrop-blur-xl` cards. Sign-out stays a native form POST; no `fetch`.

#### 2. Layout takes ownership of the viewport shell

**File**: `src/layouts/Layout.astro`

**Intent**: Make the layout the single owner of the cosmic background and the full-viewport height contract, with the nav as the first row and page content as the growing remainder, and fix the two identity leftovers while in here.

**Contract**: `lang` becomes `pl`; the default `title` becomes the product name instead of `"10x Astro Starter"`. The `<body>` carries `bg-cosmic` and a full-height flex column. `AppNav` renders before the content region; the `<slot />` is wrapped in a growing `<main>` so pages can fill the remaining height. The existing `missingConfigs` banner rendering and the `html, body` style block are preserved — but if the hard-coded `height: 100%` prevents document scrolling or breaks sticky, relax it to `min-height: 100%` rather than introducing overflow rules.

#### 3. Homepage reconciliation

**File**: `src/components/Welcome.astro`

**Intent**: Stop rendering the old bar and hand the background and height to the layout, while keeping the decorative orbs and star field local to the homepage.

**Contract**: Remove the `Topbar` import (line 2) and its usage (line 28). The outer wrapper drops `bg-cosmic` and `min-h-screen`, keeps `relative w-full overflow-hidden`, and grows to fill the layout's remaining height. The orb and star-field layers and the inner `relative z-10 p-4 sm:p-8` content wrapper are otherwise unchanged. The `overflow-hidden` must remain scoped here — it must not end up wrapping the nav.

#### 4. Retire the old bar

**File**: `src/components/Topbar.astro` (delete)

**Intent**: Remove the English, homepage-only bar now fully superseded by `AppNav`.

**Contract**: File deleted; no remaining references anywhere in `src/`.

#### 5. Page wrapper migration — centered pages

**File**: `src/pages/dashboard.astro`, `src/pages/auth/signin.astro`, `src/pages/auth/signup.astro`, `src/pages/auth/confirm-email.astro`, `src/pages/recipes/new.astro`, plus the 404 branches of `src/pages/recipes/[id].astro` and `src/pages/recipes/[id]/edit.astro`

**Intent**: Stop each page from painting its own background and claiming a full viewport of height, so the card centers within the space below the nav instead of below the fold.

**Contract**: In each top-level wrapper, `bg-cosmic` and `min-h-screen` are removed and replaced by a grow-to-fill utility; `flex items-center justify-center p-4` is retained unchanged. Inner card markup is untouched. Note that the auth pages keep working identically because the nav suppresses itself there — they simply inherit the background from the layout.

#### 6. Page wrapper migration — scrolling pages

**File**: `src/pages/recipes/index.astro`, the success branch of `src/pages/recipes/[id].astro`, the success branch of `src/pages/recipes/[id]/edit.astro`

**Intent**: Same ownership hand-off for the three pages that scroll rather than center.

**Contract**: `bg-cosmic` and `min-h-screen` are removed from the top-level wrapper while each page's own responsive padding is preserved exactly as-is — `p-4 sm:p-8` on the list and detail pages, `p-4 md:p-8` on the edit page. The inner `mx-auto max-w-*` containers are untouched.

### Success Criteria:

#### Automated Verification:

- Linting passes: `npm run lint`
- Build passes: `npm run build`
- Unit tests still pass: `npm run test:run`
- No references to the deleted component remain: `rg "Topbar" src` returns no matches

#### Manual Verification:

- The nav appears on `/`, `/dashboard`, `/recipes`, `/recipes/new`, `/recipes/{id}`, and `/recipes/{id}/edit`
- The nav is absent on `/auth/signin`, `/auth/signup`, and `/auth/confirm-email`, and those pages still show the cosmic background
- No page has a spurious vertical scrollbar, and the centered cards on `/dashboard` and `/recipes/new` are centered in the area below the nav
- The homepage shows exactly one bar, with its orbs and star field visually unchanged
- The nav stays pinned while scrolling `/recipes/{id}` and renders above the blurred content cards rather than behind them
- The correct single item is highlighted on each route: "Twoje przepisy" on the list, detail, and edit pages; "Nowy przepis" on the wizard; nothing on `/` and `/dashboard`
- Signed in, the nav shows the user's e-mail and "Wyloguj się"; as a guest on `/` it shows "Zaloguj" and "Zarejestruj" and no links into `/recipes`
- Signing out from the nav ends the session and lands on `/`

**Implementation Note**: After completing this phase and all automated verification passes, pause for manual confirmation from the human before proceeding.

---

## Phase 3: Narrow-screen collapse and accessibility

### Overview

Add the collapsed menu below the `sm` breakpoint using `<details>`/`<summary>`, and finish the keyboard and screen-reader affordances.

### Changes Required:

#### 1. Collapsed menu and focus affordances

**File**: `src/components/AppNav.astro`

**Intent**: Meet the roadmap's requirement that the bar collapses to a menu on narrow screens, without shipping any client-side JavaScript, and make the whole bar usable from the keyboard.

**Contract**: The horizontal item row is hidden below `sm` and a `<details>` element is shown in its place; its `<summary>` is the hamburger toggle, carrying an accessible Polish label and with the native disclosure marker suppressed. The panel lists the same items from the same `nav-items` arrays as the desktop row — including the e-mail and the sign-out form when signed in — so there is one source of truth for the content. Every interactive element gets a visible `focus-visible` treatment consistent with the app's existing focus styling. No state persistence is needed: each item is a full page navigation, so the menu naturally starts closed on every load.

### Success Criteria:

#### Automated Verification:

- Linting passes, including the `jsx-a11y` rules already configured: `npm run lint`
- Build passes: `npm run build`

#### Manual Verification:

- At a 375px-wide viewport the items collapse behind the hamburger, which opens and closes on click
- The hamburger is reachable by Tab and operable with Enter or Space, and every link and the sign-out button inside the open panel is reachable by keyboard with a visible focus ring
- The active link exposes `aria-current="page"` in the accessibility inspector
- At `sm` and above the full horizontal row is shown and no hamburger is visible
- Both the guest and signed-in variants of the collapsed menu render their expected items

**Implementation Note**: After completing this phase and all automated verification passes, pause for manual confirmation from the human before proceeding.

---

## Phase 4: Redundancy cleanup and cross-route regression sweep

### Overview

Remove the one control the shell makes genuinely redundant, then verify the whole surface — including the auth boundary, which the shell now touches on every request.

### Changes Required:

#### 1. Remove the duplicated dashboard sign-out

**File**: `src/pages/dashboard.astro`

**Intent**: The nav's sign-out and the dashboard card's own sign-out button would otherwise sit in the same viewport, which reads as a bug.

**Contract**: The `<form method="POST" action="/api/auth/signout">` block and its button are removed from the card. The "Nowy przepis" link, the heading, and the e-mail greeting stay. No other page loses a link or CTA in this change.

### Success Criteria:

#### Automated Verification:

- Linting passes: `npm run lint`
- Build passes: `npm run build`
- Unit tests pass: `npm run test:run`
- The guest auth-boundary suite still passes: `npx playwright test --project=guest`

#### Manual Verification:

- `/dashboard` has exactly one sign-out control, in the nav
- All ten routes render correctly signed-in and, where reachable, as a guest, at both desktop and 375px widths
- Browser tab titles show the product name on pages that pass no title, with no "10x Astro Starter" remaining
- Page source declares `lang="pl"`
- The list page's header and empty-state CTAs and the detail page's "← Wróć do listy" link are all still present and working

**Implementation Note**: After completing this phase and all automated verification passes, pause here for final manual confirmation from the human.

---

## Testing Strategy

### Unit Tests:

- `resolveActiveHref` — exact match, segment-aware prefix match, longest-match precedence between `/recipes` and `/recipes/new`, the `/recipesfoo` near-miss, trailing-slash normalization, and the no-match cases (`/`, `/dashboard`)
- `isNavSuppressedPath` — all three `/auth/*` routes suppressed, product routes not suppressed

### Integration Tests:

None added. Per `context/foundation/test-plan.md` §5, UI snapshot tests and static-page tests are out of the test budget, and Playwright is scoped to auth boundaries and IDOR. The existing `guest` project is re-run in Phase 4 as a regression check, because `AppNav` newly reads `locals.user` on every route.

### Manual Testing Steps:

1. Signed out, load `/` and confirm the bar shows the brand, "Zaloguj", and "Zarejestruj", with no links into `/recipes`.
2. Load `/auth/signin` and confirm no bar is rendered and the background is still cosmic.
3. Sign in and confirm the bar now shows the e-mail, both product links, and "Wyloguj się".
4. Walk `/recipes` → `/recipes/new` → `/recipes/{id}` → `/recipes/{id}/edit`, confirming exactly one item is highlighted on each and that the highlight is "Twoje przepisy" on the detail and edit pages.
5. Scroll `/recipes/{id}` to the bottom and confirm the bar stays pinned and paints above the blurred cards.
6. Load `/dashboard` and `/recipes/new` and confirm the cards are centered below the bar with no spurious scrollbar.
7. Narrow the viewport to 375px on each route and confirm the collapse, then operate the menu with the keyboard only.
8. Sign out from the bar and confirm the session ends and the browser lands on `/`.
9. Confirm the homepage orbs and star field are visually unchanged from before the change.

## Performance Considerations

The shell adds no client-side JavaScript: it is an Astro component, the collapse is CSS plus native `<details>`, and sign-out remains a form POST. Choosing `<details>` over a React island specifically avoids hydrating a component on all ten routes — including the otherwise fully static auth and landing pages — for one toggle. The nav renders per request from `Astro.locals.user`, which middleware has already resolved, so it adds no queries.

## Migration Notes

No data or schema migration. The one-way structural migration is the background and viewport-height contract moving from the pages into the layout; it must land as a single unit with the nav insertion, since either half alone leaves routes visibly broken. Rollback is a straight revert of the phase.

## References

- Roadmap slice S-08: `context/foundation/roadmap.md:183-194`
- Polish UI requirement: `context/foundation/prd.md:108`
- Test scope and exclusions: `context/foundation/test-plan.md` §4–§5
- Type-gate and lint caveats: `context/foundation/lessons.md`
- Pathname-module pattern to mirror: `src/lib/protected-routes.ts`, `src/lib/protected-routes.test.ts`
- Glassy styling precedent: `context/archive/2026-06-09-saved-recipes-list/plan.md`
- Existing bar being replaced: `src/components/Topbar.astro:5-37`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Nav model and active-state resolver

#### Automated

- [x] 1.1 Linting passes: `npm run lint`
- [x] 1.2 Unit tests pass, including the new resolver spec: `npm run test:run`
- [x] 1.3 Build passes: `npm run build`

#### Manual

- [x] 1.4 Item labels and hrefs match the S-08 outcome

### Phase 2: The shell — `AppNav.astro` and the `Layout.astro` viewport contract

#### Automated

- [ ] 2.1 Linting passes: `npm run lint`
- [ ] 2.2 Build passes: `npm run build`
- [ ] 2.3 Unit tests still pass: `npm run test:run`
- [ ] 2.4 No references to the deleted component remain: `rg "Topbar" src`

#### Manual

- [ ] 2.5 Nav appears on all six product routes
- [ ] 2.6 Nav absent on the three `/auth/*` routes, background still cosmic
- [ ] 2.7 No spurious scrollbars; centered cards centered below the nav
- [ ] 2.8 Homepage shows exactly one bar, orbs and star field unchanged
- [ ] 2.9 Nav stays pinned when scrolling recipe detail, above the blurred cards
- [ ] 2.10 Correct single item highlighted on each route
- [ ] 2.11 Signed-in shows e-mail and "Wyloguj się"; guest shows "Zaloguj" / "Zarejestruj"
- [ ] 2.12 Sign-out from the nav ends the session and lands on `/`

### Phase 3: Narrow-screen collapse and accessibility

#### Automated

- [ ] 3.1 Linting passes: `npm run lint`
- [ ] 3.2 Build passes: `npm run build`

#### Manual

- [ ] 3.3 Items collapse behind the hamburger at 375px and it opens and closes
- [ ] 3.4 Hamburger and panel contents fully keyboard-operable with visible focus rings
- [ ] 3.5 Active link exposes `aria-current="page"`
- [ ] 3.6 Full horizontal row at `sm` and above, no hamburger
- [ ] 3.7 Guest and signed-in variants of the collapsed menu both correct

### Phase 4: Redundancy cleanup and cross-route regression sweep

#### Automated

- [ ] 4.1 Linting passes: `npm run lint`
- [ ] 4.2 Build passes: `npm run build`
- [ ] 4.3 Unit tests pass: `npm run test:run`
- [ ] 4.4 Guest auth-boundary suite passes: `npx playwright test --project=guest`

#### Manual

- [ ] 4.5 `/dashboard` has exactly one sign-out control
- [ ] 4.6 All ten routes correct signed-in and as guest, desktop and 375px
- [ ] 4.7 Tab titles show the product name, no "10x Astro Starter" remaining
- [ ] 4.8 Page source declares `lang="pl"`
- [ ] 4.9 List CTAs and the detail-page back link still present and working
