# Kreator: drożdże i dodatki z ABV na żywo (S-03) — Implementation Plan

## Overview

Domykamy rdzenną obietnicę produktu: dwa ostatnie kroki kreatora — **Drożdże** i **Dodatki** — oraz **ABV** jako czwartą metrykę liczoną na żywo. W tym momencie pełny kreator (Podstawy → Zasyp → Zacieranie → Chmiel → Drożdże → Dodatki) pokazuje wszystkie cztery metryki (BLG / Barwa / IBU / ABV) aktualizowane na żywo (north star S-03).

W przeciwieństwie do S-02 ten slice **nie zmienia matematyki silnika**: `calcABV` jest już w pełni zaimplementowane i otestowane (`src/lib/calc/abv.ts`), a `computeMetrics` już wpina ABV ze współdzielonej grawitacji. Praca to: rozszerzenie modelu draftu o drożdże i dodatki, wpięcie ABV w seam wizarda (`recipe-to-calc.ts`), kafelek ABV w panelu, oraz UI dwóch kroków na bazie istniejących wzorców z S-01/S-02.

## Current State Analysis

S-01 (`wizard-basics-grist-blg-srm`) i S-02 (`wizard-mash-hops-ibu`) oraz F-02 (`calc-engine-harness`) są **zaimplementowane w kodzie**.

- **Silnik ABV**: `calcABV` (`src/lib/calc/abv.ts` linie 18–33) liczy `FG_points = OG_points × (1 − attenuation)`, `ABV% = (OG − FG) × 131.25`; zwraca `{ ok: false }` dla OG ≤ 1.0 lub atenuacji poza `(0, 1]`. Otestowane golden vectorami (`abv.test.ts`).
- **Agregat**: `computeMetrics` (`index.ts` linie 48–58) już liczy `abv = gravity.ok ? calcABV({ og: gravity.value.sg, attenuation }) : gravity` — wzorzec do skopiowania w seamie.
- **Seam wizarda**: `recipe-to-calc.ts` — `computeWizardMetrics` (linie 98–113) liczy grawitację raz przez `computeGravity` i zwraca `{ blg, srm, ibu }`. Brak ABV i brak konsumpcji drożdży. `mapDraftToCalcInput` (linie 55–84) zwraca sentinel `{ ok: false }` gdy brakuje danych — propaguje się do wszystkich metryk.
- **Model danych**: `src/types.ts` — `RecipeDraft = { basics, batch, malts, mash, hops }`; **brak `yeast` i `adjuncts`**. Istnieją `HopStage`, `MashRest`, `HopEntry`, `MashParams`.
- **Schemat**: `src/lib/recipe-schema.ts` — `recipeDraftSchema`, schematy per-krok (`gristStepSchema`, `mashStepSchema`, `hopsStepSchema`), `defaultRecipeDraft`, oraz domyślne wpisy list (`defaultMaltEntry`, `defaultMashRest`, `defaultHopEntry`). Pola draftu są łagodne (zero dozwolone w trakcie pracy), gate'y zaostrzają per-krok.
- **Panel metryk**: `MetricsPanel.tsx` — `useWatch` na `["batch", "malts", "mash", "hops"]` (linia 41), derived state bez `useEffect`, `formatMetric` pokazuje `—` gdy `!ok`. Trzy kafelki (BLG / Barwa / IBU).
- **Kreator**: `RecipeWizard.tsx` — `WIZARD_STEPS` (4 kroki, linie 13–18), `STEP_COMPONENTS` (linia 20), walidacja per-krok w `handleNext` (linie 30–54), `isLastStep` z długości tablicy. Gałąź kroku Chmiel (index 3) ma TODO(S-04): jest dziś martwa, bo „Dalej" jest wyłączone na ostatnim kroku (impl-review S-02 F2).
- **Wzorzec listy dynamicznej**: `HopList.tsx` (`useFieldArray` z `append`/`move`/`remove`) + `HopRow.tsx` (pola przez `register`, selektor etapu przez `Controller` + `HopStageSelect`) — gotowy do skopiowania dla dodatków.
- **Selektor**: `HopStageSelect.tsx` — własny stylowany dropdown (button + listbox), zbudowany bo natywny `<select>` był nieczytelny na Windows (impl-review S-02 F1). Options-driven przez stałą `STAGE_OPTIONS`. Eksportuje `hopFieldShellClass`.
- **Walidacja kroku**: `validateWizardStep` (`wizard-step-validation.ts`) — mapuje **wszystkie** ścieżki Zod (w tym indeksowane, np. `hops.0.alphaAcidPercent`) na `setError` (lesson + impl-review S-02 F3 zaaplikowane).
- **Testy**: Vitest, `*.test.ts` współlokowane; seam pokryty `src/lib/recipe-to-calc.test.ts`.

