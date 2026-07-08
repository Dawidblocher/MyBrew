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

| #   | Ryzyko (scenariusz awarii)                                                                                                                                                           | Impact        | Likelihood   | Dowody (bez anchorów)                                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Dryf seamu obliczeniowego** — `recipe-to-calc.ts` cicho gubi lub błędnie formatuje pole po zmianie modelu draft → silnik dostaje złe dane → metryki wyglądają poprawnie, są błędne | Wysoki        | Wysoki       | Wywiad Q1/Q3/Q4; hot-spot dir `src/lib/` (recipe-to-calc — 5 commitów/30d); PRD NFR "brak cichych błędnych liczb" (prd.md linia 44/109) |
| 2   | **IDOR na mutacjach przepisu** — PATCH/DELETE `/api/recipes/:id` nie weryfikuje własności przepisu per user → user A może nadpisać lub usunąć przepis usera B                        | Wysoki        | Średni       | PRD sekcja Access Control; stack (RLS Supabase + SSR klient Cloudflare Workers); hot-spot dir `src/pages/api/` (8 commitów/30d)         |
| 3   | **Korupcja zapisu przepisu** — mapowanie draft → Zod schema → DB cicho gubi wymagane pole → przepis zapisany niekompletnie, bez błędu widocznego dla użytkownika                     | Wysoki        | Niski–Średni | PRD FR-011; hot-spot dir `src/lib/` (recipe-schema — 6 commitów/30d); częściowe testy w recipe-save.test.ts już istnieją                |
| 4   | **Granica auth na odczyt** — API trasy lub strony przepisów dostępne bez ważnej sesji lub zwracające dane cudzego użytkownika                                                        | Wysoki        | Niski        | PRD FR-012, Access Control; hot-spot `src/middleware.ts` (2 commity/30d); PROTECTED_ROUTES w middleware                                 |
| 5   | **Dryf round-tripu edycji** — S-07 dodało tryb edycji; mapowanie DB→draft (recipe-mappers) może różnić się od mapowania nowego przepisu, co przy save w trybie edycji korumpuje dane | Średni–Wysoki | Średni       | hot-spot dir `src/components/recipe/` (40 commitów/30d); zmiana recipe-edit-delete (zaimplementowana); roadmap S-07                     |

### Wskazówki odpowiedzi na ryzyko (Risk Response Guidance)

