---
date: 2026-08-01T11:58:00+02:00
researcher: Dawid Blocher
git_commit: e936bf525f0deec4be9829f891443db38872987c
branch: master
repository: Dawidblocher/MyBrew
topic: "Granica auth na odczyt (Plan testów — Ryzyko #4)"
tags: [research, codebase, auth, middleware, rls, recipe-queries, playwright, vitest]
status: complete
last_updated: 2026-08-01
last_updated_by: Dawid Blocher
---

# Research: Granica auth na odczyt (Ryzyko #4)

**Data**: 2026-08-01 11:58 (UTC+2)
**Researcher**: Dawid Blocher
**Git commit**: `e936bf52` (uwaga: drzewo robocze brudne — większość plików `src/` jest nietrackowana, patrz „Uwaga o stanie repo")
**Branch**: master
**Repository**: Dawidblocher/MyBrew

## Research Question

Ryzyko #4 z `context/foundation/test-plan.md:31`: _„API trasy lub strony przepisów
dostępne bez ważnej sesji lub zwracające dane cudzego użytkownika"_. Jak faktycznie
wygląda dziś granica auth na odczyt, gdzie jest krucha, i jaka jest najtańsza
warstwa testowa dająca realny sygnał — integracyjna (Vitest) czy E2E (Playwright)?

Zakres ustalony z użytkownikiem: **tylko Ryzyko #4 (odczyt)**, obie warstwy testowe
brane pod uwagę, wynik jako pełny dokument.

## Summary

Granica odczytu jest dziś **potrójna i domyka się w stronę zamkniętą** (fail-closed):

1. **Middleware** (`src/middleware.ts:18-21`) — prefiksowy gate `startsWith` na
   `["/dashboard", "/recipes"]`; brak usera → `context.redirect("/auth/signin")` (302).
2. **Warstwa zapytań** (`src/lib/recipe-queries.ts:14,22`) — każdy SELECT ma jawne
   `.eq("user_id", userId)`; obcy/nieistniejący `id` → `null` → strona ustawia **404**.
3. **RLS** (`supabase/migrations/20260609100000_create_recipes.sql:16-22`) — RLS
   włączone, polityka SELECT tylko dla roli `authenticated` z `auth.uid() = user_id`.

**Najważniejsze odkrycie — premisa ryzyka #4 jest częściowo nieaktualna.**
`GET /api/recipes` **nie istnieje**. Żadna trasa pod `src/pages/api/recipes/` nie
eksportuje `GET`: `index.ts` ma tylko `POST` (`src/pages/api/recipes/index.ts:8`),
`[id].ts` tylko `PUT` i `DELETE` (`src/pages/api/recipes/[id].ts:9,52`). Odczyt listy
i szczegółu jest w 100% SSR-owy — decyzja z S-05
(`context/changes/saved-recipes-list/plan.md:14`, `plan-brief.md:33`: _„Out of scope:
GET/JSON API route"_). W praktyce niezalogowane `GET /api/recipes` zwraca **405**, nie
403 i nie redirect. Test napisany dosłownie według `test-plan.md:41`
(„niezalogowany → redirect/403 na `/recipes` **i** `/api/recipes`") byłby testem
zielonym z niewłaściwego powodu — zaświadczałby o braku handlera, nie o auth.

**Gdzie jest realna kruchość** (i co warto zamrozić testem):

- `/api/*` **świadomie nie jest** w `PROTECTED_ROUTES` (`src/middleware.ts:4`;
  decyzja z S-04, `context/changes/save-recipe/plan.md:14`). Każdy przyszły
  `export const GET` w `src/pages/api/recipes/**` startuje z **zerową** ochroną
  middleware i musi sam wywołać `getUser()`. To jest dokładnie ten antypattern, przed
  którym ostrzega `test-plan.md:41` („middleware chroni strony" ≠ „API sprawdza sesję").
- Izolacja cross-user na odczycie opiera się dziś na tym, że wywołujący **przekaże
  poprawny `user.id`** do `getRecipe`/`listRecipes`. Podpis wymusza argument, ale nic
  nie broni przed przekazaniem cudzego id — jedynym prawdziwym bezpiecznikiem jest RLS,
  której **żaden istniejący test nie dotyka** (fake klient nie modeluje `auth.uid()`).
- Brak env Supabase to fail-closed na stronach (redirect) i 500 na API, **ale**
  `src/lib/config-status.ts` jest wyłącznie kosmetyczny (banner w `Layout.astro`) —
  nie gate'uje niczego.

**Rekomendacja warstw** (szczegóły w „Rekomendowane seamy testowe"):
tanie i szybkie — Vitest na `recipe-queries.ts` (cross-user + kształt zapytania) oraz
czysta funkcja decyzji middleware; drogie, ale jedyne dla prawdziwego sygnału o sesji
i RLS — Playwright z projektem **bez** `storageState` i drugim użytkownikiem.

---

## Detailed Findings

### 1. Middleware — jedyny gate na strony

`src/middleware.ts` w całości (25 linii) to jeden `defineMiddleware`, bez `sequence()`:

- `src/middleware.ts:4` — `const PROTECTED_ROUTES = ["/dashboard", "/recipes"];`
- `src/middleware.ts:18` — dopasowanie **prefiksowe**: `PROTECTED_ROUTES.some((route) => context.url.pathname.startsWith(route))`
- `src/middleware.ts:12` — user rozwiązywany przez `supabase.auth.getUser()` (nigdzie w repo nie ma `getSession()`)
- `src/middleware.ts:13,15` — ustawia **wyłącznie** `context.locals.user` (`User | null`, `src/env.d.ts:1-5`); klient Supabase **nie** jest wkładany na `locals` — każda strona i trasa API tworzy własny przez `createClient(...)`
- `src/middleware.ts:20` — `context.redirect("/auth/signin")` bez jawnego statusu → domyślnie **302**

Konsekwencje dopasowania prefiksowego:

| Ścieżka                                                         | Chroniona przez middleware?                                 |
| --------------------------------------------------------------- | ----------------------------------------------------------- |
| `/recipes`, `/recipes/new`, `/recipes/:id`, `/recipes/:id/edit` | tak                                                         |
| `/dashboard`                                                    | tak                                                         |
| `/api/recipes`, `/api/recipes/:id`                              | **nie** (`"/api/recipes".startsWith("/recipes") === false`) |
| hipotetyczne `/recipes-admin`, `/recipesfoo`                    | tak (over-match; dziś bez znaczenia, brak takich tras)      |

**Fail-closed przy braku env**: `src/lib/supabase.ts:6-8` zwraca `null`, gdy brak
`SUPABASE_URL`/`SUPABASE_KEY` (oba `optional: true` w schemacie env,
`astro.config.mjs:18-19`). Middleware wtedy ustawia `user = null`
(`src/middleware.ts:14-16`) i gate poniżej redirectuje. Nie ma gałęzi „degraded open".

### 2. Powierzchnie odczytu (strony SSR)

`output: "server"` (`astro.config.mjs:11`) — wszystko SSR.

| Plik                                        | Auth                                                      | Filtr własności                    | Wynik dla obcego/braku                                       |
| ------------------------------------------- | --------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------ |
| `src/pages/recipes/index.astro:9,16-21`     | `Astro.locals.user` + `if (supabase && user)`             | `listRecipes(supabase, user.id)`   | brak wiersza → lista bez wpisu; błąd → `pageState = "error"` |
| `src/pages/recipes/[id].astro:12,16-19`     | `Astro.locals.user`, `prerender = false` (`:10`)          | `getRecipe(supabase, user.id, id)` | `record === null` → `Astro.response.status = 404`            |
| `src/pages/recipes/[id]/edit.astro:9,13-16` | jak wyżej, `prerender = false` (`:7`)                     | `getRecipe(supabase, user.id, id)` | `404`                                                        |
| `src/pages/recipes/new.astro`               | **brak własnego guardu** — polega w całości na middleware | n/d (nie czyta przepisów)          | n/d                                                          |
| `src/pages/dashboard.astro:4`               | `Astro.locals.user` (tylko e-mail w UI)                   | n/d                                | n/d                                                          |

Wzorzec `supabase && user ? ... : null` (`[id].astro:16`) sprawia, że nawet przy
obejściu middleware strona nie czyta DB — degraduje do 404, a nie do wycieku.

**Eksport/PDF nie jest osobną granicą auth.** `RecipeExportActions.tsx` dostaje
`record` propsem z SSR (`:9`), `recipe-export.ts` to czyste utilsy bez I/O, a
`RecipePdf.tsx` renderuje tylko propsy. Autoryzacja zdarza się raz — w `[id].astro`.

**Klient nie czyta przez API**: jedyne `fetch` do `/api/recipes*` w `src/` to
`RecipeWizard.tsx:129` (POST/PUT) i `DeleteRecipeDialog.tsx:29` (DELETE).

### 3. Warstwa zapytań — `src/lib/recipe-queries.ts`

```
listRecipes(supabase, userId)   → .select("id, name, style, blg, srm, ibu, abv, created_at").eq("user_id", userId).order(...)   (:11-15)
getRecipe(supabase, userId, id) → .select("*").eq("user_id", userId).eq("id", id).maybeSingle()                                 (:22)
```

- Oba zwracają sentinel zamiast rzucać: `{ ok: false }` (`:17`) i `null` (`:24`).
- Jawne `.eq("user_id", ...)` to **defense-in-depth** ponad RLS — decyzja z S-05
  (`context/changes/saved-recipes-list/plan.md:88`).
- **Nie ma** żadnego miejsca w ścieżce odczytu, które polegałoby wyłącznie na RLS.
  Jedyny SELECT bez `WHERE user_id` to read-back świeżo wstawionego wiersza:
  `src/pages/api/recipes/index.ts:33` (`insert(...).select("id")`) — chroniony przez
  `with check (auth.uid() = user_id)`.

### 4. Powierzchnia API — brak odczytu, mutacje z 401

Pełna inwentaryzacja eksportów HTTP w `src/pages/api/` (weryfikowana grepem):

| Trasa                                 | Metody                         | Auth                                                        |
| ------------------------------------- | ------------------------------ | ----------------------------------------------------------- |
| `api/recipes/index.ts`                | `POST` (`:8`)                  | `getUser()` → **401** (`:17-18`); `!supabase` → 500 (`:11`) |
| `api/recipes/[id].ts`                 | `PUT` (`:9`), `DELETE` (`:52`) | `getUser()` → **401** (`:18-19`, `:61-62`)                  |
| `api/auth/{signin,signup,signout}.ts` | `POST`                         | n/d                                                         |

Zero eksportów `GET` w całym `src/pages/api/`. Niezalogowany `GET /api/recipes`
kończy się **405 Method Not Allowed** (trasa istnieje, metoda nie) — nie 401/403.

Konwencje statusów ustalone historycznie: **401** dla braku sesji na API
(`context/changes/save-recipe/plan.md:30`), **404** dla obcego/nieistniejącego `id`
zamiast 403 — celowo, by nie zdradzać istnienia zasobu
(`context/changes/saved-recipes-list/plan.md:52`).

### 5. Warstwa DB — RLS

`supabase/migrations/20260609100000_create_recipes.sql`:

- `:16` — `alter table public.recipes enable row level security;`
- `:18-22` — polityka SELECT:

```sql
create policy "Users can select own recipes"
  on public.recipes
  for select
  to authenticated
  using (auth.uid() = user_id);
```

- `:24-28` — INSERT `with check (auth.uid() = user_id)`
- `supabase/migrations/20260614100000_add_recipe_edit_delete.sql:8-20` — UPDATE/DELETE, także `auth.uid() = user_id`

Brak polityk `for all`, brak polityk dla `anon`/`public`, nigdzie `using (true)`,
nigdzie `disable row level security`.

**Asymetria GRANT vs RLS** (higiena, nie dziura):
`supabase/migrations/20260609110000_grant_recipes.sql:2` daje
`grant select, insert on table public.recipes to anon, authenticated;` — `anon` ma
przywilej tabelaryczny, ale **żadnej polityki**, więc RLS default-deny zwraca zero
wierszy. `update/delete` nadane tylko `authenticated`
(`20260614100000_add_recipe_edit_delete.sql:23`).

Ręczny snippet do weryfikacji RLS istnieje: `supabase/snippets/Untitled query 172.sql`
(`set local role authenticated` + `request.jwt.claims`) — pokazuje, że RLS da się
testować z poziomu SQL bez UI.

### 6. Stan infrastruktury testowej

**Vitest** (`vitest.config.ts`): `environment: "node"`, `include: ["src/**/*.test.ts"]`,
alias `@` → `./src`, **brak** setup files, **brak** aliasu/stubu dla `astro:env/server`.
10 plików testowych, wszystkie w `src/lib/**`. **Żaden** nie dotyka middleware, tras
API ani auth (potwierdzone; zgodne z `test-plan.md:67`).

Blokery importu w Vitest (łańcuch importów):

```
src/middleware.ts:1   import { defineMiddleware } from "astro:middleware";   ← nierozwiązywalne w Vite/Vitest
src/middleware.ts:2   import { createClient } from "@/lib/supabase";
  └─ src/lib/supabase.ts:3  import { SUPABASE_URL, SUPABASE_KEY } from "astro:env/server";  ← nierozwiązywalne
src/pages/api/recipes/index.ts:2  ten sam createClient → ten sam bloker
```

Dodatkowo `defineMiddleware` owija handler, a `APIRoute` potrzebuje kontekstu z
`request` + `cookies` (`AstroCookies`) — nie ma dziś żadnej fabryki takiego kontekstu.

**`src/lib/__tests__/fake-supabase.ts`** — `createFakeSupabase(seed?)` zwraca
chainable builder (`:185-209`, builder `:21-183`):

| Możliwość                                                               | Stan                                               |
| ----------------------------------------------------------------------- | -------------------------------------------------- |
| wiele userów w danych (seed z różnymi `user_id`)                        | tak                                                |
| `.eq()` (wiele filtrów, AND), `.order()`, `.single()`, `.maybeSingle()` | tak (`applyFilters` `:81-83`)                      |
| `insert` / `update` / `delete`                                          | tak                                                |
| `auth.getUser()`                                                        | **nie** — klient nie ma właściwości `auth`         |
| RLS / `auth.uid()`                                                      | **nie** — filtruje tylko to, o co jawnie poprosisz |
| tabele inne niż `recipes`                                               | rzuca                                              |

To znaczy: fake udowodni, że **aplikacja pyta o właściwe wiersze**, ale nigdy nie
udowodni, że **DB odmówi**, gdy aplikacja spyta o złe. Jedyny konsument dziś:
`src/lib/recipe-save-roundtrip.test.ts:16-21` (jeden hardcodowany `USER_ID`).

**Playwright** — nowy w repo, nie opisany w żadnym dokumencie `context/`:

- `playwright.config.ts:9-12` — ładuje `.env` potem `.env.test` (`.env.test` wygrywa)
- `:15` — `STORAGE_STATE = playwright/.auth/user.json` (gitignored, `.gitignore:43-44`)
- `:44-64` — projekt `setup` + `chromium`/`firefox`/`webkit`, **wszystkie** z `storageState: STORAGE_STATE`
- `:68-73` — `webServer: npm run dev` (dev, nie preview), `reuseExistingServer: !CI`
- `tests/auth.setup.ts:24-35` — logowanie **przez UI** (`/auth/signin`, `E2E_USERNAME`/`E2E_PASSWORD`), z retry na hydratację React islanda; weryfikuje sesję wejściem na `/recipes` (`:34-35`)
- `tests/example.spec.ts` — boilerplate strzelający do `playwright.dev`, nie do aplikacji
- `context/foundation/seed.spec.ts` — leży **poza** `testDir: "./tests"`, więc się nie uruchamia; używa angielskich etykiet („New recipe", „Create") wobec polskiego UI → materiał poglądowy, nie test

**CI**: `.github/workflows/ci.yml:25` uruchamia `npm run test:run` (Vitest, offline,
bez env Supabase — baseline z Fazy 1, `testing-seam-save-integrity/research.md:231`).
`.github/workflows/playwright.yml` uruchamia `npx playwright test`, ale **bez żadnych
sekretów** — dev server nie dostanie `SUPABASE_*`, a `auth.setup.ts` nie dostanie
`E2E_*`, więc na CI padnie na `:20-22`.

**Brak izolowanego środowiska testowego**: `.env.example:1-8` wskazuje ten sam projekt
Supabase co produkcja i **jednego** użytkownika E2E. Nie ma drugiego konta, którym
dałoby się udowodnić cross-user.

---

## Analiza luki wobec sformułowania Ryzyka #4

`test-plan.md:41` definiuje, co ma udowodnić ochronę. Konfrontacja z kodem:

| Asercja z planu                                                | Rzeczywistość w kodzie                                                                                                                   | Wniosek dla testu                                                                                                |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| „Niezalogowane żądanie do `/recipes` daje redirect lub 403"    | redirect **302** → `/auth/signin` (`middleware.ts:18-21`); dotyczy też `/recipes/new`, `/recipes/:id`, `/recipes/:id/edit`, `/dashboard` | testowalne i warte testu; asercja: cel redirectu, nie tylko „nie 200"                                            |
| „…lub do `/api/recipes`"                                       | **brak handlera GET** → 405; `/api/*` w ogóle poza `PROTECTED_ROUTES`                                                                    | asercja nie do napisania dosłownie; zamień na inwariant „brak powierzchni odczytu w API" + guard na przyszły GET |
| „zalogowany user widzi tylko własne przepisy"                  | `.eq("user_id")` w `listRecipes`/`getRecipe` + RLS SELECT; obcy `id` → 404                                                               | testowalne na dwóch poziomach: kształt zapytania (Vitest) i realna odmowa DB (E2E/SQL)                           |
| „middleware chroni strony ≠ API sprawdza sesję niezależnie"    | dokładnie tak jest: strony redirect, API `getUser()` → 401 w każdym handlerze osobno                                                     | najcenniejsza rzecz do zamrożenia: **każdy** eksport w `api/recipes/**` sprawdza sesję                           |
| Antypattern: „testowanie Supabase SDK zamiast logiki routingu" | fake klient nie ma `auth`, więc pokusa mockowania SDK jest realna                                                                        | trzymać asercje na poziomie „która ścieżka → jaki status/redirect"                                               |

Dodatkowo w planie testów `test-plan.md:67` twierdzi „Zero testów dla: … tras API,
auth flow, logiki middleware" — to nadal prawda, ale §4 nie wspomina Playwrighta,
który od tego czasu wszedł do repo. To rozjazd dokumentu ze stanem stacku.

---

## Rekomendowane seamy testowe (koszt × sygnał)

Uporządkowane od najtańszego. Żaden nie wymaga Dockera; kolejność zachowuje zasadę
`test-plan.md:14`.

**A. Vitest — izolacja cross-user w warstwie zapytań** (koszt: 1 plik, 0 zależności)
Seam: `listRecipes`/`getRecipe` z `createFakeSupabase` zasianym wierszami **dwóch**
userów. Udowadnia: user B nie dostaje wiersza A (`getRecipe` → `null`), lista A nie
zawiera wierszy B, `getRecipe` filtruje po `user_id` **i** `id` (nie tylko po `id`).
Nie udowadnia: redirectu, sesji, RLS. Prerekwizyt: brak — wzorzec z
`recipe-save-roundtrip.test.ts` wystarcza.

**B. Vitest — czysta funkcja decyzji dostępu** (koszt: mały refactor + 1 plik)
Dziś `src/middleware.ts` jest nieimportowalny w Vitest (`astro:middleware`,
`astro:env/server`). Najtańsze wyjście: wyciągnąć `isProtectedPath(pathname)` (lub
`shouldRedirect(pathname, user)`) do `src/lib/`, zostawiając w middleware tylko
sklejenie. Udowadnia: tabelę ścieżek (`/recipes/:id/edit` → chroniona,
`/api/recipes` → **nie** chroniona, więc API musi mieć własny check). Alternatywa bez
refactoru — aliasy/stuby `astro:*` w `vitest.config.ts` — kupuje mniej sygnału za
więcej konfiguracji.

**C. Vitest — statyczny inwariant powierzchni API** (koszt: 1 mały plik)
Seam: przejść po `src/pages/api/recipes/**` i sprawdzić, że każdy eksportowany
handler HTTP zawiera check sesji przed pracą z DB (albo: że nie istnieje `GET` bez
takiego checku). Brzydkie, ale to jedyny tani strażnik przed regresją „ktoś dodał
`GET` poza `PROTECTED_ROUTES`". Do rozważenia w planie — może przegrać z E2E na
czytelności.

**D. Playwright — niezalogowany dostęp** (koszt: nowy projekt w configu + 1 spec)
Seam: projekt bez `storageState` (dziś **wszystkie** trzy projekty mają
`storageState`, `playwright.config.ts:50,56,62`, więc nie da się dziś wyrazić „gość").
Udowadnia to, czego żaden Vitest nie ruszy: prawdziwe ciasteczka, prawdziwy
`getUser()`, redirect 302 na `/auth/signin` dla `/recipes`, `/recipes/new`,
`/recipes/:id`, `/dashboard`, oraz że `GET /api/recipes` nie zwraca danych
(`request.get()` → asercja na status ≠ 200 i brak body z przepisem).
Prerekwizyty: projekt „guest"; usunąć/zastąpić `tests/example.spec.ts`; sekrety w
`.github/workflows/playwright.yml`.

**E. Playwright — cross-user na realnej sesji i RLS** (koszt: największy)
Udowadnia najmocniejszą wersję ryzyka: user B dostaje 404 na `id` przepisu A i nie
widzi go na liście — z prawdziwym JWT, czyli z RLS w pętli. Prerekwizyty: **drugie
konto** (`E2E_USERNAME_B`/`E2E_PASSWORD_B` + drugi `storageState`), przepis usera A
istniejący deterministycznie (zasiać w spec albo fixture) i decyzja, czy testy mogą
pisać do współdzielonego projektu Supabase. Alternatywa tańsza, ale słabsza jako
regresja: SQL-owy check RLS w stylu `supabase/snippets/Untitled query 172.sql`.

Podział, który wychodzi z tego researchu: **A + D** to minimum dające realny sygnał
dla ryzyka #4 (kształt zapytań offline + prawdziwa granica sesji w przeglądarce),
**B** jest tanim dodatkiem domykającym tabelę ścieżek, **E** to jedyna droga do
udowodnienia RLS i powinna być świadomym wydatkiem, nie domyślnym wyborem.

---

## Code References

- `src/middleware.ts:4` — `PROTECTED_ROUTES = ["/dashboard", "/recipes"]`
- `src/middleware.ts:12` — `supabase.auth.getUser()` jako źródło prawdy o sesji
- `src/middleware.ts:18-21` — prefiksowy gate + `redirect("/auth/signin")`
- `src/lib/supabase.ts:6-8` — `return null` przy braku env (podstawa fail-closed)
- `src/lib/config-status.ts:11-21` — status wyłącznie do bannera, nie gate'uje żądań
- `src/env.d.ts:1-5` — `App.Locals.user: User | null`, brak klienta na `locals`
- `src/lib/recipe-queries.ts:11-15` — `listRecipes` z `.eq("user_id", userId)`
- `src/lib/recipe-queries.ts:21-25` — `getRecipe` z `.eq("user_id").eq("id").maybeSingle()`
- `src/pages/recipes/index.astro:16-21` — guard `supabase && user` przed odczytem
- `src/pages/recipes/[id].astro:16-19` — brak rekordu → `status = 404`
- `src/pages/recipes/[id]/edit.astro:13-16` — ta sama ścieżka odczytu dla edycji
- `src/pages/api/recipes/index.ts:8,17-18` — jedyny `POST`, 401 bez usera
- `src/pages/api/recipes/[id].ts:9,52,18-19,61-62` — `PUT`/`DELETE`, 401 bez usera
- `supabase/migrations/20260609100000_create_recipes.sql:16-28` — RLS + SELECT/INSERT policy
- `supabase/migrations/20260609110000_grant_recipes.sql:2` — `grant select, insert ... to anon, authenticated`
- `supabase/migrations/20260614100000_add_recipe_edit_delete.sql:8-23` — UPDATE/DELETE policy + granty
- `vitest.config.ts:10-14` — `node`, `src/**/*.test.ts`, brak setup/stubów `astro:*`
- `src/lib/__tests__/fake-supabase.ts:185-209` — `createFakeSupabase(seed?)`
- `src/lib/__tests__/fake-supabase.ts:81-83` — `applyFilters` (równość, bez RLS)
- `playwright.config.ts:44-64` — projekt `setup` + 3 przeglądarki, wszystkie z `storageState`
- `tests/auth.setup.ts:19-37` — logowanie przez UI, zapis `storageState`
- `.github/workflows/playwright.yml` — E2E na CI bez sekretów (padnie na `auth.setup.ts:20-22`)

## Architecture Insights

- **Odczyt jest SSR-only i to jest cecha, nie brak.** Brak `GET /api/recipes` oznacza,
  że nie da się obejść auth strony wołaniem JSON-a. Test powinien tę właściwość
  **utrwalać**, a nie zakładać istnienia endpointu.
- **Dwa niezależne reżimy auth w jednej aplikacji**: strony → redirect (302), API →
  `getUser()` w każdym handlerze → 401. Ochrona API nie jest centralna, więc jej
  poprawność jest funkcją dyscypliny przy dodawaniu tras — idealny cel testu-strażnika.
- **404 zamiast 403 to świadoma decyzja** (`saved-recipes-list/plan.md:52`), by nie
  zdradzać istnienia cudzego zasobu. Test cross-user musi asertować **404**; asercja
  „403" byłaby sprzeczna z architekturą.
- **Ownership w dwóch warstwach** (jawne `.eq("user_id")` + RLS) daje testowalność
  offline pierwszej warstwy, ale druga bez realnej sesji jest niewidoczna dla Vitest.
- **`config-status` mierzy, nie chroni** — łatwo pomylić banner z gate'em.

## Historical Context (from prior changes)

- `context/foundation/prd.md:121-125` — Access Control: „Login required", płaski model
  ról, „each user manages their own recipes only", brak sharingu w MVP.
- `context/foundation/prd.md:96-97` — FR-012 (read-only lista przepisów) jako
  powierzchnia odczytu; `roadmap.md:142-151` — slice S-05 ją dostarcza,
  `roadmap.md:66-71` — F-01 wprowadza RLS jako realizację własności.
- `context/changes/wizard-basics-grist-blg-srm/plan.md:24,115` — pierwsza decyzja o
  dodaniu `"/recipes"` do `PROTECTED_ROUTES` (wcześniej tylko `/dashboard`);
  `:127` — „logged out → redirect `/auth/signin`" jako konwencja dla stron.
- `context/changes/save-recipe/plan.md:14,30` — `/api/*` **nie** jest chronione przez
  middleware, więc handler musi sam wywołać `getUser()` i zwrócić 401 przed
  jakąkolwiek pracą; `plan-brief.md:29` — „RLS jest backstopem".
- `context/changes/saved-recipes-list/plan.md:14` — świadoma rezygnacja z GET API dla
  odczytu; `:52` — 404 nieodróżnialne od 403 by design; `:88` — jawne `.eq("user_id")`
  jako defense-in-depth; `:215-216` — **ręczna** procedura testu cross-user (drugi
  user → pusta lista + not-found na obcym id), do dziś niezautomatyzowana.
- `context/changes/recipe-edit-delete/plan.md:48,190` — mutacje cudzego przepisu → 404,
  ta sama konwencja co odczyt.
- `context/changes/testing-seam-save-integrity/plan.md:46-50` — Faza 1 jawnie
  **odrzuciła**: prawdziwą DB/Docker/Testcontainers, testy auth/IDOR/cross-user
  („to Faza 2"), testy warstwy HTTP (statusy → Faza 2); `:94` — „bez `vi.mock` — to
  ręczny fake"; `plan-brief.md:22` — in-memory fake, „CI zostaje offline".
- `context/changes/recipe-export/recipe-export-research.md:18` — Playwright/Puppeteer
  odrzucone **po stronie serwera** (edge runtime); nie dotyczy Playwrighta jako
  runnera testów lokalnie/w CI.
- `context/foundation/infrastructure.md:84` — preview URL-e publiczne, „add Cloudflare
  Access before sharing sensitive staging data" — granica infra, nie aplikacji.
- `context/foundation/test-plan.md:39` — dla Fazy 2 przewidziano „Supabase test lub
  mock", ale żaden dokument nie precyzuje, co to znaczy; nic w `context/` nie opisuje
  Playwrighta ani `.env.test`, które już są w repo.

## Related Research

- `context/changes/testing-seam-save-integrity/research.md` — profil bazy testów,
  ocena opcji (mock vs Docker vs testcontainer), inwentarz braków (`:247`)
- `context/changes/saved-recipes-list/plan.md` — projekt ścieżki odczytu (SSR + RLS)
- `context/changes/recipe-export/research.md:109,144` — eksport czyta przez ten sam
  RLS-owany `getRecipe`

## Open Questions

1. **Czy Faza 2 ma objąć drugie konto E2E?** Bez niego cross-user na realnej sesji
   (seam E) jest nietestowalny, a zostaje tylko kształt zapytań (seam A).
2. **Czy testy E2E mogą pisać do produkcyjnego projektu Supabase?** `.env.example:1`
   wskazuje ten sam projekt; alternatywy: osobny projekt Supabase, lokalny
   `npx supabase start` (Docker — odrzucony w Fazie 1 dla CI), albo E2E tylko lokalnie.
3. **Czy `test-plan.md` §2/§4 zaktualizować** o fakt braku `GET /api/recipes` i o
   obecność Playwrighta w stacku? Dzisiejsze sformułowanie ryzyka #4 prowadzi do testu
   zielonego z niewłaściwego powodu.
4. **Refactor middleware pod testowalność czy aliasy `astro:*` w Vitest?** Wybór
   przesądza, czy tabela chronionych ścieżek jest testowana jednostkowo, czy tylko E2E.
5. **Higiena `.env.example`**: plik zawiera realny klucz publishable oraz realne
   hasło konta E2E (`:5-6`) w wersjonowanym pliku. Do rozstrzygnięcia poza tym
   researchem, ale dotyka wiarygodności granicy auth.
6. **Czy `anon` potrzebuje `grant select, insert`** (`20260609110000_grant_recipes.sql:2`)?
   RLS to dziś neutralizuje, ale grant jest zbędny i myli przy audycie.

## Uwaga o stanie repo

Drzewo robocze jest brudne: większość plików `src/**` (m.in. `middleware.ts`,
`recipe-queries.ts`, trasy API), `playwright.config.ts` i `tests/**` są **nietrackowane**
w git na commicie `e936bf52` (ostatni commit: 2026-07-08). Dlatego wszystkie referencje
w tym dokumencie są lokalne (`plik:linia`) — permalinki GitHub nie byłyby stabilne ani
nawet rozwiązywalne dla nietrackowanych plików.
