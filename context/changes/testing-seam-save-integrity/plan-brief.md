# Testy: integralność seamu i zapisu (Plan testów — Faza 1) — Plan Brief

> Full plan: `context/changes/testing-seam-save-integrity/plan.md`
> Research: `context/changes/testing-seam-save-integrity/research.md`

## What & Why

Faza 1 fazowanego rollout planu testów: testy integracyjne (Vitest, `node`, bez UI) dowodzące, że seam obliczeniowy (`recipe-to-calc.ts`) mapuje wizard draft na silnik poprawnie dla wszystkich stanów kreatora (**Ryzyko #1**), oraz że round-trip zapisu (`draft → Zod → DB → odczyt`) nie gubi danych (**Ryzyko #3**). Cel: cichy błędny wynik metryki lub niekompletny zapis nie może przejść niezauważony.

## Starting Point

Baza testów jest `sparse` i w pełni offline: 9 plików `*.test.ts` w `src/lib/`, env `node`, zero mocków i zero klienta Supabase. Seam jest przetestowany tylko częściowo, `computeWizardMetrics` **duplikuje** `computeMetrics` bez testu parytetu, brak testu pełnego round-tripu zapisu, a buildery `draft()`/`boilHop()` są zduplikowane w dwóch plikach.

## Desired End State

Istnieją współdzielone fixtures i in-memory fake klienta Supabase; seam ma golden-vectory, testy asymetrii/konwersji i inwariant parytetu; round-trip zapisu jest testowany deep-equal przez fake klienta; kontrakt strip-nieznanych-kluczy Zod jest zamrożony; brak wymaganego pola daje czytelny polski błąd. CI pozostaje zielone i offline, bez nowych sekretów.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Warstwa round-tripu | In-memory fake klienta Supabase | Testuje realną ścieżkę insert→read bez Dockera/sekretów; CI zostaje offline | Plan |
| Zachowanie Zod (nieznane klucze) | Zamrozić strip jako kontrakt | Dokumentuje świadomą, defensywną decyzję zamiast wymuszać zmianę kodu | Plan |
| Dryf duplikatu seamu | Test parytetu (bez refaktoru) | Najtańsza, najwyższego sygnału ochrona; refaktor poza zakresem Fazy 1 | Plan |
| Źródło golden vectors | Reuse oracle z testów silnika | Unika niezależnego, potencjalnie błędnego źródła prawdy | Plan |
| Fixtures | Wydzielić do wspólnego test-utils | Usuwa duplikację; skaluje na wiele scenariuszy | Plan |
| Zakres Ryzyka #1 | Wszystkie nazwane wektory | Pełne pokrycie asymetrii filtrów + konwersji z researchu | Plan |

## Scope

**In scope:** fixtures + fake klienta; golden-vector + asymetria + konwersje + parytet seamu (Ryzyko #1); round-trip + metryki serwerowe + strip Zod + błędy walidacji (Ryzyko #3); cookbook §6 + sync statusu.

**Out of scope:** refaktor seamu; zmiana zachowania Zod; prawdziwa DB/Docker/Testcontainers; auth/IDOR/cross-user (Faza 2); round-trip edycji (Faza 3); testy UI/komponentów; warstwa HTTP API route.

## Architecture / Approach

Budowa od dołu: (1) współdzielone fixtures oparte na `defaultRecipeDraft` + await-owalny fake klienta odwzorowujący chainable builder Supabase (`from/select/eq/insert/.../single/maybeSingle`) nad in-memory tablicą; (2) czyste testy seamu; (3) round-trip `buildRecipeInsert → fake insert → getRecipe → deep-equal`; (4) dokumentacja wzorców. Wszystko offline, `node`, w globie `src/**/*.test.ts`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Fixtures + fake klienta | Współdzielone buildery + in-memory Supabase | Fake musi wiernie odwzorować chainable/await builder |
| 2. Seam (Ryzyko #1) | Golden-vector, asymetria, konwersje, parytet | Prywatne mappery — odtworzyć wejścia w teście bez zmiany API |
| 3. Round-trip (Ryzyko #3) | Deep-equal save→read, strip Zod, błędy | Porównać `parsed.data` (nie surowy draft) |
| 4. Cookbook + status | §6 wypełnione, statusy zsynchronizowane | Spójność statusów test-plan ↔ change |

**Prerequisites:** brak — research kompletny; kod seamu/zapisu istnieje; Vitest skonfigurowany.
**Estimated effort:** ~2-3 sesje przez 4 fazy.

## Open Risks & Assumptions

- Fake klienta jest nową infrastrukturą — musi wiernie oddać semantykę `.eq` filtrów i await-owalnych ogniw terminalnych używanych przez kod produkcyjny.
- Test parytetu wymaga odtworzenia wejść prywatnych mapperów (`mapDraftHopsToCalc`, `attenuationFromDraft`) w teście, bez eksportowania ich z produkcji.
- Golden vectory zakładają, że wartości oracle z testów silnika (BLG≈14.1, SRM≈4.0, IBU≈16.2, ABV≈4.9) są kanoniczne.

## Success Criteria (Summary)

- Cichy błąd seamu (extract=0, zła konwersja, dryf duplikatu) jest łapany przez czerwony test.
- Zapis→odczyt zwraca identyczne `data` i metryki; brak wymaganego pola daje czytelny błąd.
- `npm run test:run`, `npm run lint`, `npm run build` zielone; CI offline bez nowych sekretów.
