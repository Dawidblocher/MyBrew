---
project: Beer Recipe Builder
version: 1
created: 2026-06-16
status: active
---

# Plan testów — Beer Recipe Builder

## §1 Strategia

Trzy zasady obowiązujące we wszystkich fazach rollout i we wszystkich testach dodawanych przez `/10x-tdd`:

1. **Koszt × sygnał.** Każdy test — klasyczny lub AI-native — musi odpowiadać na jedno pytanie: _jaki jest najtańszy test, który daje realny sygnał dla tego ryzyka?_ Nie awansuj do e2e, bo „czuje się bezpieczniej"; nie nakładaj modelu wizyjnego na deterministyczny diff, który już łapie regresję. Ten filtr przechodzi do każdej fazy rollout w `/10x-plan`.

2. **Obawy użytkownika to dowód.** Ryzyka, przez które zespół już przechodził lub których się boi, mają taki sam ciężar co linie PRD lub dane hot-spot.

3. **Sygnał, nie wiedza.** Ten plan czyta kod pod kątem _sygnału_ — churnu hot-spot, profilu bazy testów, markera projektu, języka/frameworka. NIE czyta dla _wiedzy_ — grafu wywołań, schematu, tłumaczenia błędów, które linie „posiadają" awarię. Mapa ryzyk §2 cytuje dowody (linie PRD, odpowiedzi z wywiadu, katalogi hot-spot z liczbą commitów); nigdy nie twierdzi, że plik jest „miejscem, gdzie mieszka awaria". To wydobywa `/10x-research` podczas każdej fazy rollout.

---

## §2 Mapa ryzyk

### Tabela ryzyk

| #   | Ryzyko (scenariusz awarii)                                                                                                                                                                                                                                                                  | Impact        | Likelihood   | Dowody (bez anchorów)                                                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Dryf seamu obliczeniowego** — `recipe-to-calc.ts` cicho gubi lub błędnie formatuje pole po zmianie modelu draft → silnik dostaje złe dane → metryki wyglądają poprawnie, są błędne                                                                                                        | Wysoki        | Wysoki       | Wywiad Q1/Q3/Q4; hot-spot dir `src/lib/` (recipe-to-calc — 5 commitów/30d); PRD NFR "brak cichych błędnych liczb" (prd.md linia 44/109)                                    |
| 2   | **IDOR na mutacjach przepisu** — PUT/DELETE `/api/recipes/:id` nie weryfikuje własności przepisu per user → user A może nadpisać lub usunąć przepis usera B                                                                                                                                 | Wysoki        | Średni       | PRD sekcja Access Control; stack (RLS Supabase + SSR klient Cloudflare Workers); hot-spot dir `src/pages/api/` (8 commitów/30d)                                            |
| 3   | **Korupcja zapisu przepisu** — mapowanie draft → Zod schema → DB cicho gubi wymagane pole → przepis zapisany niekompletnie, bez błędu widocznego dla użytkownika                                                                                                                            | Wysoki        | Niski–Średni | PRD FR-011; hot-spot dir `src/lib/` (recipe-schema — 6 commitów/30d); częściowe testy w recipe-save.test.ts już istnieją                                                   |
| 4   | **Granica auth na odczyt** — strony przepisów dostępne bez ważnej sesji lub zwracające dane cudzego użytkownika; odczyt jest wyłącznie SSR-owy (brak `GET /api/recipes` — decyzja z S-05), a `/api/*` jest poza PROTECTED_ROUTES, więc przyszła trasa `GET` startuje bez ochrony middleware | Wysoki        | Niski        | PRD FR-012, Access Control; hot-spot `src/middleware.ts` (2 commity/30d); PROTECTED_ROUTES w middleware; research `context/changes/testing-auth-read-boundary/research.md` |
| 5   | **Dryf round-tripu edycji** — S-07 dodało tryb edycji; mapowanie DB→draft (recipe-mappers) może różnić się od mapowania nowego przepisu, co przy save w trybie edycji korumpuje dane                                                                                                        | Średni–Wysoki | Średni       | hot-spot dir `src/components/recipe/` (40 commitów/30d); zmiana recipe-edit-delete (zaimplementowana); roadmap S-07                                                        |

### Wskazówki odpowiedzi na ryzyko (Risk Response Guidance)

