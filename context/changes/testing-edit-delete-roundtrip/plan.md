# Round-trip edycji i trwałość usuwania — Implementation Plan

## Overview

Faza 3 rollowanego planu testów (`context/foundation/test-plan.md`, §3) domyka Ryzyko #5. Dodajemy testy Vitest, które dowodzą, że przepis przepuszczony przez tryb edycji wraca z bazy w niezmienionej postaci, że edycja zmienia dokładnie to, co miała zmienić, oraz że usunięcie własnego przepisu jest potwierdzone ścieżką odczytu aplikacji. Zero zmian w kodzie produkcyjnym, zero nowej infrastruktury testowej.

## Current State Analysis

Research (`research.md`) ustalił trzy rzeczy, które przesuwają punkt ciężkości tej fazy względem sformułowania w test-planie:

- **Mappera DB→draft nie ma.** `mapRowToRecord` przepuszcza `data` bez transformacji (`src/lib/recipe-mappers.ts:38`), a `edit.astro` wstrzykuje `record.data` prosto w `defaultValues` formularza (`src/pages/recipes/[id]/edit.astro:42` → `src/components/hooks/useWizardRecipe.ts:11`). Ryzyko leży w braku normalizacji przy odczycie, nie w rozjeździe dwóch mapowań.
- **PUT i POST dzielą bramkę zapisu.** Oba wołają `buildRecipeInsert` (`src/pages/api/recipes/[id].ts:34`), więc create i edit nie mogą policzyć różnych metryk dla tego samego draftu. Test porównujący te dwie ścieżki byłby zielony z niewłaściwego powodu.
- **Trwałość własnego DELETE nie jest udowodniona ścieżką odczytu.** Istniejąca asercja zagląda do `fake._rows` (`src/lib/recipe-queries.test.ts:134-142`), a nie woła `getRecipe` / `listRecipes`.

Infrastruktura jest gotowa: fake Supabase obsługuje `update()` i `delete()` z filtrami `eq` oraz projekcję `select("id")` (`src/lib/__tests__/fake-supabase.ts:142-160`), a `updateRecipe` stempluje `updated_at` (`src/lib/recipe-queries.ts:38`). Trzy pliki testowe budują dziś wiersz DB własnym inline seedem (`recipe-queries.test.ts:16-33`, `recipe-mappers.test.ts:6-22`).

## Desired End State

`npm run test:run` zawiera zestaw testów, które przechodzą i które **zapalą się na czerwono**, gdy: odczyt zacznie gubić lub zmieniać pole draftu, edycja zacznie zapisywać metryki niezgodne z zapisanym `data`, edycja przestanie stemplować `updated_at`, usunięcie przestanie być widoczne przez `getRecipe`/`listRecipes`, albo update zacznie zmieniać właściciela wiersza. Dodatkowo zachowanie aplikacji wobec niekompletnego jsonb jest udokumentowane testem charakteryzującym, więc przyszła zmiana tego zachowania będzie świadoma, a nie przypadkowa.

Weryfikacja: `npm run test:run` zielony, `npm run lint` zielony, §6 test-planu zawiera wzorce Fazy 3.

### Key Discoveries

- `buildRecipeInsert` liczy metryki z surowego `draft`, a zapisuje `parsed.data` (`src/lib/recipe-save.ts:34` vs `:60`) — po pierwszym zapisie dane są już znormalizowane, więc round-trip powinien być idempotentny; to czyni idempotencję falsyfikowalnym testem, a nie tautologią.
- `updatePayload()` w `recipe-queries.test.ts:41-46` odtwarza dokładnie kształt, jaki handler PUT przekazuje po zdjęciu `user_id` — gotowy wzorzec dla warstwy zapytań.
- Fake przy insercie ustawia `created_at === updated_at` (`fake-supabase.ts:116-129`), a `updateRecipe` nadpisuje `updated_at` bieżącym czasem.
- Zod nie ma `.strict()`, więc nieznane klucze są cicho usuwane — kontrakt zamrożony w `recipe-save-roundtrip.test.ts:69-84`.
- `draftWithHops(overrides)` wstawia `...overrides` **po** `basics`, więc podanie samego `basics.name` gubi `style: "American IPA"` i zostawia `""` z `baseDraft`. Przy zapisie `style` jest wymagany (`.min(1)`), więc taki draft nie przejdzie walidacji.

## What We're NOT Doing