## Desired End State

Zalogowany użytkownik w kreatorze może:

1. Po kroku „Chmiel" przejść do kroku **„Drożdże"**: wpisać szczep (tekst), typ (tekst), odfermentowanie (%, domyślnie 75) oraz zakres temperatur fermentacji (min/max °C).
2. Przejść do kroku **„Dodatki"**: dodać/przesunąć/usunąć dodatki (nazwa, etap — Zacieranie/Gotowanie/Whirlpool/Fermentacja, czas, notatki).
3. Widzieć **cztery** metryki na żywo (BLG, Barwa/SRM, IBU, **ABV**); ABV pokazuje `—` dopóki nie ma kompletu danych (zasyp dający grawitację + atenuacja w `(0, 100]`).

**Weryfikacja**: `npm run test` (nowe testy seamu ABV przechodzą), `npm run lint`, `npm run build`; manualnie — przejście wszystkich 6 kroków, ABV reaguje na zmianę odfermentowania i zasypu, dodatki działają (add/move/remove) i nie wpływają na żadną metrykę.

### Key Discoveries:

- ABV już zaimplementowane i otestowane (`src/lib/calc/abv.ts`, `abv.test.ts`) — silnik nietknięty; `computeMetrics` (`index.ts` linia 56) to gotowy wzorzec wpięcia ABV w seam.
- Seam już współdzieli grawitację (`recipe-to-calc.ts` linie 105–112) — ABV dokleja się jak IBU, bez nowej infrastruktury.
- Decyzja zakresu: **dodatki i zakres temperatur fermentacji są zbierane jako dane, nie wpływają na obliczenia** w v1 (jak przerwy zacierania / stosunek woda-słód) — żadna zmiana silnika.
- Decyzja UX: **brak gate'u walidacji** na krokach Drożdże i Dodatki — wszystkie pola łagodne; domyślne odfermentowanie 75 sprawia, że ABV liczy się od razu.
- Dodanie kroków po Chmielu sprawia, że Chmiel **przestaje być ostatnim krokiem** — jego dotychczas martwa gałąź walidacji (impl-review S-02 F2) staje się aktywna i działa bez zmian.
- Selektor etapu dodatków: **generalizacja `HopStageSelect`** w options-driven komponent współdzielony (jedyny nowy dropdown — typ drożdży jest tekstowy).

## What We're NOT Doing

- **Brak zmian w silniku obliczeń** — `calcABV` i `computeMetrics` są gotowe; nie dotykamy `src/lib/calc/*` poza ewentualnym brakiem (nic nie wymaga zmiany).
- **Dodatki NIE wpływają na metryki** — brak modelu cukru fermentowalnego → grawitacja/ABV; zbierane jako dane przepisu (decyzja zakresu v1).
- **Zakres temperatur fermentacji NIE wpływa na obliczenia** — zbierany jako dane.
- **Brak pola `amount` w dodatkach** — kształt z roadmapy S-03: `{ name, stage, timeMin, notes }`.
- **Brak gate'u walidacji** na krokach Drożdże/Dodatki — brak nowych gałęzi w `handleNext`.
- **Brak zapisu / persystencji** — to F-01 + S-04. ABV i pozostałe metryki są tylko liczone na żywo.
- **Brak instalacji shadcn `Select`/`Textarea`** — selektor przez zgeneralizowany `HopStageSelect`; notatki przez stylowany natywny `<textarea>`.

## Implementation Approach

Trzy fazy w kolejności zależności. Faza 1 rozszerza model i schemat (typy + Zod + domyślne). Faza 2 wpina ABV w seam i panel (jednostkowo testowalna przez Vitest). Faza 3 buduje UI dwóch kroków na bazie istniejących wzorców i wpina je w kreator (weryfikacja manualna).

