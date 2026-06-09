---
date: 2026-06-10T01:30:00+02:00
researcher: Dawid
git_commit: 8710df39b54714bdd80c25eec1c445735be2b6e0
branch: master
repository: MyBrew
topic: "Czy recipe-export-docs.md (@react-pdf/renderer) jest kompatybilny z kodem dla S-06"
tags: [research, codebase, recipe-export, pdf, react-pdf, cloudflare, astro-islands]
status: complete
last_updated: 2026-06-10
last_updated_by: Dawid
---

# Research: Kompatybilność `recipe-export-docs.md` z kodem (S-06)

**Date**: 2026-06-10T01:30:00+02:00
**Researcher**: Dawid
**Git Commit**: 8710df39b54714bdd80c25eec1c445735be2b6e0
**Branch**: master
**Repository**: MyBrew

## Research Question

Przejrzeć kod i ocenić, czy `context/changes/recipe-export/recipe-export-docs.md`
(docs `@react-pdf/renderer`) jest kompatybilny z obecnym kodem, w kontekście
implementacji **S-06 (`recipe-export`)** z `context/foundation/roadmap.md`.

## Summary

**Werdykt: docs są kompatybilne z kodem.** Wszystkie założenia opisane w
`recipe-export-docs.md` mają pokrycie w obecnym stanie repo, a żadne ograniczenie
architektury (Cloudflare edge, brak `"use client"`, hooki w `src/components/hooks/`)
nie jest naruszone przez proponowane podejście „generowanie tylko po stronie klienta".

Kluczowe fakty potwierdzone:

- **Prerekwizyty S-06 są spełnione w kodzie.** Mimo że roadmap nadal oznacza
  S-05 i F-01 jako `proposed`, w kodzie już istnieją: tabela `recipes` + RLS,
  pełne typy encji (`src/types.ts`), lista przepisów (`/recipes`) oraz strona
  szczegółów (`/recipes/[id]`) z pełnym `RecipeRecord` w frontmatterze.
- **Strona szczegółów to idealny punkt montażu** wyspy eksportu — `record`
  (pełny `RecipeRecord` z zagnieżdżonym `RecipeDraft`) jest już załadowany
  serwerowo i wystarcza do PDF i JSON.
- **`@react-pdf/renderer` NIE jest zainstalowany** — to jedyna twarda luka
  (nowa zależność do dodania). React 19 jest wspierany od v4.1.0.
- **Brak fontów w repo** — docs słusznie wymaga `Font.register()` dla polskich
  znaków; `public/fonts/` trzeba utworzyć (UI jest w pełni po polsku).

Innymi słowy: docs nie tylko są kompatybilne — opisują dokładnie ten kształt
integracji, którego wymaga obecny kod. Do implementacji brakuje 2 rzeczy:
(1) instalacja biblioteki, (2) dodanie self-hostowanych fontów TTF.

## Detailed Findings

### Obszar 1 — Powierzchnia UI / S-05 (gdzie zamontować eksport)

- **Strona szczegółów istnieje i jest najlepszym punktem montażu.**
  `src/pages/recipes/[id].astro` ładuje pełny rekord przez
  `getRecipe(supabase, user.id, id)` ([`[id].astro:27`](src/pages/recipes/[id].astro)),
  destrukturyzuje `data: RecipeDraft` ([`[id].astro:33`](src/pages/recipes/[id].astro))
  i renderuje wszystkie sekcje (podstawy, warka, zasyp, zacieranie, chmiel,
  drożdże, dodatki) — `[id].astro:55-238`. `prerender = false` ([`[id].astro:8`](src/pages/recipes/[id].astro)).