| Ryzyko # | Co udowodni ochronę                                                                                                                                                                                                                                                    | Nie akceptuj ślepo                                                                                                                        | Kontekst dla `/10x-research`                                                                                                                                                                           | Najtańsza warstwa                                                                                                                                            | Antypattern do unikania                                                                                                                                                        |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1        | Pełny draft każdego scenariusza (sam zasyp, zasyp+mash+chmiel, pełny z drożdżami) przez seam produkuje dokładnie typy i wartości, jakich oczekuje silnik                                                                                                               | „testy silnika przechodzą" ≠ „seam mapuje poprawnie" — to różne rzeczy                                                                    | Kształt `RecipeDraft` vs. `RecipeMetricsInput`; pola opcjonalne vs. wymagane w obu; co się dzieje, gdy pole jest `undefined`                                                                           | Test integracyjny (Vitest, node) — bez UI, bez przeglądarki                                                                                                  | Testowanie `calcBLG` w izolacji i zakładanie poprawności seamu                                                                                                                 |
| 2        | PUT z ważną sesją innego użytkownika zwraca 404; DELETE zwraca 204 (idempotencja S-07) przy nienaruszonym rekordzie ofiary — nie tylko „niezalogowany → 401"                                                                                                           | „RLS Supabase chroni" bez sprawdzenia, że SSR klient przesyła cookie sesji do runtime Cloudflare Workers poprawnie                        | Jak `src/pages/api/recipes/[id].ts` tworzy klienta Supabase; czy używa sesji usera czy service key                                                                                                     | Test integracyjny z dwoma użytkownikami (Supabase test lub mock)                                                                                             | Testowanie tylko „niezalogowany dostaje 401" — nie testuje cross-user access                                                                                                   |
| 3        | Pełny draft (wszystkie pola) → save API → odczyt z DB zwraca identyczne wartości; brak pola wymaganego blokuje save z czytelnym błędem                                                                                                                                 | „Zod validation przechodzi" ≠ „DB write kompletny" — Zod sprawdza kształt, nie DB constraints                                             | Zod schema vs. typy encji DB w `src/types.ts`; które pola są required vs. optional w obu warstwach                                                                                                     | Test integracyjny save round-trip                                                                                                                            | Unit-testowanie samej walidacji (częściowo istnieje) bez pełnego round-tripu                                                                                                   |
| 4        | Niezalogowane żądanie do `/recipes`, `/recipes/new`, `/recipes/:id` daje redirect na `/auth/signin`; zalogowany user widzi tylko własne przepisy, a obcy `id` daje 404 (nie 403 — decyzja z S-05); każdy handler w `src/pages/api/recipes/**` sam sprawdza sesję (401) | „middleware chroni strony" ≠ „API routes sprawdzają sesję niezależnie"; 405 na `GET /api/recipes` to dowód braku handlera, nie dowód auth | Które trasy są w PROTECTED_ROUTES (prefiks `startsWith`); czy trasy API wywołują `getUser()` same; czy `src/middleware.ts` jest w ogóle importowalny w Vitest (`astro:middleware`, `astro:env/server`) | Vitest na warstwie zapytań (cross-user, fake Supabase z dwoma userami) + czysta funkcja ścieżek; Playwright w projekcie bez `storageState` dla granicy sesji | Testowanie zachowania Supabase SDK zamiast logiki routingu aplikacji; asercja 403 na `GET /api/recipes` — taki handler nie istnieje, test byłby zielony z niewłaściwego powodu |
| 5        | Przepis załadowany z DB → tryb edycji wizard → save → odczyt zwraca identyczne wartości metryk jak oryginał                                                                                                                                                            | „tryb edycji działa, bo formularz się wypełnia" ≠ „save w trybie edycji produkuje poprawny output"                                        | `recipe-mappers.ts` mapowanie DB→draft; różnice między trybem nowego a edycji w `RecipeWizard` i `useWizardRecipe`                                                                                     | Test integracyjny round-tripu edycji (DB entity → draft → save → DB entity)                                                                                  | Testowanie tylko że formularz edycji renderuje z wartościami — bez weryfikacji outputu zapisu                                                                                  |

---

## §3 Fazowany rollout

> **Słownictwo statusów (literały parsera):** `not started` → `change opened` → `researched` → `planned` → `implementing` → `complete`
>
> Orchestrator (`/10x-test-plan`) odczytuje tę tabelę przy każdym wywołaniu. Aktualizuje kolumny Status i Change-folder w miarę postępu; reszta wiersza jest zamrożona do `--refresh`.