Odfermentowanie jest wprowadzane jako procent (0–100, domyślnie 75) — spójnie z `mash.efficiencyPct` — i konwertowane na ułamek w seamie. ABV korzysta z OG = grawitacji liczonej raz z zasypu+wydajności (jak `computeWizardMetrics` dla BLG/IBU). Sentinel niewystarczających danych propaguje się do ABV tak jak do pozostałych trzech metryk.

## Critical Implementation Details

**Propagacja sentinela do ABV**: gdy `mapDraftToCalcInput` zwraca `{ ok: false }`, wszystkie cztery metryki dostają ten sentinel. Gdy grawitacja jest OK, ale odfermentowanie jest poza `(0, 100]` (np. wyczyszczone pole → `NaN`), ABV musi dostać własny `{ ok: false }` — `calcABV` nie może dostać `null`. Seam liczy atenuację jako ułamek lub `null` i przy `null` zwraca sentinel, nie wołając `calcABV`.

**Subskrypcja panelu**: dodatki nie wpływają na żadną metrykę, więc `useWatch` **nie** obejmuje `adjuncts` (utrzymanie wąskiej subskrypcji, jak komentarz przy `MetricsPanel` linia 39). Draft składany w panelu ustawia `adjuncts: []`, bo seam ich nie czyta — analogicznie do pustego `basics`.

## Phase 1: Model danych + schemat

### Overview

Rozszerzyć `RecipeDraft` o `yeast` i `adjuncts`, dodać typy etapu dodatków, schematy Zod (pełny draft) oraz domyślne wartości.

### Changes Required:

#### 1. Typy współdzielone

**File**: `src/types.ts`

**Intent**: Dodać encje drożdży i dodatków do modelu draftu kreatora.

**Contract**:

- `AdjunctStage = "mash" | "boil" | "whirlpool" | "fermentation"`.
- `YeastParams = { strain: string; type: string; attenuationPct: number; fermTempMinC: number; fermTempMaxC: number }`.
- `AdjunctEntry = { name: string; stage: AdjunctStage; timeMin: number; notes: string }`.
- `RecipeDraft` rozszerzone o `yeast: YeastParams` i `adjuncts: AdjunctEntry[]`.

#### 2. Schemat Zod + domyślne wartości

**File**: `src/lib/recipe-schema.ts`

