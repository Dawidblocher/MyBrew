---
date: 2026-08-01T13:25:00+02:00
researcher: GPT-5.6 Terra
git_commit: f89093fca50b52036350f6f41b430bb5009a86d4
branch: master
repository: Dawidblocher/MyBrew
topic: "Faza 2, Ryzyko #2: IDOR na mutacjach przepisów"
tags: [research, codebase, authentication, idor, recipes, supabase, playwright]
status: complete
last_updated: 2026-08-01
last_updated_by: GPT-5.6 Terra
---

# Research: Faza 2, Ryzyko #2 — IDOR na mutacjach przepisów

**Date**: 2026-08-01T13:25:00+02:00  
**Researcher**: GPT-5.6 Terra  
**Git Commit**: f89093fca50b52036350f6f41b430bb5009a86d4  
**Branch**: master  
**Repository**: Dawidblocher/MyBrew

## Research Question

Jak udowodnić izolację przepisów per użytkownik i brak IDOR dla mutacji przepisu z Fazy 2, Ryzyka #2 w `context/foundation/test-plan.md`?

## Summary

Live implementation nie używa `PATCH`, lecz `PUT /api/recipes/:id` i `DELETE /api/recipes/:id`. Obie mutacje są chronione trzema niezależnymi warstwami: sesją w handlerze, filtrem `id + user_id` w zapytaniu oraz politykami Supabase RLS. Nie znaleziono ścieżki pozwalającej użytkownikowi A zmienić lub usunąć rekord użytkownika B.

Istnieje jednak luka w pokryciu testowym: brak automatycznych testów mutacji cross-user. Najtańszy sygnał to testy Vitest istniejącego seamu `recipe-queries` na fake Supabase. Udowodnią one, że aplikacja przekazuje filtr własności i że rekord B pozostaje nienaruszony. Nie dowiodą jednak przekazania cookie/JWT do klienta SSR ani działania RLS; do pełnego dowodu potrzebny jest test integracyjny z dwiema prawdziwymi, niezależnie zalogowanymi tożsamościami.

`PUT` na cudzym identyfikatorze zwraca 404. `DELETE` świadomie zwraca 204 nawet przy zerowej liczbie usuniętych wierszy (idempotencja), przy czym cudzy rekord pozostaje nienaruszony. To bezpieczne dla integralności danych, ale jest rozbieżne z ogólnym sformułowaniem test-planu „403/404” i wymaga asercji na stanie rekordu, nie wyłącznie statusie HTTP.

## Detailed Findings

### Faktyczna powierzchnia mutacji

