# Nowy design aplikacji (paper / ink / copper) — Implementation Plan

## Overview

Przeskinowujemy całą istniejącą aplikację (shell, lista i szczegóły przepisu, kreator new/edit, auth, landing) na język wizualny prototypu `design-app-example.html` (źródła: `context/changes/new-app-design/design-source/`). Paleta paper/ink/copper, typografia Fraunces + IBM Plex Sans/Mono, rail ikon zamiast górnego paska, przepisy jako master-detail, kreator full-screen ze stepperem po lewej i paskiem metryk na górze. Logika biznesowa (kalkulacje, walidacja, zapis, API, RLS) zostaje nietknięta. Przy okazji: polskie teksty w auth (wymóg PRD `prd.md:108`), swatch koloru piwa i wyszukiwarka w liście przepisów.

## Current State Analysis

Pełna analiza: `context/changes/new-app-design/research.md`. Najważniejsze:

- Obecny styl „cosmic glassmorphism” jest wpisany na sztywno: **494 klasy palety Tailwind w 38 plikach** (`white/10`, `blue-100/80`, `purple-*`, `backdrop-blur-xl`, gradient `bg-clip-text`). Tokeny shadcn w `src/styles/global.css:6-39` to stockowy neutral, prawie wszędzie nadpisywany. Samo przemapowanie tokenów nie przeskinuje aplikacji — trzeba przejść plik po pliku.
- Jeden `src/layouts/Layout.astro` (`bg-cosmic`, `Banner`, `AppNav`, `main`) bez wariantów. `AppNav.astro` to górny sticky header, zero JS, hamburger `<details>`, ukryty na `/auth/*`.
- Warstwa `ui/` jest szczątkowa: `inputClass` skopiowany 8×, `FieldError` 7×, `Label` zawsze z nadpisaniem koloru, `card.tsx` i `LibBadge.astro` nieużywane.
- Brak fontów webowych. Astro 6.3.1 ma stabilne Fonts API (`fonts` w configu, `fontProviders`, `<Font/>` z `astro:assets`).
- Kreator (`RecipeWizard.tsx`) renderuje `WizardStepper` (poziome kroki + stopka) → baner błędów → `MetricsPanel` na dole. Logika (`handleNext`, `handleSave`, `stepForField`, `applySaveErrors`) jest niezależna od kompozycji.
- Testy: tylko logika (Vitest, `environment: node`). `nav-items.test.ts:33,40` przypina `SIGNED_IN_NAV_ITEMS`/`GUEST_NAV_ITEMS` przez `toEqual`. E2E (Playwright, Desktop Chrome 1280px) sprawdza przekierowania gości oraz nagłówki na `/recipes/[id]` (`idor-mutations.spec.ts:87,102,103,115`).
- Auth: UI po angielsku (`SignInForm`, `SignUpForm`, `PasswordToggle`, strony `/auth/*`), a API przekazuje surowe `error.message` z Supabase w query (`src/pages/api/auth/signin.ts:18`, `signup.ts:18`).

## Desired End State

- Cała aplikacja w jasnej palecie paper/ink/copper, z fontami Fraunces (tytuły, liczby), IBM Plex Sans (body), IBM Plex Mono (eyebrow, jednostki), promień 4px. Zero klas starej palety w `src/`.
- Strony zalogowane (lg+): pionowy rail ikon (marka, Przepisy, Nowy przepis, awatar + Wyloguj). Poniżej lg: górny pasek z menu `<details>`. Goście: górny pasek z marką i Zaloguj/Zarejestruj.
- `/recipes` i `/recipes/[id]`: aside 360px z listą (swatch, nazwa, styl, mini-metryki, wyszukiwarka) + panel po prawej (zachęta albo szczegóły). Szczegóły: nagłówek z akcjami, pasek StatTile + swatch, sticky pasek kotwic do sekcji. Poniżej lg: sama lista albo same szczegóły.
- `/recipes/new` i `/recipes/[id]/edit`: full-screen bez raila; pionowy stepper z hintami (klikalne ukończone kroki), nagłówek „Krok X / 6” + X, pasek postępu, pasek metryk, treść kroku, stopka ze statusem i przyciskami.
- `/auth/*` po polsku, z polskimi komunikatami błędów. Landing przeskinowany bez orbów. `/dashboard` przekierowuje na `/recipes`.
- Weryfikacja: `npm run lint`, `npm run build`, `npm run test:run` zielone; E2E bez zmian w asercjach; ręczny przegląd każdego ekranu na 375px i 1280px+.

### Key Discoveries:

- `src/styles/global.css:75-79` — radiusy liczone jako `calc(var(--radius) - 4px)`; przy `--radius: 4px` `--radius-sm` spada do 0.
- `src/layouts/Layout.astro:22` — `bg-cosmic` na `body` przykrywa `bg-background` z base layer; dopóki jest, tło zostaje ciemne.
- `tests/idor-mutations.spec.ts:87,102` — `getByRole("heading", { name: nameB })` na Desktop Chrome 1280px. W master-detail aside z listą jest widoczny, więc **nazwy przepisów w kartach aside nie mogą być nagłówkami** (strict mode złapie dwa elementy).
- `tests/idor-mutations.spec.ts:103,115` — nagłówek „Nie znaleziono przepisu” musi zostać na 404 szczegółów.
- `src/lib/nav-items.test.ts:33,40` — `toEqual` na tablicach nawigacji; dodanie pola `icon` wymaga aktualizacji oczekiwań.
- `src/lib/recipe-metrics.ts:5-15` — `METRIC_DESCRIPTORS` współdzielone przez listę, szczegóły i kreator (`archive/2026-06-09-saved-recipes-list/plan.md:16`). Nowe StatTile i pasek metryk mają z nich korzystać.
- `archive/2026-08-04-app-navigation-shell/plan.md:28-30,67-69` — `overflow-hidden` rodzica i `backdrop-blur` łamią `sticky`; shell ma zostać zero-JS z `aria-current`.
- `archive/2026-06-05-wizard-mash-hops-ibu/plan.md:45` — `StyledSelect` wybrany świadomie zamiast shadcn Select; tylko restyl.
- `context/foundation/lessons.md` — `validateWizardStep` musi dalej mapować błędy tablic na wiersze (nie ruszamy), zielony lint ≠ poprawne typy (nie dokładamy `tsc` jako bramki).

## What We're NOT Doing