- **Strona jest dziś w 100% statycznym Astro — brak wyspy React.** To zgodne z
  docs („Render PDF wyłącznie w React island na stronie szczegółów") — wyspę
  trzeba dopiero dodać. `record` jest JSON-serializowalny (`createdAt: string`),
  więc można go przekazać jako props do `client:load`.
- **Lista przepisów** (`src/pages/recipes/index.astro`) dostarcza tylko
  `RecipeListItem[]` (bez `data`) — niewystarczające do pełnego PDF; eksport
  należy oprzeć o `getRecipe` na stronie szczegółów.
- **Wzorzec wyspy do naśladowania**: `client:load` z propsami, np.
  `<SignInForm serverError={error} client:load />`
  (`src/pages/auth/signin.astro:16`) oraz `<RecipeWizard client:load />`
  (`src/pages/recipes/new.astro:9`). W repo używany jest **wyłącznie**
  `client:load` (brak `client:visible`/`client:only`).
- **Brak jakiegokolwiek kodu eksportu/PDF/JSON/Blob/download** w `src/` —
  zielone pole, brak kolizji.

### Obszar 2 — Build / runtime / ograniczenia edge

- **Astro SSR + Cloudflare**: `output: "server"`, `adapter: cloudflare()`,
  `integrations: [react(), ...]` (`astro.config.mjs:11-16`). Wyspa React działa
  w przeglądarce — generowanie PDF po stronie klienta **omija edge runtime**,
  dokładnie jak zakłada research/docs.
- **`nodejs_compat`** w `wrangler.jsonc:6` dotyczy runtime Workera (SSR), nie
  bundla przeglądarki — nieistotne dla klienckiego PDF (i tak nie używamy
  `renderToBuffer`/`renderToStream`).
- **React 19 jest wspierany przez `@react-pdf/renderer` od v4.1.0**
  (peer dep `^19.0.0`; najnowsze 4.5.x). Repo pinuje `react@^19.2.6`
  (`package.json:36-37`), pojedyncza wersja React w drzewie → znane problemy
  z reconcilerem (monorepo/RSC, react-pdf#2964/#3285) **nie dotyczą** tego
  projektu (single-app, generowanie w przeglądarce, nie w warstwie react-server).
- **`@react-pdf/renderer` nieobecny** w `package.json`, `package-lock.json`
  i `node_modules` — do zainstalowania.
- **`tsconfig`**: `jsx: "react-jsx"`, `jsxImportSource: "react"`, alias `@/*`
  → składnia JSX z docs zadziała bez zmian.
- **Brak fontów**: `public/` zawiera tylko `.assetsignore`; brak `public/fonts/`
  i żadnych `.ttf/.woff`. Docs słusznie ostrzega o polskich znakach diakrytycznych
  i wymaga `Font.register()` — to realna, konieczna praca (UI w pełni po polsku,
  np. `[id].astro`).
- **Brak `"use client"`, `Buffer`, `fs`** w `src/` — zgodne z konwencją z `CLAUDE.md`.
- **Testy**: Vitest `environment: "node"` (`vitest.config.ts`) pokrywa tylko
  `src/lib/**/*.test.ts`. Komponenty PDF nie będą testowalne bez `jsdom`/`happy-dom`
  — ale to nice-to-have, nie blokuje.

### Obszar 3 — Dane / typy

- **Tabela `recipes`** (`supabase/migrations/20260609100000_create_recipes.sql`):
  `id`, `user_id`, `name`, `style`, `blg`, `srm`, `ibu`, `abv` (numeric),
  `data jsonb NOT NULL`, `created_at`. RLS włączone; polityki SELECT/INSERT dla
  `auth.uid() = user_id`. Grant SELECT/INSERT w
  `20260609110000_grant_recipes.sql` (nowy plik z git status).
- **Typy w `src/types.ts` zgodne z DB**: `RecipeRecord` (linie 79-86) zawiera
  metryki + `data: RecipeDraft`; `RecipeDraft` (55-63) = `basics, batch, malts,
  mash, hops, yeast, adjuncts`. Docs twierdzi „Encja przepisu jest już typowana
  w `src/types.ts` (F-01)" — **potwierdzone**.
- **Pełny przepis jest pobieralny**: `getRecipe` robi `select("*")` i mapuje do
  `RecipeRecord` (`src/lib/recipe-queries.ts:21-26`, mappery
  `src/lib/recipe-mappers.ts:19-37`) — wystarczające zarówno do JSON
  (`JSON.stringify`) jak i do pełnego PDF.
- **Eksport JSON = zero zależności**, dokładnie jak w docs (`JSON.stringify` →
  `Blob`). Dane już w pamięci na stronie szczegółów.

## Code References

- `src/pages/recipes/[id].astro:27,33` - pełny `RecipeRecord`+`RecipeDraft` w frontmatterze (punkt montażu eksportu)
- `src/pages/recipes/new.astro:9` - wzorzec `client:load` dla wyspy React
- `src/pages/auth/signin.astro:16` - wzorzec przekazywania propsów do wyspy
- `src/lib/recipe-queries.ts:21-26` - `getRecipe` (`select("*")`, pełny rekord)
- `src/lib/recipe-mappers.ts:19-37` - mapowanie wiersza DB → `RecipeRecord`
- `src/types.ts:55-98` - `RecipeDraft`, `RecipeRecord`, `RecipeInsert`
- `supabase/migrations/20260609100000_create_recipes.sql:1-28` - tabela + RLS
- `astro.config.mjs:11-16` - SSR + Cloudflare + React
- `wrangler.jsonc:6` - `nodejs_compat` (tylko runtime Workera)
- `package.json:36-37` - `react@^19.2.6` (brak `@react-pdf/renderer`)
- `public/.assetsignore` - brak `public/fonts/`
- `src/components/hooks/useWizardRecipe.ts` - jedyny istniejący hook (wzorzec lokalizacji)

## Architecture Insights

- **Konwencja wysp**: Astro SSR statyczny + selektywne `client:load`. Eksport
  PDF idealnie pasuje jako mała wyspa na stronie szczegółów; reszta strony
  pozostaje statycznym Astro.
- **Granica edge vs przeglądarka**: cała logika ciężka (fontkit/WASM) trzymana
  w przeglądarce; serwer (Worker) tylko dostarcza dane przez RLS-owany `getRecipe`.
  To kluczowy powód, dla którego `@react-pdf/renderer` (klient) jest bezpieczny,
  a jego API serwerowe (`renderToBuffer/Stream`) musi pozostać nieużywane.
- **Dane już dostępne serwerowo** → eksport nie wymaga nowego endpointu API
  (ani GET-by-id); wystarczy przekazać `record` do wyspy jako props.
- **Lekcje (`lessons.md`)**: „nie dodawaj zależności bez powodu" — JSON ma być
  bez biblioteki (zgodne z docs); jedyna nowa zależność (`@react-pdf/renderer`)
  jest uzasadniona wyłącznie dla PDF.

## Historical Context (from prior changes)

- `context/changes/recipe-export/recipe-export-research.md` - porównanie bibliotek
  PDF (jsPDF / pdf-lib / @react-pdf/renderer), ograniczenie Cloudflare, rekomendacja
  „PDF po stronie klienta" + „JSON bez zależności". Docs są wiernym rozwinięciem tej
  rekomendacji dla wariantu `@react-pdf/renderer`.
- `context/changes/recipe-export/recipe-export-docs.md` - badane docs (źródło: Context7
  `/diegomura/react-pdf`).
- `context/foundation/roadmap.md:152-163` - definicja S-06 (PRD FR-013, nice-to-have,
  otwarte pytanie: PDF i JSON czy jeden format).

## Open Questions

1. **Zakres formatów dla v1** (otwarte pytanie z roadmapy): oba (PDF + JSON) czy
   tylko JSON na start? JSON jest niemal zerowym nakładem; PDF wymaga biblioteki
   + fontów. Owner: user.
2. **Wersja i źródło fontów**: które TTF (Inter/Roboto/Open Sans) self-hostować
   w `public/fonts/` dla pełnego wsparcia `ą ć ę ł ń ó ś ż`? (Preferencja docs:
   self-hosting zamiast Google Fonts URL.)
3. **Bundling wyspy**: czy `@react-pdf/renderer` + fontkit zbuduje się czysto
   w wyspie klienckiej Astro, czy potrzebny będzie `vite.ssr.noExternal` /
   `optimizeDeps` w `astro.config.mjs`? (Do zweryfikowania empirycznie przy
   implementacji; nie blokuje decyzji o kompatybilności.)
4. **Pin wersji**: zainstalować `@react-pdf/renderer@^4.5` (React 19 od 4.1.0).

## Next Step

Decyzja o kompatybilności: **TAK**. Sugerowane przejście do `/10x-plan recipe-export`,
z uwzględnieniem: instalacja `@react-pdf/renderer`, dodanie `public/fonts/` + `Font.register()`,
nowa wyspa `client:load` na `src/pages/recipes/[id].astro` z propsem `record`,
oraz akcja JSON bez zależności w tym samym menu „Eksportuj".