- Nie zmieniamy kodu produkcyjnego — żadnego merge z `defaultRecipeDraft` przy odczycie, żadnej walidacji Zod w `getRecipe`, żadnej zmiany kontraktów HTTP.
- Nie testujemy handlerów API (`PUT`/`DELETE`) — trasy są nieimportowalne w Vitest przy braku stubu `astro:env/server`, a dokładanie tego stubu to osobny wątek infrastrukturalny.
- Nie duplikujemy Fazy 2: cross-user PUT → 404 i cross-user DELETE → 204 z nienaruszonym rekordem ofiary są już pokryte w Vitest i w `tests/idor-mutations.spec.ts`.
- Nie dodajemy testów E2E ani komponentów React — własny DELETE z widokiem „Nie znaleziono przepisu" jest już w Fazie 2.
- Nie testujemy renderowania formularza edycji z wartościami — to antypattern wskazany wprost w test-planie dla Ryzyka #5.
- Nie zmieniamy wiersza Fazy 3 w §3 test-planu — tę kolumnę prowadzi orchestrator `/10x-test-plan`.

## Implementation Approach

Wszystkie testy działają offline na fake Supabase, w konwencji Fazy 1: seed → operacja przez funkcje z `src/lib/` → asercja na wyniku odczytu, nie na wnętrzu fake'a. Round-trip edycji symulujemy dokładnie tak, jak robi to aplikacja: `getRecipe` zwraca `record`, `record.data` gra rolę `initialData` formularza, a zapis idzie przez `buildRecipeInsert` → `updateRecipe` (bez `user_id`, tak jak handler PUT).

Fazy 1 i 4 dotykają istniejących plików testowych, więc idą jako pierwsza i ostatnia zmiana o niskim ryzyku. Faza 3 jest jedyną z nieznanym wynikiem — najpierw obserwacja zachowania, potem asercja.

## Critical Implementation Details

**Timing & lifecycle.** `updateRecipe` ustawia `updated_at` na `new Date().toISOString()`, a fake przy insercie ustawia `created_at === updated_at` z tego samego zegara. Insert i update wykonane w tej samej milisekundzie dadzą identyczny znacznik i uczynią asercję na `updatedAt` flaky. Dlatego testy round-tripu edycji **seedują wiersz przez `createFakeSupabase([row])` ze stałym, przeszłym znacznikiem czasu**, zamiast tworzyć go przez `insert`. Insert zostaje tylko tam, gdzie znacznik nie jest przedmiotem asercji.

**State sequencing.** Round-trip musi czytać przez `getRecipe` **przed** ponownym zapisem — punktem wyjścia jest to, co widzi formularz (`record.data`), a nie draft, z którego wiersz powstał. Zapisanie oryginalnego draftu zamiast odczytanego `data` omija dokładnie ten szew, który faza ma testować.

---

## Phase 1: Współdzielony builder wiersza DB

### Overview

Wyniesienie seeda `RecipeRecordRow` do wspólnych fixtures i przepięcie istniejących testów, żeby kolejne fazy miały jedno źródło prawdy dla wiersza bazy.

### Changes Required

#### 1. Fixtures

**File**: `src/lib/__tests__/fixtures.ts`

**Intent**: Dodać builder wiersza bazodanowego, żeby testy edycji i usuwania nie powielały inline seedów rozsianych dziś po trzech plikach.

**Contract**: Nowy eksport zwracający `RecipeRecordRow` (typ z `@/lib/recipe-mappers`) z deep-partial overrides w konwencji istniejącego `draft()`. Domyślnie: `data` z `draftWithHops()`, `name`/`style` spójne z `data.basics`, metryki spójne z `computeWizardMetrics(data)` lub jawnie podane, `created_at` i `updated_at` jako stały ISO w przeszłości (nie `new Date()`). Overrides muszą pozwalać nadpisać `id`, `user_id`, `name`, `data` oraz oba znaczniki czasu niezależnie.

#### 2. Przepięcie istniejących seedów

**File**: `src/lib/recipe-queries.test.ts`, `src/lib/recipe-mappers.test.ts`

**Intent**: Zastąpić lokalne `seedRow` / `recordRow` nowym builderem, bez zmiany asercji i bez zmiany wartości, na których te testy dziś stoją.

**Contract**: Zestaw i wyniki testów pozostają identyczne — to refaktor. `recipe-mappers.test.ts` opiera asercje na konkretnych wartościach (`"recipe-1"`, `12.5`, daty czerwcowe), więc albo przekazuje je jako overrides, albo zostaje przy własnym literałze, jeśli builder miałby wymusić na nim nienaturalne obejścia. Decyzja należy do implementera po zobaczeniu obu plików — kryterium jest czytelność, nie DRY za wszelką cenę.

