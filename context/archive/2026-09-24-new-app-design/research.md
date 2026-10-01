---
date: 2026-09-24T21:29:34+02:00
researcher: Claude (Opus 5.5) dla Dawid Blocher
git_commit: 89ca68d9f5ecdb3f9b2c7a76daa9318f452a349d
branch: master
repository: Dawidblocher/MyBrew
topic: "Jak wdrożyć nowy design aplikacji wzorując się na design-app-example.html"
tags: [research, codebase, design-system, tailwind, shadcn, layout, recipe-wizard, recipes-list, astro-fonts]
status: complete
last_updated: 2026-09-24
last_updated_by: Claude (Opus 5.5)
---

# Research: wdrożenie nowego designu na podstawie `design-app-example.html`

**Date**: 2026-09-24T21:29:34+02:00
**Researcher**: Claude (Opus 5.5) dla Dawid Blocher
**Git Commit**: 89ca68d9f5ecdb3f9b2c7a76daa9318f452a349d
**Branch**: master
**Repository**: Dawidblocher/MyBrew

## Research Question

Zrób research, jak wdrożyć nowy design aplikacji, wzorując się na `c:\10xdevs\design-app-example.html`.

**Zakres uzgodniony z użytkownikiem (2026-09-24):**
- **Reskin istniejących ekranów** — nawigacja, lista i szczegóły receptury, kreator (nowy + edycja), auth, landing. Bez nowych funkcji (Surowce, Protokół warzenia, statystyki pulpitu).
- **Pełny layout projektu** — sidebar/aside, receptury jako master-detail, kreator ze stepperem po lewej i paskiem obliczeń na górze.
- **Bez dodatków** — bez ciemnego motywu, bez EN/i18n, bez brandingu „myGrowl” (zostaje „Beer Recipe Builder”), bez wykresów (profil zacierania, oś chmielenia). „Dostosowujemy to, co już mamy.”

## Summary

1. **Plik projektu to bundle, nie statyczny HTML.** `design-app-example.html` (2 MB) to spakowany prototyp React + Babel („myGrowl — Dashboard piwowara”): manifest z gzipowanymi modułami JSX i fontami woff2. Źródła rozpakowano do [`design-source/`](design-source/README.md). Są tam `tokens.css`, `shared.jsx` (prymitywy UI), `app.jsx` (shell), `recipes.jsx` (master-detail), `new-recipe.jsx` (kreator) i inne.
2. **Obecna aplikacja ma zupełnie inny, ciemny styl.** Jest to „cosmic glassmorphism”: `bg-cosmic`, `white/10`, fioletowe akcenty. Styl jest **wpisany na sztywno jako klasy palety Tailwind — 494 wystąpienia w 38 plikach**. Tokeny shadcn w `global.css` to stockowy neutral i komponenty feature'owe prawie wszędzie je nadpisują. **Samo przemapowanie zmiennych shadcn nie przeskinuje aplikacji.** Trzeba przejść plik po pliku i usunąć nadpisania.
3. **Rekomendowana kolejność:**
   1. Design tokens: paleta paper/ink/copper w `global.css` → semantyczne zmienne shadcn i dodatkowe `--color-*`, radius 4px.
   2. Fonty: Fraunces, IBM Plex Sans i IBM Plex Mono przez **wbudowane Astro 6 Fonts API**.
   3. Warstwa `ui/`: nowe warianty Button, oraz Badge, Field, Input z jednostką, SectionTitle i StatTile.
   4. Layouty: wariant „shell z sidebarem” i wariant „bare”.
   5. Ekrany: receptury master-detail, kreator full-screen, auth, landing.
   6. Sprzątanie: `bg-cosmic`, `.dark`, `LibBadge`.
4. **Layout projektu trzeba przełożyć z SPA na MPA.** Prototyp przełącza widoki `setView` w jednym drzewie React. Aplikacja ma realne URL-e i SSR. Dwie konsekwencje:
   - Master-detail oznacza wspólny komponent `RecipeListAside.astro` na `/recipes` i `/recipes/[id]`. Strona szczegółów robi dodatkowe (lekkie) zapytanie `listRecipes`.
   - Zakładki w szczegółach wymagają małej wyspy React albo rozwiązania CSS/`?tab=`.
5. **Kreator zmienia się tylko warstwowo.** Logika pozostaje nietknięta: `handleNext`, `stepForField`, `applySaveErrors`, `validateWizardStep`, schemat i hook. Zmienia się kompozycja:
   - `WizardStepper` rozbity na pionowy stepper-aside i stopkę,
   - `MetricsPanel` przeniesiony z dołu na górny pasek,
   - baner błędów przeniesiony do stopki,
   - dodane „Anuluj” / X.
