# Testy: granica auth na odczyt — Plan Brief

> Full plan: `context/changes/testing-auth-read-boundary/plan.md`
> Research: `context/changes/testing-auth-read-boundary/research.md`

## What & Why

Ta zmiana dodaje automatyczne testy Ryzyka #4 z planu testów: gość nie może wejść na SSR-owe strony przepisów, a użytkownik nie odczyta rekordów należących do innego użytkownika. Odczyt jest celowo SSR-only — nie ma `GET /api/recipes` — dlatego plan testuje brak tej powierzchni jako inwariant, a nie udaje, że 405 jest odpowiedzią auth.

## Starting Point

Ochrona istnieje w trzech warstwach: middleware przekierowuje gościa z `/dashboard` i `/recipes*`, query layer dodaje `user_id` do każdego odczytu, a Supabase RLS ogranicza SELECT do `auth.uid() = user_id`. Nie ma jednak testów middleware ani auth, fake Supabase nie emuluje RLS, a wszystkie bieżące projekty Playwright są zalogowane.

## Desired End State

Vitest wyłapuje usunięcie filtra właściciela z odczytów oraz zmianę tabeli chronionych ścieżek. Chromium uruchomiony jako gość potwierdza prawdziwy redirect SSR i 401 niezależnej trasy API, a ten minimalny scenariusz biegnie na CI z konfiguracją Supabase, ale bez poświadczeń konta E2E i bez zapisu do bazy.

## Key Decisions Made

| Decision            | Choice                                    | Why (1 sentence)                                                                                                           | Source          |
| ------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------- |
| Test layers         | Seamy A + B + D                           | Łączą najtańszy offline signal, testowalną politykę tras i rzeczywistą granicę sesji.                                      | Research / Plan |
| Middleware seam     | `isProtectedPath()` w `src/lib/`          | Unika stubowania Astro w Vitest i zachowuje bieżącą politykę prefiksów jako jawny kontrakt.                                | Plan            |
| Real RLS cross-user | Odroczone do Ryzyka #2                    | Drugie konto E2E jest konieczne dla IDOR, więc należy zbudować je raz przy zmianie, która bez niego nie może dowieść celu. | Plan            |
| CI E2E              | Tylko projekt gościa na Chromium          | Redirect i 401 są zachowaniem serwera; trzy silniki i konto E2E nie zwiększają tu sygnału.                                 | Plan            |
| API invariant       | 401 na nieautoryzowany POST, 405 na GET   | 401 dowodzi niezależnego checku sesji; 405 dokumentuje brak odczytowego API bez fałszywego twierdzenia o auth.             | Research / Plan |
| Test-atrapy         | Usunąć `example.spec.ts` i `seed.spec.ts` | Żaden nie testuje aktualnej aplikacji ani nie jest wiarygodnym wzorcem dla kolejnych speców.                               | Plan            |

## Scope

**In scope:**

- Cross-user test `listRecipes`/`getRecipe` na istniejącym fake Supabase
- Czysta polityka `isProtectedPath()` i testy jej obecnej semantyki
- Playwright guest project i speca redirect/401/405
- CI dla projektu guest z sekretami `SUPABASE_*`
- Aktualizacja cookbooka i statusów planu testów

**Out of scope:**

- IDOR `PUT`/`DELETE` oraz testy realnego RLS z drugim kontem
- Nowe API GET dla przepisów
- Zmiany polityk RLS, grantów SQL i środowiska DB
- Zalogowane E2E w CI oraz poświadczenia `E2E_*` w GitHub Actions
- Docker, lokalny Supabase i Testcontainers

## Architecture / Approach

`recipe-queries.test.ts` testuje filtr ownera offline na seeded fake DB. `protected-routes.ts` izoluje politykę middleware od Astro, a `protected-routes.test.ts` zamraża ścieżki. Projekt Playwright `guest` działa bez cookies i sprawdza SSR/API przeciwko realnie skonfigurowanemu Supabase; CI uruchamia wyłącznie ten projekt.

## Phases at a Glance

| Phase               | What it delivers                 | Key risk                                        |
| ------------------- | -------------------------------- | ----------------------------------------------- |
| 1. Query cross-user | Offline proof filtrów `user_id`  | Fake nie dowodzi RLS                            |
| 2. Path policy      | Testowalna polityka middleware   | Nie wolno zmienić semantyki prefixu przypadkiem |
| 3. Guest E2E        | Redirect SSR + API 401/405       | E2E wymaga rzeczywistej konfiguracji Supabase   |
| 4. CI + docs        | Automatyczna kontrola i cookbook | Ręczne dodanie sekretów GitHub                  |

**Prerequisites:** Dostęp do GitHub Secrets, by ustawić `SUPABASE_URL` i `SUPABASE_KEY`; działające lokalne wartości tych zmiennych dla E2E.
**Estimated effort:** ~2–3 sesje w 4 fazach.

## Open Risks & Assumptions

- Fake Supabase potwierdza intent aplikacji, ale nie RLS; realny test user A/user B pozostaje długiem do zmiany IDOR.
- Test 401 jest wiarygodny tylko z prawidłowym Supabase; CI musi otrzymać sekrety przed merge.
- Bieżąca polityka `startsWith` obejmuje także `/recipesfoo`; plan celowo zamraża to zachowanie zamiast je zmieniać ubocznie.

## Success Criteria (Summary)

- Usunięcie filtra właściciela, ochrony `/recipes` lub API `getUser()` powoduje czerwony właściwy test.
- Gość nie widzi chronionych stron i otrzymuje 401 z API przy skonfigurowanym Supabase.
- Na CI działa wyłącznie bezpieczny, bezstanowy projekt Chromium bez sekretów konta E2E.