### Success Criteria

#### Automated Verification

- Testy przechodzą bez zmian w liczbie i nazwach: `npm run test:run`
- Lint i typy: `npm run lint`

#### Manual Verification

- Nowy builder daje się użyć bez rzutowań i bez `as` w miejscu wywołania

**Implementation Note**: Po zakończeniu fazy i zielonej weryfikacji automatycznej zatrzymaj się na potwierdzenie od człowieka przed przejściem dalej.

---

## Phase 2: Round-trip edycji

### Overview

Rdzeń fazy: dowód, że przejście przez tryb edycji nie zmienia danych, a zamierzona zmiana zmienia dokładnie jedno pole i przelicza metryki.

### Changes Required

#### 1. Nowy plik testów round-tripu edycji

**File**: `src/lib/recipe-edit-roundtrip.test.ts`

**Intent**: Odtworzyć ścieżkę, którą chodzi aplikacja w trybie edycji (`getRecipe` → `record.data` jako `initialData` → `buildRecipeInsert` → `updateRecipe` → `getRecipe`), i zamrozić jej własności.

**Contract**: Lokalny helper round-tripu w konwencji `saveAndRead` z `recipe-save-roundtrip.test.ts:12-23`, przyjmujący wiersz seedowany builderem z Fazy 1 i opcjonalną mutację `data`, zwracający rekord przed i po. Payload update'u nie zawiera `user_id` — tak jak `updatePayload()` w `recipe-queries.test.ts:41-46`.

Cztery testy:

- **Idempotencja** — zapis odczytanego `data` bez żadnej zmiany daje `after.data` głęboko równe `before.data` oraz metryki równe co do `toBeCloseTo(…, 5)`.
- **Mutacja jednego pola** — zmiana pojedynczej wartości wpływającej na metryki (np. `malts[0].amountKg`) daje `after.data` równe klonowi `before.data` z podmienionym tym jednym polem, a metryki różne od wyjściowych i zgodne z `computeWizardMetrics(after.data)`.
- **Invariant metryk** — kolumny `after.blg/srm/ibu/abv` odpowiadają przeliczeniu z zapisanego `after.data`, nie z draftu wejściowego.
- **Znacznik edycji** — `after.updatedAt` różni się od seedowanego `created_at` i jest od niego późniejszy; `createdAt` pozostaje nietknięte.

### Success Criteria

#### Automated Verification

- Nowe testy przechodzą: `npm run test:run`
- Lint i typy: `npm run lint`

#### Manual Verification

- Test mutacji faktycznie zapala się na czerwono po ręcznym uszkodzeniu `mapRowToRecord` (np. podmiana `data: row.data` na płytką kopię z usuniętym polem) — sprawdź i cofnij zmianę
- Test invariantu metryk zapala się po ręcznej podmianie `data: parsed.data` na `data: draft` w `recipe-save.ts` — sprawdź i cofnij

**Implementation Note**: Po zakończeniu fazy i zielonej weryfikacji automatycznej zatrzymaj się na potwierdzenie od człowieka przed przejściem dalej.

---

## Phase 3: Charakteryzacja zdegradowanego jsonb

### Overview

Jedyna faza z nieznanym wynikiem. Ustalamy eksperymentalnie, co dzieje się z wierszem, którego `data` nie odpowiada bieżącemu kształtowi draftu, i zamrażamy zaobserwowane zachowanie.

### Changes Required

#### 1. Testy charakteryzujące

**File**: `src/lib/recipe-edit-roundtrip.test.ts` (osobny `describe`)

**Intent**: Udokumentować, jak zapis reaguje na jsonb z `null` w polu liczbowym oraz na jsonb z brakującym kluczem — to jedyne miejsce, w którym round-trip może cicho zmienić dane użytkownika.

**Contract**: Dwa scenariusze seedowane builderem z Fazy 1, z `data` zdegradowanym po odczycie:

1. pole liczbowe ustawione na `null`,
2. pole liczbowe usunięte z obiektu.

Wybierz pola, które **nie** wchodzą do silnika metryk — zweryfikuj to czytając `src/lib/recipe-to-calc.ts`, a nie na podstawie tego planu; kandydaci to `mash.waterToGrainRatio` i `yeast.fermTempMinC`. Chodzi o to, żeby bramka metryk nie przykryła zjawiska i żeby test mówił o cichej zmianie, a nie o głośnym błędzie.

