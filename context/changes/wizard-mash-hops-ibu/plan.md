# Kreator: zacieranie i chmiel z IBU na żywo (S-02) — Implementation Plan

## Overview

Rozszerzamy kreator przepisu o dwa nowe kroki — **Zacieranie** i **Chmiel** — oraz dodajemy **IBU** do panelu metryk liczonych na żywo. Zacieranie wprowadza wydajność (zastępując dotychczasową stałą `0.75`), stosunek woda/słód i dynamiczną listę przerw zacierania. Chmiel wprowadza dynamiczną listę dodatków z polem etapu (boil/whirlpool/dry hop) i czasem, z których liczone jest IBU modelem Tinsetha. Silnik obliczeń (`@/lib/calc`) ma już w pełni zaimplementowane IBU; ten slice rozszerza go o semantykę etapu i wpina chmiel + wydajność z inputu w istniejący seam i UI.

## Current State Analysis

S-01 (`wizard-basics-grist-blg-srm`) i F-02 (`calc-engine-harness`) są **zaimplementowane w kodzie**, mimo że roadmapa wciąż oznacza je jako `proposed`/`ready`.

- **Kreator** (`src/components/recipe/RecipeWizard.tsx`) to 2-krokowy flow: `WIZARD_STEPS` + `STEP_COMPONENTS` (linie 11–16), indeks kroku w `useState`, walidacja per-krok w `handleNext` (linie 26–43), wszystko w `FormProvider` (linie 57–70).
- **Stan formularza**: `react-hook-form` przez `useWizardRecipe` (`src/components/hooks/useWizardRecipe.ts`), `zodResolver(recipeDraftSchema)`, `defaultValues: defaultRecipeDraft`, `mode: "onTouched"`.
- **Wzorzec listy dynamicznej**: `MaltList.tsx` (`useFieldArray` z `append`/`move`/`remove`, linia 10) + `MaltRow.tsx` (pola przez `register(\`malts.${index}.field\`)`, callbacki `onMoveUp/onMoveDown/onRemove` z rodzica). Domyślny wpis: `defaultMaltEntry` (`recipe-schema.ts` linie 41–46).
- **Seam obliczeń**: `recipe-to-calc.ts` — `DEFAULT_MASH_EFFICIENCY = 0.75` (linia 19, oznaczone jako tymczasowe do S-02), `mapDraftToCalcInput` zwraca `BlgInput` (linie 34–58), `computeWizardMetrics` zwraca tylko `{ blg, srm }` (linie 70–81).
- **Silnik**: `src/lib/calc/` — `calcIBU` (Tinseth) w `ibu.ts` jest pełny i otestowany; `computeMetrics` (`index.ts` linie 45–56) liczy grawitację raz przez `computeGravity` i podaje `sg` do `calcIBU`/`calcABV`. Kontrakt `HopAddition` (`types.ts` linie 43–50) ma tylko `alphaAcidPercent`, `amountG`, `boilTimeMin` — **brak pola etapu**.
- **Panel metryk**: `MetricsPanel.tsx` — `useWatch` na `["batch", "malts"]` (linia 43), derived state bez `useEffect`/debounce, `formatMetric` pokazuje `—` gdy `!result.ok` (linie 9–14).
- **Typy**: `src/types.ts` — `RecipeDraft` = `{ basics, batch, malts }`; brak `mash`, `hops`, drożdży, dodatków.
- **Testy**: Vitest (`vitest.config.ts`), wzorzec `*.test.ts` współlokowane w `src/`, golden vectors w `src/lib/calc/*.test.ts`.
- **shadcn/ui**: tylko `button`, `card`, `input`, `label` — brak `Select`.

## Desired End State

Po ukończeniu planu zalogowany użytkownik w kreatorze może:

1. Przejść z kroku „Zasyp" do kroku **„Zacieranie"**: ustawić wydajność (%, domyślnie 75), stosunek woda/słód i dodać/przesunąć/usunąć przerwy zacierania (temperatura + czas).
2. Przejść do kroku **„Chmiel"**: dodać/przesunąć/usunąć dodatki chmielu (nazwa, alfa-kwasy %, ilość g, etap, czas min).
3. Widzieć **trzy** metryki na żywo (BLG, Barwa/SRM, **IBU**) aktualizujące się przy zmianie dowolnego pola wpływającego na obliczenia; IBU pokazuje `—` dopóki nie ma kompletu danych (zasyp dający grawitację + co najmniej jeden ważący dodatek boil/whirlpool).