6. **Wiele elementów prototypu nie ma danych w aplikacji** (wersja, BJCP, woda, fermentacja, historia, OG/FG, zakresy stylu, magazyn). Przy zakresie „bez dodatków” należy je **pominąć**, a w ich miejscu pokazać to, co mamy: BLG / Barwa (SRM) / IBU / ABV, objętość, dodatki. Pełna tabela: sekcja „Gap analysis”.
7. **Ryzyko testowe jest niskie, ryzyko weryfikacji manualnej wysokie.** Brak testów komponentów i snapshotów (świadoma decyzja, `context/foundation/test-plan.md:81`). E2E sprawdza przekierowania i nagłówki szczegółów. Twarde bramki to `npm run lint` (z `jsx-a11y`) i `npm run build`. **Jedyny unit test, który pęknie przy zmianie nawigacji, to `src/lib/nav-items.test.ts:33,40`** (przypina etykiety i hrefy przez `toEqual`).

## Detailed Findings

### 1. Prototyp — co zawiera `design-app-example.html`

- Bundle: `<script type="__bundler/manifest">` (base64 + gzip) oraz `__bundler/template`. Template ładuje React 18 UMD i Babel standalone, potem moduły `src/*.jsx` jako `text/babel`. Rozpakowane pliki: `design-source/` (mapowanie w `design-source/README.md`).
- **Design tokens** (`design-source/tokens.css`):
  - paper `#F4EFE6` / paper-2 `#EFE8DB` / paper-3 `#E6DCC7`
  - ink `#2C1810` / ink-2 `#4A3020` / ink-3 `#6B4A33`
  - rule `#D9CDB4` / rule-soft `#E5DBC5`
  - copper `#B8632D` / copper-2 `#8B4513`
  - hop `#6B8E4E`, ok `#5B7A3F`, warn `#C97A2B`, err `#A83A27`
  - chip `#EAE0CB`, white `#FBF8F2`
  - `--radius: 4px`, `--shadow`, gęstość `--density-y/x`
  - Motywy `dark` i `swiss` są **poza zakresem**.
- **Typografia:**
  - body: IBM Plex Sans 14px / 1.45
  - `.serif` (Fraunces): tytuły 22–44px, duże liczby
  - `.mono` (IBM Plex Mono): „eyebrow” 9–11px, uppercase, `letter-spacing: .08–.12em`, liczby i jednostki
- **Prymitywy** (`design-source/shared.jsx`):
  - `Button` z wariantami `default|primary(ink)|copper|ghost|outline|danger` i rozmiarami `sm|md` (`:67-102`)
  - `Badge` z tonami `neutral|ok|warn|err|ink|copper|hop`, mono uppercase (`:104-132`)
  - `Card` z tłem white, obramowaniem rule i opcją interactive (`:134-149`)
  - `Field` z etykietą mono uppercase i hintem (`:151-159`)
  - `Input` z sufiksem jednostki (`:161-172`)
  - `SectionTitle` (eyebrow + serif + prawy slot) (`:174-184`)
  - `StatTile` (`:186-197`)
  - `ColorSwatch` (EBC → gradient kolorów) (`:200-231`)
  - `Bar` (`:234-242`)
  - ikony liniowe SVG (`:5-45`) — w repo odpowiada im `lucide-react`
- **Shell** (`design-source/app.jsx:46-113`):
  - Sidebar 232px (tło paper-2, sticky, 100vh), a w nim: blok logo, `NavItem` (aktywny = białe tło + lewa krawędź 2px copper, `:117-140`), karta aktywnej warki i blok użytkownika.
  - **Sidebar jest ukryty dla widoków `recipes` i `newRecipe`** (`app.jsx:46-48`). Te widoki mają własne pełnoekranowe gridy z przyciskiem „Wróć” i logo.
- **Receptury — master-detail** (`design-source/recipes.jsx`):
  - Grid `360px 1fr`, pełna wysokość (`:22`).
  - Aside (`:24-109`): „Wróć” + logo, eyebrow + tytuł „Receptury” + licznik, wyszukiwarka, chipy stylów, lista kart, a w stopce przycisk „Nowa receptura” w wariancie primary. Karta zawiera swatch, nazwę serif, styl mono i Mini ABV/IBU/EBC/vol.
  - Szczegóły (`:153-238`):
    - nagłówek na tle paper-2: badge, H1 serif 44px, opis, akcje (outline sm + główna copper);
    - pasek 6 StatTile + swatch;
    - sticky zakładki z aktywnym podkreśleniem copper;
    - karty zakładek.
- **Kreator** (`design-source/new-recipe.jsx:282-491`):
  - Grid `260px 1fr`, pełna wysokość.
  - Aside: eyebrow „Nowa receptura”, tytuł „Kreator”, kroki jako kółka (ukończony = ok + check, aktywny = copper z halo, oczekujący = paper-3) z etykietą i hintem mono.
  - Po prawej:
    - nagłówek „Krok X / N” + tytuł serif + X,
    - pasek postępu 2px copper,
    - `ComputedStrip` (`:221-280`),
    - przewijana treść,
    - stopka z paper-2: status oraz przyciski Anuluj (ghost) / ← Wstecz (outline) / Dalej → (primary) / Zapisz recepturę (copper).
  - Wiersze składników mają postać `grid` wewnątrz białej karty, z inputami z jednostką i przyciskiem X (`:641-665`). Pusty stan to box z przerywaną ramką (`:636-639`).

### 2. Infrastruktura stylów — stan obecny

