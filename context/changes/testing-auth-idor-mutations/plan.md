# Testy IDOR na mutacjach przepisów — Implementation Plan

## Overview

Zamknąć Ryzyko #2 z planu testów: udowodnić, że użytkownik A nie może nadpisać ani usunąć przepisu użytkownika B przez `PUT`/`DELETE /api/recipes/:id`.

Dowód składa się z dwóch rozłącznych warstw, bo żadna z nich nie zastępuje drugiej. Warstwa offline (Vitest na fake Supabase) zamraża kontrakt filtra własności w `recipe-queries.ts` — jest darmowa i biegnie w każdym CI. Warstwa realna (Playwright, dwie niezależnie zalogowane tożsamości) dowodzi tego, czego fake udowodnić nie może: że klient SSR faktycznie przenosi cookie sesji do runtime i że PostgreSQL z RLS odrzuca nieuprawnioną mutację.

## Current State Analysis

- Powierzchnia mutacji to `PUT` i `DELETE /api/recipes/:id` (`src/pages/api/recipes/[id].ts:9-76`). `PATCH` z tabeli ryzyk nie istnieje — to dryf terminologii, nie luka.
- Oba handlery same wołają `supabase.auth.getUser()` i zwracają 401 przed dotknięciem bazy; `/api/*` celowo nie należy do `PROTECTED_ROUTES`, więc middleware ich nie chroni.
- `updateRecipe` i `deleteRecipe` filtrują po `id` **oraz** `user_id` (`src/lib/recipe-queries.ts:30-55`); brak dopasowania w update mapuje się na `notFound` → 404.
- RLS `auth.uid() = user_id` obejmuje `UPDATE` (z `WITH CHECK`) i `DELETE`, a granty mutacji ma wyłącznie rola `authenticated` (`supabase/migrations/20260614100000_add_recipe_edit_delete.sql:7-23`).
- Pokrycie testowe kończy się na odczycie: `src/lib/recipe-queries.test.ts` testuje `listRecipes` i `getRecipe`, ale żadna mutacja nie ma testu cross-user — mimo że fake Supabase obsługuje już update, delete i inspekcję `_rows` (`src/lib/__tests__/fake-supabase.ts:142-208`).
- Playwright ma jedną tożsamość: `tests/auth.setup.ts:19-38` zapisuje jeden `storageState`, a `chromium`/`firefox`/`webkit` dzielą ten sam plik (`playwright.config.ts:76-95`). Projekt `guest` dowodzi wyłącznie granicy bez sesji.
- CI uruchamia tylko `--project=guest` z dwoma sekretami Supabase (`.github/workflows/playwright.yml:21-25`); żaden zalogowany scenariusz nie biegnie automatycznie.
- Środowisko testowe to hostowany projekt Supabase (`.env.test`), nie lokalny stack — każdy zapis testowy dotyka współdzielonej bazy.

## Desired End State

Po wdrożeniu:

- Test offline czerwieni się, gdy ktokolwiek usunie `.eq("user_id", userId)` z `updateRecipe` lub `deleteRecipe`, i dowodzi nie tylko statusu wyniku, ale też że wiersz drugiego użytkownika pozostał w stanie nienaruszonym.
- Playwright dysponuje dwiema niezależnie zalogowanymi tożsamościami, przy czym istniejące projekty zalogowane nie wymagają poświadczeń drugiego konta.
- Jedna speca wykonuje realny atak: A z ważną sesją wysyła `PUT` i `DELETE` na identyfikator przepisu B, a stan przepisu B jest weryfikowany sesją B przez stronę `/recipes/:id`.
- Speca zawiera kontrole pozytywne, które wykluczają zielony wynik z niewłaściwego powodu: A potrafi zmodyfikować własny przepis, a B potrafi usunąć swój.
- CI uruchamia atak cross-user na każdym pushu i PR, z czterema sekretami poświadczeń, tworząc i sprzątając własne dane testowe.
- `test-plan.md` opisuje wzorce obu warstw, prostuje nazewnictwo `PATCH` → `PUT` i domyka Fazę 2.