**Weryfikacja**: `npm run test` (nowe golden vectors dla etapu + testy seamu przechodzą), `npm run lint`, `npm run build`; manualnie — przejście kroków, IBU reaguje na zmiany chmielu, dry hop nie zmienia IBU, whirlpool daje mniejszy wkład niż boil o tym samym czasie.

### Key Discoveries:

- IBU już zaimplementowane (`src/lib/calc/ibu.ts` linie 31–54); `computeMetrics` dzieli grawitację (`index.ts` linie 48–53) — to wzorzec dla seamu wizarda.
- `HopAddition` nie zna etapu (`src/lib/calc/types.ts` linie 43–50) — semantyka etapu wymaga rozszerzenia kontraktu silnika.
- Wzorzec listy dynamicznej w `MaltList.tsx`/`MaltRow.tsx` jest gotowy do dwukrotnego skopiowania (przerwy zacierania, chmiel).
- Walidacja kroku jest łagodna w S-01: `gristStepSchema` (`recipe-schema.ts` linie 26–31) wymaga dodatniej objętości, ale dopuszcza pustą listę słodów — wzorzec do powtórzenia.
- `MetricsPanel` używa derived state z `useWatch` (linia 43) — rozszerzenie o `mash`/`hops` wystarczy, bez nowego mechanizmu reaktywności.

## What We're NOT Doing

- **Brak ABV i kroku drożdży** — to S-03 (`wizard-yeast-adjuncts-abv`).
- **Brak zapisu przepisu / persystencji** — to F-01 + S-04.
- **Przerwy zacierania i stosunek woda/słód NIE wpływają na obliczenia** — zbierane jako dane przepisu (decyzja); żaden obecny wzór ich nie konsumuje.
- **Brak modelu osobnej objętości/grawitacji przedwarzelnej (boil volume / pre-boil gravity)** — IBU używa SG = OG z zasypu+wydajności, zgodnie z istniejącym `computeMetrics`.
- **Brak instalacji shadcn `Select`** — etap wybierany natywnym stylowanym `<select>`.
- **Brak edycji/usuwania zapisanych przepisów, eksportu** — poza zakresem v1/tego slice'a.

## Implementation Approach

Cztery fazy w kolejności zależności: najpierw czyste, testowalne rozszerzenie silnika (etap → współczynnik wykorzystania), potem rozszerzenie modelu danych i schematów, potem seam łączący model z silnikiem + IBU w panelu, na końcu UI dwóch kroków. Fazy 1–3 są jednostkowo testowalne (Vitest), faza 4 jest weryfikowana manualnie w UI.

Semantyka etapu chmielu realizowana jest przez opcjonalne pole `utilizationFactor` w `HopAddition` (domyślnie `1.0`), aplikowane jako mnożnik wykorzystania w Tinsecie. Seam mapuje etap → współczynnik (`boil` → 1.0, `whirlpool` → 0.25, `dry hop` → wykluczony z IBU). IBU korzysta z SG = OG liczonego raz z zasypu+wydajności (jak w `computeMetrics`).

## Critical Implementation Details

**Współdzielenie grawitacji w seamie**: IBU wymaga `sg`. `computeGravity` jest wewnętrzny dla silnika (nie na barrelu `index.ts`). Seam wyliczy grawitację raz i poda `sg` do `calcIBU` — wymaga to udostępnienia `computeGravity` (i `blgFromSg`) na publicznym barrelu **albo** policzenia `sg` lokalnie w seamie. Wybór: wyeksportować `computeGravity` z `@/lib/calc`, by uniknąć duplikacji formuły grawitacji i utrzymać silnik jako jedyne źródło prawdy.

**Tinseth nie jest liniowy w czasie**: nie wolno realizować „redukcji whirlpool" przez skalowanie `boilTimeMin` — wkład IBU nie jest proporcjonalny do czasu. Redukcja musi być mnożnikiem na `utilization`, stąd `utilizationFactor` w silniku (nie w mapowaniu czasu).

## Phase 1: Silnik — chmiel wg etapu

### Overview

