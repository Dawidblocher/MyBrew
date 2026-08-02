# Testy IDOR na mutacjach przepisów — Plan Brief

> Full plan: `context/changes/testing-auth-idor-mutations/plan.md`
> Research: `context/changes/testing-auth-idor-mutations/research.md`

## What & Why

Ryzyko #2 planu testów — IDOR na mutacjach przepisu — nie ma dziś żadnego automatycznego pokrycia. Kod wygląda na poprawny (bramka sesji, filtr `user_id`, RLS), ale nic nie broni tych trzech warstw przed cichą regresją. Ta zmiana dostarcza dowód, że użytkownik A nie może nadpisać ani usunąć przepisu użytkownika B przez `PUT`/`DELETE /api/recipes/:id`.

## Starting Point

Mutacje są chronione trzema niezależnymi warstwami i research nie znalazł ścieżki obejścia. Testy pokrywają jednak wyłącznie odczyt: `recipe-queries.test.ts` sprawdza `listRecipes`/`getRecipe`, a Playwright ma jedną tożsamość i jeden `storageState`, przez co realny cross-user był dotąd świadomie odroczony. CI uruchamia tylko projekt gościa.

## Desired End State

Regresja filtra własności czerwieni test w dwóch niezależnych miejscach: offline'owo w warstwie zapytań i realnie w ataku dwiema zalogowanymi sesjami przeciwko uruchomionej aplikacji. Atak biegnie w CI na każdym PR, tworzy i sprząta własne dane, a Faza 2 planu testów zostaje domknięta.

## Key Decisions Made

| Decyzja                          | Wybór                                                        | Dlaczego                                                                                                       | Źródło   |
| -------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | -------- |
| Warstwy dowodu                   | Vitest seam + jeden realny test cross-user                   | Fake nie emuluje `auth.uid()`, więc sam nie dowiedzie RLS ani przekazania sesji do klienta SSR                  | Plan     |
| Druga tożsamość                  | Drugie konto E2E + drugi `storageState`                      | Rozszerza działający wzorzec; żądania niosą prawdziwe cookie tą samą drogą co produkcja                        | Plan     |
| Kontrakt `DELETE` cross-user     | Zachować 204, asertować trwałość rekordu                     | 204 przy zerowym dopasowaniu to wiążąca decyzja S-07; dowodem ochrony jest stan danych, nie status              | Research |
| Weryfikacja integralności        | Strona `/recipes/:id` otwarta sesją B                        | Brak `GET /api/recipes` (S-05) — to jedyna powierzchnia odczytu, ta sama, z której korzysta realny użytkownik   | Plan     |
| Dane testowe                     | Test tworzy przepis B przez API i usuwa go sesją właściciela | Brak zależności od ręcznie utrzymywanego stanu; usunięcie przez właściciela jest jednocześnie kontrolą pozytywną | Plan     |
| Zakres CI                        | Osobny projekt `crossuser` obok `guest`, na każdym pushu     | Test nieuruchamiany nie chroni przed regresją; osobny krok odróżnia awarię IDOR od awarii granicy gościa        | Plan     |
| Nazewnictwo `PATCH`              | Sprostować na `PUT` w tabeli ryzyk                           | `PATCH` nie istnieje w kodzie — to dryf terminologii w test-planie, nie luka                                    | Research |

## Scope

**In scope:**

- Testy Vitest `updateRecipe`/`deleteRecipe` cross-user z asercją stanu wiersza ofiary
- Drugie konto E2E, wspólny helper logowania, dwa `storageState`, nowe projekty Playwrighta
- Speca ataku cross-user z kontrolami pozytywnymi po stronie A i B
- Krok CI dla toru cross-user, cookbook §6, domknięcie Fazy 2

**Out of scope:**

- Jakakolwiek zmiana kodu produkcyjnego, RLS lub grantów — to dowód, nie poprawka
- Zmiana kontraktu `DELETE` na 404
- Modelowanie RLS w fake Supabase, klucz service-role, Docker/Testcontainers
- Atak odtwarzany przez UI (SSR blokuje go 404 przed handlerem mutacji)

## Architecture / Approach

Dwie rozłączne warstwy dowodu. Offline: fake Supabase z seedem dwóch użytkowników zamraża kontrakt filtra własności w `recipe-queries.ts` — darmowo, w każdym CI. Realnie: Playwright loguje dwa konta do osobnych plików stanu, po czym jedna speca w trybie `serial` tworzy cel jako B, atakuje go dwiema mutacjami jako A i weryfikuje stan celu stroną SSR otwartą z powrotem jako B. Kontrole pozytywne po obu stronach (A modyfikuje swój przepis, B usuwa swój) zamykają drogę do zielonego wyniku z niewłaściwego powodu.

## Phases at a Glance

| Faza                                | Co dostarcza                                              | Kluczowe ryzyko                                                                              |
| ----------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1. Cross-user mutacje w Vitest      | Offline'owe zamrożenie filtra własności dla obu mutacji   | Asercja na wyniku funkcji zamiast na stanie wiersza przeoczyłaby faktyczną korupcję danych   |
| 2. Druga tożsamość E2E              | Dwa konta, dwa `storageState`, tor cross-user             | Niezawężony `testMatch` setupu związałby istniejące projekty z poświadczeniami konta B       |
| 3. Speca IDOR cross-user            | Realny atak `PUT`/`DELETE` z weryfikacją integralności    | Niepoprawny payload dałby 400 przed sprawdzeniem własności — test zielony z błędnego powodu  |
| 4. CI, cookbook, statusy            | Atak w CI na każdym PR, domknięta Faza 2                  | Brak sekretów lub konta B czerwieni pipeline; kolejność wdrożenia ma znaczenie               |

**Prerequisites:** drugie konto testowe w Supabase z potwierdzonym e-mailem; cztery sekrety poświadczeń w GitHub Actions przed merge Fazy 4.
**Estimated effort:** ~2 sesje; Faza 1 jest szybka, Fazy 2-3 to główny koszt.

## Open Risks & Assumptions

- Testy zapisują do współdzielonej, hostowanej bazy Supabase — izolacja opiera się na unikalnych nazwach przepisów i odwoływaniu się do konkretnego `id`, nigdy do „pierwszego przepisu na liście".
- Nieudany teardown zostawia śmieci w bazie; sprzątanie musi być odporne na cel już usunięty przez kontrolę pozytywną.
- Zakłada się, że Playwright rozwiąże alias `@/` z `tsconfig.json` przy imporcie fixture'ów draftu — to jawny punkt weryfikacji w Fazie 3.
- Logowanie przez UI w setupie zależy od hydratacji wyspy React; obecne obejście zostaje przeniesione do wspólnego helpera bez zmian.

## Success Criteria (Summary)

- Usunięcie filtra własności z `updateRecipe` lub `deleteRecipe` czerwieni testy w dwóch niezależnych warstwach, w tym na asercji stanu danych — nie tylko na statusie HTTP.
- Atak cross-user biegnie automatycznie na każdym PR i nie zostawia po sobie danych testowych.
- Faza 2 planu testów jest domknięta, a dokumentacja opisuje faktyczny kontrakt mutacji (`PUT` → 404, `DELETE` → 204 z trwałością rekordu).