- `src/styles/global.css:6-39`: stockowe tokeny shadcn „neutral” (oklch).
  - `:41-73` blok `.dark` jest martwy — nic nie ustawia klasy `.dark`.
  - `:75-111` `@theme inline` mapuje kolory i radiusy (`--radius-sm/md/lg/xl` jako calc od `--radius`), ale **nie mapuje fontów**.
  - `:113-115` `@utility bg-cosmic`, używane tylko w `src/layouts/Layout.astro:22`.
- **Fonty:** brak jakiegokolwiek fontu webowego (ani Google Fonts, ani `@fontsource`). PDF korzysta z własnego Inter TTF: `src/lib/pdf-fonts.ts:3-11`, `public/fonts/`. `RecipePdf.tsx` stylizuje się własnym `StyleSheet` z hexami, więc **PDF jest niezależny od CSS** i poza zakresem.
- **Astro 6.3.1 ma stabilne Fonts API:**
  - `fonts` w `astro.config` (`node_modules/astro/dist/core/config/schemas/base.js:311`)
  - `fontProviders.google()/fontsource()` z `astro/config`
  - komponent `<Font cssVariable preload/>` z `astro:assets`
  - Fonty są pobierane w buildzie i serwowane z `/_astro/fonts/`, co działa na Cloudflare Workers bez requestów runtime do Google.
  - **Wymagany subset `latin-ext`** — polskie znaki.
- **shadcn** (`components.json`: new-york, neutral, cssVariables, lucide). Komponenty w `src/components/ui/`:
  - `button.tsx`: warianty `default|destructive|outline|secondary|ghost|link`. W praktyce używane są `outline` ×22 i `destructive` ×2, i niemal zawsze z `className` nadpisującym kolory (np. `RecipeExportActions.tsx:7`).
  - `input.tsx` ×22 — każde użycie przez lokalny `inputClass`, **skopiowany 8×** (MaltRow:18, HopRow:19, AdjunctRow:26, MashRestRow:18, BasicsStep:27, GristStep:22, MashStep:23, YeastStep:8).
  - `label.tsx` ×25, wszędzie z nadpisaniem `text-blue-100/80`.
  - `dialog.tsx` — tylko `DeleteRecipeDialog`.
  - `card.tsx` — **0 użyć**. Karty to ręczne `div`-y `rounded-xl border-white/10 bg-white/5 backdrop-blur-xl`.
  - `LibBadge.astro` — nieużywany.
- **Hard-coded kolory:** 494 wystąpienia.
  - Rodziny: white 244, blue 117, purple 70, red 58.
  - Najwięcej w: `pages/recipes/[id].astro` (80), `Welcome.astro` (34), `HopRow` (30), `MaltRow` (29), `AdjunctRow` (28), `pages/recipes/index.astro` (27), `MashRestRow` (25), `AppNav.astro` (19), `WizardStepper` (18).
  - Dodatkowo: `backdrop-blur-xl` ×24, gradientowe nagłówki `bg-clip-text` ×12, `Banner.astro:14-41` (hexy w scoped CSS).
  - Wzorce są spójne semantycznie, więc mapowanie da się zrobić mechanicznie:

| Obecna klasa | Docelowy token |
|---|---|
| `text-white` | ink |
| `text-blue-100/60-80` | ink-2 / ink-3 |
| `bg-white/5\|10` | white / paper-2 |
| `border-white/10\|20` | rule / rule-soft |
| `purple-*` | copper |
| `red-*` | err / destructive |
| gradient text | serif ink |

### 3. Strony i nawigacja — stan obecny

- Wszystkie strony używają jednego `src/layouts/Layout.astro` (tylko prop `title`). Body to `bg-cosmic flex min-h-screen flex-col` (`:22`), dalej `Banner` przy brakującym env (`:23-38`), `<AppNav/>` (`:39`) i `<main>` (`:40-42`). **Brak wariantów layoutu.**
- `src/components/AppNav.astro`: **górny** sticky header (`:30`), nie sidebar.
  - Marka „Beer Recipe Builder” (`:32-40`).
  - Linki z `src/lib/nav-items.ts` (`/recipes` „Twoje przepisy”, `/recipes/new` „Nowy przepis”; dla gości logowanie i rejestracja). Aktywny link przez `resolveActiveHref` (longest prefix) + `aria-current="page"` (`:47`).
  - E-mail i formularz POST „Wyloguj się” (`:53-68`).
  - Hamburger `<details>` na mobile (`:71-127`), zero JS.
  - Ukryty na `/auth/*` (`isNavSuppressedPath`).
- Strony:
  - `/`: `Welcome.astro` (hero z „kosmicznymi” orbami, niedawno zrobiony landing).
  - `/dashboard`: placeholder ze startera, po angielsku, poza nawigacją.
  - `/recipes`: grid kart z `RecipeMetricTiles compact`, ikonami edycji i usuwania na hover (`src/pages/recipes/index.astro:73-115`), stanami error i empty (`:47-69`).
  - `/recipes/[id]`: nagłówek z akcjami (`RecipeExportActions` JSON+PDF, „Edytuj”, `DeleteRecipeDialog`), `RecipeMetricTiles` i sekcje ułożone jedna pod drugą (`src/pages/recipes/[id].astro:44-247`).
  - `/recipes/new` i `/recipes/[id]/edit`: ten sam `RecipeWizard` w wyśrodkowanym `max-w-2xl` / `max-w-4xl`.
  - `/auth/*`: szklane karty. **Teksty formularzy są po angielsku** (`SignInForm`, `SignUpForm`, `PasswordToggle`), mimo że PRD wymaga polskiego UI (`prd.md:108`).
