# Testy: integralność seamu i zapisu (Plan testów — Faza 1) — Implementation Plan

## Overview

Wdrożyć Fazę 1 fazowanego rollout planu testów (`context/foundation/test-plan.md` §3): testy integracyjne (Vitest, środowisko `node`, bez UI/przeglądarki), które dowodzą:

- **Ryzyko #1 (dryf seamu obliczeniowego)** — `src/lib/recipe-to-calc.ts` mapuje pełny `RecipeDraft` na wejścia silnika poprawnie dla wszystkich stanów kreatora; seam nie gubi ani nie zniekształca pola, a asymetria filtrów seam↔silnik nie produkuje cicho częściowych/błędnych metryk.
- **Ryzyko #3 (korupcja zapisu)** — round-trip zapisu (`draft → Zod → DB → odczyt`) nie gubi danych; brak wymaganego pola blokuje save z czytelnym komunikatem.

Plan wprowadza także minimalną, offline'ową infrastrukturę testową (współdzielone fixtures + in-memory fake klienta Supabase), która pozwala testować round-trip bez Dockera i bez sekretów w CI.

## Current State Analysis

- **Seam wąski, dwuwejściowy.** `mapDraftToCalcInput` (guardy + mapowanie maltów) i `computeWizardMetrics` (`src/lib/recipe-to-calc.ts:63-131`). Konsumenci produkcyjni: `MetricsPanel.tsx:55` (live preview) i `recipe-save.ts:34` (persist).
- **`computeWizardMetrics` duplikuje `computeMetrics`** (`src/lib/calc/index.ts:48-58`) zamiast delegować — brak testu parytetu, więc dryf jest niewykrywalny.
- **Asymetria filtrów (rdzeń Ryzyka #1):** seam odrzuca tylko `amountKg<=0`; silnik dodatkowo wymaga `extractPercent>0` (`gravity.ts:52-54`) i `colorEbc>0` (`srm.ts:31-34`). Malt z dodatnią wagą, zerowym ekstraktem przechodzi seam `{ok:true}` i cicho zaniża/psuje metryki.
- **Konwersje w seamie:** `efficiencyPct/100`, `attenuationPct/100`, rename `timeMin→boilTimeMin`, `stage→utilizationFactor` (whirlpool 0.25, dryHop wykluczony). Brak golden-vectora przez pełny draft.
- **Ścieżka zapisu:** `buildRecipeInsert` (`recipe-save.ts:19-62`) → `saveRecipeSchema.safeParse` → `computeWizardMetrics` → insert `{user_id,name,style,blg,srm,ibu,abv,data:parsed.data}`. API `POST /api/recipes` (`index.ts:33`) robi `.from("recipes").insert(built.insert).select("id").single()`. Odczyt: `getRecipe` (`recipe-queries.ts:21-26`) `.select("*").eq("user_id").eq("id").maybeSingle()` → `mapRowToRecord` (`recipe-mappers.ts:33-39`), **bez re-walidacji Zod**.
- **Zabezpieczenia Ryzyka #3:** metryki liczone serwerowo (`RecipeDraft` nie ma pól metryk), kolumny DB NOT NULL, Zod wymusza strukturę. Luki: brak testu pełnego round-tripu; Zod **cicho usuwa nieznane klucze** (brak `.strict()`/`.passthrough()`).
- **Baza testów `sparse`, offline.** 9 plików `*.test.ts`, wszystkie w `src/lib/`, env `node`, zero mocków/klienta Supabase, brak wspólnych fixtures. Buildery `draft()`/`boilHop()` **zduplikowane** w `recipe-to-calc.test.ts:7-27` i `recipe-save.test.ts:8-28`. CI (`npm run test:run`) działa bez env Supabase.
- **Konwencje testów:** `*.test.ts` co-located w `src/lib/`, importy `@/`, jawny import z `"vitest"`, wzorzec `CalcResult` (assert `.ok`, potem narrow), golden vectors z `TOLERANCE`/`toBeCloseTo`, sentinel = `{ok:false}`, błędy walidacji szukane po `field` z polskim `message` przez `toContain`.

## Desired End State

Po ukończeniu planu:

- Istnieje współdzielony moduł fixtures z builderami `draft()`/`boilHop()`; oba istniejące pliki testowe (`recipe-to-calc.test.ts`, `recipe-save.test.ts`) używają go zamiast lokalnych duplikatów.
- Istnieje in-memory fake klienta Supabase (`src/lib/__tests__/`), wspierający chainable builder używany przez `recipe-queries.ts` i API route.
- Testy seamu (Ryzyko #1) pokrywają: golden-vector pełnego draftu (oracle = silnik), wszystkie nazwane scenariusze „plausible-but-wrong", konwersje jednostek/rename chmielu, oraz inwariant parytetu seam↔`computeMetrics`.
- Testy round-tripu (Ryzyko #3) dowodzą: `data` + kolumny metryk odczytane z (fake) DB są identyczne z zapisanymi; metryki liczone serwerowo (klient nie może wstrzyknąć); nieznane klucze są usuwane (zamrożony kontrakt); brak wymaganego pola → 400/`{errors}` z czytelnym polskim komunikatem.
- `test-plan.md` §6 Faza 1 ma wypełnione wzorce cookbook; §3 status Fazy 1 = `complete`; `change.md` status zaktualizowany.
- **Weryfikacja:** `npm run test:run` przechodzi (nowe pliki włącznie), `npm run lint` czysto, `npm run build` przechodzi, CI zielone bez dodatkowych sekretów.

### Key Discoveries:

- Seam/silnik asymetria filtrów: `recipe-to-calc.ts:76-86` vs `gravity.ts:52-54` / `srm.ts:31-34`.
- `computeWizardMetrics` odtwarza `computeMetrics` ręcznie — `recipe-to-calc.ts:107-131` vs `calc/index.ts:48-58`.
- Insert mirror: `index.ts:33` (`insert(...).select("id").single()`); odczyt: `recipe-queries.ts:22`.
- Zod strip: `parsed.data` bez `.strict()`/`.passthrough()` w `recipe-save.ts:23` i `recipe-schema.ts`.
- Reuse: `defaultRecipeDraft` (`recipe-schema.ts:116-151`) jako baza fixtures.

## What We're NOT Doing

- **Nie refaktoryzujemy seamu** by delegował do `computeMetrics` — zamiast tego test parytetu chroni przed dryfem (refaktor poza zakresem Fazy 1).
- **Nie zmieniamy zachowania Zod** wobec nieznanych kluczy — zamrażamy bieżący strip jako świadomy kontrakt (nie dodajemy `.strict()`).
- **Nie testujemy przez prawdziwą DB / Docker / Testcontainers** — round-trip przez in-memory fake klienta; CI pozostaje offline.
- **Nie testujemy auth/IDOR ani cross-user** — to Faza 2 (`#2/#4`).
- **Nie testujemy round-tripu trybu edycji (DB→draft→save)** — to Faza 3 (`#5`).
- **Nie testujemy UI/komponentów** (`MetricsPanel`, `RecipeWizard`) — bez jsdom; testujemy czyste funkcje. Rozbieżność `MetricsPanel` hardkodująca `adjuncts:[]` jest nieistotna dla metryk (adjuncts nie wchodzą do silnika) — poza zakresem.
- **Nie testujemy warstwy HTTP API route** (Response/status) — Faza 1 celuje w `buildRecipeInsert` + queries przez fake klienta; kody HTTP to Faza 2.
- **Nie zmieniamy `vitest.config.ts`** (glob `src/**/*.test.ts` już obejmuje nowe pliki) ani CI.

## Implementation Approach

Zbudować od dołu: najpierw współdzielone fixtures i fake klienta (Faza 1), potem testy czystego seamu (Faza 2), potem round-trip używający fixtures + fake klienta (Faza 3), a na końcu udokumentować wzorce i zsynchronizować status (Faza 4). Wszystkie testy są offline, `node`, co-located lub w `src/lib/__tests__/` zgodnie z globem `src/**/*.test.ts`. Golden vectory reużywają znanego-dobrego draftu z testów silnika jako oracle, żeby nie wprowadzać niezależnego (i potencjalnie błędnego) źródła prawdy.

## Critical Implementation Details

- **Fake klienta musi odwzorować chainable builder Supabase, nie SDK.** Metody używane w kodzie: `.from(table)`, `.select(cols)`, `.eq(col,val)` (łańcuchowo, wielokrotnie), `.maybeSingle()`, `.single()`, `.order()`, `.insert(row)`, `.update(patch)`, `.delete()`. `insert(...).select("id").single()` musi zwrócić `{ data: { id }, error: null }`; `select("*").eq(...).eq(...).maybeSingle()` musi zwrócić pełny wiersz. Builder rozwiązuje się jako thenable/awaitable (`await supabase.from(...).select(...).eq(...)`), więc fake musi być await-owalny na każdym końcowym ogniwie używanym w kodzie.
- **DB przypisuje `id`, `created_at`, `updated_at`.** Insert dostaje `RecipeInsert` bez tych pól; fake generuje `id` (np. licznik/uuid), znaczniki czasu ISO, i przechowuje pełny wiersz `RecipeRecordRow`. To pozwala `getRecipe` zwrócić kompletny wiersz i domknąć round-trip.
- **`data` w round-tripie to `parsed.data` (po Zod coerce/trim), nie surowy draft.** Deep-equal round-tripu porównuje odczytane `record.data` z `parsed.data` z `buildRecipeInsert` — nie z surowym draftem — bo to wartość faktycznie zapisana. Metryki liczone są z surowego `draft`.
- **Kolejność faz jest twarda:** Fazy 2 i 3 zależą od fixtures z Fazy 1; Faza 3 dodatkowo od fake klienta z Fazy 1.

## Phase 1: Współdzielone fixtures + in-memory fake klienta Supabase

### Overview

Wyeliminować duplikację builderów draftu i dostarczyć offline'owy fake klienta Supabase, na którym oprze się round-trip Fazy 3.

### Changes Required:

#### 1. Współdzielony moduł fixtures

**File**: `src/lib/__tests__/fixtures.ts` (nowy)

**Intent**: Wydzielić `draft()`/`boilHop()` (dziś zduplikowane w dwóch testach) do jednego miejsca, opartego na `defaultRecipeDraft`, z ergonomicznymi override'ami per test. Ma pokrywać scenariusze planu: sam zasyp, zasyp+mash+chmiel, pełny z drożdżami, oraz wariacje pól (extract/color/percent).

**Contract**: Eksportuje co najmniej `draft(overrides?: DeepPartial<RecipeDraft>): RecipeDraft` (bazuje na `defaultRecipeDraft` z `recipe-schema.ts:116-151`, głęboki merge) i `boilHop(overrides?)`/`hop(overrides?)` zwracający `HopEntry`. Typy z `@/types`. Bez zależności zewnętrznych (natywny merge — patrz lekcja „nie dodawaj lodash").

#### 2. Refaktor istniejących testów na współdzielone fixtures

**File**: `src/lib/recipe-to-calc.test.ts`, `src/lib/recipe-save.test.ts`

**Intent**: Zastąpić lokalne `draft()`/`boilHop()` importem z `fixtures.ts`, zachowując identyczne dotychczasowe asercje (czysty refaktor, zero zmian sygnału).

**Contract**: Usuwa lokalne definicje builderów (`recipe-to-calc.test.ts:7-27`, `recipe-save.test.ts:8-28`); importuje z `@/lib/__tests__/fixtures`. Istniejące testy nadal przechodzą bez modyfikacji asercji.

#### 3. In-memory fake klienta Supabase

**File**: `src/lib/__tests__/fake-supabase.ts` (nowy)

**Intent**: Dostarczyć minimalny, await-owalny fake, który odwzorowuje chainable query builder używany przez `recipe-queries.ts` i `src/pages/api/recipes/index.ts`, operujący na in-memory tablicy wierszy `recipes`. Umożliwia round-trip insert→select bez Dockera.

**Contract**: `createFakeSupabase(seed?: RecipeRecordRow[])` zwraca obiekt zgodny strukturalnie z `NonNullable<ReturnType<typeof createClient>>` w zakresie używanym przez kod: `.from("recipes")` → builder z `.select()`, `.eq(col,val)` (łańcuchowo), `.maybeSingle()`, `.single()`, `.order()`, `.insert(row).select("id").single()`, `.update(patch).eq().eq().select("id")`, `.delete().eq().eq()`. Insert generuje `id`+`created_at`+`updated_at` i przechowuje pełny wiersz; filtry `.eq` zawężają zbiór; ogniwa terminalne są `await`-owalne i zwracają `{ data, error }`. Ekspozycja pomocnicza do inspekcji stanu (np. `._rows`) dla asercji. Bez `vi.mock` — to ręczny fake (spójne z bazą „zero mocków", ale świadomie wprowadzamy fake jako nową infrastrukturę).

### Success Criteria:

#### Automated Verification:

- Typy przechodzą: `npm run build` (lub `tsc`)
- Lint czysty: `npm run lint`
- Istniejące testy nadal przechodzą po refaktorze: `npm run test:run`

#### Manual Verification:

- `fixtures.ts` produkuje draft, który przechodzi `saveRecipeSchema` i daje wszystkie 4 metryki `{ok:true}` dla scenariusza „pełny z drożdżami"
- Fake klienta poprawnie zwraca wstawiony wiersz przez `getRecipe` w ad-hoc próbie

**Implementation Note**: Po ukończeniu tej fazy i przejściu automatycznej weryfikacji, zatrzymaj się na potwierdzenie manualne przed przejściem do kolejnej fazy.

---

## Phase 2: Testy integralności i parytetu seamu (Ryzyko #1)

### Overview

Udowodnić, że seam mapuje pełny draft poprawnie i że jego asymetria wobec silnika oraz konwersje jednostek nie produkują cicho błędnych metryk.

### Changes Required:

#### 1. Golden-vector przez pełny draft

**File**: `src/lib/recipe-to-calc.test.ts` (rozszerzenie)

**Intent**: Dodać test, który bierze znany-dobry draft (odpowiadający oracle'owi z testów silnika) i asertuje, że `computeWizardMetrics` zwraca `{ok:true}` z wartościami zgodnymi z referencyjnymi (BLG≈14.1, SRM≈4.0, IBU≈16.2, ABV≈4.9) w ramach `TOLERANCE`.

**Contract**: Reużywa wektora z `src/lib/calc/index.test.ts`/`blg|srm|ibu|abv.test.ts` jako oracle; assert per metryka `.ok` potem `toBeCloseTo(expected, TOLERANCE)`. Komentarz-provenance wskazujący źródło wartości.

#### 2. Scenariusze „plausible-but-wrong" (asymetria seam↔silnik)

**File**: `src/lib/recipe-to-calc.test.ts` (rozszerzenie)

**Intent**: Zablokować dokładnie te stany, w których seam mówi „ok", a metryka jest cicho błędna lub `{ok:false}`. Pokrycie wszystkich nazwanych w researchu wektorów.

**Contract**: Osobne przypadki dla: (a) malt `amountKg>0, extractPercent:0` → `blg`/gravity `{ok:false}` mimo że `mapDraftToCalcInput` zwraca `{ok:true}`; (b) malt `colorEbc:0` → `srm` `{ok:false}`; (c) grist mieszany (valid + zero-extract) → BLG liczone tylko z maltów z ekstraktem (asercja, że wartość różni się od wariantu z pełnym gristem — udokumentowanie cichego zaniżenia OG); (d) literówka `extractPercent:8` vs `80` → brak sentinela, metryka `{ok:true}` ale wartość znacząco inna (dokumentuje brak ochrony — test zamraża świadomość granicy). Każdy przypadek asertuje najpierw wynik `mapDraftToCalcInput`, potem odpowiednią metrykę.

#### 3. Konwersje jednostek i mapowanie chmielu

**File**: `src/lib/recipe-to-calc.test.ts` (rozszerzenie)

**Intent**: Golden-testy transformacji, które są miejscami regresji: procent→ułamek (efficiency, attenuation), rename `timeMin→boilTimeMin`, `stage→utilizationFactor`, wykluczenie `dryHop`.

**Contract**: Przypadki: efficiency `75` → efekt jak `0.75` w gravity; attenuation `80` → ABV zgodne z ułamkiem `0.8`; hop `whirlpool` daje IBU zredukowane wg `WHIRLPOOL_UTILIZATION_FACTOR` (0.25) vs `boil`; hop `dryHop` nie wpływa na IBU; hop z `timeMin:0` odfiltrowany. Asercje przez wartości metryk (`toBeCloseTo`) lub — gdy trzeba precyzji — przez `mapDraftHopsToCalc`, jeśli wyeksportowany; jeśli nie, przez efekt w IBU.

#### 4. Inwariant parytetu seam ↔ `computeMetrics`

**File**: `src/lib/recipe-to-calc.test.ts` (rozszerzenie)

**Intent**: Chronić przed dryfem duplikatu: dla zestawu draftów `computeWizardMetrics(draft)` musi zgadzać się z `computeMetrics` uruchomionym na tych samych wejściach zbudowanych z draftu.

**Contract**: Dla każdego draftu w zestawie (happy-path + kilka wariacji), gdy `mapDraftToCalcInput(draft).ok`, zbuduj `RecipeMetricsInput` (malts/volumeL/mashEfficiency z `mapDraftToCalcInput`, hops z odpowiednika `mapDraftHopsToCalc`, attenuation z `attenuationPct/100`) i asertuj równość (w `TOLERANCE`) każdej z 4 metryk `computeWizardMetrics` vs `computeMetrics`. Jeśli prywatne mappery (`mapDraftHopsToCalc`, `attenuationFromDraft`) nie są eksportowane, test odtwarza ich wejścia jawnie lub wymaga minimalnego eksportu — decyzja implementacyjna: preferuj odtworzenie wejść w teście, bez zmiany API produkcyjnego.

### Success Criteria:

#### Automated Verification:

- Wszystkie nowe testy seamu przechodzą: `npm run test:run`
- Type-check: `npm run build`
- Lint: `npm run lint`

#### Manual Verification:

- Ręczne wprowadzenie regresji (np. zmiana `WHIRLPOOL_UTILIZATION_FACTOR` lub usunięcie `/100` z efficiency) powoduje **czerwony** test parytetu/konwersji (sanity: testy faktycznie łapią dryf)
- Scenariusz extract=0 czerwieni się dopiero na metryce, nie na seamie (potwierdza, że test celuje w asymetrię)

**Implementation Note**: Po ukończeniu tej fazy i przejściu automatycznej weryfikacji, zatrzymaj się na potwierdzenie manualne przed przejściem do kolejnej fazy.

---

## Phase 3: Testy round-tripu i integralności zapisu (Ryzyko #3)

### Overview

Udowodnić, że zapis→odczyt nie gubi danych, metryki są serwerowe, nieznane klucze są usuwane (kontrakt), a brak wymaganego pola daje czytelny błąd.

### Changes Required:

#### 1. Pełny round-trip save → read (deep-equal)

**File**: `src/lib/recipe-save-roundtrip.test.ts` (nowy)

**Intent**: Zbudować `buildRecipeInsert(draft, userId)`, wstawić `insert` przez fake klienta (mirror `index.ts:33`: `insert(...).select("id").single()`), odczytać przez `getRecipe(fake, userId, id)` i asertować, że `record.data` deep-equals `parsed.data` oraz `record.blg/srm/ibu/abv` równe wartościom z `computeWizardMetrics(draft)`.

**Contract**: Używa `fixtures.draft()` (pełny scenariusz) + `createFakeSupabase()`. Porównanie `data` przez `toEqual` z `parsed.data` (nie surowym draftem). Metryki przez `toBeCloseTo`/`toEqual` z `computeWizardMetrics`. `name`/`style` z kolumn równe `parsed.data.basics.*`.

#### 2. Metryki serwerowe — brak zaufania do klienta

**File**: `src/lib/recipe-save-roundtrip.test.ts`

**Intent**: Potwierdzić, że przesłanie w body pól metryk (lub innych wartości „metrycznych") nie zmienia zapisanych metryk — są zawsze recompute z draftu.

**Contract**: Draft z dostrzykniętymi fałszywymi kluczami metryk (`blg:999`, itd.) → `buildRecipeInsert` → zapisane kolumny metryk równe `computeWizardMetrics(draft)`, a nie wstrzykniętym wartościom. (Zgodne z faktem, że `RecipeDraft`/`saveRecipeSchema` nie mają pól metryk.)

#### 3. Zamrożenie kontraktu Zod: strip nieznanych kluczy

**File**: `src/lib/recipe-save.test.ts` (rozszerzenie) lub `recipe-save-roundtrip.test.ts`

**Intent**: Zamrozić bieżące zachowanie jako świadomy kontrakt — nieznane klucze w body są cicho usuwane z `parsed.data`.

**Contract**: Draft z dodatkowymi kluczami na różnych poziomach (top-level i w `basics`) → `buildRecipeInsert` `{ok:true}` → `insert.data` **nie zawiera** nieznanych kluczy. Komentarz w teście dokumentujący, że to intencjonalne (nie `.strict()`).

#### 4. Brak wymaganego pola → czytelny błąd

**File**: `src/lib/recipe-save.test.ts` (rozszerzenie)

**Intent**: Udowodnić, że brak/nieprawidłowe wymagane pole blokuje save z czytelnym polskim komunikatem powiązanym z `field`, oraz że niepełny (ale Zod-optional) przepis nie koruptuje mapowania.

**Contract**: (a) Brak `basics.name`/pusty styl → `{ok:false}` z `errors` zawierającym wpis o `field` odpowiadającym ścieżce i polskim `message` (assert przez `toContain`); (b) Draft prowadzący do `metrics.*` fail (np. brak kwalifikującego chmielu → IBU) → `errors` zawiera `field:"metrics.ibu"`; (c) Przepis Zod-valid ale „product-incomplete" (pusty `yeast.strain`) → `{ok:true}` (dokumentuje, że puste wartości persystują, nie gubią mapowania). Uwzględnić lekcję o mapowaniu błędów tablic Zod (ścieżki z indeksem, np. `hops.0.*`).

### Success Criteria:

#### Automated Verification:

- Testy round-tripu i integralności przechodzą: `npm run test:run`
- Type-check: `npm run build`
- Lint: `npm run lint`

#### Manual Verification:

- Ręczna zmiana kształtu insertu (np. pominięcie `data`) czerwieni test round-tripu (sanity)
- Deep-equal faktycznie porównuje pełny `data` (a nie tylko podzbiór) — potwierdzone przez wprowadzenie różnicy w jednym zagnieżdżonym polu

**Implementation Note**: Po ukończeniu tej fazy i przejściu automatycznej weryfikacji, zatrzymaj się na potwierdzenie manualne przed przejściem do kolejnej fazy.

---

## Phase 4: Cookbook wzorców + synchronizacja statusu

### Overview

Udokumentować wypracowane wzorce testowe i zsynchronizować status Fazy 1 w planie testów i identity change.

### Changes Required:

#### 1. Wypełnienie §6 cookbook

**File**: `context/foundation/test-plan.md`

**Intent**: Zastąpić placeholder „TBD" w §6 Faza 1 konkretnymi wzorcami wypracowanymi w Fazach 1-3 (fixtures, fake klienta, golden-vector przez seam, test parytetu, round-trip przez fake klienta, zamrożenie strip-kontraktu Zod).

**Contract**: Sekcja §6 „Faza 1 — Integralność seamu i zapisu" wymienia realne pliki/wzorce z krótkim opisem, jako referencję dla przyszłych faz. Bez zmian w §1-§5 poza statusem (poniżej).

#### 2. Aktualizacja statusu Fazy 1

**File**: `context/foundation/test-plan.md`, `context/changes/testing-seam-save-integrity/change.md`

**Intent**: Odzwierciedlić ukończenie Fazy 1.

**Contract**: W `test-plan.md` §3 tabela — status Fazy 1 → `complete`. W `change.md` — `status: complete` (lub zgodnie ze słownictwem parsera identity), `updated: <today>`.

### Success Criteria:

#### Automated Verification:

- Cały suite przechodzi: `npm run test:run`
- Lint (w tym prettier na `.md`): `npm run lint` / `npm run format`

#### Manual Verification:

- §6 cookbook czytelnie opisuje wzorce; przyszła faza może z nich skorzystać
- Statusy spójne między `test-plan.md` a `change.md`

**Implementation Note**: Po ukończeniu tej fazy i przejściu automatycznej weryfikacji, zatrzymaj się na potwierdzenie manualne.

---

## Testing Strategy

### Unit Tests:

- Seam: golden-vector pełnego draftu; asymetria filtrów (extract=0, color=0, mieszany grist, typo 8-vs-80); konwersje (efficiency/attenuation %→ułamek, hop rename/utilizationFactor/dryHop); parytet `computeWizardMetrics` ≡ `computeMetrics`.
- Zapis: brak wymaganego pola → błąd z `field`+polski `message`; strip nieznanych kluczy; metryki serwerowe.

### Integration Tests:

- Round-trip: `buildRecipeInsert` → fake `insert().select("id").single()` → `getRecipe` → deep-equal `data` + metryki.

### Manual Testing Steps:

1. Uruchom `npm run test:run` — wszystkie nowe pliki zielone.
2. Wprowadź celową regresję w seamie (usuń `/100` z efficiency) — test konwersji/parytetu czerwony.
3. Zmień kształt insertu (pomiń zagnieżdżone pole `data`) — round-trip czerwony.
4. Przywróć kod — całość zielona.

## Performance Considerations

Brak — testy offline, in-memory, hobbyistyczna skala. Fake klienta operuje na tablicy w pamięci.

## Migration Notes

Brak migracji DB ani zmian runtime. `vitest.config.ts` i CI bez zmian (glob `src/**/*.test.ts` obejmuje nowe pliki; suite pozostaje offline).

## References

- Research: `context/changes/testing-seam-save-integrity/research.md`
- Plan testów: `context/foundation/test-plan.md` §2 (#1/#3), §3 (Faza 1), §6
- Seam: `src/lib/recipe-to-calc.ts:63-131`; silnik: `src/lib/calc/index.ts:48-58`, `gravity.ts:52-54`, `srm.ts:31-34`
- Zapis: `src/lib/recipe-save.ts:19-62`; API: `src/pages/api/recipes/index.ts:33`; queries: `src/lib/recipe-queries.ts:21-49`; mappery: `src/lib/recipe-mappers.ts:33-39`
- Istniejące testy/buildery: `src/lib/recipe-to-calc.test.ts`, `src/lib/recipe-save.test.ts`
- Lekcje: `context/foundation/lessons.md` (mapowanie błędów tablic Zod; brak lodash)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Współdzielone fixtures + in-memory fake klienta Supabase

#### Automated

- [x] 1.1 Type-check przechodzi: `npm run build` — 43a951a
- [x] 1.2 Lint czysty: `npm run lint` — 43a951a
- [x] 1.3 Istniejące testy przechodzą po refaktorze: `npm run test:run` — 43a951a

#### Manual

- [x] 1.4 `fixtures.ts` produkuje draft przechodzący `saveRecipeSchema` z 4 metrykami `{ok:true}` — 43a951a
- [x] 1.5 Fake klienta zwraca wstawiony wiersz przez `getRecipe` — 43a951a

### Phase 2: Testy integralności i parytetu seamu (Ryzyko #1)

#### Automated

- [x] 2.1 Nowe testy seamu przechodzą: `npm run test:run` — 20401ea
- [x] 2.2 Type-check: `npm run build` — 20401ea
- [x] 2.3 Lint: `npm run lint` — 20401ea

#### Manual

- [x] 2.4 Ręczna regresja czerwieni test parytetu/konwersji — 20401ea
- [x] 2.5 Scenariusz extract=0 czerwieni się na metryce, nie na seamie — 20401ea

### Phase 3: Testy round-tripu i integralności zapisu (Ryzyko #3)

#### Automated

- [x] 3.1 Testy round-tripu i integralności przechodzą: `npm run test:run`
- [x] 3.2 Type-check: `npm run build`
- [x] 3.3 Lint: `npm run lint`

#### Manual

- [x] 3.4 Zmiana kształtu insertu czerwieni round-trip
- [x] 3.5 Deep-equal łapie różnicę w zagnieżdżonym polu `data`

### Phase 4: Cookbook wzorców + synchronizacja statusu

#### Automated

- [ ] 4.1 Cały suite przechodzi: `npm run test:run`
- [ ] 4.2 Lint/format czysty: `npm run lint` / `npm run format`

#### Manual

- [ ] 4.3 §6 cookbook opisuje wzorce użyteczne dla przyszłych faz
- [ ] 4.4 Statusy spójne między `test-plan.md` i `change.md`