| #   | Nazwa fazy                   | Cel (co ma być udowodnione)                                                                                                | Ryzyka | Typy testów                                         | Status      | Change-folder                                     |
| --- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------- | ----------- | ------------------------------------------------- |
| 1   | Integralność seamu i zapisu  | Udowodnić, że wizard draft → silnik mapuje poprawnie dla wszystkich stanów kreatora i że round-trip zapisu nie gubi danych | #1, #3 | Testy integracyjne (Vitest, node)                   | complete    | context/changes/testing-seam-save-integrity/      |
| 2   | Ochrona autoryzacji          | Udowodnić izolację przepisów per user i że mutacje wymagają potwierdzenia własności zasobu                                 | #2, #4 | Testy integracyjne auth/API (Supabase SSR lub mock) | complete    | context/changes/testing-auth-read-boundary/, context/changes/testing-auth-idor-mutations/ |
| 3   | Round-trip edycji i usuwania | Udowodnić, że tryb edycji S-07 nie korumpuje danych przy save i że usuwanie jest trwałe oraz wymaga bycia właścicielem     | #5     | Testy integracyjne (recipe-mappers + edit flow)     | not started | —                                                 |

---

## §4 Stack

- **Język / framework:** TypeScript, Astro 6 SSR, React 19 islands, Tailwind 4
- **Runtime produkcja:** Cloudflare Workers (adapter `@astrojs/cloudflare`)
- **Auth / DB:** Supabase (PostgreSQL + RLS, klient SSR `@supabase/ssr`, sesje cookie-based)
- **Test runner:** Vitest (skonfigurowany, `vitest.config.ts`, środowisko `node`, `globals: true`, `src/**/*.test.ts`). Brak aliasu/stubu dla `astro:env/server` i `astro:middleware`, więc `src/middleware.ts` i trasy API nie są dziś importowalne w Vitest.
- **E2E runner:** Playwright (`@playwright/test`, `playwright.config.ts`, `testDir: "./tests"`, `webServer: npm run dev`). Projekt `setup` (`tests/auth.setup.ts`) loguje konto A i zapisuje `playwright/.auth/user.json` dla projektów zalogowanych (`chromium`/`firefox`/`webkit`). Osobny setup konta B (`tests/auth-crossuser.setup.ts`) zapisuje `playwright/.auth/user-b.json`. Projekt `guest` (Desktop Chrome, bez `storageState`) pokrywa granicę sesji gościa. Projekt `crossuser` zależy od obu setupów, nie ustawia `storageState` na poziomie projektu i uruchamia `tests/idor-mutations.spec.ts` z jawnymi kontekstami obu tożsamości.
- **CI:** GitHub Actions — lint + build + testy (`npm run test:run`) na każdy push/PR do master (`ci.yml`, sekrety `SUPABASE_*`). Workflow `.github/workflows/playwright.yml` uruchamia `--project=guest` (tylko `SUPABASE_URL`/`SUPABASE_KEY`) oraz osobny krok `--project=crossuser` z sekretami `SUPABASE_*` i czterema poświadczeniami E2E (`E2E_USERNAME`, `E2E_PASSWORD`, `E2E_USERNAME_B`, `E2E_PASSWORD_B`). Projekty `chromium`/`firefox`/`webkit` nie biegną w CI.
- **Profil bazy testów:** Vitest w `src/lib/` (silnik calc, seam zapisu, izolacja zapytań cross-user w tym mutacje, polityka `isProtectedPath`). Playwright: `tests/auth-read-boundary.spec.ts` (gość), `tests/idor-mutations.spec.ts` (cross-user), setupy zalogowane lokalnie. Zero testów komponentów React / stron Astro poza tymi E2E.
- **Stack grounding tools (bieżąca sesja):**
  - Docs: brak Context7 / framework-docs MCP — bez sprawdzenia; sprawdzono: 2026-06-16
  - Search: WebSearch dostępny — bez użycia (stack dobrze znany z kodu); sprawdzono: 2026-06-16
  - Runtime/browser: brak Playwright MCP — nie użyto
  - Provider/platform: brak GitHub/Cloudflare/Supabase MCP — nie użyto

---

## §5 Przestrzeń negatywna

Obszary świadomie wyłączone z budżetu testowego (wywiad Q5 + decyzja projektowa):

- **Snapshot testy UI komponentów** — łamią się przy każdej zmianie Tailwind CSS i nie łapią nic istotnego (decyzja użytkownika, wywiad Q5)
- **Wewnętrzna logika Supabase SDK** — testujemy zachowanie _aplikacji_ wobec auth, nie SDK
- **Statyczne strony Astro (marketing, landing)** — niskie ryzyko, brak logiki
- **Formatowanie / zaokrąglanie metryk w UI** — silnik zwraca pełną precyzję; konsument formatuje; to testy wizualne, nie logiczne
- **Testy wydajności i obciążeniowe** — hobbyistyczna skala, poza zakresem v1