Rozszerzyć kontrakt `HopAddition` i Tinsetha o współczynnik wykorzystania, tak by seam mógł wyrazić semantykę etapu, oraz pokryć to golden vectorami w harnessie F-02.

### Changes Required:

#### 1. Kontrakt silnika

**File**: `src/lib/calc/types.ts`

**Intent**: Dodać opcjonalne pole pozwalające skalować wykorzystanie pojedynczego dodatku, by reprezentować etap (whirlpool < boil) bez ujawniania pojęcia „etapu" w czystym silniku.

**Contract**: Do `HopAddition` (linie 43–50) dochodzi `utilizationFactor?: number` — bezwymiarowy mnożnik wykorzystania w `[0, 1]`, domyślnie `1.0`. Brak pola zachowuje obecne zachowanie (zgodność wsteczna z istniejącymi testami i `computeMetrics`).

#### 2. Formuła Tinsetha

**File**: `src/lib/calc/ibu.ts`

**Intent**: Zastosować współczynnik wykorzystania do wkładu każdego dodatku, zachowując dotychczasowe guardy (objętość > 0, SG ≥ 1, co najmniej jeden ważący dodatek).

**Contract**: W reduktorze (linie 47–51) `utilization = bigness × boilTimeFactor(t) × (h.utilizationFactor ?? 1)`. Filtr `validHops` (linia 41) pozostaje oparty o `alphaAcidPercent > 0 && amountG > 0 && boilTimeMin > 0` — dodatki o współczynniku `0` mogą zostać wykluczone wcześniej w seamie (Faza 3), tu nie zmieniamy guardów wejściowych. Funkcja nadal nigdy nie zwraca `NaN`/`Infinity`.

#### 3. Dokumentacja kontraktu

**File**: `src/lib/calc/README.md`

**Intent**: Udokumentować nowe pole, zakres i domyślną wartość oraz że jest to przybliżenie (mnożnik wykorzystania, nie fizyczny model whirlpool).

**Contract**: Sekcja IBU/`HopAddition` opisuje `utilizationFactor` (zakres, default 1.0, znaczenie).

### Success Criteria:

#### Automated Verification:

- Nowe golden vectors przechodzą: `npm run test`
- Type checking / lint przechodzi: `npm run lint`

#### Manual Verification:

- Brak — faza czysto jednostkowa.

**Implementation Note**: Dodać do `src/lib/calc/ibu.test.ts` wektory: (a) `utilizationFactor` pominięty == obecny wynik (regresja), (b) `utilizationFactor = 0.25` daje ~1/4 wkładu danego dodatku, (c) `utilizationFactor = 0` daje 0 wkładu danego dodatku, (d) niezmienność dotychczasowego golden ~16.2 IBU.

---

## Phase 2: Model danych + schemat

### Overview

Rozszerzyć `RecipeDraft` o `mash` i `hops`, dodać schematy Zod (pełny + per-krok), domyślne wartości i typy etapu.

### Changes Required:

#### 1. Typy współdzielone

**File**: `src/types.ts`

**Intent**: Dodać encje zacierania i chmielu do modelu draftu kreatora.

**Contract**:
- `HopStage = "boil" | "whirlpool" | "dryHop"`.
- `MashRest = { tempC: number; durationMin: number }`.
- `HopEntry = { name: string; alphaAcidPercent: number; amountG: number; stage: HopStage; timeMin: number }`.
- `MashParams = { efficiencyPct: number; waterToGrainRatio: number; rests: MashRest[] }`.
- `RecipeDraft` rozszerzone o `mash: MashParams` i `hops: HopEntry[]`.

#### 2. Schemat Zod + domyślne wartości

**File**: `src/lib/recipe-schema.ts`

**Intent**: Odzwierciedlić nowe pola w `recipeDraftSchema`, dodać schematy walidacji kroków i domyślne wpisy list.

