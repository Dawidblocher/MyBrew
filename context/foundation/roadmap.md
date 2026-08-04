---
project: Beer Recipe Builder
version: 1
status: draft
created: 2026-05-28
updated: 2026-08-04
prd_version: 1
main_goal: speed
top_blocker: time
---

# Roadmap: Beer Recipe Builder

> Wyprowadzona z `context/foundation/prd.md` (v1) + auto-zbadany baseline kodu.
> Edytuj w miejscu; archiwizuj, gdy zostanie zastąpiona.
> Pozycje poniżej są w kolejności zależności. Tabela "At a glance" jest indeksem.

## Vision recap

Tworzenie przepisu na piwo wymaga wielu ręcznych obliczeń (BLG, ABV, SRM, IBU) rozrzuconych po arkuszach i osobnych kalkulatorach. Produkt daje jedno miejsce do zdefiniowania pełnego przepisu w kreatorze krok-po-kroku i liczy te cztery parametry na żywo, gdy zmieniają się dane wejściowe. Rdzeń wartości (core hypothesis — założenie, które musi się sprawdzić, by produkt miał sens) to: poprawne, automatyczne obliczenia na żywo z realnych danych przepisu. Zakres v1: tworzenie + zapis + odczyt listy (bez edycji i usuwania).

## North star

**S-03: Użytkownik kończy kreator i widzi na żywo wszystkie cztery metryki (BLG, ABV, SRM, IBU)** — to moment walidacyjny, w którym pełna obietnica produktu działa od wejścia danych po poprawny wynik; przy celu `speed` domykamy ścieżkę konieczną aż do tego punktu, zanim zajmiemy się czymkolwiek opcjonalnym.

> Gwiazda przewodnia (north star) — najmniejszy kompletny przepływ od wejścia użytkownika po widoczny wynik, którego dostarczenie dowodzi rdzennej hipotezy produktu; umieszczony tak wcześnie, jak pozwalają zależności, bo wszystko inne ma znaczenie tylko wtedy, gdy to zadziała.

## At a glance

| ID   | Change ID                   | Outcome (user can …)                                                            | Prerequisites | PRD refs                                       | Status   |
| ---- | --------------------------- | ------------------------------------------------------------------------------- | ------------- | ---------------------------------------------- | -------- |
| F-01 | recipe-persistence-model    | (foundation) model danych przepisu + RLS + typy współdzielone                   | —             | FR-001, FR-002, FR-011, FR-012, Access Control | done     |
| F-02 | calc-engine-harness         | (foundation) szkielet silnika obliczeń + harness testów poprawności             | —             | FR-010, NFR (poprawność)                       | done     |
| S-01 | wizard-basics-grist-blg-srm | rozpocząć kreator, wpisać podstawy i zasyp, zobaczyć na żywo BLG/SRM            | F-02          | FR-003, FR-004, FR-005, FR-010                 | done     |
| S-02 | wizard-mash-hops-ibu        | skonfigurować zacieranie i chmiel, zobaczyć na żywo IBU                         | S-01          | FR-006, FR-007, FR-010                         | done     |
| S-03 | wizard-yeast-adjuncts-abv   | ustawić drożdże i dodatki, zobaczyć na żywo ABV — wszystkie 4 metryki           | S-02          | FR-008, FR-009, FR-010                         | done     |
| S-04 | save-recipe                 | zapisać ukończony przepis z czterema metrykami                                  | F-01, S-03    | FR-011                                         | done     |
| S-05 | saved-recipes-list          | zobaczyć listę zapisanych przepisów (tylko do odczytu) z metrykami              | F-01, S-04    | FR-012                                         | done     |
| S-06 | recipe-export               | wyeksportować zapisany przepis jako PDF lub JSON                                | S-05          | FR-013                                         | done     |
| S-07 | recipe-edit-delete          | edytować istniejący przepis (pełny kreator) i trwale go usunąć z potwierdzeniem | S-05          | —                                              | done     |
| S-08 | app-navigation-shell        | poruszać się po aplikacji ze spójnego, trwałego paska nawigacji na każdej stronie | —             | — (UX, post-v1)                                | done     |
| S-09 | product-landing-page        | zrozumieć czym jest aplikacja od razu po wejściu na stronę główną, z jasnym CTA  | —             | — (UX, post-v1)                                | planned  |

