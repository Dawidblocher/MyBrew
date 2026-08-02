# Round-trip edycji i trwałość usuwania — Plan Brief

> Full plan: `context/changes/testing-edit-delete-roundtrip/plan.md`
> Research: `context/changes/testing-edit-delete-roundtrip/research.md`

## What & Why

Faza 3 rollowanego planu testów domyka Ryzyko #5: tryb edycji dodany w S-07 może cicho zmienić dane przy zapisie, a usuwanie ma być trwałe i ograniczone do właściciela. Dodajemy testy Vitest dowodzące, że przepis przepuszczony przez edycję wraca z bazy identyczny, a usunięty znika z perspektywy odczytu aplikacji.

## Starting Point

Faza 1 pokryła round-trip **tworzenia** przepisu, Faza 2 — cross-user PUT/DELETE. Brakuje dwóch rzeczy: nikt nie sprawdza, co się dzieje z przepisem przepuszczonym przez **edycję**, a trwałość własnego DELETE jest dowodzona zaglądaniem do wnętrza fake'a (`fake._rows`), a nie wywołaniem `getRecipe` / `listRecipes`.

## Desired End State

Suita `npm run test:run` zapala się na czerwono, gdy odczyt zacznie gubić pole draftu, gdy edycja zapisze metryki niezgodne z zapisanym `data`, gdy przestanie stemplować `updated_at`, gdy usunięty przepis nadal będzie widoczny przez funkcje zapytań, albo gdy update zmieni właściciela wiersza. Zachowanie wobec niekompletnego jsonb jest udokumentowane, więc jego przyszła zmiana będzie świadoma.

## Key Decisions Made

| Decyzja | Wybór | Dlaczego | Źródło |
| --- | --- | --- | --- |
| Sformułowanie Ryzyka #5 | Dryf = brak normalizacji przy odczycie, nie rozjazd mapowań | Mappera DB→draft nie ma; `data` idzie z jsonb prosto do formularza | Research |
| Rdzeń dowodu | Idempotencja + mutacja jednego pola + invariant metryk | PUT i POST dzielą `buildRecipeInsert`, więc porównanie create ↔ edit byłoby zielone z niewłaściwego powodu | Research + Plan |
| Asymetria metryk | Tylko invariant po round-tripie | Zamrażanie wnętrza `buildRecipeInsert` przywiązałoby test do implementacji | Plan |
| Zdegradowany jsonb | Test charakteryzujący, bez naprawy | Faza testowa nie zmienia kodu produkcyjnego; naprawa to osobna decyzja | Plan |
| Dowód usuwania | `getRecipe` `null` + `listRecipes` bez rekordu | Status HTTP i `{ok:true}` nie dowodzą usunięcia (DELETE jest idempotentny z decyzji S-07) | Research + Plan |
| Znacznik `updated_at` | W zakresie, seed zamiast insertu | Fake ustawia `created_at === updated_at`; insert w tej samej milisekundzie dałby flaky test | Plan |
| Strażnik `user_id` | Tak, na warstwie zapytań | Handler PUT zdejmuje `user_id`, ale nic tego nie pilnuje, a trasa jest nieimportowalna w Vitest | Plan |
| Umiejscowienie | Nowy plik + builder wiersza w `fixtures.ts` | Trzy pliki testowe mają dziś własne inline seedy | Plan |

## Scope

**In scope:** builder wiersza DB w `fixtures.ts`; nowy `src/lib/recipe-edit-roundtrip.test.ts` (idempotencja, mutacja pola, invariant metryk, `updatedAt`); charakteryzacja `null` i brakującego klucza w jsonb; rozszerzenie `recipe-queries.test.ts` o trwałość usunięcia i niezmienność właściciela; wpis do §6 test-planu.

**Out of scope:** jakakolwiek zmiana kodu produkcyjnego; testy handlerów API (brak stubu `astro:env/server`); nowe testy E2E i komponentów React; cross-user PUT/DELETE (Faza 2); testowanie renderowania formularza edycji.

## Architecture / Approach

Testy odtwarzają ścieżkę aplikacji na fake Supabase: seed wiersza → `getRecipe` → `record.data` w roli `initialData` formularza → `buildRecipeInsert` → `updateRecipe` (bez `user_id`, jak handler PUT) → ponowny `getRecipe`. Asercje stoją na wyniku odczytu, nie na wnętrzu fake'a. Wszystko offline, bez Dockera i sekretów.

## Phases at a Glance

| Faza | Co dostarcza | Kluczowe ryzyko |
| --- | --- | --- |
| 1. Builder wiersza DB | Wspólny seed `RecipeRecordRow` w fixtures | Refaktor dotyka zielonych testów — musi być bezinwazyjny |
| 2. Round-trip edycji | Cztery testy rdzenia fazy | Asercja na `updatedAt` flaky, jeśli wiersz powstanie przez insert |
| 3. Zdegradowany jsonb | Charakteryzacja realnego zachowania | Wynik nieznany; wybór pola przykrytego bramką metryk zamaskuje zjawisko |
| 4. Usuwanie i właściciel | Dowód trwałości + strażnik `user_id` | Strażnik nie pokrywa handlera — ograniczenie do odnotowania |
| 5. Cookbook | Wypełniona §6 test-planu | — |

**Prerequisites:** brak — infrastruktura z Fazy 1 (fake Supabase z `update`/`delete`, fixtures) jest gotowa.
**Estimated effort:** ~1–2 sesje, pięć małych faz.

## Open Risks & Assumptions

- Wynik Fazy 3 jest nieznany z założenia. Hipoteza z researchu: `z.coerce.number()` zamienia `null` na `0` (cicha zmiana), a brakujący klucz na `NaN` (głośny błąd). Jeśli hipoteza się potwierdzi, faza kończy się udokumentowanym długiem, nie naprawą.
- Strażnik `user_id` działa na warstwie zapytań i nie zobaczy regresji w samym handlerze PUT. Pełne pokrycie wymagałoby stubu `astro:env/server` — świadomie odłożone.
- Test idempotencji ma sens tylko dlatego, że wiersz w bazie jest już po normalizacji Zod. Gdyby kiedyś pojawiła się ścieżka zapisu omijająca `buildRecipeInsert`, założenie przestaje obowiązywać.

## Success Criteria (Summary)

- Regresja w odczycie, zapisie edycji lub filtrach usuwania zatrzymuje CI, zamiast dojść do użytkownika jako cicho zmieniony przepis.
- Zachowanie aplikacji wobec niekompletnego jsonb jest zapisane w teście, a nie w niczyjej głowie.
- §6 test-planu pozwala kolejnej zmianie odtworzyć te wzorce bez czytania samych testów.