---

## §6 Wzorce cookbook (placeholders — wypełniane przez każdą fazę rollout)

### Faza 1 — Integralność seamu i zapisu

Wzorce z `context/changes/testing-seam-save-integrity/` (change `testing-seam-save-integrity`):

- **`src/lib/__tests__/fixtures.ts`** — współdzielone buildery `draft()`, `draftWithHops()`, `boilHop()` z deep-merge na `defaultRecipeDraft`; scenariusze od sam zasyp po pełny przepis z chmielem.
- **`src/lib/__tests__/fake-supabase.ts`** — in-memory fake klienta Supabase (chainable builder, `insert().select("id").single()`, `getRecipe`); round-trip bez Dockera i sekretów w CI.
- **`src/lib/recipe-to-calc.test.ts`** — golden-vector pełnego draftu (oracle z `src/lib/calc/*.test.ts`); scenariusze „plausible-but-wrong" (asymetria seam↔silnik: `extractPercent:0`, `colorEbc:0`, mieszany grist); konwersje jednostek (`efficiencyPct/100`, `attenuationPct/100`, whirlpool factor, wykluczenie `dryHop`); inwariant parytetu `computeWizardMetrics` ≡ `computeMetrics`.
- **`src/lib/recipe-save-roundtrip.test.ts`** — round-trip `buildRecipeInsert` → fake insert → `getRecipe`; deep-equal `record.data` z `parsed.data`; metryki serwerowe (klient nie może wstrzyknąć kolumn metryk).
- **`src/lib/recipe-save.test.ts`** — walidacja brakujących pól (`field` + polski `message`); błędy metryk (`metrics.ibu`, `metrics.abv`); zamrożenie kontraktu Zod strip nieznanych kluczy (świadomie bez `.strict()`).

Konwencje: Vitest `node`, import z `"vitest"`, wzorzec `CalcResult` (assert `.ok`, potem narrow), tolerancje golden-vector z plików silnika, sentinel `{ok:false}`.

### Faza 2 — Ochrona autoryzacji

