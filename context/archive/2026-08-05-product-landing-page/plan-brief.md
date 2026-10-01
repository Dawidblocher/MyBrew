# Product Landing Page — Plan Brief

> Full plan: `context/changes/product-landing-page/plan.md`

## What & Why

The homepage at `/` is still the generic "10x Astro Starter" boilerplate — English copy, starter feature cards, and no mention of what the app actually does. This slice (roadmap S-09) replaces it with a Polish product landing for Beer Recipe Builder so a first-time visitor instantly understands the promise (a step-by-step recipe wizard with live BLG / ABV / SRM / IBU calculations) and has a clear next action.

## Starting Point

All landing content lives in `src/components/Welcome.astro`, which `src/pages/index.astro` renders through `Layout.astro`. Today it holds an English "10x Astro Starter" hero, `Sign In` / `Sign Up` buttons, and three starter feature cards, plus decorative cosmic orbs. The app already has a persistent nav shell (S-08) and a settled cosmic design system; `/` is public and `Astro.locals.user` is available in the component.

## Desired End State

`/` shows a Polish product hero with BLG · ABV · SRM · IBU badges above the fold, an auth-aware CTA (guests: "Zacznij za darmo" + "Zaloguj się"; logged-in: "Twoje przepisy" + "Nowy przepis"), and three benefit cards reframed to the real product — with the cosmic orbs kept and zero English or boilerplate left behind.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Logged-in user on `/` | Show the landing, swap CTAs to app actions | No redirect surprise, page stays bookmarkable, reuses `Astro.locals.user` already in scope. | Plan |
| Guest primary CTA | "Zacznij za darmo" → signup (primary) + "Zaloguj się" (secondary) | Optimizes new-user activation, the landing page's core job. | Plan |
| Content depth | Hero + 3 reframed benefit cards | Communicates value with minimal new structure, fits the after-hours budget. | Plan |
| Metrics treatment | BLG/ABV/SRM/IBU as hero badges | Signals the concrete promise above the fold cheaply. | Plan |
| Verification | Lint + build + manual state/route sweep | Matches the presentational scope and the project's existing gates. | Plan |
| No type-check gate / new deps | Omitted | `lessons.md` records pre-existing type errors and native-first preference. | Lessons |

## Scope

**In scope:**

- Rewriting `src/components/Welcome.astro`: Polish product hero, metric badges, auth-aware CTAs, three reframed benefit cards.
- Removing all English copy and starter-boilerplate references from the page.

**Out of scope:**

- Redirecting logged-in users away from `/`.
- Any change to `index.astro`, `Layout.astro`, `AppNav.astro`, `middleware.ts`, or route protection.
- Data, API, calculation, or auth changes; new automated tests; new dependencies; a "how it works" or standalone metrics section.

## Architecture / Approach

Single-component, SSR-only rewrite. A small frontmatter script in `Welcome.astro` reads `Astro.locals.user` and derives a primary/secondary CTA pair; the template swaps all copy to Polish, adds a metric-badge row, and reuses existing Tailwind tokens (accent/outline buttons, glassmorphic cards, gradient headline). The decorative orbs and `overflow-hidden` wrapper stay so the visual identity and sticky nav are unaffected. No client JS ships.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Rewrite the landing content | Polish hero, metric badges, auth-aware CTAs, reframed benefit cards; boilerplate gone | Low — leftover English string or a token mismatch; keeping orbs scoped |
| 2. Verification sweep | Confirmed guest + logged-in CTAs and mobile layout, lint/build green | Low — the two auth states are the only branching to check |

**Prerequisites:** none — v1 and S-08 are complete. Local dev server and a signed-in test account for manual passes.

**Estimated effort:** ~1 short session.

## Open Risks & Assumptions

- The orbs must stay inside the existing `overflow-hidden` wrapper, or they could clip oddly or interact with the sticky nav.
- CTA branching is presumed correct from `Astro.locals.user` alone; the Phase 2 logged-in pass is the check.

## Success Criteria (Summary)

- A first-time guest at `/` immediately sees, in Polish, what the app does and a clear "Zacznij za darmo" path into signup.
- A logged-in visitor at `/` gets "Twoje przepisy" / "Nowy przepis" instead of sign-in prompts.
- No English or starter-boilerplate text remains, and the page works down to ~375px with lint + build green.