## Streams

Pomoc nawigacyjna — grupuje pozycje dzielące ten sam łańcuch zależności. Kanoniczna kolejność wciąż żyje w grafie zależności poniżej; ta tabela to proponowana kolejność czytania równoległych tras.

| Stream | Theme                        | Chain                             | Note                                                                                     |
| ------ | ---------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------- |
| A      | Kreator i obliczenia na żywo | `F-02` → `S-01` → `S-02` → `S-03` | Ścieżka konieczna do gwiazdy przewodniej; priorytet przy celu `speed`.                   |
| B      | Trwałość, lista i eksport    | `F-01` → `S-04` → `S-05` → `S-06` | `F-01` można budować równolegle do całego Stream A; `S-04` dołącza do Stream A w `S-03`. |
| C      | Edycja i usuwanie            | `S-05` → `S-07`                   | Odgałęzienie od Stream B po S-05; można budować równolegle do S-06.                      |
| D      | UX i nawigacja               | `S-08` → `S-09`                   | Warstwa UX na gotowym produkcie v1; `S-08` (nawigacja) daje shell, z którego korzysta `S-09` (strona główna). Oba niezależne od Streamów A–C. |

## Baseline

Co już jest w kodzie na dzień `2026-05-28` (auto-zbadane + potwierdzone przez użytkownika).
Foundations poniżej zakładają obecność tych warstw i ich NIE odtwarzają.

- **Frontend:** present — Astro 6 SSR + wyspy React 19, Tailwind 4, shadcn/ui ("new-york", `src/components/ui/button.tsx`), `src/layouts/Layout.astro`, formularze auth.
- **Backend / API:** partial — Astro SSR (`output: "server"` w `astro.config.mjs`); istnieją tylko trasy auth (`src/pages/api/auth/{signin,signup,signout}.ts`), brak tras dla przepisów.
- **Data:** absent — klient Supabase podłączony (`src/lib/supabase.ts`), ale brak migracji, schematu i `supabase/migrations/`; brak encji przepisu w `src/types.ts`.
- **Auth:** present — sesje cookie przez `@supabase/ssr`, middleware rozwiązujące użytkownika + ochrona `/dashboard` (`src/middleware.ts`), strony i endpointy auth.
- **Deploy / infra:** present — adapter Cloudflare (`@astrojs/cloudflare`), `wrangler.jsonc`, GitHub Actions CI (lint + build) w `.github/workflows/ci.yml`.
- **Observability:** absent — brak bibliotek logowania / śledzenia błędów / metryk w zależnościach.

## Foundations

### F-01: Model danych przepisu + RLS

- **Outcome:** (foundation) schemat bazy dla przepisów (migracja Supabase z zagnieżdżonymi danymi przepisu), polityki RLS związane z `auth.uid()`, oraz współdzielone typy encji w `src/types.ts` są na miejscu.
- **Change ID:** recipe-persistence-model
- **PRD refs:** FR-011, FR-012, FR-001, FR-002, sekcja Access Control
- **Unlocks:** S-04 (zapis przepisu), S-05 (lista zapisanych); polityki RLS realizują własność przepisów na bazie istniejącej tożsamości auth (FR-001/FR-002 — auth obecny per baseline, tutaj wiązany z własnością danych).
- **Prerequisites:** — (auth obecny w baseline)
- **Parallel with:** F-02, S-01, S-02, S-03
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Sekwencjonowane wcześnie i równolegle do kreatora, bo persystencja jest potrzebna dopiero przy S-04; ryzyko: zbyt rozbudowany model — trzymać minimalny pojedynczy model przepisu, nie odtwarzać auth.
- **Status:** done

### F-02: Szkielet silnika obliczeń + harness testów poprawności