### Key Discoveries:

- **`PUT` waliduje payload przed sprawdzeniem własności**: `buildRecipeInsert` odpala się przed `updateRecipe` (`src/pages/api/recipes/[id].ts:34-40`), więc niekompletny payload zwróci 400 i nigdy nie dotknie filtra własności. Atak musi nieść w pełni poprawny draft, inaczej test jest zielony z niewłaściwego powodu.
- **`DELETE` cross-user zwraca 204, nie 404** (`src/pages/api/recipes/[id].ts:70-75`): `deleteRecipe` zwraca `{ ok: true }` także przy zerowej liczbie usuniętych wierszy. To świadoma idempotencja z kontraktu S-07, a nie luka — dowodem ochrony jest trwałość rekordu, nie status.
- **Strona szczegółów jest jedyną powierzchnią odczytu**: nie istnieje `GET /api/recipes` (decyzja S-05). `/recipes/:id` renderuje `<h1>{record.name}</h1>` dla właściciela i nagłówek „Nie znaleziono przepisu" ze statusem 404 w przeciwnym razie (`src/pages/recipes/[id].astro:16-53`).
- **`POST /api/recipes` zwraca 201 z `{ id }`** (`src/pages/api/recipes/index.ts:46`), co daje testowi identyfikator celu bez dostępu do bazy.
- **Fixtures są importowalne z Playwrighta**: `src/lib/__tests__/fixtures.ts` ciągnie tylko `recipe-schema` (zod + typy), bez `astro:env/server`; alias `@/*` jest w `tsconfig.json:9-11`, który Playwright respektuje.
- **Guard Origin obowiązuje mutacje**: istniejąca speca gościa musi ustawiać `Origin`, by dojść do `getUser()` (`tests/auth-read-boundary.spec.ts:22-30`). To samo dotyczy `PUT` i `DELETE`.

## What We're NOT Doing

- Nie zmieniamy kontraktu `DELETE` na 404 — 204 przy zerowym dopasowaniu jest wiążącą decyzją S-07, a dialog usuwania w UI interpretuje 204 jako sukces.
- Nie zmieniamy polityk RLS, grantów ani żadnego kodu produkcyjnego w `src/pages/api/**` i `src/lib/recipe-queries.ts` — ta zmiana dostarcza dowód, nie poprawkę.
- Nie modelujemy `auth.uid()` ani RLS w fake Supabase; fake pozostaje testem kształtu zapytania.
- Nie używamy klucza service-role do seedowania ani weryfikacji — test, którego celem jest dowód RLS, nie może korzystać ze ścieżki omijającej RLS.
- Nie dodajemy `GET /api/recipes` na potrzeby asercji integralności.
- Nie odtwarzamy ataku przez UI (otwarcie edytora cudzego przepisu) — SSR blokuje tę ścieżkę wcześniej 404, więc test nie dotknąłby handlera mutacji.
- Nie używamy Dockera, lokalnego Supabase ani Testcontainers.
- Nie uruchamiamy w CI projektów `chromium`/`firefox`/`webkit`; zakres CI rośnie wyłącznie o projekt cross-user.

## Implementation Approach

Najpierw najtańszy sygnał: rozszerzyć istniejący plik testów query seamu o mutacje, korzystając z gotowego seedu dwóch użytkowników. Następnie zbudować infrastrukturę drugiej tożsamości jako osobny, opcjonalny tor Playwrighta — tak, by brak poświadczeń konta B nie psuł żadnego istniejącego projektu. Na tej bazie napisać jedną specę wykonującą atak, obudowaną kontrolami pozytywnymi po obu stronach. Na końcu włączyć ją do CI i zsynchronizować dokumentację testową.

## Critical Implementation Details

**Payload ataku musi być poprawnym draftem.** Handler `PUT` waliduje ciało Zodem, zanim dotknie filtra własności. Speca musi wysyłać kompletny draft (z `basics`, `batch`, `malts`, chmielem pozwalającym policzyć metryki) i nadawać mu nazwę jawnie odróżnialną od nazwy przepisu ofiary — nazwa jest asercją: jeśli IDOR by zadziałał, `<h1>` na stronie B pokazałby nazwę atakującego.