Każdy scenariusz przepuszczamy przez `buildRecipeInsert` i asertujemy **faktycznie zaobserwowane** zachowanie: albo `ok: false` z konkretnym `field`, albo `ok: true` z konkretną wartością w `insert.data`. Nazwa testu ma nazywać zjawisko wprost (np. że `null` zapisuje się jako `0`), żeby czytelnik nie musiał wnioskować z asercji. Jeśli okaże się, że to cicha korupcja — **nie naprawiaj kodu w tej fazie**; odnotuj to jako znalezisko w §6 test-planu w Fazie 5.

### Success Criteria

#### Automated Verification

- Testy przechodzą i opisują rzeczywiste zachowanie: `npm run test:run`
- Lint i typy: `npm run lint`

#### Manual Verification

- Zaobserwowane zachowanie zapisane w nazwach testów zgadza się z tym, co realnie zwraca `buildRecipeInsert` — sprawdzone przez odwrócenie asercji i zobaczenie komunikatu błędu
- Wybrane pola faktycznie nie uczestniczą w obliczeniach metryk — potwierdzone lekturą `recipe-to-calc.ts`

**Implementation Note**: Po zakończeniu fazy i zielonej weryfikacji automatycznej zatrzymaj się na potwierdzenie od człowieka przed przejściem dalej.

---

## Phase 4: Trwałość usuwania i strażnik właściciela

### Overview

Domknięcie drugiej połowy fazy: usunięcie ma być potwierdzone tą samą ścieżką odczytu, z której korzysta aplikacja, a update nie może zmieniać właściciela wiersza.

### Changes Required

#### 1. Dowód trwałości usunięcia

**File**: `src/lib/recipe-queries.test.ts`

**Intent**: Zastąpić dowód „wiersz zniknął z `fake._rows`" dowodem „aplikacja go już nie widzi", bo to drugie jest tym, co obchodzi użytkownika i co złamie się przy regresji w filtrach zapytania.

**Contract**: Po `deleteRecipe` własnego rekordu: `getRecipe` dla tego `id` zwraca `null`, a `listRecipes` nie zawiera go na liście i zwraca pozostałe rekordy właściciela. Istniejące asercje na `_rows` zostają — nowe je uzupełniają, nie zastępują. Nie ruszamy testów cross-user (Faza 2).

#### 2. Strażnik właściciela przy update

**File**: `src/lib/recipe-queries.test.ts`

**Intent**: Złapać regresję, w której `user_id` przeciekłby do payloadu update'u i cicho przeniósł przepis na innego użytkownika — handler PUT zdejmuje to pole dziś (`src/pages/api/recipes/[id].ts:39`), ale nic tego nie pilnuje.

**Contract**: Po udanym `updateRecipe` własnego rekordu `user_id` wiersza pozostaje niezmieniony. Test musi w komentarzu odnotować swoje ograniczenie: warstwa zapytań nie widzi handlera, więc to strażnik kontraktu payloadu, a nie dowód poprawności trasy PUT.

### Success Criteria

#### Automated Verification

- Testy przechodzą: `npm run test:run`
- Lint i typy: `npm run lint`

#### Manual Verification

- Test trwałości zapala się po ręcznym usunięciu filtra `.eq("user_id", userId)` z `getRecipe` — sprawdź i cofnij

**Implementation Note**: Po zakończeniu fazy i zielonej weryfikacji automatycznej zatrzymaj się na potwierdzenie od człowieka przed przejściem dalej.

---

## Phase 5: Cookbook i domknięcie zmiany

### Overview

Wpisanie wzorców fazy do wspólnego cookbooka, żeby kolejne zmiany korzystały z nich bez czytania testów.

### Changes Required

#### 1. Cookbook §6

**File**: `context/foundation/test-plan.md`

**Intent**: Zastąpić placeholder „TBD" w sekcji „Faza 3 — Round-trip edycji i usuwania" opisem faktycznie powstałych wzorców.

**Contract**: Wpis w konwencji Faz 1 i 2 — lista plików z jednozdaniowym opisem tego, co każdy zamraża, plus akapit konwencji. Musi zawierać: sprostowanie sformułowania Ryzyka #5 (nie ma mappera DB→draft; dryf polega na braku normalizacji przy odczycie), regułę seedowania wiersza zamiast insertu przy asercjach na `updated_at`, oraz wynik charakteryzacji zdegradowanego jsonb z Fazy 3. Wiersza Fazy 3 w §3 nie ruszamy.