- **Brak wyszukiwania i filtrowania listy** — `listRecipes` nie przyjmuje parametrów (`src/lib/recipe-queries.ts:7-19`) i selektuje `id, name, style, blg, srm, ibu, abv, created_at` (`:13`). Objętość jest tylko w `data.batch.volumeL`.
- Dane użytkownika dla bloku „user” w sidebarze: tylko Supabase `User` (`email`, `id`) — `src/env.d.ts:1-5`.

### 4. Kreator — stan obecny i mapowanie na nowy układ

- `src/components/recipe/RecipeWizard.tsx`:
  - 6 kroków (`:19-26`): Podstawy, Zasyp i parametry, Zacieranie, Chmiel, Drożdże, Dodatki. Prototyp ma Wodę i Podgląd, a nie ma Dodatków.
  - Renderowany jest tylko bieżący krok (`:28,58,185`). RHF trzyma wartości.
  - `stepForField` (`:32-40`) jest **sprzężony z kolejnością kroków**.
  - Gating „Dalej” w `handleNext` (`:78-107`), zapis w `handleSave` (`:115-166`, POST/PUT, obsługa statusów).
  - Baner `role="alert"` (`:188-200`).
  - **`<MetricsPanel/>` renderuje się na dole karty** (`:202`).
- `WizardStepper.tsx`:
  - Pozioma lista `<nav aria-label="Kroki kreatora"><ol>`, `aria-current="step"` (`:36-58`).
  - Kroki to `<div>` — **nie da się dziś kliknąć dowolnego kroku**.
  - Stopka Wstecz / Dalej / „Zapisz przepis” (`:63-93`, `:81`).
  - Brak Anuluj / X.
- `MetricsPanel.tsx`: 4 metryki z `computeWizardMetrics` (`src/lib/recipe-to-calc.ts:107-131`): BLG, SRM („Barwa”), IBU, ABV.
  - Deskryptory w `src/lib/recipe-metrics.ts:5-15` są **współdzielone z `RecipeMetricTiles.astro`** (szczegóły i lista).
  - OG jest liczone wewnętrznie (`src/lib/calc/gravity.ts:42-62`), FG tylko w `calc/abv.ts:29-30`. Oba nie są wystawione. Brak funkcji SRM → kolor i brak danych BJCP.
- Wiersze (`MaltRow`, `HopRow`, `MashRestRow`, `AdjunctRow`):
  - `<li>` z gridem pól i kolumną 3 przycisków ikonowych (↑ ↓ ✕) z polskimi `aria-label` z numerem (np. `MaltRow.tsx:118,129,139`).
  - Każde pole ma `Label htmlFor` + stabilne `id` (`malt-${i}-amount` itd.), `aria-invalid` i `FieldError` per wiersz (`errors.hops?.[i]?.alphaAcidPercent`, np. `HopRow.tsx:36`). Dzięki temu działa lekcja z `lessons.md:12-17`.
  - `FieldError` jest skopiowany w 7 plikach. `YeastStep.tsx:23-101` **nie wyświetla błędów pól**.
- `StyledSelect.tsx`: własny listbox z ARIA (`:59-107`), ciemny `bg-slate-950` (`:84`). `hopFieldShellClass` jest re-eksportowany przez `HopStageSelect.tsx:10`.
- Pliki, których restyle **nie powinien ruszać**: `useWizardRecipe.ts`, `wizard-step-validation.ts`, `recipe-schema.ts`, `recipe-labels.ts`, `src/lib/calc/*`.

### 5. Testy i bramki jakości

- Vitest: `environment: node`, tylko `src/**/*.test.ts`, bez jsdom i RTL. Testy dotyczą wyłącznie logiki.
- **Wyjątek:** `src/lib/nav-items.test.ts:33,40` przypina `SIGNED_IN_NAV_ITEMS` i `GUEST_NAV_ITEMS` przez `toEqual`. Dodanie `icon` lub zmiana etykiet wymaga aktualizacji testu.
- Playwright (`tests/auth-read-boundary.spec.ts`, `tests/idor-mutations.spec.ts`) sprawdza przekierowania gości i nagłówki strony szczegółów, oraz polską kopię typu „Nie znaleziono przepisu” (`test-plan.md:117`). **Nie zmieniać tras ani kluczowych tekstów 404.** CI uruchamia projekty `guest` i `crossuser`.
- `.github/workflows/ci.yml`: `lint` (z `eslint-plugin-jsx-a11y`) + `build` + `test:run`. `tsc --noEmit` nie jest bramką (`lessons.md:19-24`).
- `test-plan.md:81` — snapshot testy UI zostały świadomie odrzucone. Weryfikacja designu będzie **manualna**.

