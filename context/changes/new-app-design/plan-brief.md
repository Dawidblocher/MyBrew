# Nowy design aplikacji (paper / ink / copper) — Plan Brief

> Full plan: `context/changes/new-app-design/plan.md`
> Research: `context/changes/new-app-design/research.md`

## What & Why

Przeskinowujemy istniejącą aplikację na język wizualny prototypu `design-app-example.html`: jasna paleta paper/ink/copper, Fraunces + IBM Plex, rail ikon, przepisy jako master-detail, kreator full-screen. To czysty reskin: dostosowujemy to, co już mamy, bez nowych funkcji z prototypu. Przy okazji domykamy wymóg PRD dotyczący polskiego UI w auth.

## Starting Point

Obecny ciemny styl „cosmic glassmorphism” jest wpisany na sztywno: 494 klasy palety Tailwind w 38 plikach. Tokeny shadcn to stock, którego prawie nic nie używa. Jest jeden layout z górnym paskiem nawigacji. Kreator ma poziomy stepper, a metryki są na dole. Auth jest po angielsku.

## Desired End State

Każdy ekran jest w nowej palecie i nowych fontach, a w `src/` nie ma żadnej klasy starej palety.
- **Zalogowany na desktopie** widzi rail ikon.
- **Przepisy** to aside z listą (swatch koloru, wyszukiwarka) i panel szczegółów ze sticky kotwicami.
- **Kreator** działa na pełnym ekranie: stepper z lewej, metryki na żywo u góry, stopka z akcjami.
- **Mobile (375px)** działa jako stack.
- **Auth** jest po polsku, łącznie z komunikatami błędów Supabase.
- **`/dashboard`** przekierowuje na `/recipes`.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Zakres | Reskin istniejących ekranów, bez nowych funkcji, dark mode, i18n i brandingu | „Dostosowujemy to, co już mamy” | Research |
| Nawigacja | Rail ikon (lg+) + aside listy; kreator bez raila | Zachowuje master-detail z prototypu, nie traci globalnej nawigacji i wylogowania | Plan |
| `/dashboard` | Redirect → `/recipes` | Martwy placeholder, stare linki dalej działają | Plan |
| Aside listy | Tylko wyszukiwarka (wyspa React), bez chipów | Duża użyteczność przy małym koszcie | Plan |
| Swatch SRM | Tak, helper `srmToHex` + test | Mocny element wizualny, czysta funkcja | Plan |
| Terminologia | Zostaje „przepis” | Zero zmian w E2E i eksporcie | Plan |
| Auth | Tłumaczymy + mapper błędów Supabase | Wymóg PRD, pliki i tak są przepisywane | Plan |
| Mobile | Stack poniżej lg, górny pasek z `<details>` | Utrzymuje obecne wsparcie 375px | Plan |
| `/recipes` bez wyboru | Panel z zachętą | Przewidywalne URL-e, bez redirectu | Plan |
| Stepper | Klikalne tylko ukończone kroki | Wygoda bez omijania gatingu | Plan |
| Szczegóły | Sticky kotwice zamiast tabów | Zero JS, E2E nietknięte | Plan |
| Fonty | Astro 6 Fonts API (Google, latin-ext), self-host w buildzie | Działa na Workers bez requestów runtime | Research |
| Zasada stylu | Feature code bez klas palety — tylko tokeny i warianty `ui/` | Usuwa 8 kopii `inputClass` i 7 kopii `FieldError` | Research |

## Scope

**In scope:**
- tokeny, fonty i prymitywy `ui/`: Button, Badge, Field, Input z jednostką, StatTile, SectionTitle, ColorSwatch;
- Layout `app`/`bare`, rail i top bar;
- auth (reskin + PL) i landing;
- master-detail przepisów z wyszukiwarką;
- kompozycja kreatora oraz restyl wierszy i kroków;
- sprzątanie i archiwizacja `product-landing-page`.

**Out of scope:**
- nowe funkcje prototypu: Pulpit, Surowce, Protokół, BJCP, OG/FG, woda, historia;
- wykresy, chipy stylów, dark mode, i18n;
- zmiana terminologii na „receptura”;
- PDF;
- zmiany logiki, API i bazy;
- testy komponentów i bramka `tsc`.

## Architecture / Approach

Od dołu do góry: najpierw tokeny w `global.css` (paleta → semantyka shadcn + klasy `bg-paper-2`, `text-ink-3`, `bg-copper`), potem prymitywy `ui/` (React, renderowane statycznie także w Astro). Na tym powstają shell (`Layout` z propem `shell`, `AppRail`, `AppTopBar`) i ekrany.

Aplikacja zostaje MPA/SSR. Master-detail to wspólny `RecipeListAside` na `/recipes` i `/recipes/[id]` (`Promise.all` z `listRecipes`). Kreator zmienia tylko kompozycję: `WizardStepNav` + nagłówek + `MetricsPanel` jako pasek + `WizardFooter`. `handleNext`, `handleSave` i walidacja zostają bez zmian.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Fundament | Tokeny, fonty, prymitywy `ui/`, `srmToHex` | Radiusy przy 4px; fonty w buildzie CI |
| 2. Shell, auth, landing | Rail/top bar, jasne tło, auth PL, nowy landing, redirect dashboard | Od tej fazy niezmigrowane ekrany są nieczytelne |
| 3. Przepisy master-detail | Aside z wyszukiwarką, szczegóły z kotwicami, swatch | E2E: nazwy w aside nie mogą być nagłówkami |
| 4. Kreator — kompozycja | Stepper, nagłówek, pasek metryk, stopka, Anuluj | Fokus przy zmianie kroku; sticky przy scrollu okna |
| 5. Kreator — wiersze i kroki | Field/Input z jednostką, restyl selectów | Utrata `id`/`htmlFor`/błędów per wiersz |
| 6. Sprzątanie | Grep-bramka, martwy kod, archiwizacja landingu | Przeoczone resztki palety |

**Prerequisites:** lokalny Supabase dla E2E; dostęp do sieci w buildzie (pobranie fontów).
**Estimated effort:** ~6 sesji, po jednej na fazę; Fazy 3 i 5 są największe.

## Open Risks & Assumptions

- Między Fazą 2 a 5 aplikacja jest wizualnie „pół na pół” (białe teksty na jasnym tle). Nie deployować w tym oknie albo pracować na gałęzi.
- Weryfikacja wyglądu jest w całości ręczna (brak snapshotów). Jakość zależy od przeglądu na 375px i 1280px po każdej fazie.
- Komunikaty Supabase mogą mieć inne brzmienie niż zmapowane. Nieznane trafiają do polskiego fallbacku.
- Build w CI pobiera fonty z Google. Awaria sieci w CI zablokuje build.

## Success Criteria (Summary)

- Każdy ekran wygląda spójnie z prototypem (paleta, fonty, 4px, layout), a w `src/` nie ma klas starej palety.
- Wszystkie istniejące flow (tworzenie, podgląd, edycja, eksport, usuwanie, auth) działają jak wcześniej, na desktopie i na 375px; lint, build, unit i E2E są zielone.
- Użytkownik nie widzi już angielskiego tekstu w auth.