| Ryzyko # | Co udowodni ochronę                                                                                                                                      | Nie akceptuj ślepo                                                                                                 | Kontekst dla `/10x-research`                                                                                                 | Najtańsza warstwa                                                           | Antypattern do unikania                                                                       |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1        | Pełny draft każdego scenariusza (sam zasyp, zasyp+mash+chmiel, pełny z drożdżami) przez seam produkuje dokładnie typy i wartości, jakich oczekuje silnik | „testy silnika przechodzą" ≠ „seam mapuje poprawnie" — to różne rzeczy                                             | Kształt `RecipeDraft` vs. `RecipeMetricsInput`; pola opcjonalne vs. wymagane w obu; co się dzieje, gdy pole jest `undefined` | Test integracyjny (Vitest, node) — bez UI, bez przeglądarki                 | Testowanie `calcBLG` w izolacji i zakładanie poprawności seamu                                |
| 2        | PATCH/DELETE z ważną sesją innego użytkownika zwraca 403/404 (nie tylko „niezalogowany → 401")                                                           | „RLS Supabase chroni" bez sprawdzenia, że SSR klient przesyła cookie sesji do runtime Cloudflare Workers poprawnie | Jak `src/pages/api/recipes/[id].ts` tworzy klienta Supabase; czy używa sesji usera czy service key                           | Test integracyjny z dwoma użytkownikami (Supabase test lub mock)            | Testowanie tylko „niezalogowany dostaje 401" — nie testuje cross-user access                  |
| 3        | Pełny draft (wszystkie pola) → save API → odczyt z DB zwraca identyczne wartości; brak pola wymaganego blokuje save z czytelnym błędem                   | „Zod validation przechodzi" ≠ „DB write kompletny" — Zod sprawdza kształt, nie DB constraints                      | Zod schema vs. typy encji DB w `src/types.ts`; które pola są required vs. optional w obu warstwach                           | Test integracyjny save round-trip                                           | Unit-testowanie samej walidacji (częściowo istnieje) bez pełnego round-tripu                  |
| 4        | Niezalogowane żądanie do `/recipes` lub `/api/recipes` daje redirect lub 403; zalogowany user widzi tylko własne przepisy                                | „middleware chroni strony" ≠ „API routes sprawdzają sesję niezależnie"                                             | Które trasy są w PROTECTED_ROUTES; czy API trasy sprawdzają `context.locals.user` ręcznie                                    | Test integracyjny middleware (lekki, bez UI)                                | Testowanie zachowania Supabase SDK zamiast logiki routingu aplikacji                          |
| 5        | Przepis załadowany z DB → tryb edycji wizard → save → odczyt zwraca identyczne wartości metryk jak oryginał                                              | „tryb edycji działa, bo formularz się wypełnia" ≠ „save w trybie edycji produkuje poprawny output"                 | `recipe-mappers.ts` mapowanie DB→draft; różnice między trybem nowego a edycji w `RecipeWizard` i `useWizardRecipe`           | Test integracyjny round-tripu edycji (DB entity → draft → save → DB entity) | Testowanie tylko że formularz edycji renderuje z wartościami — bez weryfikacji outputu zapisu |

---

## §3 Fazowany rollout

> **Słownictwo statusów (literały parsera):** `not started` → `change opened` → `researched` → `planned` → `implementing` → `complete`
>
> Orchestrator (`/10x-test-plan`) odczytuje tę tabelę przy każdym wywołaniu. Aktualizuje kolumny Status i Change-folder w miarę postępu; reszta wiersza jest zamrożona do `--refresh`.

| #   | Nazwa fazy                   | Cel (co ma być udowodnione)                                                                                                | Ryzyka | Typy testów                                         | Status      | Change-folder                                |
| --- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------- | ----------- | -------------------------------------------- |
| 1   | Integralność seamu i zapisu  | Udowodnić, że wizard draft → silnik mapuje poprawnie dla wszystkich stanów kreatora i że round-trip zapisu nie gubi danych | #1, #3 | Testy integracyjne (Vitest, node)                   | complete    | context/changes/testing-seam-save-integrity/ |
| 2   | Ochrona autoryzacji          | Udowodnić izolację przepisów per user i że mutacje wymagają potwierdzenia własności zasobu                                 | #2, #4 | Testy integracyjne auth/API (Supabase SSR lub mock) | not started | —                                            |
| 3   | Round-trip edycji i usuwania | Udowodnić, że tryb edycji S-07 nie korumpuje danych przy save i że usuwanie jest trwałe oraz wymaga bycia właścicielem     | #5     | Testy integracyjne (recipe-mappers + edit flow)     | not started | —                                            |

---

## §4 Stack

- **Język / framework:** TypeScript, Astro 6 SSR, React 19 islands, Tailwind 4
- **Runtime produkcja:** Cloudflare Workers (adapter `@astrojs/cloudflare`)
- **Auth / DB:** Supabase (PostgreSQL + RLS, klient SSR `@supabase/ssr`, sesje cookie-based)
- **Test runner:** Vitest (skonfigurowany, `vitest.config.ts`, środowisko `node`, `globals: true`, `src/**/*.test.ts`)
- **CI:** GitHub Actions — lint + build + testy (`npm run test:run`) na każdy push/PR do master
- **Profil bazy testów:** `sparse` — Vitest skonfigurowany, 9 plików testowych, wszystkie w `src/lib/` (5 w `src/lib/calc/`, 4 w `src/lib/`). Zero testów dla: `src/components/recipe/`, `src/pages/`, tras API, auth flow, logiki middleware.
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

- TBD — patrz §3 Faza 2. Docelowe wzorce: test IDOR (cross-user PATCH/DELETE → 403/404); test granicy auth (niezalogowany → redirect/403 na `/recipes` i `/api/recipes`).

### Faza 3 — Round-trip edycji i usuwania

- TBD — patrz §3 Faza 3. Docelowe wzorce: test round-tripu edycji (DB entity → wizard draft → save → DB entity — identyczne wartości metryk); test usuwania (DELETE → 404 na odczyt; cross-user DELETE → 403).