## Code References

Permalinki: `https://github.com/Dawidblocher/MyBrew/blob/89ca68d9f5ecdb3f9b2c7a76daa9318f452a349d/<path>#L<n>`

- [`src/styles/global.css:6-124`](https://github.com/Dawidblocher/MyBrew/blob/89ca68d9f5ecdb3f9b2c7a76daa9318f452a349d/src/styles/global.css#L6-L124) — tokeny shadcn, `.dark`, `@theme inline`, `bg-cosmic`, base layer
- [`src/layouts/Layout.astro:22-42`](https://github.com/Dawidblocher/MyBrew/blob/89ca68d9f5ecdb3f9b2c7a76daa9318f452a349d/src/layouts/Layout.astro#L22-L42) — body `bg-cosmic`, Banner, AppNav, main
- [`src/components/AppNav.astro:12-127`](https://github.com/Dawidblocher/MyBrew/blob/89ca68d9f5ecdb3f9b2c7a76daa9318f452a349d/src/components/AppNav.astro#L12-L127) — górna nawigacja, wylogowanie, hamburger
- [`src/lib/nav-items.ts:1-47`](https://github.com/Dawidblocher/MyBrew/blob/89ca68d9f5ecdb3f9b2c7a76daa9318f452a349d/src/lib/nav-items.ts#L1-L47) / [`nav-items.test.ts:33-44`](https://github.com/Dawidblocher/MyBrew/blob/89ca68d9f5ecdb3f9b2c7a76daa9318f452a349d/src/lib/nav-items.test.ts#L33-L44) — model nawigacji i przypięte testy
- [`src/pages/recipes/index.astro:47-115`](https://github.com/Dawidblocher/MyBrew/blob/89ca68d9f5ecdb3f9b2c7a76daa9318f452a349d/src/pages/recipes/index.astro#L47-L115) — lista, stany error/empty
- [`src/pages/recipes/[id].astro:16-247`](https://github.com/Dawidblocher/MyBrew/blob/89ca68d9f5ecdb3f9b2c7a76daa9318f452a349d/src/pages/recipes/%5Bid%5D.astro#L16-L247) — szczegóły (80 klas palety)
- [`src/pages/recipes/new.astro:6-11`](https://github.com/Dawidblocher/MyBrew/blob/89ca68d9f5ecdb3f9b2c7a76daa9318f452a349d/src/pages/recipes/new.astro#L6-L11), [`src/pages/recipes/[id]/edit.astro:39-45`](https://github.com/Dawidblocher/MyBrew/blob/89ca68d9f5ecdb3f9b2c7a76daa9318f452a349d/src/pages/recipes/%5Bid%5D/edit.astro#L39-L45) — montaż kreatora
- [`src/components/recipe/RecipeWizard.tsx:19-202`](https://github.com/Dawidblocher/MyBrew/blob/89ca68d9f5ecdb3f9b2c7a76daa9318f452a349d/src/components/recipe/RecipeWizard.tsx#L19-L202) — kroki, gating, zapis, baner, MetricsPanel
- [`src/components/recipe/WizardStepper.tsx:11-93`](https://github.com/Dawidblocher/MyBrew/blob/89ca68d9f5ecdb3f9b2c7a76daa9318f452a349d/src/components/recipe/WizardStepper.tsx#L11-L93) — stepper + stopka
- [`src/components/recipe/MetricsPanel.tsx:8-67`](https://github.com/Dawidblocher/MyBrew/blob/89ca68d9f5ecdb3f9b2c7a76daa9318f452a349d/src/components/recipe/MetricsPanel.tsx#L8-L67) — metryki na żywo
- [`src/lib/recipe-metrics.ts:3-15`](https://github.com/Dawidblocher/MyBrew/blob/89ca68d9f5ecdb3f9b2c7a76daa9318f452a349d/src/lib/recipe-metrics.ts#L3-L15) — deskryptory współdzielone z `RecipeMetricTiles.astro`
- [`src/lib/recipe-queries.ts:7-19`](https://github.com/Dawidblocher/MyBrew/blob/89ca68d9f5ecdb3f9b2c7a76daa9318f452a349d/src/lib/recipe-queries.ts#L7-L19) — `listRecipes` (bez filtrów, bez objętości)
- [`src/components/recipe/StyledSelect.tsx:5-107`](https://github.com/Dawidblocher/MyBrew/blob/89ca68d9f5ecdb3f9b2c7a76daa9318f452a349d/src/components/recipe/StyledSelect.tsx#L5-L107) — własny select z ciemnym shellem
- [`src/components/ui/button.tsx:7-33`](https://github.com/Dawidblocher/MyBrew/blob/89ca68d9f5ecdb3f9b2c7a76daa9318f452a349d/src/components/ui/button.tsx#L7-L33) — `buttonVariants` do rozszerzenia
- [`src/components/auth/FormField.tsx:5-68`](https://github.com/Dawidblocher/MyBrew/blob/89ca68d9f5ecdb3f9b2c7a76daa9318f452a349d/src/components/auth/FormField.tsx#L5-L68), [`SubmitButton.tsx:11-31`](https://github.com/Dawidblocher/MyBrew/blob/89ca68d9f5ecdb3f9b2c7a76daa9318f452a349d/src/components/auth/SubmitButton.tsx#L11-L31) — surowe kontrolki auth
- `context/changes/new-app-design/design-source/*` — rozpakowane źródła prototypu (referencja)

## Architecture Insights

**Proponowana architektura wdrożenia** (do potwierdzenia w `/10x-plan`):

1. **Tokens (`global.css`).** Dodać surowe zmienne palety w `:root` i przemapować zmienne semantyczne shadcn:

   | Zmienna shadcn | Wartość z palety |
   |---|---|
   | `--background` | paper |
   | `--foreground` | ink |
   | `--card`, `--popover` | white `#FBF8F2` |
   | `--primary` | ink |
   | `--primary-foreground` | white |
   | `--secondary`, `--muted` | paper-2 |
   | `--muted-foreground` | ink-3 |
   | `--accent` | paper-3 (hover) |
   | `--destructive` | err |
   | `--border`, `--input` | rule |
   | `--ring` | copper |
   | `--radius` | 4px |

   Do tego:
   - W `@theme inline` dodać `--color-paper-2/3`, `ink-2/3`, `rule-soft`, `copper`, `copper-2`, `hop`, `ok`, `warn`, `chip`, żeby istniały klasy `bg-copper`, `text-ink-3` itd.
   - Dodać `--font-sans`, `--font-serif` i `--font-mono`.
   - Uwaga: przy `--radius: 4px` dostajemy `--radius-sm = calc(4px - 4px) = 0`. Trzeba poprawić formuły.
   - Usunąć `.dark`, `@custom-variant dark` i `bg-cosmic`.

2. **Fonty.** W `astro.config.mjs` ustawić `fonts: [...]` z `fontProviders.google()` dla Fraunces (400–700), IBM Plex Sans (400–600) i IBM Plex Mono (400–500), z subsetami `latin` i `latin-ext`. W `<head>` Layoutu dodać `<Font cssVariable=… preload/>`. Alternatywa: `@fontsource/*`.

3. **`ui/` jako jedyne źródło wyglądu.**
   - `buttonVariants` dostaje warianty `primary` (ink), `copper` i `danger` (lub przemianowany `destructive`) oraz przestylowane `outline` i `ghost`.
   - Nowe komponenty: `badge.tsx` (cva z tonami), `field.tsx` (etykieta mono uppercase + kontrolka + hint + błąd, z `aria-describedby`) i `Input` z propem `unit` (sufiks `aria-hidden`).
   - `SectionTitle`, `StatTile` i `Eyebrow` jako komponenty Astro lub React. Są potrzebne w obu światach: `RecipeMetricTiles.astro` i `MetricsPanel.tsx`. Rozważyć wersję React używaną też w Astro (bez `client:`) — renderuje się statycznie.
   - Zasada: **feature code nie ustawia kolorów palety** — tylko warianty i tokeny. Wtedy znikają 8 kopii `inputClass`, 7 kopii `FieldError` i nadpisania `className` na Button/Label.

4. **Layouty (MPA).** Rozszerzyć `Layout.astro` o prop `shell: "sidebar" | "bare"` albo rozbić na `AppLayout` i `BareLayout`.
   - `AppSidebar.astro` zastępuje `AppNav.astro`. Zachowuje:
     - logikę z `nav-items.ts`,
     - `aria-current="page"`,
     - formularz POST wylogowania,
     - zero JS,
     - wariant mobilny (`<details>` → wysuwany panel lub górny pasek).
   - Wg prototypu widoki receptur i kreator **nie mają sidebara**, tylko własny aside z „Wróć” i marką. W aplikacji nie ma pulpitu, do którego można by wracać — patrz Open Questions.
   - Pułapki z `archive/2026-08-04-app-navigation-shell/plan.md:28-30,67-69`:
     - `html, body { height: 100% }` kontra `sticky`,
     - `backdrop-blur` tworzy stacking context,
     - `overflow-hidden` rodzica łamie `sticky`.

5. **Master-detail receptur.**
   - `RecipeListAside.astro` używany w `/recipes` i `/recipes/[id]`. `[id].astro` robi `Promise.all([listRecipes, getRecipe])`, a aktywna karta to `item.id === Astro.params.id`.
   - `/recipes` pokazuje aside + prawy panel: pusty stan / zachętę albo przekierowanie do najnowszej receptury (decyzja).
   - Zakładki szczegółów: dane są już na stronie, więc wystarczy lekka wyspa `RecipeTabs` lub `?tab=` SSR.
   - Akcje z kart (edycja/usuwanie na hover) przenieść do nagłówka szczegółów.
   - Szczegóły strony 404 muszą zachować kopię używaną przez E2E.

6. **Kreator full-screen.** Strony `new` i `edit` na layoucie `bare`. `RecipeWizard` składa:

   ```
   <aside>
     <WizardStepNav/>   (ol, aria-current="step", hinty)
   <main>
     header (eyebrow „Krok X / N” + h2 serif + link X)
     progress
     <MetricsPanel variant="strip"/>
     step content
     <WizardFooter/>    (status/role=alert, Anuluj, Wstecz, Dalej / Zapisz)
   ```

   - Logika zostaje bez zmian.
   - Klikalne kroki tylko wstecz (do ukończonych), żeby nie omijać gatingu — albo nieklikalne jak dziś.
   - Tryb edycji potrzebuje własnych tekstów („Edycja receptury”).
   - Przyciski ↑↓ w wierszach **zostają** (istniejąca funkcja).

7. **Kolejność faz (propozycja do planu):**
   - F1: tokens + fonty + `ui/` (wizualnie rusza cała aplikacja; klasy palety wciąż ją nadpisują).
   - F2: layouty + sidebar/nawigacja + auth + landing.
   - F3: lista i szczegóły jako master-detail.
   - F4: kreator.
   - F5: sprzątanie (grep na `white/`, `purple-`, `blue-`, `backdrop-blur`, `bg-cosmic`; usunięcie `LibBadge`; `Banner` na tokeny).

   Po każdej fazie `lint` + `build` + `test:run` + ręczny przegląd na 375px i desktopie.

## Historical Context (from prior changes)

- `context/archive/2026-08-04-app-navigation-shell/plan-brief.md:27-42,63`:
  - sticky nav na wszystkich trasach poza `/auth/*`,
  - hamburger CSS-only `<details>`,
  - zero JS w shellu,
  - brak linku „Dashboard”,
  - marka „Beer Recipe Builder”,
  - Layout jest właścicielem `bg-cosmic` + `min-h-screen`.
  - Nowy sidebar powinien zachować te zasady (zero JS, a11y, aktywny link).
- `context/archive/2026-08-04-app-navigation-shell/plan.md:28-30,67-69,212,223-226` — pułapki ze `sticky`, wymagania a11y: polska etykieta hamburgera, focus ring, `aria-current`, 375px.
- `context/changes/product-landing-page/` — `status: implemented`, **niezarchiwizowana**.
  - Przepisała `Welcome.astro` w stylu „cosmic” i traktuje orby i gwiazdy jako tożsamość wizualną (`plan.md:14,20,34,44`).
  - Nowy design ją unieważnia. Warto najpierw zarchiwizować tę zmianę (`/10x-archive product-landing-page`), żeby uniknąć nakładania.
- `context/archive/2026-06-09-saved-recipes-list/plan.md:16,32,94-104` — `METRIC_DESCRIPTORS` wydzielone, „żeby lista, szczegóły i kreator nigdy się nie rozjechały”. Nowe StatTile powinny dalej korzystać z tych deskryptorów.
- `context/archive/2026-05-31-wizard-basics-grist-blg-srm/plan.md:50,245-249` — stepper jako reużywalny shell sterowany tablicą kroków. MetricsPanel zawsze widoczny, poza obszarem kroku (przeniesienie na górę jest z tym zgodne).
- `context/archive/2026-06-05-wizard-mash-hops-ibu/plan.md:45` — zamiast shadcn Select świadomie wybrano natywnie stylowany select. `StyledSelect` zostaje, tylko restyl.
- `context/archive/2026-06-10-recipe-export/plan.md:124-145` — Inter self-hosted tylko dla PDF.
- `context/foundation/test-plan.md:68,81` — zero testów komponentów, odrzucone snapshoty UI.
- `context/foundation/roadmap.md:193` — „trzymać zmianę w warstwie layoutu, nie dotykać logiki stron”. Brak slice'u redesignu w roadmapie. S-09 (landing) wciąż oznaczony jako `planned` (`:207`), choć wdrożony.
- `context/foundation/prd.md:108` — główny język UI to polski. Brak wymagań wizualnych.

## Gap analysis: element prototypu → dane w aplikacji

Legenda: **Keep** = jest i przenosimy; **Adapt** = istnieje w innej formie; **Drop** = brak danych lub funkcji, poza zakresem „bez dodatków”.

| Obszar | Element prototypu | Decyzja | Uwagi |
|---|---|---|---|
| Shell | Sidebar 232px, NavItem z ikoną | Adapt | `NavItem` + pole `icon` (lucide); aktualizacja `nav-items.test.ts` |
| Shell | Logo growlera + „myGrowl” + tagline | Drop / Adapt | Zostaje tekst „Beer Recipe Builder” (bez brandingu) |
| Shell | Licznik receptur w nav | Drop | Wymagałby zapytania `count` na każdej stronie |
| Shell | Pulpit, Surowce, Protokół, karta aktywnej warki | Drop | Brak funkcji |
| Shell | Blok usera: awatar z inicjałem, nazwa | Adapt | Inicjał i nazwa z e-maila; przycisk języka → „Wyloguj” (POST) |
| Lista | Nagłówek, licznik, przycisk „Nowa receptura” | Keep | `items.length` |
| Lista | Wyszukiwarka, chipy stylów | **Otwarte** | Nowa funkcja (filtr klienta) — patrz Open Questions |
| Lista | Karta: nazwa serif, styl mono, ABV, IBU | Keep | |
| Lista | Karta: EBC + swatch, vol | Adapt / Drop | Swatch = „wykres” (wykluczony); vol wymaga rozszerzenia `listRecipes` → pokazać BLG / Barwa (SRM) / IBU / ABV z `RecipeMetricTiles compact` |
| Szczegóły | Badge stylu, H1 serif, meta | Keep | Meta: „Ostatnio edytowano” (`updatedAt`) zamiast opisu |
| Szczegóły | Badge wersji / BJCP, opis, Duplikuj, „Rozpocznij warzenie” | Drop | Brak danych i funkcji |
| Szczegóły | Akcje: Eksport, Edytuj | Keep | JSON + PDF, Edytuj; główna akcja copper = „Edytuj”? Usuń zostaje (danger) |
| Szczegóły | StatTile OG / FG / EBC | Drop | Zostają 4 metryki z `METRIC_DESCRIPTORS` + objętość (`data.batch.volumeL`) |
| Szczegóły | Zakładki | Adapt | Przegląd, Zasyp, Zacieranie, Chmiel, Drożdże, **Dodatki**. Bez Wody, Fermentacji i Historii. % zasypu liczony z kg; przerwy bez nazw („Przerwa 1…”); chmiel wg `HOP_STAGE_LABELS` |
| Szczegóły | Wykres zacierania, oś chmielu | Drop | Wykluczone przez użytkownika |
| Kreator | Grid 260px + 1fr bez shella | Adapt | Layout `bare` |
| Kreator | Stepper-aside z kółkami i hintami | Adapt | Hinty dopisać do `WIZARD_STEPS` |
| Kreator | Kroki Woda, Podgląd | Drop | Zostaje 6 kroków z Dodatkami |
| Kreator | Nagłówek „Krok X / N”, X, pasek postępu | Adapt | X / Anuluj → `/recipes` lub `/recipes/{id}` |
| Kreator | Pasek metryk na górze | Adapt | 4 metryki; bez OG / FG / BU:GU, zakresów BJCP i swatcha |
| Kreator | Stopka ze statusem | Adapt | Status z `saveErrors` / `genericSaveError`, `role="alert"` zachowany |
| Kreator | „Dodaj z magazynu”, presety zacierania, style BJCP | Drop | Brak danych (nowe funkcje) |
| Kreator | Wiersz składnika jako grid z jednostkami | Adapt | Zachować ↑↓✕, id, `htmlFor`, `aria-invalid`, błędy per wiersz; na mobile fallback do stacku |
| Auth | (brak w prototypie) | Adapt | Karta paper + serif H1, copper submit; FormField / SubmitButton przez `ui/` |
| Landing | (brak w prototypie) | Adapt | Reskin `Welcome.astro` w nowym języku wizualnym (bez orbów) |

## Open Questions

1. **Nawigacja wg prototypu vs. aplikacja.** W prototypie sidebar istnieje dla Pulpitu, Surowców i Protokołu, a receptury i kreator go ukrywają. W aplikacji zostają tylko `/`, `/dashboard` (placeholder), receptury i kreator. Opcje:
   - (a) sidebar tylko na `/` i `/dashboard`, receptury z aside'em wg prototypu (przycisk „Wróć” do `/`);
   - (b) **receptury jako główny ekran z sidebarem obok listy** (3 kolumny);
   - (c) zwinięty sidebar-rail (ikony) + aside listy.

   Dodatkowo: co z `/dashboard` — usunąć, przekierować na `/recipes`, czy zostawić?
2. **Wyszukiwarka i chipy stylów w aside** — to element layoutu, ale technicznie nowa funkcja (filtr po stronie klienta). Wchodzi czy nie?
3. **Swatch koloru EBC** — przypisany do „wykresów”, które wykluczono, ale jest mocnym elementem identyfikacji listy i szczegółów. Potwierdzić, że wypada (wymaga helpera SRM → hex).
4. **Tłumaczenie auth na polski** (`SignInForm`, `SignUpForm`, `PasswordToggle`, strony auth, `dashboard.astro`) — to zmiana kopii, nie designu, ale naturalnie wypada przy reskinie. PRD wymaga polskiego UI.
5. **Kopia przycisków:** „Zapisz przepis” → „Zapisz recepturę”, „Twoje przepisy” → „Receptury” itd. Prototyp używa słowa „receptura”, aplikacja „przepis”. Ujednolicać? Uwaga na E2E („Nie znaleziono przepisu”) i `nav-items.test.ts`.
6. **`/recipes` bez wybranej receptury:** pusty panel z zachętą czy przekierowanie do najnowszej?
7. **Klikalne kroki kreatora:** tylko wstecz (bezpieczne), czy wcale (jak dziś)?
8. **Responsywność:** prototyp jest tylko desktopowy (stałe gridy 232 / 360 / 260 px). Jak ma się zachowywać na mobile (<640px)? Obecny shell wspiera 375px.
9. **PDF** zostaje w obecnym stylu (Inter) — potwierdzić, że poza zakresem.
10. **`product-landing-page`** — zarchiwizować przed startem implementacji?