**Contract**:
- `mashRestSchema` (temp i czas jako `z.coerce.number`, nieujemne), `hopEntrySchema` (alfa% 0–100, ilość ≥ 0, czas ≥ 0, `stage` jako `z.enum`).
- `recipeDraftSchema` rozszerzone o `mash` (efficiencyPct 0–100, waterToGrainRatio ≥ 0, `rests` array) i `hops` array; pola łagodne na poziomie draftu (zero dozwolone w trakcie pracy, jak `batch.volumeL`).
- `mashStepSchema` — wymaga `mash.efficiencyPct` dodatniej (`positive`), reszta łagodna.
- `hopsStepSchema` — `hops` array z `hopEntrySchema` (dopuszcza pustą listę).
- `defaultRecipeDraft` rozszerzone o `mash: { efficiencyPct: 75, waterToGrainRatio: 0, rests: [] }` i `hops: []`.
- `defaultMashRest = { tempC: 0, durationMin: 0 }`, `defaultHopEntry = { name: "", alphaAcidPercent: 0, amountG: 0, stage: "boil", timeMin: 0 }`.

### Success Criteria:

#### Automated Verification:

- Type checking przechodzi (rozszerzony `RecipeDraft` spójny ze schematem): `npm run lint`
- Istniejące testy nie regresują: `npm run test`

#### Manual Verification:

- Brak — faza typów/schematu.

---

## Phase 3: Seam obliczeń + metryki na żywo

### Overview

Wpiąć wydajność z inputu i listę chmielu w seam `recipe-to-calc.ts`, dodać IBU do `WizardMetrics` (współdzieląc grawitację), oraz wyświetlić IBU w `MetricsPanel`.

### Changes Required:

#### 1. Udostępnienie grawitacji

**File**: `src/lib/calc/index.ts`

**Intent**: Pozwolić seamowi policzyć grawitację raz i podać `sg` do IBU bez duplikacji formuły.

**Contract**: Wyeksportować `computeGravity` (i `Gravity`/`GravityInput` w razie potrzeby typów) z barrelu. Brak zmiany istniejących eksportów.

#### 2. Mapowanie draft → wejścia silnika

**File**: `src/lib/recipe-to-calc.ts`

**Intent**: Zastąpić stałą wydajność wartością z `draft.mash.efficiencyPct`, zmapować `draft.hops` na `HopAddition[]` z `utilizationFactor` wg etapu, i policzyć IBU współdzieląc grawitację.

**Contract**:
- Usunąć/zdezaktualizować `DEFAULT_MASH_EFFICIENCY`; wydajność = `mash.efficiencyPct / 100`, z guardem `(0, 1]` (poza zakresem → sentinel dla BLG/IBU).
- Stała `WHIRLPOOL_UTILIZATION_FACTOR = 0.25` (nazwana, udokumentowana jako przybliżenie); `boil → 1.0`, `dryHop → wykluczony` z listy IBU.
- Mapowanie hopów: `{ alphaAcidPercent, amountG, boilTimeMin: timeMin, utilizationFactor }`, z pominięciem dry hop oraz wpisów niekompletnych (alfa/ilość/czas ≤ 0).
- `WizardMetrics` rozszerzone o `ibu: CalcResult<number>`.
- `computeWizardMetrics`: policz `gravity = computeGravity({ malts, volumeL, mashEfficiency })`; `blg`/`srm` jak dotąd; `ibu = gravity.ok ? calcIBU({ hops, volumeL, sg: gravity.value.sg }) : gravity`. Sentinel niewystarczających danych propaguje się do wszystkich trzech.

#### 3. Panel metryk

**File**: `src/components/recipe/MetricsPanel.tsx`

**Intent**: Dodać kafelek IBU i rozszerzyć subskrypcję `useWatch` o pola wpływające na IBU.

**Contract**: `useWatch` na `["batch", "malts", "mash", "hops"]`; draft składany z tych slice'ów; dodać `<Metric label="IBU" unit="IBU" value={formatMetric(ibu, 0)} />` (IBU bez miejsc po przecinku). Zachować `—` dla `!ok`.

### Success Criteria:

#### Automated Verification:

- Testy seamu przechodzą: `npm run test`
- Type checking / lint przechodzi: `npm run lint`

#### Manual Verification:

- Brak na tym etapie (UI kroków powstaje w Fazie 4); panel zweryfikowany manualnie po Fazie 4.

**Implementation Note**: Rozszerzyć `src/lib/recipe-to-calc.test.ts` o: wydajność z inputu wpływa na BLG; pusta lista chmielu → `ibu` `{ ok: false }`; dodatek boil daje IBU > 0; whirlpool < boil dla tego samego czasu/ilości; dry hop nie zmienia IBU; niepoprawna wydajność (0 lub > 100) → sentinel.