**Kontrole pozytywne są częścią dowodu, nie ozdobą.** Test, w którym A dostaje 404, jest zielony również wtedy, gdy URL ma literówkę, sesja wygasła albo payload jest odrzucany. Dlatego ta sama sesja A musi w tym samym przebiegu z powodzeniem zmodyfikować **własny** przepis (200), a sesja B usunąć **własny** (204 + strona przechodzi na „Nie znaleziono przepisu"). Dopiero te dwie kontrole czynią 404/nienaruszalność dowodem własności, a nie dowodem zepsutego żądania.

**Testy współdzielą jeden zaseedowany cel, więc muszą biec seryjnie.** Atak `DELETE` i późniejsze sprzątanie operują na tym samym rekordzie; równoległe wykonanie dałoby wyścig. Speca deklaruje tryb `serial`.

**Współdzielona baza wymaga unikalnych nazw.** Dwa równoległe przebiegi CI (dwa PR-y) korzystają z tego samego projektu Supabase. Nazwy przepisów testowych muszą zawierać składnik unikalny dla przebiegu, a asercje muszą odwoływać się do konkretnego `id` zwróconego przez `POST`, nigdy do „pierwszego przepisu na liście".

## Phase 1: Cross-user mutacje w warstwie zapytań

### Overview

Zamrozić offline'owo defense-in-depth dla mutacji: `updateRecipe` i `deleteRecipe` nigdy nie mogą dosięgnąć wiersza, którego `user_id` nie należy do wołającego.

### Changes Required:

#### 1. Testy mutacji cross-user na fake Supabase

**File**: `src/lib/recipe-queries.test.ts`

**Intent**: Rozszerzyć istniejący plik o mutacje, wykorzystując ten sam seed dwóch użytkowników co testy odczytu, aby jeden plik opisywał całą politykę własności w warstwie zapytań.

**Contract**: Nowy blok `describe` dla mutacji, obok istniejącego bloku izolacji odczytu. Przypadki:

- `updateRecipe(fake, USER_A, RECIPE_B_ID, payload)` zwraca `{ ok: false, notFound: true }`, a wiersz B w `fake._rows` ma niezmienione `name` i `data`;
- `updateRecipe(fake, USER_A, RECIPE_A_ID, payload)` zwraca `{ ok: true }` i faktycznie modyfikuje wiersz A — kontrola pozytywna wykluczająca test zielony przez zepsuty payload;
- `deleteRecipe(fake, USER_A, RECIPE_B_ID)` zwraca `{ ok: true }` (kontrakt idempotencji), ale wiersz B nadal istnieje w `fake._rows`;
- `deleteRecipe(fake, USER_A, RECIPE_A_ID)` usuwa wyłącznie wiersz A, pozostawiając B.

Payload aktualizacji ma być typu `Omit<RecipeInsert, "user_id">` — tego samego, który buduje handler po usunięciu kolumny właściciela. Asercje integralności czytają `fake._rows`, nie wynik funkcji, bo to stan wiersza jest przedmiotem ryzyka.

### Success Criteria:

#### Automated Verification:

- Nowe testy mutacji przechodzą: `npm run test:run`
- Type-check przechodzi: `npm run build`
- Lint jest czysty: `npm run lint`

#### Manual Verification:

- Tymczasowe usunięcie `.eq("user_id", userId)` z `updateRecipe` czerwieni test integralności wiersza B, a nie tylko asercję `notFound`.
- Tymczasowe usunięcie `.eq("user_id", userId)` z `deleteRecipe` czerwieni test trwałości wiersza B.

**Implementation Note**: Po ukończeniu tej fazy i przejściu automatycznej weryfikacji zatrzymaj się na potwierdzenie manualne przed kolejną fazą.

---

## Phase 2: Druga tożsamość E2E

### Overview

Dodać drugie, niezależne konto Playwrighta jako osobny tor, tak aby istniejące projekty zalogowane nadal działały bez poświadczeń konta B.

### Changes Required:

#### 1. Wspólny helper logowania

**File**: `tests/support/sign-in.ts` (nowy)

**Intent**: Wyciągnąć z obecnego setupu logikę logowania przez formularz wraz z obejściem hydratacji, aby oba konta logowały się dokładnie tą samą, już zweryfikowaną ścieżką.

**Contract**: Eksportuje funkcję przyjmującą `page`, e-mail, hasło i docelową ścieżkę `storageState`. Zachowuje obecne zachowanie `tests/auth.setup.ts:12-37`: ponawianie `fill` do skutku z powodu hydratacji wyspy React, oczekiwanie na `/` po zalogowaniu, potwierdzenie sesji wejściem na `/recipes` i dopiero potem zapis stanu. Plik nie może pasować do wzorców testowych żadnego projektu (nie jest ani `*.spec.ts`, ani `*.setup.ts`).

#### 2. Delegacja istniejącego setupu

**File**: `tests/auth.setup.ts`

**Intent**: Sprowadzić setup konta A do wywołania wspólnego helpera, bez zmiany zachowania i bez wprowadzania zależności od konta B.

**Contract**: Nadal czyta `E2E_USERNAME`/`E2E_PASSWORD`, nadal rzuca czytelnym błędem przy ich braku i nadal zapisuje do `STORAGE_STATE`. Brak poświadczeń konta B nie może wpływać na ten plik.

#### 3. Setup drugiego konta

**File**: `tests/auth-crossuser.setup.ts` (nowy)

**Intent**: Zalogować konto B do osobnego pliku stanu, uruchamiane wyłącznie przez tor cross-user.

**Contract**: Czyta `E2E_USERNAME_B`/`E2E_PASSWORD_B`, zapisuje do `STORAGE_STATE_B`. Przy braku zmiennych rzuca błędem wskazującym `.env.test` i `.env.example` — analogicznie do setupu konta A. Dodatkowo asertuje, że e-mail konta B różni się od `E2E_USERNAME`; identyczne konta uczyniłyby cały test cross-user bezwartościowym, dając fałszywie zielony wynik nie do wykrycia z samych asercji.

#### 4. Projekty Playwrighta dla toru cross-user

**File**: `playwright.config.ts`

**Intent**: Rozdzielić dotychczasowy jeden projekt `setup` na dwa niezależne tory i dodać projekt wykonujący atak, nie zmieniając zachowania projektów istniejących.

**Contract**:

- Eksport `STORAGE_STATE_B` obok obecnego `STORAGE_STATE`, wskazujący osobny plik w `playwright/.auth/`.
- Stała wzorca dla nowej specy (analogicznie do obecnego `GUEST_SPEC`).
- Projekt `setup` zawęża `testMatch` z `/.*\.setup\.ts/` do samego pliku konta A — inaczej pociągnąłby setup konta B i związał wszystkie zalogowane projekty z poświadczeniami B.
- Nowy projekt setupu konta B, dopasowany do `tests/auth-crossuser.setup.ts`.
- Nowy projekt `crossuser`: Desktop Chrome, **bez** `storageState` na poziomie projektu (speca jawnie tworzy konteksty obu tożsamości), `dependencies` na oba setupy, `testMatch` na nową specę.
- `testIgnore` projektów `chromium`/`firefox`/`webkit` rozszerzone o nową specę — dziś wykluczają wyłącznie specę gościa, więc bez tej zmiany uruchomiłyby atak cross-user z pojedynczą tożsamością A.

#### 5. Dokumentacja zmiennych środowiskowych

**File**: `.env.example`

**Intent**: Ujawnić, że pełny suite E2E wymaga dwóch odrębnych kont.

**Contract**: Dodaje `E2E_USERNAME_B` i `E2E_PASSWORD_B` z komentarzem, że musi to być inne konto niż `E2E_USERNAME`, używane wyłącznie przez tor cross-user. Plik pozostaje wolny od realnych wartości.

### Success Criteria:

#### Automated Verification:

- Oba setupy przechodzą i produkują dwa różne pliki stanu: `npx playwright test --project=setup --project=<setup konta B>`
- Istniejące projekty zalogowane nadal przechodzą lokalnie bez ustawionych zmiennych konta B: `npx playwright test --project=chromium`
- Projekt gościa nadal przechodzi: `npx playwright test --project=guest`
- Type-check przechodzi: `npm run build`
- Lint jest czysty: `npm run lint`

#### Manual Verification:

- Oba pliki `storageState` zawierają różne tokeny sesji — nie są kopią tej samej tożsamości.
- Usunięcie `E2E_USERNAME_B` powoduje czytelny błąd wyłącznie w torze cross-user; projekty `chromium` i `guest` pozostają zielone.
- Ustawienie `E2E_USERNAME_B` na ten sam adres co `E2E_USERNAME` zatrzymuje setup z jawnym błędem.

**Implementation Note**: Po ukończeniu tej fazy i przejściu automatycznej weryfikacji zatrzymaj się na potwierdzenie manualne przed kolejną fazą.

---

## Phase 3: Speca IDOR cross-user

### Overview

Wykonać realny atak dwiema sesjami i udowodnić, że przepis ofiary przetrwał nienaruszony — z kontrolami pozytywnymi po obu stronach.

### Changes Required:

#### 1. Speca ataku na mutacje cudzego przepisu

**File**: `tests/idor-mutations.spec.ts` (nowy)

**Intent**: Przeprowadzić przez uruchomioną aplikację pełną ścieżkę cookie → SSR → RLS dla obu mutacji i zweryfikować stan danych ofiary jej własną sesją.

**Contract**: Speca działa w trybie `serial` (współdzieli jeden zaseedowany cel). Konteksty tworzone jawnie: dwa `APIRequestContext` ze `STORAGE_STATE` i `STORAGE_STATE_B` do żądań mutujących oraz kontekst przeglądarki ze `STORAGE_STATE_B` do asercji na stronie. Wszystkie żądania mutujące niosą nagłówek `Origin` równy `baseURL`.

Przygotowanie: B tworzy przepis przez `POST /api/recipes` (oczekiwane 201, zapamiętany `id`), A tworzy własny przepis dla kontroli pozytywnej. Payloady budowane z `draftWithHops()` (`@/lib/__tests__/fixtures`) z nazwami zawierającymi składnik unikalny dla przebiegu.

Przypadki, w kolejności:

1. **Kontrola pozytywna A**: `PUT` A na własny `id` z poprawnym draftem → 200. Dowodzi, że trasa, sesja i payload są sprawne, więc 404 w kolejnym teście pochodzi z własności.
2. **Atak `PUT`**: `PUT` A na `id` przepisu B, payload z jawnie odróżnialną nazwą atakującego → 404 i JSON `{ error: "Recipe not found" }`. Następnie kontekst B otwiera `/recipes/:idB` i widzi `<h1>` z oryginalną nazwą B; nazwa atakującego nie występuje na stronie.
3. **Atak `DELETE`**: `DELETE` A na `id` przepisu B → 204. Status jest jawnie udokumentowany w teście jako idempotencja z S-07, a nie jako dowód czegokolwiek. Dowodem jest to, że kontekst B nadal renderuje `/recipes/:idB` z oryginalną nazwą, a nie stronę „Nie znaleziono przepisu".
4. **Kontrola pozytywna B i sprzątanie celu**: `DELETE` B na własny `id` → 204, a następnie `/recipes/:idB` w kontekście B pokazuje „Nie znaleziono przepisu". Dowodzi, że usuwanie w ogóle działa — bez tego przetrwanie rekordu w przypadku 3 mogłoby wynikać z zepsutego `DELETE`.

Sprzątanie: przepis A usuwany sesją A po zakończeniu; cel B jest już usunięty przez przypadek 4, a sprzątanie musi być odporne na jego wcześniejsze usunięcie.

### Success Criteria:

#### Automated Verification:

- Speca przechodzi lokalnie z poświadczeniami obu kont: `npx playwright test --project=crossuser`
- Import fixture'ów przez alias `@/` rozwiązuje się pod Playwrightem (speca w ogóle się uruchamia, brak błędu rozwiązywania modułu).
- Projekt gościa i offline suite nadal przechodzą: `npx playwright test --project=guest` oraz `npm run test:run`
- Type-check przechodzi: `npm run build`
- Lint jest czysty: `npm run lint`

#### Manual Verification:

- Po przebiegu w bazie nie pozostają przepisy testowe żadnego z kont.
- Tymczasowe usunięcie `.eq("user_id", userId)` z `updateRecipe` czerwieni przypadek 2 na asercji nazwy na stronie B, a nie tylko na statusie.
- Tymczasowe usunięcie `.eq("user_id", userId)` z `deleteRecipe` czerwieni przypadek 3.
- Podmiana `STORAGE_STATE_B` na `STORAGE_STATE` w spece czerwieni testy ataku — potwierdza, że dwie tożsamości są faktycznie różne i że test mierzy własność.
- Wysłanie payloadu ataku bez wymaganego pola daje 400 zamiast 404, co potwierdza, że kolejność walidacji przed sprawdzeniem własności jest realna i że kontrola pozytywna ma sens.

**Implementation Note**: Po ukończeniu tej fazy i przejściu automatycznej weryfikacji zatrzymaj się na potwierdzenie manualne przed kolejną fazą.

---

## Phase 4: CI, cookbook i synchronizacja statusów

### Overview

Uruchomić atak cross-user na każdym pushu i PR oraz zapisać wzorce obu warstw w trwałej dokumentacji testowej.

### Changes Required:

#### 1. Projekt cross-user w workflow Playwrighta

**File**: `.github/workflows/playwright.yml`

**Intent**: Uczynić z dowodu IDOR kontrolę uruchamianą automatycznie — test istniejący, ale nieuruchamiany, nie chroni przed regresją.

**Contract**: Obecny krok gościa pozostaje bez zmian i nadal nie otrzymuje żadnych poświadczeń. Dodany krok uruchamia `--project=crossuser` z sekretami `SUPABASE_URL`, `SUPABASE_KEY`, `E2E_USERNAME`, `E2E_PASSWORD`, `E2E_USERNAME_B`, `E2E_PASSWORD_B`. Rozdzielenie kroków jest celowe: awaria toru cross-user musi być odróżnialna od awarii granicy gościa. Projekty `chromium`/`firefox`/`webkit` nadal nie biegną w CI.

#### 2. Cookbook Fazy 2 i domknięcie rollout

**File**: `context/foundation/test-plan.md`

**Intent**: Zapisać wzorce dostarczone przez tę zmianę, sprostować nazewnictwo mutacji i domknąć Fazę 2, która była wstrzymana wyłącznie przez Ryzyko #2.

**Contract**:

- §2, wiersz ryzyka #2 oraz kolumna „Co udowodni ochronę": `PATCH` zastąpione przez `PUT`; oczekiwanie „403/404" doprecyzowane do faktycznego kontraktu — `PUT` → 404, `DELETE` → 204 z asercją trwałości rekordu.
- §4: opis E2E uwzględnia dwa konta, dwa pliki `storageState` i projekt `crossuser`; wzmianka o odroczonym cross-user znika.
- §6, Faza 2: dopisany blok wzorców tej zmiany — testy mutacji cross-user na fake Supabase, tor drugiej tożsamości, speca ataku z kontrolami pozytywnymi po obu stronach, cykl życia danych testowych (create → attack → owner-delete → cleanup).
- §3: status Fazy 2 zmieniony na `complete`, a kolumna Change-folder wskazuje oba change foldery Fazy 2.

#### 3. Finalizacja identity zmiany

**File**: `context/changes/testing-auth-idor-mutations/change.md`

**Intent**: Utrzymać zgodność identity change z gotowym planem i sprostować tytuł, który nazywa nieistniejącą metodę.

**Contract**: Tytuł mówi o `PUT`/`DELETE`; frontmatter ma `status: planned` i dzisiejszą datę `updated`.

### Success Criteria:

#### Automated Verification:

- Workflow uruchamia oba projekty w osobnych krokach, a krok gościa nadal nie dostaje poświadczeń.
- Offline suite przechodzi: `npm run test:run`
- Oba projekty E2E przechodzą: `npx playwright test --project=guest` oraz `npx playwright test --project=crossuser`
- Type-check przechodzi: `npm run build`
- Lint jest czysty: `npm run lint`

#### Manual Verification:

- Sekrety `E2E_USERNAME`, `E2E_PASSWORD`, `E2E_USERNAME_B`, `E2E_PASSWORD_B` są dodane w GitHub przed merge, a konto B istnieje w projekcie Supabase i ma potwierdzony e-mail.
- Przebieg CI nie zostawia po sobie przepisów testowych w bazie.
- §2 i §6 nie odwołują się już do `PATCH` ani do odroczonego dowodu cross-user.

**Implementation Note**: Po ukończeniu tej fazy i przejściu automatycznej weryfikacji zatrzymaj się na potwierdzenie manualne.

---

## Testing Strategy

### Integration Tests (Vitest, offline):

- `updateRecipe` cross-user: `notFound` + wiersz ofiary bez zmian.
- `updateRecipe` własny rekord: sukces i faktyczna modyfikacja (kontrola pozytywna).
- `deleteRecipe` cross-user: `ok`, ale wiersz ofiary nadal obecny.
- `deleteRecipe` własny rekord: usuwa wyłącznie wiersz właściciela.

### End-to-End Tests (Playwright, dwie realne sesje):

- A modyfikuje własny przepis → 200 (kontrola pozytywna).
- A `PUT` na przepis B → 404; strona B pokazuje oryginalną nazwę.
- A `DELETE` na przepis B → 204; przepis B nadal istnieje.
- B usuwa własny przepis → 204; strona B pokazuje „Nie znaleziono przepisu" (kontrola pozytywna).

### Manual Testing Steps:

1. Utwórz w Supabase drugie konto testowe z potwierdzonym e-mailem i wpisz je do `.env.test` jako `E2E_USERNAME_B`/`E2E_PASSWORD_B`.
2. Uruchom `npx playwright test --project=crossuser` i potwierdź, że wszystkie cztery przypadki przechodzą.
3. Usuń tymczasowo filtr własności z `updateRecipe`, potwierdź czerwony przypadek ataku `PUT`, przywróć kod.
4. Usuń tymczasowo filtr własności z `deleteRecipe`, potwierdź czerwony przypadek ataku `DELETE`, przywróć kod.
5. Zaloguj się do aplikacji jako oba konta i potwierdź, że po przebiegu żadne nie ma pozostałości przepisów testowych.

## Performance Considerations

Zero zmian w kodzie produkcyjnym, więc brak wpływu na runtime aplikacji. Testy Vitest są in-memory. Tor cross-user dokłada do CI jeden silnik Chromium i dwa logowania przez UI; asercje dotyczą zachowania serwera, więc nie ma powodu mnożyć przeglądarek.

## Migration Notes

Brak migracji danych i schematu. Uruchomienie Fazy 4 wymaga ręcznego utworzenia drugiego konta testowego w Supabase oraz dodania czterech sekretów w GitHub. Do czasu ich konfiguracji krok cross-user w CI będzie czerwony — kolejność wdrożenia to najpierw konto i sekrety, potem merge.

## References

- Research: `context/changes/testing-auth-idor-mutations/research.md`
- Plan testów: `context/foundation/test-plan.md` §2 (#2), §3 (Faza 2), §4, §6
- Poprzednia faza: `context/changes/testing-auth-read-boundary/plan.md`
- Kontrakt S-07: `context/changes/recipe-edit-delete/plan.md`
- Handlery mutacji: `src/pages/api/recipes/[id].ts:9-76`
- Filtry własności: `src/lib/recipe-queries.ts:30-55`
- Fake Supabase: `src/lib/__tests__/fake-supabase.ts:142-208`
- Fixtures draftu: `src/lib/__tests__/fixtures.ts:32-38`
- RLS mutacji: `supabase/migrations/20260614100000_add_recipe_edit_delete.sql:7-23`
- Strona weryfikacji integralności: `src/pages/recipes/[id].astro:16-53`
- Playwright: `playwright.config.ts:29-96`, `tests/auth.setup.ts:19-38`, `tests/auth-read-boundary.spec.ts:22-30`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Cross-user mutacje w warstwie zapytań

#### Automated

- [x] 1.1 Nowe testy mutacji przechodzą: `npm run test:run` — 13ccba5
- [x] 1.2 Type-check przechodzi: `npm run build` — 13ccba5
- [x] 1.3 Lint jest czysty: `npm run lint` — 13ccba5

#### Manual

- [x] 1.4 Usunięcie filtra własności z `updateRecipe` czerwieni asercję integralności wiersza B — 13ccba5
- [x] 1.5 Usunięcie filtra własności z `deleteRecipe` czerwieni asercję trwałości wiersza B — 13ccba5

### Phase 2: Druga tożsamość E2E

#### Automated

- [x] 2.1 Oba setupy produkują dwa różne pliki `storageState` — 58666d3
- [x] 2.2 Istniejące projekty zalogowane przechodzą bez zmiennych konta B: `npx playwright test --project=chromium` — 58666d3
- [x] 2.3 Projekt gościa nadal przechodzi: `npx playwright test --project=guest` — 58666d3
- [x] 2.4 Type-check przechodzi: `npm run build` — 58666d3
- [x] 2.5 Lint jest czysty: `npm run lint` — 58666d3

#### Manual

- [x] 2.6 Pliki stanu zawierają różne tokeny sesji — 58666d3
- [x] 2.7 Brak `E2E_USERNAME_B` psuje wyłącznie tor cross-user — 58666d3
- [x] 2.8 Identyczny e-mail obu kont zatrzymuje setup z jawnym błędem — 58666d3

### Phase 3: Speca IDOR cross-user

#### Automated

- [x] 3.1 Speca przechodzi lokalnie: `npx playwright test --project=crossuser` — 82d043f
- [x] 3.2 Import fixture'ów przez alias `@/` rozwiązuje się pod Playwrightem — 82d043f
- [x] 3.3 Projekt gościa i offline suite nadal przechodzą — 82d043f
- [x] 3.4 Type-check przechodzi: `npm run build` — 82d043f
- [x] 3.5 Lint jest czysty: `npm run lint` — 82d043f

#### Manual

- [x] 3.6 Po przebiegu brak pozostałości danych testowych w bazie — 82d043f
- [x] 3.7 Usunięcie filtra własności z `updateRecipe` czerwieni asercję nazwy na stronie B — 82d043f
- [x] 3.8 Usunięcie filtra własności z `deleteRecipe` czerwieni atak DELETE — 82d043f
- [x] 3.9 Podmiana stanu B na stan A czerwieni testy ataku — 82d043f
- [x] 3.10 Niepoprawny payload ataku daje 400 zamiast 404 — 82d043f

### Phase 4: CI, cookbook i synchronizacja statusów

#### Automated

- [x] 4.1 Workflow uruchamia `guest` i `crossuser` w osobnych krokach, bez poświadczeń w kroku gościa — b2803bb
- [x] 4.2 Offline suite przechodzi: `npm run test:run` — b2803bb
- [x] 4.3 Oba projekty E2E przechodzą — b2803bb
- [x] 4.4 Type-check przechodzi: `npm run build` — b2803bb
- [x] 4.5 Lint jest czysty: `npm run lint` — b2803bb

#### Manual

- [x] 4.6 Cztery sekrety poświadczeń skonfigurowane w GitHub, konto B istnieje z potwierdzonym e-mailem — b2803bb
- [x] 4.7 Przebieg CI nie zostawia danych testowych w bazie — b2803bb
- [x] 4.8 Dokumentacja nie odwołuje się już do `PATCH` ani do odroczonego cross-user — b2803bb