- Handler aktualizacji eksportuje `PUT`, a nie `PATCH`; po uwierzytelnieniu buduje payload z `user.id`, usuwa `user_id` z danych aktualizacji i deleguje do `updateRecipe` ([`src/pages/api/recipes/[id].ts:9-50`](https://github.com/Dawidblocher/MyBrew/blob/f89093fca50b52036350f6f41b430bb5009a86d4/src/pages/api/recipes/%5Bid%5D.ts#L9-L50)).
- Ten sam plik eksportuje `DELETE` i wymaga sesji przed wywołaniem `deleteRecipe` ([`src/pages/api/recipes/[id].ts:52-75`](https://github.com/Dawidblocher/MyBrew/blob/f89093fca50b52036350f6f41b430bb5009a86d4/src/pages/api/recipes/%5Bid%5D.ts#L52-L75)).
- Klient kreatora również wysyła `PUT`, więc `PATCH` w nazwie ryzyka i change folderze jest dryfem terminologii, nie obsługiwaną trasą ([`src/components/recipe/RecipeWizard.tsx:129-147`](https://github.com/Dawidblocher/MyBrew/blob/f89093fca50b52036350f6f41b430bb5009a86d4/src/components/recipe/RecipeWizard.tsx#L129-L147)).

### Defense in depth dla własności

- Klient Supabase SSR jest tworzony z ciasteczek bieżącego żądania; aplikacja nie używa service-role key do tych operacji ([`src/lib/supabase.ts:5-23`](https://github.com/Dawidblocher/MyBrew/blob/f89093fca50b52036350f6f41b430bb5009a86d4/src/lib/supabase.ts#L5-L23)).
- `updateRecipe` filtruje po `id` oraz `user_id`; brak pasującego wiersza mapuje na `notFound` ([`src/lib/recipe-queries.ts:30-48`](https://github.com/Dawidblocher/MyBrew/blob/f89093fca50b52036350f6f41b430bb5009a86d4/src/lib/recipe-queries.ts#L30-L48)).
- `deleteRecipe` stosuje identyczny filtr własności ([`src/lib/recipe-queries.ts:51-54`](https://github.com/Dawidblocher/MyBrew/blob/f89093fca50b52036350f6f41b430bb5009a86d4/src/lib/recipe-queries.ts#L51-L54)).
- Payload zapisu ustawia `user_id` wyłącznie na podstawie argumentu pochodzącego z sesji ([`src/lib/recipe-save.ts:19-62`](https://github.com/Dawidblocher/MyBrew/blob/f89093fca50b52036350f6f41b430bb5009a86d4/src/lib/recipe-save.ts#L19-L62)); handler `PUT` usuwa tę kolumnę przed aktualizacją.
- Migracja dla edycji i usuwania nakłada RLS `auth.uid() = user_id` dla `UPDATE` i `DELETE`, z `WITH CHECK` także dla aktualizacji ([`supabase/migrations/20260614100000_add_recipe_edit_delete.sql:7-23`](https://github.com/Dawidblocher/MyBrew/blob/f89093fca50b52036350f6f41b430bb5009a86d4/supabase/migrations/20260614100000_add_recipe_edit_delete.sql#L7-L23)).

### Oczekiwane zachowanie cross-user

| Operacja użytkownika A na rekordzie B | Obecny kontrakt HTTP | Wymagana asercja integralności |
| --- | --- | --- |
| `PUT /api/recipes/:idB` | 404 | dane B pozostają identyczne |
| `DELETE /api/recipes/:idB` | 204 (idempotentnie) | rekord B nadal istnieje |

Nie należy zmieniać asercji DELETE na 403/404 wyłącznie na podstawie tabeli ryzyka. Plan S-07 jawnie wybrał 204 dla delete z zerowym dopasowaniem, a dialog UI interpretuje 204 jako sukces. To jest problem semantyki/UX, nie dowód IDOR: własnościowe filtry i RLS nadal blokują modyfikację danych.

### Dostępne seamy i warstwy testów

- `createFakeSupabase` już obsługuje wielowierszowy stan, łańcuchowe `.eq()`, update, delete i inspekcję rekordów ([`src/lib/__tests__/fake-supabase.ts:37-40`](https://github.com/Dawidblocher/MyBrew/blob/f89093fca50b52036350f6f41b430bb5009a86d4/src/lib/__tests__/fake-supabase.ts#L37-L40), [`src/lib/__tests__/fake-supabase.ts:142-159`](https://github.com/Dawidblocher/MyBrew/blob/f89093fca50b52036350f6f41b430bb5009a86d4/src/lib/__tests__/fake-supabase.ts#L142-L159), [`src/lib/__tests__/fake-supabase.ts:185-208`](https://github.com/Dawidblocher/MyBrew/blob/f89093fca50b52036350f6f41b430bb5009a86d4/src/lib/__tests__/fake-supabase.ts#L185-L208)).
- Testy odczytu dostarczają gotowy układ dwóch użytkowników i rekordów własnych/cudzych ([`src/lib/recipe-queries.test.ts:8-36`](https://github.com/Dawidblocher/MyBrew/blob/f89093fca50b52036350f6f41b430bb5009a86d4/src/lib/recipe-queries.test.ts#L8-L36)).
- Testy query seam powinny dodać: `updateRecipe(fake, userA, recipeBId, payload)` zwraca `notFound`, dane B bez zmian; oraz `deleteRecipe(fake, userA, recipeBId)` nie usuwa wiersza B. To jest najtańszy test obrony aplikacyjnej.
- Fake nie emuluje `auth.uid()` ani RLS. Nie może więc być jedynym dowodem, że runtime SSR przekazuje sesję i że PostgreSQL odrzuca nieuprawnione zapytanie.
- Vitest działa w Node i nie ma aliasu/stubu dla `astro:env/server`; bez wyodrębnienia/zmokowania zależności bezpośredni unit test handlera API nie jest tani ([`vitest.config.ts:10-14`](https://github.com/Dawidblocher/MyBrew/blob/f89093fca50b52036350f6f41b430bb5009a86d4/vitest.config.ts#L10-L14), [`src/lib/supabase.ts:1-3`](https://github.com/Dawidblocher/MyBrew/blob/f89093fca50b52036350f6f41b430bb5009a86d4/src/lib/supabase.ts#L1-L3)).

### Pełny dowód RLS

Pełna integracja musi utworzyć przepis użytkownika B, a następnie wykonać `PUT` i `DELETE` na tym identyfikatorze z niezależną sesją użytkownika A. Następnie należy odczytać stan jako B i potwierdzić niezmienione dane oraz istnienie rekordu.

Obecny Playwright zapisuje storage state tylko jednego konta i wszystkie zalogowane projekty korzystają z tej samej sesji ([`tests/auth.setup.ts:19-37`](https://github.com/Dawidblocher/MyBrew/blob/f89093fca50b52036350f6f41b430bb5009a86d4/tests/auth.setup.ts#L19-L37), [`playwright.config.ts:76-94`](https://github.com/Dawidblocher/MyBrew/blob/f89093fca50b52036350f6f41b430bb5009a86d4/playwright.config.ts#L76-L94)). Projekt `guest` dowodzi wyłącznie granicy bez sesji; workflow CI uruchamia tylko ten projekt i nie przekazuje poświadczeń drugiego konta ([`.github/workflows/playwright.yml:21-25`](https://github.com/Dawidblocher/MyBrew/blob/f89093fca50b52036350f6f41b430bb5009a86d4/.github/workflows/playwright.yml#L21-L25)).

W konsekwencji plan implementacji powinien zdecydować, czy wykorzystać dwa konta E2E z sekretów CI, czy dwie sesje/JWT utworzone w kontrolowanym teście integracyjnym. W obu przypadkach test musi wykonywać żądania z prawdziwym cookie/JWT przeciwko skonfigurowanemu Supabase. Docker/Testcontainers pozostają poza przyjętym budżetem CI.

## Code References

- `src/pages/api/recipes/[id].ts:9-75` — handlery `PUT` i `DELETE`, bramka `getUser()`, mapowanie wyników.
- `src/lib/recipe-queries.ts:30-54` — filtry ownership dla update/delete.
- `src/lib/__tests__/fake-supabase.ts:142-208` — istniejący fake wspierający testy mutacji.
- `supabase/migrations/20260614100000_add_recipe_edit_delete.sql:7-23` — RLS i granty mutacji.
- `tests/auth.setup.ts:19-37` i `playwright.config.ts:76-94` — pojedyncza tożsamość E2E.

## Architecture Insights

- API nie jest chronione middleware: `PROTECTED_ROUTES` obejmuje wyłącznie strony `/dashboard` i `/recipes`. Każdy handler API musi sam wywołać `getUser()`; oba badane handlery to robią.
- Projekt rozróżnia autoryzację aplikacyjną i RLS. Filtr `.eq("user_id", userId)` jest defense-in-depth, a RLS niezależnym backstopem. Testy fake powinny chronić pierwszy kontrakt, test z dwiema sesjami — całą ścieżkę.
- Status DELETE nie przekazuje informacji o własności, bo endpoint jest celowo idempotentny. Test musi sprawdzać trwałość rekordu B po żądaniu A.

## Historical Context (from prior changes)

- `context/changes/save-recipe/plan.md` ustanowił regułę: API samodzielnie uwierzytelnia żądanie i zawsze bierze `user_id` z sesji; `/api/*` nie jest trasą middleware.
- `context/changes/saved-recipes-list/plan.md` przyjął filtr `user_id` jako defense-in-depth i 404 dla niedostępnego zasobu, aby nie ujawniać jego istnienia.
- `context/changes/recipe-edit-delete/plan.md` jest wiążącym kontraktem S-07: `PUT` cross-user → 404, `DELETE` cross-user → 204 z niezmienionym rekordem.
- `context/changes/testing-auth-read-boundary/research.md` ograniczył poprzednią zmianę do Ryzyka #4 i świadomie odroczył dwa konta E2E/JWT dla mutacji.
- `context/foundation/test-plan.md:105-112` potwierdza, że Ryzyko #2 pozostaje otwarte mimo ukończenia testów granicy odczytu.

## Related Research

- `context/changes/testing-auth-read-boundary/research.md` — research granicy auth dla odczytu.
- `context/changes/testing-seam-save-integrity/research.md` — decyzja o fake Supabase i nieużywaniu Dockera/Testcontainers w CI.

## Open Questions

1. Czy zespół chce zachować idempotentne `204` dla cudzej/niewidocznej operacji DELETE, czy zmienić kontrakt na 404? Obecny kod i S-07 wybierają 204; sama zmiana testu byłaby niezgodna z tym kontraktem.
2. Jakie dwa izolowane konta i sekrety mają zasilać cross-user E2E w CI (`E2E_USER_A_*`, `E2E_USER_B_*`), oraz czy środowisko Supabase jest przeznaczone do tworzenia/usuwania danych testowych?
3. Czy pełny dowód RLS ma być Playwrightem, czy krótszym testem API z dwoma prawdziwymi sesjami? Oba wymagają realnego Supabase; wybór wpływa na koszt i konfigurację CI.