- Ciemny motyw, motyw „swiss”, gęstość `compact`, i18n/EN, branding „myGrowl” (zostaje „Beer Recipe Builder”).
- Nowe funkcje z prototypu: Pulpit, Surowce, Protokół warzenia, karta aktywnej warki, licznik w nawigacji, wersje/BJCP, woda, fermentacja, historia, OG/FG/BU:GU, zakresy stylu, „Dodaj z magazynu”, presety zacierania, Duplikuj, „Rozpocznij warzenie”, kroki Woda i Podgląd.
- Wykresy (profil zacierania, oś chmielenia). Swatch koloru to nie wykres — wchodzi.
- Chipy stylów w aside (tylko wyszukiwarka).
- Zmiana terminologii „przepis” → „receptura”.
- Prawdziwe zakładki przełączające treść (są kotwice).
- Przeskakiwanie do przyszłych kroków kreatora.
- Zmiany w logice: `useWizardRecipe.ts`, `wizard-step-validation.ts`, `recipe-schema.ts`, `recipe-save.ts`, `recipe-labels.ts`, `src/lib/calc/*`, API recipes, migracje.
- PDF (`RecipePdf.tsx`, Inter) — niezależny od CSS, zostaje.
- Testy komponentów / snapshoty UI (odrzucone w `test-plan.md:81`).
- Bramka `tsc --noEmit` (osobna zmiana, `lessons.md`).

## Implementation Approach

Od dołu do góry: najpierw tokeny, fonty i warstwa `ui/` jako jedyne źródło wyglądu; potem shell; potem ekrany od najprostszych do najbardziej złożonych (kreator dzielony na kompozycję i wiersze); na końcu grep-bramka na resztki starej palety. **Zasada dla feature code: nie ustawia kolorów palety wprost** — używa wariantów `ui/` i klas tokenów (`bg-paper-2`, `text-ink-3`, `border-rule`, `bg-copper`). Ma to usunąć kopie `inputClass`/`FieldError` i nadpisania `className` na `Button`/`Label`.

Prototyp to SPA; aplikacja zostaje MPA z SSR. Master-detail to wspólny komponent aside renderowany na dwóch trasach; kotwice zamiast tabów; rail i menu mobilne bez JS. Jedyne nowe wyspy React: wyszukiwarka listy (Faza 3) i kreator (już jest wyspą).

## Critical Implementation Details

**Stan przejściowy między fazami.** Od Fazy 2 (usunięcie `bg-cosmic`) do Fazy 5 niezmigrowane ekrany mają białe teksty na jasnym tle — są nieczytelne. Nie deployować produkcyjnie pomiędzy Fazą 2 a Fazą 5 (albo pracować na gałęzi i mergować po Fazie 5/6).

**Sticky i przewijanie.** Przewija się okno, nie wewnętrzne kontenery. Aside listy, rail i aside kreatora: `sticky top-0 h-dvh overflow-y-auto`. Żaden rodzic nie może mieć `overflow-hidden` ani `backdrop-blur` (łamią `sticky`). Pasek kotwic w szczegółach i stopka kreatora (`sticky bottom-0`) zależą od tego samego.

**E2E a master-detail.** W kartach aside nazwa przepisu to `<span>`/`<p>`, nie `h2`/`h3`. Jedynym nagłówkiem z nazwą przepisu na `/recipes/[id]` jest `h1` w panelu szczegółów. Na 404 szczegółów `h1` „Nie znaleziono przepisu” zostaje.

**Fokus w kreatorze.** Przy zmianie kroku (Dalej, Wstecz, klik w stepperze, skok po błędzie zapisu) fokus przechodzi na nagłówek kroku (`h2` z `tabIndex={-1}`), chyba że `applySaveErrors` już ustawił fokus na polu z błędem (`shouldFocus`) — wtedy nie nadpisywać.

## Phase 1: Fundament — tokeny, fonty, warstwa `ui/`

### Overview

Wprowadza paletę, fonty i prymitywy UI. Wizualnie aplikacja jeszcze się prawie nie zmienia (`bg-cosmic` i klasy palety nadal wygrywają), ale wszystkie klocki dla kolejnych faz są gotowe.

### Changes Required:

#### 1. Design tokens

**File**: `src/styles/global.css`

**Intent**: Zastąpić stockowe tokeny shadcn paletą z `design-source/tokens.css` (tylko motyw jasny), wystawić dodatkowe kolory i fonty jako klasy Tailwind, naprawić radiusy, usunąć martwy `.dark`.