Wzorce z `context/changes/testing-auth-read-boundary/` (change `testing-auth-read-boundary`, Ryzyko #4 — odczyt) oraz `context/changes/testing-auth-idor-mutations/` (change `testing-auth-idor-mutations`, Ryzyko #2 — mutacje). Faza 2 w §3 jest `complete`.

**Ryzyko #4 — granica odczytu:**

- **`src/lib/recipe-queries.test.ts`** — izolacja cross-user na fake Supabase (seed rekordów userów A i B). Dowodzi kształtu zapytania: `listRecipes(fake, userA)` nie zawiera wierszy B; `getRecipe(fake, userA, recipeBId)` → `null`; własny rekord pozostaje dostępny. **Nie** emuluje RLS / `auth.uid()` — to test defense-in-depth w warstwie zapytań, nie odmowy DB.
- **`src/lib/protected-routes.ts` + `protected-routes.test.ts`** — czysta funkcja `isProtectedPath(pathname)` z prefiksowym `startsWith` (lista `/dashboard`, `/recipes`). Middleware deleguje do niej bez zmiany semantyki. Tabela zamraża chronione ścieżki, świadomie niechronione `/api/recipes*` oraz obecny over-match (`/recipesfoo`).
- **Projekt Playwright `guest`** (`playwright.config.ts`) — Desktop Chrome, bez `storageState`, bez zależności od `setup`. Spec `tests/auth-read-boundary.spec.ts`: redirect gościa z `/recipes*`, `/dashboard` → `/auth/signin`; `POST /api/recipes` bez cookies → **401** `{ error: "Unauthorized" }` (guard konfiguracji Supabase — 500 oznaczałoby brak env, nie poprawny gate); brak powierzchni odczytu w API (`GET /api/recipes` → 404 w Astro, gdy trasa istnieje bez eksportu GET).

**Ryzyko #2 — IDOR na mutacjach:**

- **`src/lib/recipe-queries.test.ts` (mutacje)** — ten sam seed dwóch użytkowników: `updateRecipe(fake, userA, recipeBId, …)` → `notFound` i wiersz B nienaruszony; `deleteRecipe(fake, userA, recipeBId)` → `{ ok: true }` (idempotencja), ale wiersz B nadal w `fake._rows`. Kontrole pozytywne na własnych rekordach wykluczają zielony wynik z zepsutego payloadu.
- **Tor drugiej tożsamości E2E** — wspólny helper `tests/support/sign-in.ts`; `tests/auth.setup.ts` (konto A → `STORAGE_STATE`); `tests/auth-crossuser.setup.ts` (konto B → `STORAGE_STATE_B`, asercja różnych e-maili). Projekt `crossuser` zależy od obu setupów; brak poświadczeń B nie psuje projektów `chromium`/`guest`.
- **`tests/idor-mutations.spec.ts`** — tryb `serial`; dwa `APIRequestContext` + przeglądarka B; mutacje z nagłówkiem `Origin`. Kolejność: kontrola pozytywna A (`PUT` własny → 200) → atak `PUT` A na B → 404 + strona B z oryginalną nazwą → atak `DELETE` A na B → 204 + rekord B nadal widoczny → kontrola pozytywna B (`DELETE` własny → 204 + „Nie znaleziono przepisu").
- **Cykl życia danych testowych:** create (POST obu kont) → attack → owner-delete (B usuwa cel) → cleanup (A usuwa własny). Nazwy z unikalnym składnikiem przebiegu; asercje po konkretnym `id` z odpowiedzi POST.
- **CI:** `.github/workflows/playwright.yml` — krok `guest` bez poświadczeń; osobny krok `crossuser` z czterema sekretami E2E. Awaria toru cross-user jest odróżnialna od awarii granicy gościa.

### Faza 3 — Round-trip edycji i usuwania

Wzorce z `context/changes/testing-edit-delete-roundtrip/` (change `testing-edit-delete-roundtrip`, Ryzyko #5).

**Sprostowanie Ryzyka #5:** w kodzie nie ma mappera DB→draft. `mapRowToRecord` przepuszcza `data` bez transformacji, a strona edycji wstrzykuje `record.data` prosto w `defaultValues`. Dryf nie leży w rozjeździe dwóch mapowań, lecz w **braku normalizacji przy odczycie** — zapis (`buildRecipeInsert`) trimuje, coerce'uje liczby i stripuje nieznane klucze, odczyt nie. PUT i POST dzielą tę samą bramkę, więc test „edycja liczy metryki inaczej niż create" byłby zielony z niewłaściwego powodu.

- **`src/lib/__tests__/fixtures.ts` (`recipeRow`)** — współdzielony builder `RecipeRecordRow` z deep-merge na `draftWithHops()`, metrykami z `computeWizardMetrics` (lub jawnymi overrides) oraz stałym przeszłym `created_at`/`updated_at`. Jedno źródło prawdy dla seedów edycji i usuwania.
- **`src/lib/recipe-edit-roundtrip.test.ts`** — ścieżka aplikacji: `getRecipe` → `record.data` jako `initialData` → `buildRecipeInsert` → `updateRecipe` (bez `user_id`) → `getRecipe`. Zamraża: idempotencję bez zmian, mutację jednego pola z przeliczeniem metryk, invariant kolumn metryk względem `after.data`, stempel `updatedAt` (późniejszy niż seedowany `created_at`, `createdAt` nietknięte).
- **Charakteryzacja zdegradowanego jsonb** (ten sam plik, osobny `describe`) — pola spoza silnika metryk (`mash.waterToGrainRatio`): `null` → `z.coerce.number` zapisuje `0` (cicha korupcja — świadomie nie naprawiana); brakujący klucz → `ok: false` z `field: mash.waterToGrainRatio`. Nazwy testów nazywają zjawisko wprost.
- **`src/lib/recipe-queries.test.ts` (własne DELETE / strażnik właściciela)** — po `deleteRecipe` własnego rekordu: `getRecipe` → `null`, `listRecipes` bez niego (pozostałe własne zostają). Asercje na `fake._rows` zostają jako uzupełnienie. `updateRecipe` z normalnym payloadem nie zmienia `user_id` — strażnik kontraktu payloadu warstwy zapytań, nie dowód stripu w handlerze PUT (trasy API nieimportowalne w Vitest). Cross-user DELETE pozostaje w Fazie 2.

Konwencje: seed wiersza przez `createFakeSupabase([recipeRow(...)])` ze stałym znacznikiem w przeszłości — **nie** przez `insert`, gdy asercja dotyczy `updated_at` (insert i update w tej samej milisekundzie dają flaky równość). Punktem wyjścia round-tripu jest odczytane `record.data`, nie draft, z którego wiersz powstał. Vitest `node`, fake Supabase, zero zmian w kodzie produkcyjnym.
