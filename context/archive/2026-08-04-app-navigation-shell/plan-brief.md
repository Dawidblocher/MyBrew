# App Navigation Shell — Plan Brief

> Full plan: `context/changes/app-navigation-shell/plan.md`

## What & Why

Navigation exists in exactly one place today: a `Topbar` rendered only inside the homepage. Every other route — the recipe list, the wizard, recipe detail, edit, dashboard — has no navigation at all, so users move between them via page-local back links and CTAs or by editing the URL. This change lifts navigation into `Layout.astro` as a persistent shell, delivering roadmap slice S-08.

## Starting Point

`Layout.astro` is nav-free and still declares `lang="en"` with a default title of `"10x Astro Starter"`. `Topbar.astro` has English labels, links to `/dashboard` but never to `/recipes`, and renders only from `Welcome.astro`. Critically, all ten pages own their own `bg-cosmic min-h-screen` wrapper in three padding variants, six of them centering a card with `flex items-center justify-center` — so the layout has no viewport contract to hang a nav on. Sign-out is a native form POST, duplicated in the Topbar and the dashboard.

## Desired End State

Every route except `/auth/*` shows one sticky bar: brand linking home, "Twoje przepisy", "Nowy przepis", the signed-in e-mail, and "Wyloguj się" — or brand plus "Zaloguj" / "Zarejestruj" for guests. Exactly one item is highlighted per route, with detail and edit pages highlighting "Twoje przepisy". Below `sm` the links collapse behind a keyboard-accessible hamburger. No page gains a scrollbar, centered cards stay centered below the bar, the homepage keeps its orbs, and tabs show the product name.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Viewport contract | Layout owns `bg-cosmic` + `min-h-screen` flex column; pages grow to fill | One owner of background and height avoids a nav-height + 100vh scrollbar on all ten routes and keeps centered cards centered. | Plan |
| Guest nav content | Brand + "Zaloguj" / "Zarejestruj" only | The nav should never offer a link that middleware would bounce to sign-in. | Plan |
| Collapse mechanism | CSS-only `<details>` / `<summary>` | Zero client JS and free keyboard semantics, versus hydrating React on all ten routes for one toggle. | Plan |
| Where the shell renders | Everywhere except `/auth/*`, decided from the pathname inside the component | Keeps auth screens focused with no per-page prop and no chance a future page forgets the nav. | Plan |
| Scroll behavior | Sticky top with blurred backdrop | Keeps navigation reachable on the long recipe detail and wizard pages. | Plan |
| Active-state resolution | Segment-aware prefix match, longest match wins | Guarantees exactly one highlight, and makes `/recipes/{id}` read as part of "Twoje przepisy". | Plan |
| Page cleanup scope | Minimal — only the duplicated dashboard sign-out | Contextual CTAs and the hierarchy-expressing back link are worth keeping; keeps the diff in the layout layer as the roadmap asked. | Plan |
| Brand and identity | "Beer Recipe Builder", `lang="pl"`, product-name title default | Matches the PRD product name and fixes a real i18n bug plus the starter name leaking into tabs. | Plan |
| No "Dashboard" nav link | Omitted | The S-08 outcome doesn't list one; the page stays reachable by URL. | Roadmap |
| No `tsc --noEmit` gate | Omitted from success criteria | `lessons.md` records pre-existing type errors and treats the type gate as its own change. | Lessons |

## Scope

**In scope:**

- A new `AppNav.astro` shell component plus a tested `src/lib/nav-items.ts` resolver
- `Layout.astro` taking over the background and viewport-height contract, `lang`, and the title default
- Migrating all ten page wrappers off their own `bg-cosmic min-h-screen`
- Deleting `Topbar.astro` and reconciling `Welcome.astro`
- Removing the dashboard's now-duplicate sign-out

**Out of scope:**

- The landing page rewrite (roadmap S-09) — hero copy stays as-is
- Translating auth pages and dashboard body copy
- Any change to data, API routes, `middleware.ts`, or route protection
- New Playwright specs, UI snapshot tests, or a type-check gate

## Architecture / Approach

`Layout.astro` becomes a flex column owning `bg-cosmic` and full viewport height: `AppNav` is the sticky first row, a growing `<main>` holds the `<slot />`. `AppNav` reads `Astro.locals.user` (already resolved by middleware) and `Astro.url.pathname`, so no page passes props, and it self-suppresses on `/auth/*`. All pathname logic lives in `src/lib/nav-items.ts`, mirroring the existing `protected-routes.ts` pattern, which is what makes it unit-testable. Sign-out stays a native form POST and the collapse stays CSS-only, so the shell ships no JavaScript.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Nav model and resolver | Tested `src/lib/nav-items.ts` with active-item and suppression logic | Low — pure module; the `/recipes` vs `/recipes/new` precedence is the only trap |
| 2. Shell and layout contract | Desktop nav on every route, layout owns background and height, `Topbar` gone, all pages migrated | Highest — one atomic change across ten pages; sticky can be broken by the existing `height: 100%` rule or an `overflow-hidden` ancestor |
| 3. Collapse and a11y | `<details>` hamburger below `sm`, focus states, `aria-current` | Native disclosure styling and keyboard behavior need hands-on checking |
| 4. Cleanup and sweep | Duplicate dashboard sign-out removed, full-surface and guest-boundary verification | Low — the guest Playwright run guards the one thing the shell newly touches everywhere |

**Prerequisites:** none — v1 is complete and every dependency of S-08 is already done. Local dev server and a signed-in test account for manual passes.

**Estimated effort:** ~1–2 sessions; Phase 2 is the bulk of it.

## Open Risks & Assumptions

- Sticky positioning may fight the hard-coded `html, body { height: 100% }` in `Layout.astro`; the planned response is to relax it to `min-height`, not to add overflow rules
- `Welcome.astro`'s `overflow-hidden` would silently disable sticky if the nav ever ended up inside it, so the nav must stay a sibling of page content
- Migrating ten page wrappers by hand risks a missed page showing no background; the manual route sweep in Phases 2 and 4 is the safety net
- Setting `lang="pl"` while the auth pages and landing hero are still English is a knowing, temporary inconsistency that S-09 resolves

## Success Criteria (Summary)

- From any page in the app, a user can reach their recipe list, start a new recipe, or sign out without using page-local links or the URL bar
- The bar shows where the user currently is, and works down to a 375px viewport and from the keyboard alone
- No existing page regresses: no new scrollbars, no off-center cards, no lost CTAs, and the guest auth boundary still holds