**Contract**:
- `:root` — surowe zmienne: `--paper`, `--paper-2`, `--paper-3`, `--ink`, `--ink-2`, `--ink-3`, `--rule`, `--rule-soft`, `--copper`, `--copper-2`, `--hop`, `--ok`, `--warn`, `--err`, `--chip`, `--chip-ink`, `--white` (#FBF8F2), `--shadow`, `--radius: 4px`.
- Mapowanie semantyczne shadcn: `--background` paper, `--foreground` ink, `--card`/`--popover` white, `--primary` ink, `--primary-foreground` white, `--secondary`/`--muted` paper-2, `--muted-foreground` ink-3, `--accent` paper-3, `--accent-foreground` ink, `--destructive` err, `--border`/`--input` rule, `--ring` copper. `--chart-*` i `--sidebar-*` usunąć (wraz z mapowaniem w `@theme inline`) — nic ich nie używa.
- `@theme inline`: dodać `--color-paper`, `--color-paper-2`, `--color-paper-3`, `--color-ink`, `--color-ink-2`, `--color-ink-3`, `--color-rule`, `--color-rule-soft`, `--color-copper`, `--color-copper-2`, `--color-hop`, `--color-ok`, `--color-warn`, `--color-err`, `--color-chip`, `--color-chip-ink`, `--color-white` (nadpisuje Tailwindowe `white`); `--font-sans`, `--font-serif`, `--font-mono` wskazujące na zmienne z Astro Fonts z fallbackami (`system-ui, sans-serif` / `Georgia, serif` / `ui-monospace, monospace`); `--shadow-card: var(--shadow)`.
- Radiusy: żaden nie może wyjść ≤ 0 (np. `sm` 2px, `md` = `--radius`, `lg` `--radius` + 2px, `xl` `--radius` + 4px).
- Usunąć `@custom-variant dark` i blok `.dark`. `bg-cosmic` **zostaje** do Fazy 2.
- Base layer: `body` → `font-sans text-sm leading-[1.45] antialiased`; `:focus-visible` → outline 2px copper, offset 2px.

#### 2. Fonty

**File**: `astro.config.mjs`, `src/layouts/Layout.astro`

**Intent**: Self-hostowane fonty pobierane w buildzie (działa na Cloudflare Workers bez requestów runtime do Google), z polskimi znakami.

**Contract**: `fonts: [...]` z `fontProviders.google()` dla Fraunces (400–700, `cssVariable: "--font-fraunces"`), IBM Plex Sans (400, 500, 600, `--font-plex-sans`), IBM Plex Mono (400, 500, `--font-plex-mono`); `subsets: ["latin", "latin-ext"]` dla każdego. W `<head>` Layoutu `<Font cssVariable=… />` dla każdego fontu, `preload` tylko dla Plex Sans 400.

#### 3. Button

**File**: `src/components/ui/button.tsx`

**Intent**: Warianty z prototypu (`design-source/shared.jsx:67-102`), żeby feature code nie nadpisywał kolorów przez `className`.

**Contract**: `variant`: `default` (outline na white, ink), `primary` (ink/white), `copper` (copper/white, hover copper-2), `outline`, `ghost`, `danger` (err), `link`; `destructive` zostaje jako alias `danger` do końca Fazy 6 (potem usunąć, jeśli nieużywany). `size`: `sm`, `default`, `icon`, `icon-sm` (32px, dla ↑↓✕ w wierszach). Radius `rounded-md` (4px), bez `shadow-xs`, bez klas `dark:`.

#### 4. Nowe prymitywy

**Files**: `src/components/ui/badge.tsx`, `src/components/ui/field.tsx`, `src/components/ui/input.tsx`, `src/components/ui/label.tsx`, `src/components/ui/eyebrow.tsx`, `src/components/ui/section-title.tsx`, `src/components/ui/stat-tile.tsx`, `src/components/ui/color-swatch.tsx`, `src/components/ui/dialog.tsx`

**Intent**: Jedno źródło wyglądu dla list, szczegółów, kreatora i auth. Komponenty React bez `client:` renderują się w Astro statycznie, więc jedna implementacja obsługuje oba światy.

**Contract**:
- `Badge` — cva z tonami `neutral|ok|warn|err|ink|copper|hop`, mono uppercase 10–11px (`shared.jsx:104-132`).
- `Label` — domyślnie mono uppercase 10–11px, `tracking-[0.08em]`, `text-ink-3`.
- `Input` — tokeny (bg white, border rule, focus ring copper, `aria-invalid` → border err); nowy opcjonalny prop `unit?: string` renderuje sufiks `aria-hidden` wewnątrz ramki (`shared.jsx:161-172`). Bez `unit` zachowuje obecny kontrakt.
- `Field` — `{ id, label, hint?, error?, children }`: renderuje `Label htmlFor={id}`, kontrolkę, hint i błąd; błąd ma `id={`${id}-error`}`, a `Field` przekazuje/wymaga `aria-describedby` na kontrolce (implementer wybiera mechanizm: render-prop albo `cloneElement`). Zastępuje lokalne `FieldError`.
- `Eyebrow` — mono uppercase 9–11px, `text-ink-3`.
- `SectionTitle` — `{ eyebrow?, title, as?: "h1"|"h2"|"h3", right?: ReactNode }`, tytuł serif.
- `StatTile` — `{ label, value, unit, placeholder?: boolean }`, wartość serif `tabular-nums`, placeholder w `text-ink-3/40`.
- `ColorSwatch` — `{ srm: number, size?: "sm"|"md"|"lg" }`, tło z `srmToHex`, `aria-hidden`, obramowanie rule; dla niefinitywnego SRM neutralny paper-3.
- `dialog.tsx` — overlay `bg-ink/40`, content na white/border rule, bez klas `dark:`.

#### 5. Helper SRM → kolor

**File**: `src/lib/srm-color.ts` (+ `src/lib/srm-color.test.ts`)

**Intent**: Czysta funkcja do swatcha na liście, w szczegółach i w pasku metryk kreatora.

**Contract**: `srmToHex(srm: number): string` — tabela standardowa SRM 1–40 (interpolacja do najbliższej całkowitej), clamp poniżej 1 i powyżej 40, `NaN`/`Infinity` → kolor neutralny (stała eksportowana). Testy: wartości brzegowe, clamp, NaN, kilka punktów tabeli.

### Success Criteria:

#### Automated Verification:

- Lint przechodzi: `npm run lint`
- Build przechodzi (fonty pobrane, brak błędów configu): `npm run build`
- Testy jednostkowe przechodzą (w tym nowe `srm-color.test.ts`): `npm run test:run`
- W `dist/` są pliki fontów z zakresem latin-ext (np. `ls dist/**/_astro/fonts/` niepuste)

#### Manual Verification:

- `npm run dev`: aplikacja działa jak wcześniej (nadal ciemna), bez błędów w konsoli; w DevTools `body` ma font IBM Plex Sans
- Polskie znaki (ąęłńóśźż) renderują się fontem webowym, nie fallbackiem

**Implementation Note**: Po zakończeniu fazy i zielonej weryfikacji automatycznej zatrzymaj się na ręczne potwierdzenie przed kolejną fazą.

---

## Phase 2: Shell, auth, landing, dashboard

### Overview

Nowy layout z railem / górnym paskiem, jasne tło globalnie, przeskinowane i przetłumaczone auth, nowy landing, przekierowanie `/dashboard`.

### Changes Required:

#### 1. Layout z wariantami

**File**: `src/layouts/Layout.astro`

**Intent**: Jeden layout z dwoma wariantami shella; usunięcie `bg-cosmic`.

**Contract**: prop `shell?: "app" | "bare"` (domyślnie `"app"`). `"app"`: lg+ grid `[64px_1fr]` z `AppRail` (zalogowani) albo górny pasek (goście i < lg); `"bare"`: tylko `Banner` + `<slot/>` (kreator, auth). Body `bg-background text-foreground min-h-dvh`. Usunąć `@utility bg-cosmic` z `global.css`. Zachować `lang="pl"`, `Banner` dla `missingConfigs`.

#### 2. Nawigacja

**Files**: `src/components/AppRail.astro` (nowy), `src/components/AppTopBar.astro` (nowy), `src/components/AppNav.astro` (usunąć), `src/lib/nav-items.ts`, `src/lib/nav-items.test.ts`

**Intent**: Rail ikon wg `design-source/app.jsx:46-140` przełożony na wąski wariant; na mobile i dla gości górny pasek. Zero JS, logika aktywnego linku bez zmian.

**Contract**:
- `NavItem` dostaje `icon: NavIconKey` (unia stringów, np. `"recipes" | "new-recipe" | "signin" | "signup"`); mapowanie klucz → komponent `lucide-react` żyje w komponentach Astro, nie w `nav-items.ts` (lib zostaje wolny od Reacta). Etykiety i hrefy bez zmian. `nav-items.test.ts` aktualizuje oczekiwania o pole `icon`.
- `AppRail` (lg+, zalogowani): na górze marka (ikona, link `/`, `aria-label="Beer Recipe Builder — strona główna"`), potem pozycje `SIGNED_IN_NAV_ITEMS` jako ikony 40px z widoczną etykietą-tooltipem na hover/focus (CSS) i `sr-only` tekstem; aktywna = bg white + lewa krawędź 2px copper + `aria-current="page"` (`resolveActiveHref`). Na dole: awatar z inicjałem e-maila (`title` = e-mail) i formularz POST `/api/auth/signout` z przyciskiem ikonowym `aria-label="Wyloguj się"`. Tło paper-2, prawa krawędź rule, `sticky top-0 h-dvh`.
- `AppTopBar` (goście zawsze; zalogowani < lg): marka „Beer Recipe Builder” (serif), dla gości linki Zaloguj/Zarejestruj; dla zalogowanych menu `<details>` (wzorzec z obecnego `AppNav.astro:71-127`, polska etykieta przycisku, focus ring, `aria-current`) z pozycjami nawigacji, e-mailem i Wyloguj.
- `isNavSuppressedPath` przestaje być potrzebny (jedynym użyciem był `AppNav.astro:12`, a auth używa `shell="bare"`) — usunąć funkcję i jej `describe` w `nav-items.test.ts`.

#### 3. Banner

**File**: `src/components/Banner.astro`

**Intent**: Hexy w scoped CSS (`:14-41`) → tokeny (`err`/`warn` na paper).

**Contract**: API komponentu bez zmian.

#### 4. Auth — reskin i tłumaczenie

**Files**: `src/pages/auth/signin.astro`, `src/pages/auth/signup.astro`, `src/pages/auth/confirm-email.astro`, `src/components/auth/{SignInForm,SignUpForm,FormField,PasswordToggle,SubmitButton,ServerError}.tsx`, `src/lib/auth-errors.ts` (nowy, + test), `src/pages/api/auth/{signin,signup}.ts`

**Intent**: Strony na `shell="bare"`: wyśrodkowana karta (white, border rule, shadow), marka nad kartą, `h1` serif, submit `copper`. Wszystkie teksty po polsku (tytuły stron, etykiety, placeholdery, walidacja klienta, `aria-label` w `PasswordToggle`, stany „Logowanie…”, linki między stronami). `FormField` na prymitywach `Field`/`Input`/`Label`, `SubmitButton` na `Button variant="copper"`.

**Contract**: `toPolishAuthError(message: string): string` — mapuje znane komunikaty Supabase (m.in. „Invalid login credentials”, „User already registered”, „Email not confirmed”, „Password should be at least 6 characters”, „Supabase is not configured”) na polskie; nieznane → ogólny polski komunikat. Wywoływane w API routes przed `encodeURIComponent` w redirectcie. Testy jednostkowe na mapowanie i fallback.

#### 5. Landing

**File**: `src/components/Welcome.astro`, `src/pages/index.astro`

**Intent**: Reskin hero w nowym języku: eyebrow mono, duży tytuł serif, opis, CTA `copper` (zalogowani → „Twoje przepisy”, goście → Zarejestruj/Zaloguj — zachować obecną logikę CTA), kilka kart cech na white/border rule. Bez orbów, gwiazd i gradientów. Treść merytoryczna z obecnego `Welcome.astro` zostaje.

**Contract**: `index.astro` na `shell="app"`.

#### 6. Dashboard

**Files**: `src/pages/dashboard.astro`, `CLAUDE.md`

**Intent**: Martwy placeholder zamieniony na przekierowanie; trasa zostaje w `PROTECTED_ROUTES`.

**Contract**: `dashboard.astro` zwraca `Astro.redirect("/recipes")`. W `CLAUDE.md` przykład strony chronionej wskazuje `src/pages/recipes/index.astro`.

### Success Criteria:

#### Automated Verification:

- Lint przechodzi: `npm run lint`
- Build przechodzi: `npm run build`
- Testy jednostkowe przechodzą (zaktualizowany `nav-items.test.ts`, nowy `auth-errors.test.ts`): `npm run test:run`
- Brak odwołań do `AppNav` i `bg-cosmic`: `grep -rn "AppNav\|bg-cosmic" src` zwraca pusto
- E2E przekierowań gości przechodzi: `npm run test:e2e -- tests/auth-read-boundary.spec.ts` (wymaga lokalnego Supabase)

#### Manual Verification:

- Zalogowany, 1280px: rail widoczny, aktywna pozycja podświetlona, tooltip na hover i focus, Wyloguj działa
- Zalogowany, 375px: górny pasek, menu `<details>` otwiera się klawiaturą, brak poziomego scrolla
- Gość na `/`: górny pasek z Zaloguj/Zarejestruj, landing w nowym stylu
- `/auth/signin` i `/auth/signup`: całość po polsku, błędne hasło pokazuje polski komunikat, rejestracja istniejącego e-maila pokazuje polski komunikat
- `/dashboard` przekierowuje na `/recipes`; gość na `/dashboard` → `/auth/signin`
- Nawigacja klawiaturą: widoczny copper focus ring na wszystkich elementach shella

**Implementation Note**: Po zakończeniu fazy i zielonej weryfikacji automatycznej zatrzymaj się na ręczne potwierdzenie. Uwaga: ekrany przepisów i kreatora są w tej fazie nieczytelne (białe teksty na jasnym tle) — to oczekiwane.

---

## Phase 3: Przepisy — master-detail

### Overview

Lista i szczegóły jako układ master-detail wg `design-source/recipes.jsx`, z wyszukiwarką i swatchem.

### Changes Required:

#### 1. Aside z listą

**Files**: `src/components/recipe/RecipeListAside.astro` (nowy), `src/components/recipe/RecipeListSearch.tsx` (nowy, wyspa)

**Intent**: Wspólny aside dla `/recipes` i `/recipes/[id]` (`recipes.jsx:24-109`, bez chipów i bez „Wróć”).

**Contract**:
- `RecipeListAside.astro` props: `{ state: "error" | "empty" | "list", items: RecipeListItem[], activeId?: string }`. Układ: eyebrow „Biblioteka”, `h1`/`h2` „Twoje przepisy” (serif) + licznik (`items.length`), wyspa wyszukiwarki z listą, stopka z „Nowy przepis” (`Button asChild variant="primary"` → `/recipes/new`). Tło paper-2, prawa krawędź rule, lg+: `sticky top-0 h-dvh overflow-y-auto`, szerokość 360px.
- `RecipeListSearch` (`client:load`) props: `{ items: RecipeListItem[], activeId?: string }`. SSR renderuje pełną listę (działa bez JS); po hydracji pole „Szukaj przepisu” (label `sr-only`) filtruje po `name` i `style` (case-insensitive, `toLocaleLowerCase("pl")`, trim). Brak wyników → „Brak przepisów pasujących do wyszukiwania”. Lista to `<ul>` z `<li><a href="/recipes/{id}">`; aktywny element `aria-current="page"`, bg white + lewa krawędź copper.
- Karta: `ColorSwatch` (srm), nazwa serif jako `<span>` (**nie nagłówek**), styl mono, mini-metryki z `METRIC_DESCRIPTORS` (etykieta + wartość `formatMetricValue`).

#### 2. `/recipes`

**File**: `src/pages/recipes/index.astro`

**Intent**: Master-detail bez wybranego przepisu.

**Contract**: lg+: `RecipeListAside` + prawy panel z zachętą („Wybierz przepis z listy albo utwórz nowy”, CTA copper „Nowy przepis”); przy `empty` panel pokazuje pusty stan z CTA, przy `error` panel pokazuje obecny komunikat błędu (tokeny err). < lg: tylko aside na pełną szerokość (panel ukryty). Znikają ikonki edycji/usuwania z kart (akcje są w szczegółach). Tytuł strony bez zmian.

#### 3. `/recipes/[id]`

**File**: `src/pages/recipes/[id].astro`, `src/components/recipe/RecipeMetricTiles.astro`

**Intent**: Szczegóły wg `recipes.jsx:153-238` z danymi, które mamy.

**Contract**:
- Frontmatter: `Promise.all([listRecipes(...), getRecipe(...)])`; błąd listy nie blokuje szczegółów (aside w stanie `error`).
- lg+: aside z `activeId = id` + panel; < lg: sam panel z linkiem „← Wszystkie przepisy”.
- Nagłówek (paper-2, border-bottom rule): `Badge` ze stylem, `h1` serif ~44px z `record.name` (jedyny nagłówek z nazwą), meta „Ostatnio edytowano: …” (obecny formatter), akcje: `RecipeExportActions` (outline sm), `DeleteRecipeDialog` (ghost/danger sm), „Edytuj” (`copper`, link).
- Pasek statystyk: `RecipeMetricTiles` przepisany na `StatTile` (API `{ metrics, compact? }` bez zmian, dalej na `METRIC_DESCRIPTORS`) + kafel „Objętość” (`data.batch.volumeL` L) + `ColorSwatch size="lg"`.
- Sticky pasek kotwic (`<nav aria-label="Sekcje przepisu">`, `sticky top-0`, bg paper, podkreślenie copper na hover/focus): Przegląd, Zasyp, Zacieranie, Chmiel, Drożdże, Dodatki → `#przeglad`, `#zasyp`, `#zacieranie`, `#chmiel`, `#drozdze`, `#dodatki`. Sekcje z `scroll-mt-*` ≥ wysokość paska.
- Sekcje jako karty (white, border rule, `SectionTitle` z `h2`): Przegląd (nazwa, styl, objętość), Zasyp (tabela: nazwa, kg, % zasypu liczone z sumy kg, EBC, ekstrakt), Zacieranie (wydajność, stosunek wody; przerwy jako lista „Przerwa N · temp · czas”), Chmiel (tabela z `HOP_STAGE_LABELS`), Drożdże (`dl`), Dodatki (lista z `ADJUNCT_STAGE_LABELS` i notatkami). Puste listy → „brak”. Tabele z `<th scope="col">`, na < sm zawijane w `overflow-x-auto` na poziomie tabeli, nie strony.
- 404: `h1` „Nie znaleziono przepisu”, opis i link „Wróć do listy” bez zmian treści — tylko nowy styl (karta na paper, `shell="app"`).

#### 4. Akcje

**Files**: `src/components/recipe/RecipeExportActions.tsx`, `src/components/recipe/DeleteRecipeDialog.tsx`

**Intent**: Usunąć nadpisania kolorów, użyć wariantów `Button`. `DeleteRecipeDialog`: jeśli `variant="icon"` nie ma już użyć, usunąć ten wariant.

**Contract**: Props bez zmian (poza ewentualnym usunięciem `variant`). Teksty bez zmian.

### Success Criteria:

#### Automated Verification:

- Lint przechodzi: `npm run lint`
- Build przechodzi: `npm run build`
- Testy jednostkowe przechodzą: `npm run test:run`
- E2E bez zmian w asercjach przechodzi: `npm run test:e2e` (wymaga lokalnego Supabase)
- Brak klas starej palety w plikach fazy: `grep -nE "white/|blue-[0-9]|purple-|backdrop-blur|bg-clip-text" src/pages/recipes/index.astro "src/pages/recipes/[id].astro" src/components/recipe/RecipeMetricTiles.astro src/components/recipe/RecipeExportActions.tsx src/components/recipe/DeleteRecipeDialog.tsx` zwraca pusto

#### Manual Verification:

- 1280px: `/recipes` pokazuje aside + zachętę; klik w kartę → szczegóły z podświetloną kartą; aside przewija się niezależnie, gdy lista jest długa
- Wyszukiwarka filtruje po nazwie i stylu (polskie znaki, wielkość liter), pokazuje stan „brak wyników”; bez JS lista jest pełna
- Kotwice przewijają do sekcji, nagłówek sekcji nie chowa się pod sticky paskiem
- Swatch koloru wygląda sensownie dla jasnego (SRM ~3), bursztynowego (~12) i ciemnego (~35) piwa
- 0 przepisów: pusty stan z CTA; wyłączone Supabase: komunikat błędu
- 375px: `/recipes` = sama lista; `/recipes/[id]` = same szczegóły z linkiem powrotu; brak poziomego scrolla strony
- Eksport JSON/PDF, Edytuj i Usuń działają jak wcześniej
- Nieistniejące id → 404 z „Nie znaleziono przepisu”

**Implementation Note**: Po zakończeniu fazy i zielonej weryfikacji automatycznej zatrzymaj się na ręczne potwierdzenie.

---

## Phase 4: Kreator — kompozycja

### Overview

Nowy układ kreatora full-screen (`design-source/new-recipe.jsx:282-491`) bez dotykania logiki kroków. Treść kroków (wiersze, pola) jest restylowana dopiero w Fazie 5.

### Changes Required:

#### 1. Strony kreatora

**Files**: `src/pages/recipes/new.astro`, `src/pages/recipes/[id]/edit.astro`

**Intent**: Kreator na `shell="bare"`, bez wyśrodkowanego kontenera. 404 edycji dostaje nowy styl (treść bez zmian) na `shell="app"`.

**Contract**: `<RecipeWizard client:load />` / `<RecipeWizard client:load recipeId={id} initialData={record.data} />` bez zmian propsów; wrapper pełnej wysokości.

#### 2. RecipeWizard — nowa kompozycja

**File**: `src/components/recipe/RecipeWizard.tsx`

**Intent**: Złożyć nowy układ z istniejącej logiki. `handleNext`, `handleBack`, `handleSave`, `applySaveErrors`, `stepForField` i `WIZARD_STEPS` (kolejność) bez zmian merytorycznych.

**Contract**:
- `WIZARD_STEPS` — każdy krok dostaje `hint` (krótki opis mono pod etykietą, np. „Nazwa i styl”, „Słody i objętość”, „Przerwy i wydajność”, „Chmielenie i IBU”, „Szczep i fermentacja”, „Przyprawy, owoce, inne”).
- Nowa funkcja `handleStepSelect(index)` — działa tylko dla `index < currentStep` (ustawia krok), dla pozostałych nic nie robi.
- Układ lg+: grid `[260px_1fr]`: `<WizardStepNav/>` w aside (paper-2, `sticky top-0 h-dvh`), prawa kolumna `min-h-dvh flex flex-col`: nagłówek (eyebrow „Nowy przepis” / „Edycja przepisu”, „Krok X / 6”, `h2` serif z etykietą kroku, `tabIndex={-1}` dla fokusu; link-przycisk X `aria-label="Zamknij kreator"`), pasek postępu 2px copper (`role="progressbar"` z `aria-valuenow`/`aria-valuemax` albo `aria-hidden` — tekst „Krok X / 6” już to komunikuje), `<MetricsPanel variant="strip"/>`, treść kroku (`flex-1`, max-w ~ 880px), `<WizardFooter/>` (`sticky bottom-0`).
- < lg: aside ukryty, w nagłówku kompaktowy wskaźnik („Krok X / 6 · etykieta”) — stepper nie znika informacyjnie; pasek metryk w 2 kolumnach.
- Anuluj / X: link do `/recipes` (nowy) albo `/recipes/{recipeId}` (edycja); jeśli `form.formState.isDirty`, `onClick` pyta `window.confirm("Porzucić niezapisane zmiany?")` i anuluje nawigację przy odmowie.
- Tytuł `h1` strony: „Nowy przepis” / „Edytuj przepis” zostaje (w aside nad stepperem, serif).

#### 3. WizardStepNav i WizardFooter

**Files**: `src/components/recipe/WizardStepNav.tsx` (nowy), `src/components/recipe/WizardFooter.tsx` (nowy), `src/components/recipe/WizardStepper.tsx` (usunąć)

**Intent**: Rozbić `WizardStepper` na pionowy stepper i stopkę wg prototypu.

**Contract**:
- `WizardStepNav` props: `{ steps: WizardStepConfig[], currentIndex: number, onSelect: (index: number) => void }`. `<nav aria-label="Kroki kreatora"><ol>`; kółko z numerem (ukończony: ok + ikona check, aktywny: copper z halo, oczekujący: paper-3), etykieta + hint mono. Ukończone kroki to `<button type="button">` z `aria-label="Wróć do kroku N: etykieta"`; aktywny i przyszłe to nieinteraktywne elementy; aktywny ma `aria-current="step"`. `WizardStepConfig` (`{ id, label, hint }`) przenosi się tutaj.
- `WizardFooter` props: `{ isFirstStep, isLastStep, isSaving, onBack, onNext, onSave, cancelHref, onCancel, saveErrors, genericSaveError }`. Lewa strona: status — baner błędów (`role="alert"`, tokeny err, lista `saveErrors` albo `genericSaveError`; ta sama treść co dziś); bez błędów: „Zmiany zapisują się dopiero po kliknięciu Zapisz” (mono, ink-3). Prawa: Anuluj (`ghost`), ← Wstecz (`outline`, disabled na pierwszym kroku), Dalej → (`primary`) albo „Zapisz przepis” / „Zapisywanie…” (`copper`). Tło paper-2, border-top rule. < sm: status nad przyciskami.

#### 4. MetricsPanel jako pasek

**File**: `src/components/recipe/MetricsPanel.tsx`

**Intent**: Przenieść metryki na górę jako pasek (`new-recipe.jsx:221-280`), zachowując zawężony `useWatch` i `formatMetric`.

**Contract**: prop `variant?: "strip"` (jedyny używany; można usunąć stary układ). `<section aria-label="Wyliczenia przepisu">` z `StatTile` × 4 z `METRIC_DESCRIPTORS` + `ColorSwatch` dla SRM (neutralny, gdy wynik nie jest `ok`). Bg white, border-y rule. Wartości nie mogą przesuwać układu przy zmianie (stała szerokość / `tabular-nums`).

### Success Criteria:

#### Automated Verification:

- Lint przechodzi (w tym `jsx-a11y`): `npm run lint`
- Build przechodzi: `npm run build`
- Testy jednostkowe przechodzą: `npm run test:run`
- `WizardStepper` usunięty: `grep -rn "WizardStepper" src` zwraca pusto

#### Manual Verification:

- 1280px: stepper po lewej, metryki na górze aktualizują się na żywo przy wpisywaniu słodów/chmieli, stopka przyklejona do dołu
- Dalej blokuje się przy błędach jak wcześniej (krok 1–4), klik w ukończony krok cofa, klik w przyszły nic nie robi
- Po zmianie kroku fokus trafia na nagłówek kroku; po błędzie zapisu — na pierwsze pole z błędem
- Zapis nowego przepisu → `/recipes`; zapis edycji → `/recipes/{id}`; błąd serwera widoczny w stopce (`role="alert"`)
- Anuluj/X bez zmian wychodzi od razu; ze zmianami pyta o potwierdzenie
- 375px: brak aside, wskaźnik „Krok X / 6”, stopka i metryki czytelne, brak poziomego scrolla

**Implementation Note**: Po zakończeniu fazy i zielonej weryfikacji automatycznej zatrzymaj się na ręczne potwierdzenie. Treść kroków jest w tej fazie jeszcze w starym stylu.

---

## Phase 5: Kreator — wiersze i kroki

### Overview

Restyl treści kroków: wiersze składników jako karty z gridem pól i jednostkami, konsolidacja na prymitywach `ui/`.

### Changes Required:

#### 1. Wiersze składników

**Files**: `src/components/recipe/{MaltRow,HopRow,MashRestRow,AdjunctRow}.tsx`, `src/components/recipe/{MaltList,HopList,MashRestList,AdjunctList}.tsx`

**Intent**: Wygląd wg `new-recipe.jsx:636-665` (biała karta, grid pól, inputy z jednostką, pusty stan z przerywaną ramką), bez utraty dostępności i funkcji.

**Contract**:
- Usunąć lokalne `inputClass` i `FieldError`; pola przez `Field` + `Input unit` (np. `kg`, `EBC`, `%`, `g`, `min`, `°C`). Etykiety bez jednostki w nawiasie, gdy jednostka jest w sufiksie — ale dostępna nazwa pola musi nadal zawierać jednostkę (np. etykieta „Ilość” + `aria-describedby` na sufiks albo `sr-only` „(kg)” w etykiecie; implementer wybiera jedno i stosuje spójnie).
- **Bez zmian**: `id` pól (`malt-${i}-amount` itd.), `htmlFor`, `aria-invalid`, błędy per wiersz z `errors.<list>?.[i]?.<field>`, `register(..., { valueAsNumber: true })`, przyciski ↑ ↓ ✕ z obecnymi polskimi `aria-label` (warianty `ghost`/`danger`, `size="icon-sm"`).
- lg+: pola w jednym wierszu gridu; < sm: stack.
- Listy: przycisk „Dodaj …” w wariancie `outline` z ikoną Plus; pusty stan w ramce `border-dashed border-rule`.

#### 2. Kroki

**Files**: `src/components/recipe/steps/{BasicsStep,GristStep,MashStep,HopsStep,YeastStep,AdjunctsStep}.tsx`

**Intent**: Pola kroków na `Field`/`Input unit`, sekcje z `SectionTitle`/`Eyebrow`, usunięcie lokalnych `inputClass`.

**Contract**: Ścieżki `register` i `id` bez zmian. `YeastStep` dostaje wyświetlanie błędów pól przez `Field` (dziś ich nie pokazuje, `YeastStep.tsx:23-101`) — tylko prezentacja istniejących `errors.yeast.*`, bez nowej walidacji.

#### 3. Selecty

**Files**: `src/components/recipe/StyledSelect.tsx`, `src/components/recipe/HopStageSelect.tsx`

**Intent**: Restyl shella i listboxa na tokeny (bg white, border rule, opcja aktywna paper-3, zaznaczona copper). ARIA listboxa bez zmian.

**Contract**: API i eksport `hopFieldShellClass` bez zmian (albo zastąpione wspólną klasą z `Input`, jeśli nic więcej go nie używa).

### Success Criteria:

#### Automated Verification:

- Lint przechodzi (w tym `jsx-a11y` dla etykiet): `npm run lint`
- Build przechodzi: `npm run build`
- Testy jednostkowe przechodzą: `npm run test:run`
- Brak lokalnych kopii: `grep -rn "const inputClass\|function FieldError" src/components/recipe` zwraca pusto

#### Manual Verification:

- Każdy krok: dodanie, przesunięcie ↑↓ i usunięcie wiersza działa; jednostki widoczne w sufiksach
- Błędy walidacji pojawiają się przy konkretnym polu konkretnego wiersza (np. alfa > 100 w 2. chmielu), `aria-invalid` ustawione
- Czytnik ekranu / DevTools Accessibility: pole „Ilość” w wierszu słodu ma nazwę z jednostką i powiązany komunikat błędu
- Krok Drożdże pokazuje błędy pól po nieudanym zapisie
- Edycja istniejącego przepisu wczytuje wszystkie wartości do pól
- 375px: wiersze w stacku, przyciski ↑↓✕ dostępne, brak poziomego scrolla

**Implementation Note**: Po zakończeniu fazy i zielonej weryfikacji automatycznej zatrzymaj się na ręczne potwierdzenie.

---

## Phase 6: Sprzątanie

### Overview

Grep-bramka na resztki starej palety, usunięcie martwego kodu, zamknięcie poprzedniej zmiany landingu.

### Changes Required:

#### 1. Resztki palety i martwy kod

**Files**: całe `src/`, `src/components/ui/LibBadge.astro`, `src/components/ui/card.tsx`, `src/components/ui/button.tsx`

**Intent**: Zero klas starej palety; usunięcie nieużywanych komponentów i aliasów.

**Contract**: Usunąć `LibBadge.astro`; `card.tsx` usunąć, jeśli nadal ma 0 użyć; alias `destructive` w `Button` usunąć, jeśli nieużywany. Wyjątek: `RecipePdf.tsx` (własny `StyleSheet`, poza zakresem).

#### 2. Dokumentacja zmian

**Files**: `context/changes/product-landing-page/` → `context/archive/`, `CLAUDE.md`

**Intent**: Zarchiwizować `product-landing-page` (`/10x-archive product-landing-page`), bo jej „cosmic” tożsamość wizualna jest unieważniona. W `CLAUDE.md` dopisać w „Key conventions” jedną linię: kolory tylko przez tokeny/warianty `ui/`, feature code nie używa klas palety Tailwind wprost.

**Contract**: n/d (proza).

### Success Criteria:

#### Automated Verification:

- Lint przechodzi: `npm run lint`
- Build przechodzi: `npm run build`
- Testy jednostkowe przechodzą: `npm run test:run`
- E2E przechodzi: `npm run test:e2e` (wymaga lokalnego Supabase)
- Grep-bramka pusta: `grep -rnE "white/[0-9]|text-white|bg-white|blue-[0-9]|purple-[0-9]|slate-[0-9]|red-[0-9]|backdrop-blur|bg-cosmic|bg-clip-text|dark:" src --include=*.tsx --include=*.astro --include=*.css | grep -v RecipePdf`
- `LibBadge` usunięty: `test ! -f src/components/ui/LibBadge.astro`

#### Manual Verification:

- Pełny przegląd wszystkich ekranów na 375px i 1280px: landing, signin, signup, confirm-email, `/recipes` (lista, pusty, błąd), `/recipes/[id]`, 404, `/recipes/new`, `/recipes/[id]/edit`
- Spójność: te same odcienie, radiusy 4px, fonty (serif w tytułach, mono w eyebrow/jednostkach) na wszystkich ekranach
- Nawigacja wyłącznie klawiaturą przez cały flow „utwórz przepis → zobacz szczegóły → edytuj → zapisz” z widocznym focus ringiem

**Implementation Note**: Po zakończeniu fazy i zielonej weryfikacji automatycznej poproś o finalne ręczne potwierdzenie.

---

## Testing Strategy

### Unit Tests:

- `src/lib/srm-color.test.ts` — tabela SRM, clamp < 1 i > 40, `NaN`/`Infinity` → kolor neutralny.
- `src/lib/auth-errors.test.ts` — mapowanie znanych komunikatów Supabase, fallback dla nieznanych.
- `src/lib/nav-items.test.ts` — zaktualizowane oczekiwania o pole `icon`; `resolveActiveHref` bez zmian.
- Istniejące testy logiki (kalkulacje, zapis, mapery) muszą przechodzić bez modyfikacji — to dowód, że reskin nie ruszył logiki.

### Integration Tests:

- Istniejące E2E (`auth-read-boundary.spec.ts`, `idor-mutations.spec.ts`) bez zmian w asercjach — pilnują tras, przekierowań gości, nagłówka `h1` z nazwą i kopii 404.

### Manual Testing Steps:

1. 1280px, zalogowany: przejdź rail → Przepisy → wybierz przepis → kotwice → Edytuj → zmień chmiel → Zapisz → wróć do szczegółów.
2. Utwórz nowy przepis od zera, wywołując po drodze błąd w każdym kroku z walidacją; sprawdź komunikaty przy polach i gating Dalej.
3. W kreatorze kliknij ukończony krok, potem przyszły; zmień coś i kliknij X — potwierdzenie.
4. Wyszukaj przepis po fragmencie stylu z polskimi znakami.
5. 375px: powtórz 1. i 2.; sprawdź menu `<details>`, brak poziomego scrolla.
6. Wyloguj; jako gość odwiedź `/`, `/recipes` (redirect), `/auth/signin` z błędnym hasłem (polski komunikat).

## Performance Considerations

- `/recipes/[id]` wykonuje dodatkowe `listRecipes` (lekki select 8 kolumn) równolegle z `getRecipe` przez `Promise.all` — pomijalny koszt.
- `RecipeListSearch` hydratuje się z listą wszystkich przepisów użytkownika jako props; przy skali v1 (dziesiątki przepisów) to kilka KB.
- Fonty: tylko Plex Sans 400 z `preload`; Fraunces i Plex Mono ładowane normalnie. Subsety latin + latin-ext.

## Migration Notes

Brak zmian w bazie i API. Jedyna zmiana tras: `/dashboard` → redirect na `/recipes` (stare linki działają). Rollback: revert commitów fazy.

## References

- Research: `context/changes/new-app-design/research.md`
- Źródła prototypu: `context/changes/new-app-design/design-source/` (`tokens.css`, `shared.jsx`, `app.jsx`, `recipes.jsx`, `new-recipe.jsx`)
- Poprzedni shell: `context/archive/2026-08-04-app-navigation-shell/plan.md`
- Deskryptory metryk: `context/archive/2026-06-09-saved-recipes-list/plan.md:16,32,94-104`
- Lessons: `context/foundation/lessons.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Fundament — tokeny, fonty, warstwa `ui/`

#### Automated

- [x] 1.1 Lint przechodzi: `npm run lint` — 758031d
- [x] 1.2 Build przechodzi (fonty pobrane, brak błędów configu): `npm run build` — 758031d
- [x] 1.3 Testy jednostkowe przechodzą (w tym nowe `srm-color.test.ts`): `npm run test:run` — 758031d
- [x] 1.4 W `dist/` są pliki fontów z zakresem latin-ext — 758031d

#### Manual

- [x] 1.5 Aplikacja działa jak wcześniej, `body` ma font IBM Plex Sans — 758031d
- [x] 1.6 Polskie znaki renderują się fontem webowym — 758031d

### Phase 2: Shell, auth, landing, dashboard

#### Automated

- [x] 2.1 Lint przechodzi: `npm run lint` — 4a85a4e
- [x] 2.2 Build przechodzi: `npm run build` — 4a85a4e
- [x] 2.3 Testy jednostkowe przechodzą (`nav-items.test.ts`, `auth-errors.test.ts`): `npm run test:run` — 4a85a4e
- [x] 2.4 Brak odwołań do `AppNav` i `bg-cosmic` — 4a85a4e
- [x] 2.5 E2E przekierowań gości przechodzi — 4a85a4e

#### Manual

- [x] 2.6 Zalogowany 1280px: rail, aktywna pozycja, tooltip, Wyloguj — 4a85a4e
- [x] 2.7 Zalogowany 375px: górny pasek, menu `<details>` z klawiatury, brak poziomego scrolla — 4a85a4e
- [x] 2.8 Gość na `/`: górny pasek i nowy landing — 4a85a4e
- [x] 2.9 Auth po polsku, polskie komunikaty błędów Supabase — 4a85a4e
- [x] 2.10 `/dashboard` przekierowuje na `/recipes`; gość → `/auth/signin` — 4a85a4e
- [x] 2.11 Widoczny copper focus ring w shellu — 4a85a4e

### Phase 3: Przepisy — master-detail

#### Automated

- [x] 3.1 Lint przechodzi: `npm run lint`
- [x] 3.2 Build przechodzi: `npm run build`
- [x] 3.3 Testy jednostkowe przechodzą: `npm run test:run`
- [x] 3.4 E2E bez zmian w asercjach przechodzi: `npm run test:e2e`
- [x] 3.5 Brak klas starej palety w plikach fazy

#### Manual

- [ ] 3.6 1280px: aside + zachęta, podświetlona aktywna karta, niezależny scroll aside
- [ ] 3.7 Wyszukiwarka filtruje po nazwie i stylu, stan „brak wyników”, pełna lista bez JS
- [ ] 3.8 Kotwice przewijają poprawnie pod sticky paskiem
- [ ] 3.9 Swatch sensowny dla SRM ~3, ~12, ~35
- [ ] 3.10 Stany pusty i błędu
- [ ] 3.11 375px: lista / szczegóły osobno, brak poziomego scrolla
- [ ] 3.12 Eksport, Edytuj, Usuń działają
- [ ] 3.13 404 z „Nie znaleziono przepisu”

### Phase 4: Kreator — kompozycja

#### Automated

- [ ] 4.1 Lint przechodzi (w tym `jsx-a11y`): `npm run lint`
- [ ] 4.2 Build przechodzi: `npm run build`
- [ ] 4.3 Testy jednostkowe przechodzą: `npm run test:run`
- [ ] 4.4 `WizardStepper` usunięty

#### Manual

- [ ] 4.5 1280px: stepper, metryki na żywo, sticky stopka
- [ ] 4.6 Gating Dalej bez zmian, klikalne tylko ukończone kroki
- [ ] 4.7 Fokus na nagłówku kroku / na polu z błędem
- [ ] 4.8 Zapis new/edit przekierowuje poprawnie, błąd serwera w stopce
- [ ] 4.9 Anuluj/X z potwierdzeniem przy zmianach
- [ ] 4.10 375px: wskaźnik kroku, czytelna stopka i metryki

### Phase 5: Kreator — wiersze i kroki

#### Automated

- [ ] 5.1 Lint przechodzi (w tym `jsx-a11y`): `npm run lint`
- [ ] 5.2 Build przechodzi: `npm run build`
- [ ] 5.3 Testy jednostkowe przechodzą: `npm run test:run`
- [ ] 5.4 Brak lokalnych `inputClass` / `FieldError`

#### Manual

- [ ] 5.5 Dodawanie, przesuwanie, usuwanie wierszy w każdym kroku; jednostki w sufiksach
- [ ] 5.6 Błędy przy konkretnym polu konkretnego wiersza, `aria-invalid`
- [ ] 5.7 Dostępna nazwa pola zawiera jednostkę, błąd powiązany z polem
- [ ] 5.8 Krok Drożdże pokazuje błędy pól
- [ ] 5.9 Edycja wczytuje wszystkie wartości
- [ ] 5.10 375px: wiersze w stacku, brak poziomego scrolla

### Phase 6: Sprzątanie

#### Automated

- [ ] 6.1 Lint przechodzi: `npm run lint`
- [ ] 6.2 Build przechodzi: `npm run build`
- [ ] 6.3 Testy jednostkowe przechodzą: `npm run test:run`
- [ ] 6.4 E2E przechodzi: `npm run test:e2e`
- [ ] 6.5 Grep-bramka na starą paletę pusta
- [ ] 6.6 `LibBadge` usunięty

#### Manual

- [ ] 6.7 Pełny przegląd wszystkich ekranów na 375px i 1280px
- [ ] 6.8 Spójność odcieni, radiusów i fontów
- [ ] 6.9 Pełny flow wyłącznie klawiaturą z widocznym focus ringiem