---

## Phase 4: UI kreatora — kroki Zacieranie i Chmiel

### Overview

Dodać dwa kroki kreatora wykorzystujące wzorzec listy dynamicznej z S-01, i wpiąć je do `RecipeWizard` z walidacją per-krok.

### Changes Required:

#### 1. Krok Zacieranie

**File**: `src/components/recipe/steps/MashStep.tsx` (nowy)

**Intent**: Pola wydajności (%) i stosunku woda/słód + dynamiczna lista przerw zacierania.

**Contract**: Pola `register("mash.efficiencyPct")`, `register("mash.waterToGrainRatio")` (stylowane jak `BasicsStep`/`GristStep`); osadza `MashRestList`. Etykiety i komunikaty po polsku.

#### 2. Lista i wiersz przerw zacierania

**File**: `src/components/recipe/MashRestList.tsx`, `src/components/recipe/MashRestRow.tsx` (nowe)

**Intent**: Odtworzyć wzorzec `MaltList`/`MaltRow` dla przerw (temperatura, czas) z add/move/remove.

**Contract**: `useFieldArray({ control, name: "mash.rests" })`; `append({ ...defaultMashRest })`; wiersz przez `register(\`mash.rests.${index}.tempC|durationMin\`)`, callbacki move/remove z rodzica; pusty stan z komunikatem PL.

#### 3. Krok Chmiel

**File**: `src/components/recipe/steps/HopsStep.tsx` (nowy)

**Intent**: Dynamiczna lista dodatków chmielu.

**Contract**: Osadza `HopList`; krótki opis PL że IBU liczy się na żywo.

#### 4. Lista i wiersz chmielu

**File**: `src/components/recipe/HopList.tsx`, `src/components/recipe/HopRow.tsx` (nowe)

**Intent**: Wzorzec listy dynamicznej dla chmielu z selektorem etapu.