#### 2. Status zmiany

**File**: `context/changes/testing-edit-delete-roundtrip/change.md`

**Intent**: Odzwierciedlić stan zmiany po wdrożeniu.

**Contract**: `status: implemented`, `updated` na dzień zakończenia.

### Success Criteria

#### Automated Verification

- Cała suita zielona: `npm run test:run`
- Lint i typy: `npm run lint`

#### Manual Verification

- §6 test-planu czyta się samodzielnie — bez otwierania plików testowych wiadomo, co jest pokryte i jakim wzorcem

**Implementation Note**: Po zakończeniu fazy i zielonej weryfikacji automatycznej zatrzymaj się na potwierdzenie od człowieka.

---

## Testing Strategy

### Unit Tests

- Builder wiersza DB nie ma własnych testów — jego poprawność weryfikują testy, które go używają.

### Integration Tests

- Round-trip edycji na fake Supabase: idempotencja, mutacja pojedynczego pola, invariant metryk, znacznik `updatedAt`.
- Charakteryzacja niekompletnego jsonb: `null` i brakujący klucz w polu liczbowym spoza silnika metryk.
- Trwałość usunięcia widziana przez `getRecipe` i `listRecipes`; niezmienność `user_id` po update.

### Manual Testing Steps

1. Uszkodź `mapRowToRecord` (usuń pole z `data`) i potwierdź, że test idempotencji pada; cofnij.
2. Podmień w `recipe-save.ts` `data: parsed.data` na `data: draft` i potwierdź, że pada test invariantu metryk; cofnij.
3. Usuń `.eq("user_id", userId)` z `getRecipe` i potwierdź, że pada test trwałości usunięcia; cofnij.

## Performance Considerations

Brak. Suita działa w pamięci, bez Dockera i bez sieci; dokładamy pojedyncze cyfry testów do istniejącego przebiegu CI.

## Migration Notes

Nie dotyczy — zmiana nie rusza schematu bazy ani kodu produkcyjnego.

## References

- Research: `context/changes/testing-edit-delete-roundtrip/research.md`
- Wzorzec round-tripu: `src/lib/recipe-save-roundtrip.test.ts:12-23`
- Wzorzec payloadu update: `src/lib/recipe-queries.test.ts:41-46`
- Kontrakty S-07: `context/changes/recipe-edit-delete/plan-brief.md`
- Zakres Fazy 2 (nie duplikować): `context/changes/testing-auth-idor-mutations/`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Współdzielony builder wiersza DB

#### Automated

- [x] 1.1 Testy przechodzą bez zmian w liczbie i nazwach — 2f3da3d
- [x] 1.2 Lint i typy — 2f3da3d

#### Manual

- [x] 1.3 Builder używalny bez rzutowań w miejscu wywołania — 2f3da3d

### Phase 2: Round-trip edycji

#### Automated

- [x] 2.1 Nowe testy przechodzą — e188cd9
- [x] 2.2 Lint i typy — e188cd9

#### Manual

- [x] 2.3 Test mutacji zapala się po uszkodzeniu `mapRowToRecord` — e188cd9
- [x] 2.4 Test invariantu metryk zapala się po podmianie `data: parsed.data` na `data: draft` — e188cd9

### Phase 3: Charakteryzacja zdegradowanego jsonb

#### Automated

- [x] 3.1 Testy przechodzą i opisują rzeczywiste zachowanie — 26000cc
- [x] 3.2 Lint i typy — 26000cc

#### Manual

- [x] 3.3 Zaobserwowane zachowanie potwierdzone odwróceniem asercji — 26000cc
- [x] 3.4 Wybrane pola potwierdzone jako nieuczestniczące w obliczeniach metryk — 26000cc

### Phase 4: Trwałość usuwania i strażnik właściciela

#### Automated

- [x] 4.1 Testy przechodzą — 264eef8
- [x] 4.2 Lint i typy — 264eef8

#### Manual

- [x] 4.3 Test trwałości zapala się po usunięciu filtra `user_id` z `listRecipes` — 264eef8

### Phase 5: Cookbook i domknięcie zmiany

#### Automated

- [x] 5.1 Cała suita zielona — ef03ef5
- [x] 5.2 Lint i typy — ef03ef5

#### Manual

- [x] 5.3 §6 test-planu czyta się samodzielnie — ef03ef5
