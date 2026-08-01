# Testy: granica auth na odczyt — Implementation Plan

## Overview

Wdrożyć wydzieloną część Fazy 2 planu testów: automatyczne testy Ryzyka #4 — granicy autoryzacji na odczyt przepisów. Plan potwierdza trzy niezależne warstwy ochrony: jawne filtrowanie właściciela w zapytaniach, decyzję middleware o ochronie ścieżek oraz zachowanie aplikacji wobec gościa w prawdziwej przeglądarce.

Plan nie implementuje testów IDOR mutacji (Ryzyko #2) ani nie uruchamia teraz testu cross-user z realnym JWT. Ta druga inwestycja wymaga drugiego konta E2E i zostaje świadomie odroczona do zmiany Ryzyka #2, gdzie jest warunkiem koniecznym.

## Current State Analysis

- Odczyt przepisów jest wyłącznie SSR-owy: nie istnieje `GET /api/recipes`; `GET` na tej ścieżce zwraca 405, co jest dowodem braku handlera, a nie skutecznej autoryzacji.
- Middleware w `src/middleware.ts:4-24` chroni prefiksowo `/dashboard` i `/recipes`, przekierowując gościa na `/auth/signin`; `/api/*` celowo nie należy do tej listy.
- `listRecipes` i `getRecipe` w `src/lib/recipe-queries.ts:7-25` jawnie filtrują po `user_id`; szczegół przepisu dopasowuje także `id`, a strona SSR zwraca 404 dla braku rekordu (`src/pages/recipes/[id].astro:16-20`).
- RLS w `supabase/migrations/20260609100000_create_recipes.sql:16-22` jest ostatecznym zabezpieczeniem, ale obecny fake Supabase nie modeluje `auth.uid()`, więc Vitest może dowieść tylko kształtu zapytania.
- Vitest nie może obecnie zaimportować middleware z powodu importów `astro:middleware` i `astro:env/server`; istniejące testy są offline i co-located w `src/lib/`.
- Wszystkie aktualne projekty Playwright dziedziczą zalogowany `storageState` (`playwright.config.ts:44-64`), więc nie ma scenariusza gościa. Workflow Playwright nie przekazuje też sekretów Supabase.

## Desired End State

Po wdrożeniu:

- Test offline dowodzi, że lista i szczegół przepisu nie zwracają rekordów drugiego użytkownika, ponieważ oba zapytania zawsze zawierają filtr właściciela.
- Czysta, testowalna funkcja opisuje dokładnie które ścieżki są chronione przez middleware, bez zmiany obecnej semantyki prefiksowego `startsWith`.
- Playwright uruchamia osobny projekt Chromium bez stanu logowania i potwierdza, że strony chronione przekierowują na `/auth/signin`, zaś API odrzuca gościa 401 zanim przetworzy body.
- Testy gościa biegną na CI z prawidłowo skonfigurowanym Supabase, ale bez haseł konta E2E i bez zapisu do wspólnej bazy.
- `test-plan.md` dokumentuje wzorce Fazy 2 oraz jawnie wskazuje odroczony dowód RLS na dwóch realnych użytkownikach.

### Key Discoveries:

- `GET /api/recipes` nie jest granicą auth: handler nie istnieje, więc odpowiedzią jest 405 (`context/changes/testing-auth-read-boundary/research.md:43-52`).
- API wymaga niezależnego checku sesji: `POST`, `PUT` i `DELETE` wywołują `supabase.auth.getUser()` i zwracają 401 przed operacjami DB (`src/pages/api/recipes/index.ts:14-19`, `src/pages/api/recipes/[id].ts:15-20,58-63`).
- `process.loadEnvFile()` nie nadpisuje wcześniej ustawionej wartości; obecny komentarz, że `.env.test` „wygrywa”, nie odpowiada zachowaniu Node. Konfiguracja testowa musi jawnie określać priorytet źródeł env.
- `src/lib/__tests__/fake-supabase.ts` wspiera wiele rekordów i wielokrotne `.eq()`, ale nie emuluje RLS ani `auth.getUser()`.

## What We're NOT Doing

- Nie dodajemy `GET /api/recipes` ani nie zastępujemy SSR-owego odczytu trasą JSON API.
- Nie testujemy IDOR dla `PUT`/`DELETE`; jest to Ryzyko #2 i osobna zmiana Fazy 2.
- Nie tworzymy drugiego konta E2E ani drugiego `storageState`; realny cross-user/RLS zostaje odroczony do zmiany Ryzyka #2.
- Nie modelujemy RLS w fake Supabase i nie testujemy wewnętrznego SDK Supabase.
- Nie używamy Docker, lokalnego Supabase ani Testcontainers.
- Nie zmieniamy polityk RLS, grantów SQL ani `.env.example`; te kwestie nie są konieczne do dostarczenia sygnału Ryzyka #4.
- Nie uruchamiamy zalogowanych projektów Playwright w CI i nie przekazujemy tam `E2E_USERNAME`/`E2E_PASSWORD`.

## Implementation Approach

Zacząć od offline'owego testu query seamu, następnie wyodrębnić czystą decyzję o ochronie ścieżki bez zmiany działania middleware. Na tej podstawie dodać minimalny projekt Playwright dla gościa i specę, która testuje rzeczywiste cookies, redirect oraz check API. Ostatnia faza przekazuje wyłącznie niezbędne sekrety Supabase do tego projektu w CI, zastępuje atrapy testów i synchronizuje dokumentację.

## Critical Implementation Details

`isProtectedPath()` musi zachować aktualną semantykę `startsWith`: `/recipes/new`, `/recipes/:id` oraz obecne over-matche (`/recipesfoo`) pozostają chronione, a `/api/recipes` pozostaje poza gate'em. Nie należy „przy okazji” zmieniać dopasowania na segmentowe.

Projekt Playwright gościa nie może zależeć od projektu `setup` ani korzystać z `storageState`. Test API musi asertować dokładnie 401 dla niezalogowanego `POST /api/recipes`; 500 oznaczałoby, że środowisko testowe nie ma działającej konfiguracji Supabase, a nie poprawnie działający gate auth.

## Phase 1: Izolacja cross-user w warstwie zapytań

### Overview

Zamrozić offline'owo defense-in-depth w `recipe-queries.ts`: każdy odczyt musi zawężać rekordy do przekazanego właściciela.

### Changes Required:

#### 1. Testy listy i szczegółu przepisu dla dwóch użytkowników

**File**: `src/lib/recipe-queries.test.ts` (nowy)

**Intent**: Użyć istniejącego `createFakeSupabase` z seedem rekordów userów A i B, aby dowieść, że lista A nie zawiera danych B i że A nie może pobrać szczegółu po ID B.

**Contract**: Testy wywołują rzeczywiste `listRecipes(fake, userAId)` i `getRecipe(fake, userAId, recipeBId)`. Lista ma zwracać wyłącznie rekordy A, a `getRecipe` dla cudzego ID ma zwracać `null`; dodatkowy przypadek potwierdza, że własny rekord pozostaje dostępny. Seed ma być pełnym `RecipeRecordRow`, zgodnym z istniejącym fake klientem.

### Success Criteria:

#### Automated Verification:

- Nowe testy query seamu przechodzą: `npm run test:run`
- Type-check przechodzi: `npm run build`
- Lint jest czysty: `npm run lint`

#### Manual Verification:

- Tymczasowe usunięcie `.eq("user_id", userId)` z `listRecipes` lub `getRecipe` powoduje czerwony test cross-user.

**Implementation Note**: Po ukończeniu tej fazy i przejściu automatycznej weryfikacji zatrzymaj się na potwierdzenie manualne przed kolejną fazą.

---

## Phase 2: Czysta decyzja ochrony ścieżek middleware

### Overview

Wyciągnąć do importowalnego modułu jedyną decyzję routingu auth, aby Vitest mógł zamrozić tabelę ścieżek bez stubowania Astro.

### Changes Required:

#### 1. Moduł polityki chronionych ścieżek

**File**: `src/lib/protected-routes.ts` (nowy)

**Intent**: Nadać nazwę i testowalny kontrakt aktualnej polityce middleware, bez zmiany listy tras ani sposobu dopasowania.

**Contract**: Eksportuje `isProtectedPath(pathname: string): boolean`; funkcja trzyma listę `/dashboard`, `/recipes` i używa prefiksowego `pathname.startsWith(route)`. Lista nie musi być eksportowana, o ile middleware korzysta wyłącznie z tej funkcji.

#### 2. Delegacja middleware do polityki ścieżek

**File**: `src/middleware.ts`

**Intent**: Zastąpić lokalne `PROTECTED_ROUTES.some(...)` wywołaniem nowej funkcji, pozostawiając pobranie użytkownika, przypisanie `context.locals.user`, redirect 302 i `next()` bez zmian.

**Contract**: `onRequest` ma zachowywać identyczne wyniki dla wszystkich obecnych ścieżek; moduł `src/lib/protected-routes.ts` nie może importować Astro ani Supabase.

#### 3. Jednostkowa tabela zachowania ścieżek

**File**: `src/lib/protected-routes.test.ts` (nowy)

**Intent**: Pokryć zarówno ścieżki chronione, jak i świadomie niechronione, szczególnie granicę `/recipes` kontra `/api/recipes`.

**Contract**: Przypadki pozytywne: `/dashboard`, `/recipes`, `/recipes/new`, `/recipes/:id`, `/recipes/:id/edit`. Przypadki negatywne: `/`, `/auth/signin`, `/api/recipes`, `/api/recipes/:id`. Test ma jawnie zamrażać obecny over-match prefiksu albo udokumentować go jako nieobjęty kontraktem — decyzja: zamrozić go testem dla `/recipesfoo`, aby przyszły refaktor nie zmienił auth semantyki ukradkiem.

### Success Criteria:

#### Automated Verification:

- Test polityki ścieżek przechodzi w Vitest bez aliasów ani stubów `astro:*`: `npm run test:run`
- Type-check przechodzi: `npm run build`
- Lint jest czysty: `npm run lint`

#### Manual Verification:

- Ręczna zmiana `startsWith` na błędne porównanie ścisłe czerwieni test `/recipes/new`.
- Ręczne dodanie `/api/recipes` do testu ochrony bez zmiany implementacji pozostaje czerwone, co potwierdza rozdzielenie API i middleware.

**Implementation Note**: Po ukończeniu tej fazy i przejściu automatycznej weryfikacji zatrzymaj się na potwierdzenie manualne przed kolejną fazą.

---

## Phase 3: Playwright — granica sesji gościa

### Overview

Dodać minimalny projekt Chromium bez sesji oraz specę aplikacji, która testuje faktyczny redirect SSR i niezależny check sesji API.

### Changes Required:

#### 1. Jednoznaczne ładowanie środowiska Playwright i projekt gościa

**File**: `playwright.config.ts`

**Intent**: Ustalić rzeczywisty priorytet `.env`/`.env.test`, aby konfiguracja E2E nie zależała od mylącego komentarza, oraz dodać samodzielny projekt gościa.

**Contract**: `.env` dostarcza bazową konfigurację, `.env.test` może ją świadomie nadpisać zgodnie z udokumentowaną kolejnością. Projekt `guest` używa `Desktop Chrome`, nie ma `storageState` i nie ma zależności od `setup`. Zalogowane projekty zachowują swoje dotychczasowe zachowanie lokalne.

#### 2. Speca granicy auth dla gościa

**File**: `tests/auth-read-boundary.spec.ts` (nowy)

**Intent**: Sprawdzić przez aplikację uruchomioną przez Astro, że gość nie może wejść na strony odczytu ani wykonać żądania API wymagającego sesji.

**Contract**: W projekcie `guest`:

- tabelarycznie sprawdza `/recipes`, `/recipes/new`, `/recipes/nieistniejacy-id`, `/recipes/nieistniejacy-id/edit` i `/dashboard`; każda nawigacja kończy się URL-em `/auth/signin`;
- używa `APIRequestContext` do `POST /api/recipes` bez cookies i asertuje 401 oraz JSON `{ error: "Unauthorized" }`; request nie wysyła body i nie może tworzyć danych;
- wysyła `GET /api/recipes` i asertuje 405 jako inwariant braku powierzchni odczytu, bez interpretowania go jako dowodu auth.

#### 3. Usunięcie testów-atrap

**File**: `tests/example.spec.ts`, `context/foundation/seed.spec.ts`

**Intent**: Zastąpić boilerplate testujący `playwright.dev` specą aplikacji oraz rozstrzygnąć nieuruchamiany, nieaktualny materiał poglądowy.

**Contract**: Usunąć `tests/example.spec.ts`. Usunąć `context/foundation/seed.spec.ts` zamiast przenosić go do `tests/`: ma angielskie selektory wobec polskiego UI, nie należy do `testDir`, a nie reprezentuje zatwierdzonego scenariusza produktu. Nowa speca z punktu 2 jest kanonicznym przykładem testu E2E aplikacji.

### Success Criteria:

#### Automated Verification:

- Projekt gościa przechodzi lokalnie z prawidłowym Supabase: `npx playwright test --project=guest`
- Pełny suite Playwright nadal przechodzi lokalnie po podaniu poświadczeń E2E: `npm run test:e2e`
- Type-check przechodzi: `npm run build`
- Lint jest czysty: `npm run lint`

#### Manual Verification:

- Usunięcie `storageState` z projektu gościa nie jest kompensowane przez zależność od `setup`; testy uruchamiają się bez `E2E_USERNAME` i `E2E_PASSWORD`.
- Celowe usunięcie `getUser()` z `POST /api/recipes` powoduje czerwony test 401.
- Celowe usunięcie `/recipes` z polityki ścieżek powoduje czerwony test redirectu.

**Implementation Note**: Po ukończeniu tej fazy i przejściu automatycznej weryfikacji zatrzymaj się na potwierdzenie manualne przed kolejną fazą.

---

## Phase 4: CI, cookbook i synchronizacja statusów

### Overview

Uruchomić niezalogowane E2E w CI z minimalnym zakresem sekretów oraz zapisać wzorce i odroczone ryzyka w planie testów.

### Changes Required:

#### 1. Workflow Playwright dla projektu gościa

**File**: `.github/workflows/playwright.yml`

**Intent**: Przekształcić obecny niewykonalny workflow w deterministyczną kontrolę granicy sesji na każdym pushu i pull requeście.

**Contract**: Krok uruchomienia przekazuje wyłącznie `SUPABASE_URL` i `SUPABASE_KEY` z sekretów GitHub Actions, po czym wykonuje `npx playwright test --project=guest`. Nie przekazuje `E2E_USERNAME` ani `E2E_PASSWORD`, nie uruchamia `setup` ani projektów zalogowanych. Sekrety muszą być skonfigurowane w repo przed włączeniem wymaganej kontroli CI.

#### 2. Cookbook Fazy 2 i aktualizacja rollout

**File**: `context/foundation/test-plan.md`

**Intent**: Uzupełnić trwałą dokumentację testową rzeczywistymi seamami dostarczonymi przez tę zmianę oraz zachować widoczność niezaadresowanego dowodu RLS.

**Contract**: Sekcja §6 „Faza 2 — Ochrona autoryzacji” opisuje: test dwóch użytkowników na fake Supabase jako test kształtu zapytania, `isProtectedPath` jako seam polityki middleware, projekt Playwright `guest` i API 401 jako guard konfiguracji. §3 aktualizuje Change-folder Fazy 2 na `context/changes/testing-auth-read-boundary/`, ale status Fazy 2 pozostaje `not started`, ponieważ Ryzyko #2 jest nadal niezaimplementowane. Dokument wskazuje, że realne cross-user/RLS przechodzi do osobnej zmiany IDOR.

#### 3. Finalizacja identity zmiany

**File**: `context/changes/testing-auth-read-boundary/change.md`

**Intent**: Utrzymać zgodność identity change z gotowym planem.

**Contract**: Frontmatter ma `status: planned` oraz dzisiejszą datę `updated`; nie oznacza implementacji ani ukończenia.

### Success Criteria:

#### Automated Verification:

- CI uruchamia wyłącznie projekt gościa z sekretami `SUPABASE_URL` i `SUPABASE_KEY`.
- Offline test suite przechodzi: `npm run test:run`
- E2E projektu gościa przechodzi: `npx playwright test --project=guest`
- Type-check przechodzi: `npm run build`
- Lint jest czysty: `npm run lint`

#### Manual Verification:

- Sekrety `SUPABASE_URL` i `SUPABASE_KEY` są dodane do repozytorium GitHub przed merge.
- Workflow nie otrzymuje ani nie loguje poświadczeń `E2E_USERNAME`/`E2E_PASSWORD`.
- §6 i tabela rollout jasno odróżniają ukończone Ryzyko #4 od nadal otwartego Ryzyka #2.

**Implementation Note**: Po ukończeniu tej fazy i przejściu automatycznej weryfikacji zatrzymaj się na potwierdzenie manualne.

---

## Testing Strategy

### Unit Tests:

- `isProtectedPath` dla wszystkich chronionych ścieżek, niechronionych ścieżek API i obecnego over-match prefiksu.

### Integration Tests:

- `listRecipes` i `getRecipe` na fake Supabase z rekordami dwóch użytkowników: własne rekordy są widoczne, cudze są niewidoczne.

### End-to-End Tests:

- Gość jest przekierowywany z `/recipes/*` i `/dashboard` na `/auth/signin`.
- Gość otrzymuje 401 z `POST /api/recipes`, a `GET /api/recipes` pozostaje 405.

### Manual Testing Steps:

1. Ustaw ważne `SUPABASE_URL` i `SUPABASE_KEY` w środowisku lokalnym.
2. Uruchom `npx playwright test --project=guest`; nie ustawiaj `E2E_USERNAME` ani `E2E_PASSWORD`.
3. Usuń tymczasowo `getUser()` z handlera POST i potwierdź, że speca API staje się czerwona; przywróć kod.
4. Usuń tymczasowo `/recipes` z polityki ścieżek i potwierdź czerwony redirect; przywróć kod.

## Performance Considerations

Brak zmian runtime w ścieżce aplikacji poza pojedynczym wywołaniem czystej funkcji zamiast lokalnego `some()`. Testy query są in-memory; E2E gościa uruchamia jeden silnik Chromium, ponieważ asercje dotyczą zachowania serwera, nie różnic renderingowych przeglądarek.

## Migration Notes

Brak migracji danych lub schematu. Włączenie Phase 4 wymaga ręcznego dodania w GitHub Secrets `SUPABASE_URL` i `SUPABASE_KEY`; do czasu ich dodania workflow Playwright nie może być uznany za wiarygodny.

## References

- Research: `context/changes/testing-auth-read-boundary/research.md`
- Plan testów: `context/foundation/test-plan.md` §2 (#4), §3 (Faza 2), §4, §6
- Query seam: `src/lib/recipe-queries.ts:7-25`, fake: `src/lib/__tests__/fake-supabase.ts:21-209`
- Middleware: `src/middleware.ts:4-24`
- SSR paths: `src/pages/recipes/index.astro:9-21`, `src/pages/recipes/[id].astro:12-20`, `src/pages/recipes/[id]/edit.astro:9-16`
- API auth: `src/pages/api/recipes/index.ts:8-19`, `src/pages/api/recipes/[id].ts:9-20,52-63`
- Playwright: `playwright.config.ts:7-15,44-73`, `tests/auth.setup.ts:19-37`, `.github/workflows/playwright.yml`
- Prior testing precedent: `context/changes/testing-seam-save-integrity/plan.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Izolacja cross-user w warstwie zapytań

#### Automated

- [x] 1.1 Nowe testy query seamu przechodzą: `npm run test:run` — 26f82fe
- [x] 1.2 Type-check przechodzi: `npm run build` — 26f82fe
- [x] 1.3 Lint jest czysty: `npm run lint` — 26f82fe

#### Manual

- [x] 1.4 Usunięcie filtra właściciela czerwieni test cross-user — 26f82fe

### Phase 2: Czysta decyzja ochrony ścieżek middleware

#### Automated

- [x] 2.1 Test polityki ścieżek przechodzi bez stubów `astro:*`: `npm run test:run` — 95c492f
- [x] 2.2 Type-check przechodzi: `npm run build` — 95c492f
- [x] 2.3 Lint jest czysty: `npm run lint` — 95c492f

#### Manual

- [x] 2.4 Błędne dopasowanie ścieżki czerwieni test `/recipes/new` — 95c492f
- [x] 2.5 API pozostaje poza polityką middleware — 95c492f

### Phase 3: Playwright — granica sesji gościa

#### Automated

- [x] 3.1 Projekt gościa przechodzi lokalnie: `npx playwright test --project=guest`
- [x] 3.2 Pełny lokalny suite Playwright przechodzi: `npm run test:e2e`
- [x] 3.3 Type-check przechodzi: `npm run build`
- [x] 3.4 Lint jest czysty: `npm run lint`

#### Manual

- [x] 3.5 Projekt gościa nie wymaga poświadczeń E2E
- [x] 3.6 Usunięcie `getUser()` czerwieni test 401
- [x] 3.7 Usunięcie ochrony `/recipes` czerwieni test redirectu

### Phase 4: CI, cookbook i synchronizacja statusów

#### Automated

- [ ] 4.1 CI uruchamia tylko projekt gościa z sekretami Supabase
- [ ] 4.2 Offline test suite przechodzi: `npm run test:run`
- [ ] 4.3 E2E projektu gościa przechodzi: `npx playwright test --project=guest`
- [ ] 4.4 Type-check przechodzi: `npm run build`
- [ ] 4.5 Lint jest czysty: `npm run lint`

#### Manual

- [ ] 4.6 Sekrety Supabase są skonfigurowane w GitHub
- [ ] 4.7 Workflow nie używa poświadczeń konta E2E
- [ ] 4.8 Dokumentacja rozróżnia Ryzyko #4 i otwarte Ryzyko #2