- **Outcome:** (foundation) struktura modułu obliczeń, kontrakt wyjścia czterech metryk (BLG/ABV/SRM/IBU), typy wejść metryk oraz harness testów potwierdzający poprawność formuł dla standardowych danych są na miejscu (bez implementacji wszystkich formuł — te lądują w slice'ach, które ich potrzebują).
- **Change ID:** calc-engine-harness
- **PRD refs:** FR-010, NFR (poprawność obliczeń — "brak cichych błędnych liczb")
- **Unlocks:** S-01 (pierwsze metryki na żywo) oraz ścieżkę weryfikacji poprawności obliczeń używaną przez S-01/S-02/S-03 (guardrail NFR).
- **Prerequisites:** —
- **Parallel with:** F-01
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Sekwencjonowane pierwsze, bo guardrail poprawności (NFR) musi być weryfikowalny zanim pojawi się pierwsza metryka; ryzyko: rozrost w "zbuduj wszystkie formuły naraz" — zakres ograniczony do szkieletu + harness, formuły wchodzą per slice.
- **Status:** done

## Slices

### S-01: Kreator — podstawy i zasyp z BLG/SRM na żywo

- **Outcome:** użytkownik może rozpocząć nowy przepis w kreatorze, wpisać podstawy (nazwa, styl) oraz skonfigurować parametry warki i dynamiczną listę słodów (dodaj/przesuń/usuń), i widzi na żywo aktualizowane BLG oraz SRM.
- **Change ID:** wizard-basics-grist-blg-srm
- **PRD refs:** FR-003, FR-004, FR-005, FR-010
- **Prerequisites:** F-02
- **Parallel with:** F-01
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Pierwszy pionowy slice produktowy; ryzyko, że wiązanie kreatora z silnikiem obliczeń okaże się złożone — dlatego F-02 ustala kontrakt i harness wcześniej.
- **Status:** done

### S-02: Kreator — zacieranie i chmiel z IBU na żywo

- **Outcome:** użytkownik może skonfigurować wydajność zacierania, stosunek wody do słodu i dynamiczną listę przerw zacierania oraz dynamiczną listę dodatków chmielu (etap, czas), i widzi na żywo aktualizowane IBU.
- **Change ID:** wizard-mash-hops-ibu
- **PRD refs:** FR-006, FR-007, FR-010
- **Prerequisites:** S-01
- **Parallel with:** F-01
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Rozszerza silnik o IBU (zależne od harmonogramu chmielu); ryzyko niespójności formuły IBU — pokryte harnessem z F-02.
- **Status:** done

### S-03: Kreator — drożdże i dodatki z ABV na żywo (gwiazda przewodnia)

- **Outcome:** użytkownik może wybrać parametry drożdży (szczep, typ, odfermentowanie, zakres temperatur) i skonfigurować dynamiczną listę dodatków (etap, czas, notatki), i widzi na żywo ABV — w tym momencie wszystkie cztery metryki (BLG/ABV/SRM/IBU) liczą się na żywo w pełnym kreatorze.
- **Change ID:** wizard-yeast-adjuncts-abv
- **PRD refs:** FR-008, FR-009, FR-010
- **Prerequisites:** S-02
- **Parallel with:** F-01
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Domyka rdzenną obietnicę (cztery metryki na żywo); ryzyko: ABV zależy od odfermentowania drożdży i poprzednich kroków — błąd ujawni się tylko z pełnym przepływem, dlatego harness pokrywa standardowe dane wejściowe.
- **Status:** done

### S-04: Zapis ukończonego przepisu

- **Outcome:** użytkownik może zapisać ukończony przepis wraz z czterema obliczonymi metrykami; zapis jest blokowany lub ostrzega, gdy brakuje pól wymaganych (nazwa, styl, minimalny zasyp).
- **Change ID:** save-recipe
- **PRD refs:** FR-011
- **Prerequisites:** F-01, S-03
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Łączy kreator z warstwą trwałości; ryzyko rozjazdu kształtu danych kreatora i schematu — minimalizowane przez współdzielone typy z F-01.
- **Status:** done

### S-05: Lista zapisanych przepisów (tylko do odczytu)

- **Outcome:** użytkownik może zobaczyć listę swoich zapisanych przepisów (tylko do odczytu) z widocznymi czterema metrykami; brak akcji edycji i usuwania w v1.
- **Change ID:** saved-recipes-list
- **PRD refs:** FR-012
- **Prerequisites:** F-01, S-04
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Domyka pętlę create→save→view; ryzyko niskie — odczyt RLS dla bieżącego użytkownika, bez mutacji.
- **Status:** done

### S-06: Eksport przepisu (PDF / JSON)

- **Outcome:** użytkownik może wyeksportować zapisany przepis jako PDF lub JSON.
- **Change ID:** recipe-export
- **PRD refs:** FR-013
- **Prerequisites:** S-05
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - Czy v1 wymaga obu formatów (PDF i JSON), czy wystarczy jeden na start? — Owner: user. Block: no.
- **Risk:** Nice-to-have poza ścieżką konieczną; przy celu `speed` świadomie ostatni — nie blokuje MVP.
- **Status:** done

### S-07: Edycja i usuwanie przepisu

- **Outcome:** użytkownik może otworzyć zapisany przepis w trybie edycji (pełny kreator wypełniony istniejącymi danymi), zmodyfikować dowolne pola i zapisać zmiany; może też trwale usunąć przepis po potwierdzeniu w oknie dialogowym.
- **Change ID:** recipe-edit-delete
- **PRD refs:** — (post-v1; wcześniej parkowane jako poza zakresem v1)
- **Prerequisites:** S-05
- **Parallel with:** S-06
- **Blockers:** —
- **Unknowns:**
  - Czy edycja powinna ponownie uruchomić kreator krok-po-kroku, czy otworzyć widok jednostronicowy ze wszystkimi polami naraz? — Owner: user. Block: no.
- **Risk:** Reużywa logiki kreatora (S-01–S-03) w trybie "wypełnij z istniejących danych" — ryzyko dryfu między kształtem formularza a zapisanym schematem, minimalizowane przez współdzielone typy z F-01. Usuwanie jest nieodwracalne — wymagać wyraźnego potwierdzenia użytkownika przed operacją.
- **Status:** done

### S-08: Spójna globalna nawigacja (app shell)

- **Outcome:** użytkownik porusza się po całej aplikacji z jednego, trwałego paska nawigacji obecnego na każdej stronie (strona główna, lista przepisów, kreator, szczegóły, dashboard): widzi markę/nazwę aplikacji prowadzącą do strony startowej, ma stały dostęp do „Twoje przepisy" i „Nowy przepis", widzi swój stan zalogowania (e-mail) oraz akcję wylogowania; aktywna sekcja jest wizualnie wyróżniona, a nawigacja jest responsywna (na wąskich ekranach zwijana do menu).
- **Change ID:** app-navigation-shell
- **PRD refs:** — (UX, post-v1; nie zmienia zakresu funkcjonalnego v1)
- **Prerequisites:** — (produkt v1 gotowy)
- **Parallel with:** Streamy A–C (zakończone); niezależne od S-09, ale S-09 z niego korzysta
- **Blockers:** —
- **Unknowns:**
  - Czy nawigacja różni się dla stanu zalogowany/niezalogowany (np. ukrycie „Twoje przepisy" gdy brak sesji)? — Owner: user. Block: no.
- **Risk:** Obecny `Topbar` renderuje się tylko wewnątrz `Welcome.astro`, więc reszta stron nie ma nawigacji; ryzyko: wyniesienie nawigacji do wspólnego `Layout.astro`/komponentu shell może wpłynąć na wszystkie strony (odstępy, tło `bg-cosmic`) — trzymać zmianę w warstwie layoutu, nie dotykać logiki stron. Bez zmian w danych/API.
- **Status:** done

### S-09: Produktowa strona główna (landing)

- **Outcome:** użytkownik trafiający na `/` od razu rozumie, czym jest aplikacja — kreator przepisów na piwo z obliczeniami BLG, ABV, SRM i IBU na żywo — zamiast generycznego szablonu „10x Astro Starter"; treść (nagłówek, opis, karty korzyści) opisuje realny produkt po polsku, a jasne CTA prowadzi niezalogowanego do rejestracji/logowania, a zalogowanego bezpośrednio do „Twoje przepisy" / „Nowy przepis".
- **Change ID:** product-landing-page
- **PRD refs:** — (UX, post-v1; wspiera zrozumienie rdzennej obietnicy z Vision recap)
- **Prerequisites:** — (może użyć nawigacji z S-08, ale nie blokuje)
- **Parallel with:** S-08
- **Blockers:** —
- **Unknowns:**
  - Czy landing ma być dostępny również dla zalogowanych (marketingowy) czy dla zalogowanych od razu przekierowywać na listę przepisów? — Owner: user. Block: no.
- **Risk:** Zmiana głównie prezentacyjna (`Welcome.astro`); ryzyko niskie — brak wpływu na dane i obliczenia. Uwaga: usunąć treści boilerplate startera, by nie wprowadzać użytkownika w błąd.
- **Status:** planned

## Backlog Handoff

| Roadmap ID | Change ID                   | Suggested issue title                                     | Ready for `/10x-plan` | Notes                                    |
| ---------- | --------------------------- | --------------------------------------------------------- | --------------------- | ---------------------------------------- |
| F-01       | recipe-persistence-model    | Model danych przepisu + polityki RLS + typy współdzielone | yes                   | Run `/10x-plan recipe-persistence-model` |
| F-02       | calc-engine-harness         | Szkielet silnika obliczeń + harness testów poprawności    | yes                   | Run `/10x-plan calc-engine-harness`      |
| S-01       | wizard-basics-grist-blg-srm | Kreator: podstawy i zasyp z BLG/SRM na żywo               | no                    | Wymaga F-02                              |
| S-02       | wizard-mash-hops-ibu        | Kreator: zacieranie i chmiel z IBU na żywo                | no                    | Wymaga S-01                              |
| S-03       | wizard-yeast-adjuncts-abv   | Kreator: drożdże i dodatki z ABV na żywo (4 metryki)      | no                    | Wymaga S-02                              |
| S-04       | save-recipe                 | Zapis ukończonego przepisu z metrykami                    | no                    | Wymaga F-01, S-03                        |
| S-05       | saved-recipes-list          | Lista zapisanych przepisów (tylko do odczytu)             | no                    | Wymaga F-01, S-04                        |
| S-06       | recipe-export               | Eksport przepisu jako PDF/JSON                            | no                    | Wymaga S-05; nice-to-have                |
| S-07       | recipe-edit-delete          | Edycja i usuwanie przepisu                                | no                    | Wymaga S-05; można równolegle do S-06    |
| S-08       | app-navigation-shell        | Spójna globalna nawigacja (app shell)                     | yes                   | Run `/10x-plan app-navigation-shell`     |
| S-09       | product-landing-page        | Produktowa strona główna (landing)                        | yes                   | Run `/10x-plan product-landing-page`; może korzystać z S-08 |

## Open Roadmap Questions

1. **Czy eksport (S-06) w v1 wymaga obu formatów (PDF i JSON), czy wystarczy jeden na start?** — Owner: user. Block: S-06 (nie blokuje ścieżki must-have).

## Parked

- **Współdzielenie przepisów między użytkownikami** — Why parked: PRD §Non-Goals — model jednodostępowy per konto.
- **Zarządzanie fermentacją i harmonogram dnia warzenia** — Why parked: PRD §Non-Goals — MVP obejmuje tylko projektowanie i obliczenia.
- **Przepisy generowane przez AI / sugestie składników wg stylu** — Why parked: PRD §Non-Goals — użytkownik tworzy przepisy ręcznie.
- **Natywne aplikacje mobilne** — Why parked: PRD §Non-Goals — v1 tylko web.
- **Zaawansowane raporty i analityka przepisów** — Why parked: PRD §Non-Goals — brak dashboardów poza listą zapisanych.

## Done

- **F-01: (foundation) model danych przepisu (migracja Supabase z zagnieżdżonymi danymi), polityki RLS wiązane z `auth.uid()` oraz współdzielone typy encji w `src/types.ts` są na miejscu.** — Zrealizowane w kodzie: `supabase/migrations/20260609100000_create_recipes.sql`, `supabase/migrations/20260609110000_grant_recipes.sql` oraz typy przepisu w `src/types.ts`; model powstał razem z pracą nad zapisem (S-04), bez osobnego folderu zmiany. Lesson: —.
- **F-02: (foundation) struktura modułu obliczeń, kontrakt wyjścia czterech metryk (BLG/ABV/SRM/IBU), typy wejść metryk oraz harness testów potwierdzający poprawność formuł dla standardowych danych są na miejscu (bez implementacji wszystkich formuł — te lądują w slice'ach, które ich potrzebują).** — Archived 2026-08-02 → `context/archive/2026-06-04-calc-engine-harness/`. Lesson: —.
- **S-07: użytkownik może otworzyć zapisany przepis w trybie edycji (pełny kreator wypełniony istniejącymi danymi), zmodyfikować dowolne pola i zapisać zmiany; może też trwale usunąć przepis po potwierdzeniu w oknie dialogowym.** — Archived 2026-08-02 → `context/archive/2026-06-14-recipe-edit-delete/`. Lesson: —.
- **S-06: użytkownik może wyeksportować zapisany przepis jako PDF lub JSON.** — Archived 2026-08-02 → `context/archive/2026-06-10-recipe-export/`. Lesson: —.
- **S-04: użytkownik może zapisać ukończony przepis wraz z czterema obliczonymi metrykami; zapis jest blokowany lub ostrzega, gdy brakuje pól wymaganych (nazwa, styl, minimalny zasyp).** — Archived 2026-08-02 → `context/archive/2026-06-08-save-recipe/`. Lesson: —.
- **S-05: użytkownik może zobaczyć listę swoich zapisanych przepisów (tylko do odczytu) z widocznymi czterema metrykami; brak akcji edycji i usuwania w v1.** — Archived 2026-08-02 → `context/archive/2026-06-09-saved-recipes-list/`. Lesson: —.
- **S-01: użytkownik może rozpocząć nowy przepis w kreatorze, wpisać podstawy (nazwa, styl) oraz skonfigurować parametry warki i dynamiczną listę słodów (dodaj/przesuń/usuń), i widzi na żywo aktualizowane BLG oraz SRM.** — Archived 2026-08-02 → `context/archive/2026-05-31-wizard-basics-grist-blg-srm/`. Lesson: —.
- **S-02: użytkownik może skonfigurować wydajność zacierania, stosunek wody do słodu i dynamiczną listę przerw zacierania oraz dynamiczną listę dodatków chmielu (etap, czas), i widzi na żywo aktualizowane IBU.** — Archived 2026-08-02 → `context/archive/2026-06-05-wizard-mash-hops-ibu/`. Lesson: —.
- **S-03: użytkownik może wybrać parametry drożdży (szczep, typ, odfermentowanie, zakres temperatur) i skonfigurować dynamiczną listę dodatków (etap, czas, notatki), i widzi na żywo ABV — w tym momencie wszystkie cztery metryki (BLG/ABV/SRM/IBU) liczą się na żywo w pełnym kreatorze.** — Archived 2026-08-02 → `context/archive/2026-06-06-wizard-yeast-adjuncts-abv/`. Lesson: —.
- **S-08: użytkownik porusza się po całej aplikacji z jednego, trwałego paska nawigacji obecnego na każdej stronie (strona główna, lista przepisów, kreator, szczegóły, dashboard): widzi markę/nazwę aplikacji prowadzącą do strony startowej, ma stały dostęp do „Twoje przepisy" i „Nowy przepis", widzi swój stan zalogowania (e-mail) oraz akcję wylogowania; aktywna sekcja jest wizualnie wyróżniona, a nawigacja jest responsywna (na wąskich ekranach zwijana do menu).** — Archived 2026-08-04 → `context/archive/2026-08-04-app-navigation-shell/`. Lesson: —.