**Intent**: Odzwierciedlić nowe pola w `recipeDraftSchema` i dodać domyślne wpisy. Brak schematów per-krok dla drożdży/dodatków (brak gate'u walidacji — decyzja).

**Contract**:

- `yeastSchema` (`z.object`): `strain` (`z.string()`), `type` (`z.string()`), `attenuationPct` (`z.coerce.number` 0–100, łagodne — zero dozwolone w trakcie pracy, jak `mash.efficiencyPct`), `fermTempMinC`/`fermTempMaxC` (`z.coerce.number`, mogą być ujemne lub nie — przyjąć `z.coerce.number` bez ograniczenia dolnego dla temperatury; komunikaty po polsku).
- `adjunctEntrySchema` (`z.object`): `name` (`z.string()`), `stage` (`z.enum(["mash", "boil", "whirlpool", "fermentation"])`), `timeMin` (`z.coerce.number` ≥ 0), `notes` (`z.string()`).
- `recipeDraftSchema` rozszerzone o `yeast: yeastSchema` i `adjuncts: z.array(adjunctEntrySchema)`.
- `defaultRecipeDraft` rozszerzone o `yeast: { strain: "", type: "", attenuationPct: 75, fermTempMinC: 0, fermTempMaxC: 0 }` i `adjuncts: []`.
- `defaultAdjunctEntry: RecipeDraft["adjuncts"][number] = { name: "", stage: "boil", timeMin: 0, notes: "" }`.

### Success Criteria:

#### Automated Verification:

- Type checking przechodzi (rozszerzony `RecipeDraft` spójny ze schematem): `npm run lint`
- Istniejące testy nie regresują: `npm run test`

#### Manual Verification:

- Brak — faza typów/schematu.

---

## Phase 2: Seam obliczeń + ABV na żywo

### Overview

Wpiąć odfermentowanie z draftu w seam, dodać ABV do `WizardMetrics` (współdzieląc grawitację), oraz wyświetlić ABV w `MetricsPanel`.

### Changes Required:

#### 1. Mapowanie draft → ABV w seamie

**File**: `src/lib/recipe-to-calc.ts`

**Intent**: Policzyć ABV ze współdzielonej grawitacji i odfermentowania drożdży, z poprawną propagacją sentinela.

**Contract**:

- Helper `attenuationFromDraft(draft): number | null` — `pct = draft.yeast.attenuationPct`; zwraca `pct / 100` gdy `Number.isFinite(pct) && pct > 0 && pct <= 100`, inaczej `null` (wzorzec z `mashEfficiencyFromDraft`).
- `WizardMetrics` rozszerzone o `abv: CalcResult<number>`.
- W `computeWizardMetrics`: gdy `mapped` nie OK → `abv` dostaje ten sam sentinel (`{ blg: mapped, srm: mapped, ibu: mapped, abv: mapped }`). Gdy grawitacja OK: `attenuation = attenuationFromDraft(draft)`; `abv = (gravity.ok && attenuation !== null) ? calcABV({ og: gravity.value.sg, attenuation }) : (gravity.ok ? { ok: false, reason: "Odfermentowanie musi być w zakresie (0, 100]." } : gravity)`.
- Zaimportować `calcABV` z `@/lib/calc`.

#### 2. Panel metryk

**File**: `src/components/recipe/MetricsPanel.tsx`

**Intent**: Dodać kafelek ABV i rozszerzyć subskrypcję o `yeast` (nie o `adjuncts`).

**Contract**: `useWatch` na `["batch", "malts", "mash", "hops", "yeast"]`; draft składany z tych slice'ów + `adjuncts: []`; dodać `<Metric label="ABV" unit="%" value={formatMetric(abv, 1)} />` (jedno miejsce po przecinku). Zachować `—` dla `!ok`.

### Success Criteria:

#### Automated Verification:

- Testy seamu (ABV) przechodzą: `npm run test`
- Type checking / lint przechodzi: `npm run lint`

#### Manual Verification:

- Brak na tym etapie (kroki Drożdże/Dodatki powstają w Fazie 3); panel zweryfikowany po Fazie 3.

**Implementation Note**: Rozszerzyć `src/lib/recipe-to-calc.test.ts` o: domyślne odfermentowanie (75) + ważący zasyp → `abv.ok === true` i wartość > 0; wyższe odfermentowanie → wyższe ABV; odfermentowanie 0 lub > 100 → `abv` `{ ok: false }` mimo poprawnego BLG; brak zasypu (sentinel) → `abv` `{ ok: false }`; ABV niezależne od listy dodatków.

---

## Phase 3: UI kreatora — kroki Drożdże i Dodatki

### Overview

Zgeneralizować selektor, zbudować krok Drożdże (pojedyncze pola) i krok Dodatki (lista dynamiczna), wpiąć oba do `RecipeWizard`.

### Changes Required:

#### 1. Generalizacja selektora etapu

**File**: `src/components/recipe/HopStageSelect.tsx` → reusable + `src/components/recipe/HopRow.tsx` (aktualizacja)

**Intent**: Wyodrębnić options-driven, stylowany dropdown używany przez etap chmielu i etap dodatków, bez regresji UI chmielu.

**Contract**: Generyczny komponent (np. `StyledSelect<T extends string>`) przyjmujący `options: { value: T; label: string }[]`, `id`, `value`, `onChange`, `onBlur?`, `invalid?` — zachowuje obecne zachowanie `HopStageSelect` (button + listbox, zamykanie na klik poza, `hopFieldShellClass`). `HopStageSelect` staje się cienkim wrapperem nad `StyledSelect` z `STAGE_OPTIONS` chmielu **albo** `HopRow` używa `StyledSelect` bezpośrednio z opcjami chmielu. Etap chmielu działa identycznie jak dziś.

#### 2. Krok Drożdże

**File**: `src/components/recipe/steps/YeastStep.tsx` (nowy)

**Intent**: Pojedyncze pola drożdży (bez listy dynamicznej), wzorzec z `MashStep`/`BasicsStep`.

**Contract**: Pola `register("yeast.strain")`, `register("yeast.type")` (tekst); `register("yeast.attenuationPct", { valueAsNumber: true })` (number %, 0–100, placeholder „np. 75"); `register("yeast.fermTempMinC")` i `register("yeast.fermTempMaxC")` (number °C). Stylowanie jak `MashStep` (`inputClass`, ikony opcjonalnie). Etykiety i komunikaty po polsku. Krótki opis PL, że odfermentowanie steruje ABV na żywo.

#### 3. Krok Dodatki

**File**: `src/components/recipe/steps/AdjunctsStep.tsx` (nowy)

**Intent**: Lista dynamiczna dodatków.

**Contract**: Osadza `AdjunctList`; krótki opis PL, że dodatki są zapisywane jako część przepisu (nie zmieniają metryk).

#### 4. Lista i wiersz dodatków

**File**: `src/components/recipe/AdjunctList.tsx`, `src/components/recipe/AdjunctRow.tsx` (nowe)

**Intent**: Odtworzyć wzorzec `HopList`/`HopRow` dla dodatków z add/move/remove i selektorem etapu.

**Contract**: `AdjunctList` — `useFieldArray({ control, name: "adjuncts" })`, `append({ ...defaultAdjunctEntry })`, pusty stan z komunikatem PL, etykiety „Dodaj dodatek". `AdjunctRow` — pola `name`, `timeMin` przez `register` (`timeMin` z `valueAsNumber`); `notes` jako stylowany natywny `<textarea>` (rows 2, klasy spójne z `inputClass`); `stage` przez `Controller` + zgeneralizowany `StyledSelect` z opcjami: „Zacieranie" → `mash`, „Gotowanie" → `boil`, „Whirlpool" → `whirlpool`, „Fermentacja" → `fermentation`; callbacki move/remove z rodzica; `aria-label` po polsku.

#### 5. Wpięcie kroków do kreatora

**File**: `src/components/recipe/RecipeWizard.tsx`

**Intent**: Dodać kroki Drożdże i Dodatki po Chmielu; brak nowych gałęzi walidacji (brak gate'u).

**Contract**: `WIZARD_STEPS` += `{ id: "yeast", label: "Drożdże" }`, `{ id: "adjuncts", label: "Dodatki" }`; `STEP_COMPONENTS` += `YeastStep, AdjunctsStep`. `handleNext`: gałąź kroku Chmiel (index 3) pozostaje bez zmian — przestaje być martwa, bo Chmiel nie jest już ostatnim krokiem (usunąć/zaktualizować komentarz TODO(S-04) odpowiednio); brak gałęzi dla index 4 (Drożdże) i 5 (Dodatki). `isLastStep` przelicza się automatycznie (Dodatki = ostatni).

### Success Criteria:

#### Automated Verification:

- Lint i build przechodzą: `npm run lint` i `npm run build`
- Testy nie regresują: `npm run test`

#### Manual Verification:

- Przejście Podstawy → Zasyp → Zacieranie → Chmiel → Drożdże → Dodatki działa; przyciski Wstecz/Dalej poprawne; „Dalej" wyłączone tylko na ostatnim kroku (Dodatki).
- Krok Chmiel teraz waliduje wiersze (np. alfa > 100 blokuje „Dalej" z błędem na wierszu) — wcześniej martwa gałąź.
- Krok Drożdże: domyślne odfermentowanie 75 daje ABV na żywo; zmiana odfermentowania zmienia ABV; szczep/typ/temperatury to tekst/liczby bez gate'u.
- ABV pokazuje `—` gdy brak zasypu (brak grawitacji) lub odfermentowanie ≤ 0 / > 100.
- Krok Dodatki: add/move/remove działa; selektor etapu czytelny; notatki wieloliniowe; dodatki nie zmieniają żadnej metryki (BLG/Barwa/IBU/ABV stałe przy edycji dodatków).
- Wszystkie cztery kafelki (BLG/Barwa/IBU/ABV) widoczne i reagują na właściwe pola.

**Implementation Note**: Po Fazie 3 i przejściu automatycznej weryfikacji — zatrzymać się i poczekać na manualne potwierdzenie testów UI przez człowieka.

---

## Testing Strategy

### Unit Tests:

- Seam ABV (`src/lib/recipe-to-calc.test.ts`): domyślne odfermentowanie + zasyp → `abv.ok` i > 0; wyższe odfermentowanie → wyższe ABV; odfermentowanie 0/>100 → sentinel mimo poprawnego BLG; brak zasypu → sentinel; ABV niezależne od dodatków.
- Brak nowych testów silnika — `calcABV` już pokryte (`abv.test.ts`).

### Integration Tests:

- Brak osobnych testów integracyjnych React (projekt nie ma harnessu komponentów); pokrycie logiki przez testy seamu i silnika.

### Manual Testing Steps:

1. Otwórz `/recipes/new`, przejdź przez wszystkie 6 kroków.
2. W Zasypie ustaw objętość i co najmniej jeden słód → BLG/SRM widoczne.
3. W Drożdżach zostaw odfermentowanie 75 → ABV > 0; zmień na 85 → ABV rośnie; wyczyść pole → ABV `—`.
4. W Dodatkach dodaj kilka dodatków (różne etapy, czasy, notatki) → metryki bez zmian; sprawdź add/move/remove.
5. Wróć do Zasypu i wyczyść objętość → wszystkie cztery metryki `—`.
6. W Chmielu wpisz alfa 150 → „Dalej" zablokowane z błędem na wierszu (aktywna walidacja Chmielu).

## Performance Considerations

Obliczenia są czyste i tanie; `MetricsPanel` liczy synchronicznie przy zmianie obserwowanych pól (`useWatch`), bez debounce — zgodnie z wzorcem S-01/S-02. ABV to jedno dodatkowe wywołanie na bazie już policzonej grawitacji; koszt pomijalny. Subskrypcja celowo pomija `adjuncts`, by edycja dodatków nie wyzwalała przeliczeń.

## Migration Notes

Brak migracji danych — model jest in-memory (`RecipeDraft`). Persystencja przyjdzie w F-01/S-04; rozszerzenie o `yeast`/`adjuncts` jest addytywne i zgodne z domyślnymi wartościami.

## References

- Roadmap slice S-03: `context/foundation/roadmap.md` linie 116–126
- PRD: FR-008, FR-009, FR-010 — `context/foundation/prd.md` linie 82–90
- Silnik ABV: `src/lib/calc/abv.ts`, testy `src/lib/calc/abv.test.ts`
- Wzorzec wpięcia ABV: `src/lib/calc/index.ts` linia 56 (`computeMetrics`)
- Seam S-02: `src/lib/recipe-to-calc.ts` (`computeWizardMetrics`, `mashEfficiencyFromDraft`)
- Wzorzec listy dynamicznej + selektor: `src/components/recipe/HopList.tsx`, `HopRow.tsx`, `HopStageSelect.tsx`
- Plan S-02 (precedens): `context/changes/wizard-mash-hops-ibu/plan.md`
- Lekcje / review S-02: `context/foundation/lessons.md`, `context/changes/wizard-mash-hops-ibu/reviews/impl-review.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Model danych + schemat

#### Automated

- [x] 1.1 Type checking przechodzi (rozszerzony `RecipeDraft` spójny ze schematem): `npm run lint` — 245ce27
- [x] 1.2 Istniejące testy nie regresują: `npm run test` — 245ce27

### Phase 2: Seam obliczeń + ABV na żywo

#### Automated

- [x] 2.1 Testy seamu (ABV) przechodzą: `npm run test` — 478958c
- [x] 2.2 Type checking / lint przechodzi: `npm run lint` — 478958c

### Phase 3: UI kreatora — kroki Drożdże i Dodatki

#### Automated

- [x] 3.1 Lint i build przechodzą: `npm run lint` i `npm run build` — f49be34
- [x] 3.2 Testy nie regresują: `npm run test` — f49be34

#### Manual

- [x] 3.3 Przejście przez wszystkie 6 kroków działa; Wstecz/Dalej poprawne; „Dalej" wyłączone tylko na Dodatkach — f49be34
- [x] 3.4 Krok Chmiel waliduje wiersze (alfa > 100 blokuje z błędem) — aktywna gałąź — f49be34
- [x] 3.5 Domyślne odfermentowanie 75 daje ABV; zmiana odfermentowania zmienia ABV — f49be34
- [x] 3.6 ABV pokazuje `—` gdy brak grawitacji lub odfermentowanie ≤ 0 / > 100 — f49be34
- [x] 3.7 Dodatki: add/move/remove działa; selektor czytelny; notatki wieloliniowe; metryki bez zmian przy edycji dodatków — f49be34
- [x] 3.8 Wszystkie cztery kafelki (BLG/Barwa/IBU/ABV) widoczne i reagują na właściwe pola — f49be34