**Contract**: `useFieldArray({ control, name: "hops" })`; `append({ ...defaultHopEntry })`; wiersz: pola `name`, `alphaAcidPercent`, `amountG`, `timeMin` przez `register`, oraz `stage` jako natywny stylowany `<select>` z opcjami PL (np. „Gotowanie", „Whirlpool", „Chmielenie na zimno") mapowanymi na `boil`/`whirlpool`/`dryHop`; callbacki move/remove; pusty stan PL.

#### 5. Wpięcie kroków do kreatora

**File**: `src/components/recipe/RecipeWizard.tsx`

**Intent**: Dodać kroki Zacieranie i Chmiel po Zasypie z walidacją per-krok.

**Contract**: `WIZARD_STEPS` += `{ id: "mash", label: "Zacieranie" }`, `{ id: "hops", label: "Chmiel" }` (linie 11–14); `STEP_COMPONENTS` += `MashStep, HopsStep` (linia 16). W `handleNext` dodać gałąź dla kroku mash (`validateWizardStep(mashStepSchema, …, ["mash.efficiencyPct"])`) i kroku hops (`validateWizardStep(hopsStepSchema, …)`); `isLastStep` przelicza się automatycznie z długości `WIZARD_STEPS`.

### Success Criteria:

#### Automated Verification:

- Lint i build przechodzą: `npm run lint` i `npm run build`
- Testy nie regresują: `npm run test`

#### Manual Verification:

- Przejście Podstawy → Zasyp → Zacieranie → Chmiel działa; przyciski Wstecz/Dalej poprawne.
- Krok Zacieranie blokuje przejście przy wydajności ≤ 0; dopuszcza puste przerwy.
- Add/move/remove działa na liście przerw i liście chmielu.
- IBU pojawia się na żywo po dodaniu ważącego dodatku boil; rośnie z ilością/alfą/czasem.
- Whirlpool daje mniejsze IBU niż boil przy tych samych parametrach; dry hop nie zmienia IBU.
- Zmiana wydajności zacierania zmienia BLG na żywo.
- IBU pokazuje `—` gdy brak zasypu (brak grawitacji) lub brak ważącego dodatku.

**Implementation Note**: Po Fazie 4 i przejściu automatycznej weryfikacji — zatrzymać się i poczekać na manualne potwierdzenie testów UI przez człowieka.

---

## Testing Strategy

### Unit Tests:

- IBU: `utilizationFactor` (pominięty/0.25/0), regresja golden ~16.2 IBU (`src/lib/calc/ibu.test.ts`).
- Seam: wydajność z inputu → BLG; mapowanie etapu → IBU; pusta lista → sentinel; whirlpool < boil; dry hop bez wpływu; zła wydajność → sentinel (`src/lib/recipe-to-calc.test.ts`).

### Integration Tests:

- Brak osobnych testów integracyjnych React (projekt nie ma harnessu komponentów); pokrycie logiki przez testy seamu i silnika.

### Manual Testing Steps:

1. Otwórz `/recipes/new`, przejdź przez wszystkie 4 kroki.
2. W Zasypie ustaw objętość i co najmniej jeden słód → BLG/SRM widoczne.
3. W Zacieraniu zmień wydajność → BLG się zmienia; dodaj/usuń/przesuń przerwę.
4. W Chmielu dodaj dodatek boil (alfa, ilość, czas) → IBU > 0.
5. Zmień etap na whirlpool → IBU maleje; na dry hop → IBU bez tego wkładu.
6. Wyczyść objętość/zasyp → IBU/BLG/SRM pokazują `—`.

## Performance Considerations

Obliczenia są czyste i tanie; `MetricsPanel` liczy synchronicznie przy zmianie obserwowanych pól (`useWatch`), bez debounce — zgodnie z istniejącym wzorcem S-01. Dodatkowy koszt (mapowanie hopów + jedno wyliczenie grawitacji) jest pomijalny dla realnych rozmiarów list.

## Migration Notes

Brak migracji danych — model jest in-memory (`RecipeDraft`). Persystencja przyjdzie w F-01/S-04; rozszerzenie `RecipeDraft` o `mash`/`hops` jest addytywne i zgodne z domyślnymi wartościami.

## References

- Roadmap slice S-02: `context/foundation/roadmap.md` linie 104–114
- PRD: FR-006, FR-007, FR-010 — `context/foundation/prd.md` linie 78–90
- Silnik IBU: `src/lib/calc/ibu.ts`, kontrakt `src/lib/calc/types.ts`
- Agregat współdzielący grawitację: `src/lib/calc/index.ts` linie 45–56
- Wzorzec listy dynamicznej: `src/components/recipe/MaltList.tsx`, `MaltRow.tsx`
- Seam S-01: `src/lib/recipe-to-calc.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Silnik — chmiel wg etapu

#### Automated

- [x] 1.1 Nowe golden vectors przechodzą: `npm run test` — e1e79ac
- [x] 1.2 Type checking / lint przechodzi: `npm run lint` — e1e79ac

### Phase 2: Model danych + schemat

#### Automated

- [x] 2.1 Type checking przechodzi (rozszerzony `RecipeDraft` spójny ze schematem): `npm run lint`
- [x] 2.2 Istniejące testy nie regresują: `npm run test`

### Phase 3: Seam obliczeń + metryki na żywo

#### Automated

- [ ] 3.1 Testy seamu przechodzą: `npm run test`
- [ ] 3.2 Type checking / lint przechodzi: `npm run lint`

### Phase 4: UI kreatora — kroki Zacieranie i Chmiel

#### Automated

- [ ] 4.1 Lint i build przechodzą: `npm run lint` i `npm run build`
- [ ] 4.2 Testy nie regresują: `npm run test`

#### Manual

- [ ] 4.3 Przejście Podstawy → Zasyp → Zacieranie → Chmiel działa; Wstecz/Dalej poprawne
- [ ] 4.4 Krok Zacieranie blokuje przejście przy wydajności ≤ 0; dopuszcza puste przerwy
- [ ] 4.5 Add/move/remove działa na liście przerw i liście chmielu
- [ ] 4.6 IBU na żywo po dodaniu ważącego dodatku boil; rośnie z ilością/alfą/czasem
- [ ] 4.7 Whirlpool < boil przy tych samych parametrach; dry hop nie zmienia IBU
- [ ] 4.8 Zmiana wydajności zacierania zmienia BLG na żywo
- [ ] 4.9 IBU pokazuje `—` gdy brak grawitacji lub brak ważącego dodatku
