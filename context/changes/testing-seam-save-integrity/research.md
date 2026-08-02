---
date: 2026-07-08T20:36:00+02:00
researcher: Dawid Blocher
git_commit: 9b86229d40808ae0cddd12ed4ecb7b97dc26cc7f
branch: master
repository: MyBrew
topic: "Plan testów — Faza 1: Integralność seamu obliczeniowego i round-tripu zapisu"
tags: [research, codebase, recipe-to-calc, recipe-save, seam, save-round-trip, phase-1]
status: complete
last_updated: 2026-07-08
last_updated_by: Dawid Blocher
---

# Research: Plan testów — Faza 1 (Integralność seamu i zapisu)

**Date**: 2026-07-08T20:36:00+02:00
**Researcher**: Dawid Blocher
**Git Commit**: 9b86229d40808ae0cddd12ed4ecb7b97dc26cc7f (lokalny, niepushowany)
**Branch**: master
**Repository**: MyBrew

## Research Question

Faza 1 planu testów (`context/foundation/test-plan.md` §3): _Integralność seamu i zapisu_.
Udowodnić, że:

- **Ryzyko #1** — wizard draft → silnik (`recipe-to-calc.ts`) mapuje poprawnie dla
  wszystkich stanów kreatora; seam nie gubi ani nie zniekształca pola po zmianie modelu draft.
- **Ryzyko #3** — round-trip zapisu (draft → Zod → DB → odczyt) nie gubi danych;
  brak wymaganego pola blokuje save z czytelnym błędem.

Cel researchu: dostarczyć konkretny, oparty na kodzie kontekst dla `/10x-plan` Fazy 1 —
mapę seamu, kształty typów, ścieżkę zapisu, istniejące pokrycie testami i luki.

## Summary

Faza 1 dotyka **jednego pliku seamu** (`src/lib/recipe-to-calc.ts`) i **jednej ścieżki zapisu**
(`recipe-save.ts` → `POST/PUT /api/recipes` → tabela `recipes` → `getRecipe` → `mapRowToRecord`).

**Kluczowe ustalenia:**

1. **Seam jest wąski i dobrze zlokalizowany.** Dwa eksportowane wejścia
   (`mapDraftToCalcInput`, `computeWizardMetrics`) i dwa konsumenty produkcyjne
   (`MetricsPanel` — live preview, `recipe-save` — persist). `computeWizardMetrics`
   **duplikuje** logikę agregatu `computeMetrics` z `src/lib/calc/index.ts` zamiast go wywoływać —
   brak testu parytetu, więc dryf jest niewykrywalny.

2. **Główny wektor Ryzyka #1: asymetria filtrowania seam vs. silnik.** Seam odrzuca tylko
   `amountKg <= 0`, natomiast silnik dodatkowo wymaga `extractPercent > 0` (grawitacja) i
   `colorEbc > 0` (SRM). Malt z dodatnią wagą, ale zerowym/NaN ekstraktem przechodzi seam
   (`{ ok: true }`) i cicho zmniejsza OG lub daje częściowe metryki — liczba wygląda wiarygodnie,
   jest błędna. To dokładnie scenariusz z mapy ryzyk.

3. **Konwersje jednostek w seamie są miejscem regresji.** `efficiencyPct / 100` i
   `attenuationPct / 100` (procent → ułamek), rename `timeMin → boilTimeMin`, semantyka stage →
   `utilizationFactor` (whirlpool = 0.25, dryHop wykluczony). Żadna z tych transformacji nie ma
   dedykowanego golden-vectora przez pełny draft.

4. **Ryzyko #3 jest w dużej mierze zabezpieczone strukturalnie, ale nietestowane end-to-end.**
   Metryki są **liczone po stronie serwera** (klient ich nie przesyła), kolumny DB są NOT NULL i
   zawsze wypełnione gdy save się powiedzie, a Zod wymusza strukturę przed zapisem. Największa luka:
   **brak testu pełnego round-tripu** (save API → SELECT → deep-equal na `data` + metrykach) oraz
   **ciche usuwanie nieznanych kluczy** przez Zod (`parsed.data` bez `.strict()`/`.passthrough()`).

5. **Baza testów: `sparse` i czysto offline.** 9 plików `*.test.ts`, wszystkie w `src/lib/`, env
   `node`, zero mocków, zero klienta Supabase, brak wspólnych fixtures (builder `draft()`/`boilHop()`
   jest zduplikowany w dwóch plikach). Round-trip do prawdziwej DB to **nowa infrastruktura**.

## Detailed Findings

### Obszar 1 — Seam obliczeniowy (`recipe-to-calc.ts`) — Ryzyko #1

Pełna analiza: [seam mapping subagent](89e02c79-f700-4fa9-bbd2-31b9ece3ef79).

**Architektura:**

```
RecipeDraft
   │
   ├─ mapDraftToCalcInput()  → BlgInput { malts, volumeL, mashEfficiency }  (recipe-to-calc.ts:63)
   │       │  guards: volume finite & >0; efficiency (0,100]; ≥1 malt amountKg>0
   │       ▼
   └─ computeWizardMetrics() → WizardMetrics { blg, srm, ibu, abv }         (recipe-to-calc.ts:107)
           ├─ computeGravity → blgFromSg  (blg / ibu / abv zależą od gravity.ok)
           ├─ calcSRM   (niezależne od gravity)
           ├─ mapDraftHopsToCalc → calcIBU
           └─ attenuationFromDraft → calcABV
```

**Konsumenci produkcyjni (tylko dwaj):**

- `src/components/recipe/MetricsPanel.tsx:55` — `computeWizardMetrics(draft)` (live preview)
- `src/lib/recipe-save.ts:34` — `computeWizardMetrics(draft)` (walidacja + snapshot metryk przy zapisie)

`useWizardRecipe` **nie** wywołuje seamu; `RecipeWizard.tsx:202` renderuje `<MetricsPanel />`, które
posiada recompute.

**Transformacje pole-po-polu (`mapDraftToCalcInput`, `recipe-to-calc.ts:63-91`):**

| Draft                | Engine           | Reguła                                                                                | Linie        |
| -------------------- | ---------------- | ------------------------------------------------------------------------------------- | ------------ |
| `batch.volumeL`      | `volumeL`        | pass-through; guard `isFinite && >0`                                                  | 64-69        |
| `mash.efficiencyPct` | `mashEfficiency` | `/100`; guard `(0,100]`                                                               | 27-33, 71-74 |
| `malts[]`            | `malts[]`        | filtr `amountKg>0 && isFinite`; map `{amountKg,colorEbc,extractPercent}`; drop `name` | 76-86        |

**Prywatne mappery:**

- `mashEfficiencyFromDraft` (`recipe-to-calc.ts:27-33`) — procent → ułamek, `null` jako sentinel.
- `attenuationFromDraft` (`recipe-to-calc.ts:35-41`) — tylko ABV.
- `mapDraftHopsToCalc` (`recipe-to-calc.ts:43-53`) — filtr `stage!=="dryHop"` + `alpha/amount/time>0`;
  rename `timeMin → boilTimeMin`; `utilizationFactor` = `0.25` (whirlpool) / `1` (boil);
  `WHIRLPOOL_UTILIZATION_FACTOR` = 0.25 (`recipe-to-calc.ts:19`).

**Pola draft nigdy nie mapowane do silnika:** `basics.*`, `mash.waterToGrainRatio`, `mash.rests`,
`yeast.strain/type/fermTemp*`, całe `adjuncts[]`, `malts[].name`, `hops[].name`.

**Asymetria seam vs. silnik (rdzeń Ryzyka #1):**

| Sprawdzenie              | Seam                | Silnik                                                         |
| ------------------------ | ------------------- | -------------------------------------------------------------- |
| `malts[].extractPercent` | **nie sprawdza**    | `>0` wymagane dla grawitacji (`src/lib/calc/gravity.ts:52-54`) |
| `malts[].colorEbc`       | **nie sprawdza**    | `>0` wymagane dla SRM (`src/lib/calc/srm.ts:31-34`)            |
| `volumeL`                | `isFinite` wymagane | tylko `>0`                                                     |
| `efficiencyPct`          | guard `(0,100]`     | —                                                              |

**Scenariusze „plausible-but-wrong" (hotspoty Ryzyka #1):**

- Malt z `amountKg>0` ale `extractPercent:0` → seam `{ok:true}`, `metrics.blg` **fail** (`gravity.ts:52-54`).
- Malt z `colorEbc:0` → seam `{ok:true}`, `metrics.srm` **fail** (`srm.ts:31-34`).
- Mieszany grist (valid + zero-extract malt) → BLG liczy tylko malty z ekstraktem, cicho zaniża OG.
- Literówka `extractPercent: 8` zamiast `80` → brak sentinela, liczba wiarygodna, wejście błędne.
- `MetricsPanel` **hardkoduje** `adjuncts: []` (`MetricsPanel.tsx:52`) → live preview ≠ zapisany draft.

### Obszar 2 — Kształty typów i stany kreatora

Pełna analiza: [types & wizard states subagent](e8e853d9-7d19-41e3-bc87-33cc9be17059).

**Topologia kreatora (`RecipeWizard.tsx`), 6 kroków:**

| Idx | Krok       | Walidacja „Dalej"                                                     |
| --- | ---------- | --------------------------------------------------------------------- |
| 0   | `basics`   | `basics.name` + inline `basicsStyleSchema` (`RecipeWizard.tsx:79-87`) |
| 1   | `grist`    | `gristStepSchema` (volume **positive**, malt `amountKg` positive)     |
| 2   | `mash`     | `mashStepSchema` (efficiency **positive**)                            |
| 3   | `hops`     | `hopsStepSchema`                                                      |
| 4   | `yeast`    | **brak schematu kroku**                                               |
| 5   | `adjuncts` | **brak schematu kroku**                                               |

**`RecipeDraft`** (`src/types.ts:55-63`) — wszystkie klucze top-level wymagane; semantycznie
trzymają „puste" sentinele (`""`, `0`, `[]`). Domyślny draft: `defaultRecipeDraft`
(`src/lib/recipe-schema.ts:116-124`).

**`RecipeMetricsInput`** (`src/lib/calc/types.ts:76-85`): `malts`, `volumeL`, `mashEfficiency`
(**ułamek** `(0,1]`, nie procent), `hops`, `attenuation` (**ułamek** `(0,1]`). **Seam nie wywołuje
`computeMetrics`** — `computeWizardMetrics` odtwarza te same wejścia ręcznie.

**Najwyższego ryzyka niezgodności required/optional:**

1. **Procent vs ułamek** — draft `%`, silnik `(0,1]` (`efficiencyPct`, `attenuationPct`).
2. **Rename pól chmielu** — `timeMin → boilTimeMin`; stage → `utilizationFactor`; dryHop wykluczony.
3. **Asymetria filtrów maltu** — seam tylko `amountKg`; silnik dodatkowo `extractPercent>0`/`colorEbc>0`.
4. **Bramka zapisu ostrzejsza niż kroki kreatora** — brak `yeastStepSchema`/adjunct step; save wymaga
   **wszystkich czterech** metryk (w tym IBU → wymaga kwalifikującego się chmielu, ABV → attenuation `(0,100]`).
5. **Rozjazd walidacji stylu** — `recipeDraftSchema` dopuszcza pusty styl; `saveRecipeSchema` wymaga
   `trim().min(1)` (`recipe-schema.ts:98-101`).

### Obszar 3 — Round-trip zapisu — Ryzyko #3

Pełna analiza: [save round-trip subagent](c608b72a-a563-4b55-802a-df5e1ac4e4fb).

**Pipeline:**

```
RecipeWizard.handleSave()  → gate: buildRecipeInsert(draft,"")  (RecipeWizard.tsx:115-133)
   │ POST /api/recipes (create) | PUT /api/recipes/[id] (update) — body = surowy RecipeDraft (bez metryk)
   ▼
API route  → createClient (SSR, sesja cookie) → auth.getUser() (401) → request.json() (400)
   │        → buildRecipeInsert(body, user.id)  (400 z {errors} lub 201/200)
   ▼
buildRecipeInsert (recipe-save.ts:19-62)
   │  1. saveRecipeSchema.safeParse(draft) → błędy pól {field,message}
   │  2. computeWizardMetrics(draft) → jeśli któraś metryka !ok → błąd metrics.*
   │  3. insert = { user_id, name, style, blg, srm, ibu, abv, data: parsed.data }
   ▼
supabase.insert(...).select("id")  |  updateRecipe(...) (recipe-queries.ts:30-48; scope id AND user_id)
   ▼
getRecipe → select("*") → mapRowToRecord (recipe-mappers.ts:33-39)  [BEZ re-walidacji Zod na odczycie]
```

**Tabela DB `recipes`** (`supabase/migrations/20260609100000_create_recipes.sql:1-12`, +`updated_at`
w `20260614100000_add_recipe_edit_delete.sql`): `id`, `user_id`, `name`, `style`, `blg`, `srm`, `ibu`,
`abv`, `data` (jsonb — pełny `RecipeDraft`), `created_at`, `updated_at` — wszystkie NOT NULL.

**Kluczowe zabezpieczenia (dlaczego Ryzyko #3 jest średnio-niskie):**

- **Metryki liczone po stronie serwera** — `RecipeDraft` nie ma pól metryk; klient nie może ich
  wstrzyknąć ani pominąć; zawsze recompute (`recipe-save.ts:34, 56-59`).
- **Kolumny NOT NULL zawsze wypełnione** gdy save `ok`.
- **`name`/`style`** z `parsed.data.basics` (po `trim().min(1)`), duplikowane w kolumnach i w `data`.

**Wektory cichego dropu / niezgodności (Ryzyko #3):**

| Scenariusz                                                                     | Cichy?                | Mechanizm                                                                                   |
| ------------------------------------------------------------------------------ | --------------------- | ------------------------------------------------------------------------------------------- |
| Nieznane/dodatkowe klucze w body                                               | **Tak**               | Zod domyślnie usuwa unknown keys z `parsed.data` (brak `.strict()`/`.passthrough()` w repo) |
| Brak top-level klucza (`yeast`, `mash`…)                                       | Nie                   | Zod fail z błędem ścieżki                                                                   |
| Kolumna NOT NULL bez odpowiednika w Zod                                        | Nie                   | `blg/srm/ibu/abv` zawsze serwerowe                                                          |
| Pola „product-required" ale Zod-optional (pusty `yeast.strain`, nazwy chmielu) | **Zapisze bez błędu** | Niekompletny przepis, ale nie drop mapowania — puste wartości persystują                    |
| `parsed.data` vs surowy `draft`                                                | Częściowo             | `data` = `parsed.data` (po trim/coerce); metryki liczone z surowego `draft`                 |
| Walidacja na odczycie                                                          | N/A                   | Brak schematu; korupcja jsonb ujawni się dopiero w UI/runtime                               |

**Uwaga o asymetrii:** walidacja i zapis jsonb używają **`parsed.data`** (coerced), a metryki
używają **`draft`** (surowe body). Coercible stringi (`"20"` dla `volumeL`) mogą przejść Zod, a
`computeWizardMetrics` zobaczy string i zablokuje save błędem metryki — nie cichą korupcją.

**Obsługa błędów:** walidacja → 400 `{errors:[{field,message}]}`; klient mapuje na błędy pól
(oprócz `metrics.*`, które trafiają tylko do alertu — `RecipeWizard.tsx:42-44,67-71`) i skacze do
pierwszego kroku z błędem. DB insert fail → 500 (`detail` tylko w DEV, `index.ts:35-43`); DB update
fail → 500 bez `detail`.

**RLS:** select/insert `auth.uid()=user_id`; update/delete analogicznie
(`20260609100000_create_recipes.sql:18-28`, `20260614100000_add_recipe_edit_delete.sql:8-20`).
Grant insert dla `anon, authenticated` (`20260609110000_grant_recipes.sql`).

### Obszar 4 — Baza testów i wzorce

Pełna analiza: [test baseline subagent](bdda1958-bf23-4d4d-ba7a-1cc5231dd0e5).

**Vitest (`vitest.config.ts`):** env `node` (linia 11), `globals: true` (12), include `src/**/*.test.ts`
(13), alias `@ → ./src` (5-8), **brak** setupFiles/coverage/exclude. CI uruchamia `npm run test:run`
**bez** env Supabase (`.github/workflows/ci.yml:20-25`) — dzisiejszy suite jest w pełni offline.

**9 plików testowych (wszystkie `src/lib/`):**

| Plik                             | SUT                                                  | Wzorzec                                                |
| -------------------------------- | ---------------------------------------------------- | ------------------------------------------------------ |
| `src/lib/calc/index.test.ts`     | `computeMetrics` agregat                             | unit; inline `fullInput`; cross-check vs standalone    |
| `src/lib/calc/blg.test.ts`       | `calcBLG`                                            | golden/invariants/sentinels; `expectOk()`, `TOLERANCE` |
| `src/lib/calc/srm.test.ts`       | `calcSRM`                                            | jw.                                                    |
| `src/lib/calc/ibu.test.ts`       | `calcIBU`                                            | golden + regresja `utilizationFactor`                  |
| `src/lib/calc/abv.test.ts`       | `calcABV`                                            | jw.                                                    |
| `src/lib/recipe-to-calc.test.ts` | seam (`mapDraftToCalcInput`, `computeWizardMetrics`) | lokalny `draft()`/`boilHop()` + `defaultRecipeDraft`   |
| `src/lib/recipe-save.test.ts`    | `buildRecipeInsert`                                  | jw.; cross-assert metryk vs `computeWizardMetrics`     |
| `src/lib/recipe-mappers.test.ts` | `mapRowToListItem`/`mapRowToRecord`                  | inline DB row → domena (jeden kierunek)                |
| `src/lib/recipe-export.test.ts`  | `sanitizeFilename`/`buildRecipeJsonBlob`             | string + blob round-trip                               |

**Brak:** `vi.mock`/`vi.spyOn`/`beforeEach` w `src/`; testów Supabase/API/middleware/komponentów;
wspólnego katalogu fixtures. Builder `draft()`/`boilHop()` jest **zduplikowany** w
`recipe-to-calc.test.ts:7-27` i `recipe-save.test.ts:8-28`.

**Konwencje dla nowych testów Fazy 1:**

- Nazwa `*.test.ts`, **co-located** obok SUT w `src/lib/` (glob to `*.test.ts`, nie `*.integration.test.ts`).
- Importy `@/` dla cross-module; jawny import z `"vitest"`.
- Wzorzec `CalcResult`: assert `.ok`, potem narrow przed `.value`.
- Golden vectors z komentarzem-provenance + jawny `TOLERANCE`/`toBeCloseTo`; sentinel = `{ok:false}`.
- Błędy walidacji: szukaj po `field`, assert polski `message` przez `toContain`.

## Code References

- `src/lib/recipe-to-calc.ts:19` — `WHIRLPOOL_UTILIZATION_FACTOR = 0.25`
- `src/lib/recipe-to-calc.ts:27-53` — prywatne mappery (efficiency, attenuation, hops)
- `src/lib/recipe-to-calc.ts:63-91` — `mapDraftToCalcInput` (guardy + mapowanie maltów)
- `src/lib/recipe-to-calc.ts:107-131` — `computeWizardMetrics` (duplikuje logikę `computeMetrics`)
- `src/lib/calc/gravity.ts:52-54` — silnik wymaga `extractPercent>0` (asymetria vs seam)
- `src/lib/calc/srm.ts:31-34` — silnik wymaga `colorEbc>0` (asymetria vs seam)
- `src/lib/calc/index.ts:48-58` — `computeMetrics` (agregat; kandydat do testu parytetu)
- `src/lib/calc/types.ts:76-85` — `RecipeMetricsInput` (ułamki, nie procenty)
- `src/types.ts:55-63` — `RecipeDraft`; `src/types.ts:79-99` — `RecipeRecord`/`RecipeInsert`
- `src/lib/recipe-schema.ts:49-112` — `saveRecipeSchema` (required/optional per pole)
- `src/lib/recipe-schema.ts:116-151` — `defaultRecipeDraft` + domyślne wpisy (reuse w testach)
- `src/lib/recipe-save.ts:19-62` — `buildRecipeInsert` (Zod → metryki → insert shape)
- `src/pages/api/recipes/index.ts:8-46` — POST create
- `src/pages/api/recipes/[id].ts:34-49` — PUT update (strip `user_id`)
- `src/lib/recipe-queries.ts:21-48` — `getRecipe` / `updateRecipe`
- `src/lib/recipe-mappers.ts:33-39` — `mapRowToRecord` (odczyt, bez re-walidacji)
- `src/components/recipe/MetricsPanel.tsx:45-55` — live preview (hardkoduje `adjuncts: []`)
- `src/components/recipe/RecipeWizard.tsx:79-133` — bramki kroków + `handleSave`
- `supabase/migrations/20260609100000_create_recipes.sql:1-28` — tabela + RLS
- `vitest.config.ts:5-13` — konfiguracja test runnera
- `src/lib/recipe-to-calc.test.ts` / `src/lib/recipe-save.test.ts` — istniejące pokrycie + buildery

## Architecture Insights

- **Seam jako pojedynczy punkt prawdy z ukrytą duplikacją.** `computeWizardMetrics` nie deleguje do
  `computeMetrics(RecipeMetricsInput)`, tylko odtwarza jego logikę. To najtańszy do dodania i
  najwyższego sygnału test: **parytet `computeWizardMetrics(draft)` ≡ `computeMetrics(map(draft))`**.
- **Dwuwarstwowe filtrowanie (seam luźniejszy, silnik ostrzejszy)** jest źródłem cichych częściowych
  metryk. Testy Fazy 1 muszą celować w stan `seam ok` + `metryka fail` (extract=0, color=0).
- **Zapis ufa Zod jako jedynemu strażnikowi jsonb** — DB nie ma CHECK na kształt `data`. Ciche
  usuwanie nieznanych kluczy to świadoma (ale nieudokumentowana i nietestowana) decyzja Zod.
- **Metryki serwerowe = brak zaufania do klienta** — mocne zabezpieczenie; test powinien to
  potwierdzić (przesłanie metryk w body nie zmienia zapisanych wartości).
- **Konwencja testów: czysto offline, node, co-located.** Round-trip do prawdziwej DB wymaga nowej
  infrastruktury (Supabase local / testcontainer / mock klienta). Decyzja o warstwie (mock vs realna
  DB) to główna niewiadoma projektowa dla `/10x-plan`.

## Historical Context (from prior changes)

- `context/changes/recipe-edit-delete/change.md` — S-07 dodało tryb edycji (PUT, `recipe-mappers`),
  co powiększa powierzchnię round-tripu (Faza 3 planu testów, ale wpływa na współdzielony `buildRecipeInsert`).
- `context/changes/save-recipe/` — pierwotna implementacja zapisu (`buildRecipeInsert`, POST).
- `context/changes/calc-engine-harness/` — silnik obliczeniowy i jego golden vectors (izolowane od seamu).
- `context/changes/recipe-export/research.md` — potwierdza brak środowiska jsdom/DOM w testach.
- `context/foundation/lessons.md` — „`validateWizardStep` musi mapować błędy tablic Zod" (istotne dla
  czytelności błędów walidacji w round-tripie); „nie dodawaj lodash bez powodu" (natywne JS/TS w testach).

## Related Research

- `context/foundation/test-plan.md` §2 (mapa ryzyk #1/#3), §3 (Faza 1), §6 (wzorce cookbook — placeholder).

## Open Questions

1. **Warstwa round-tripu zapisu** — mock klienta Supabase, lokalny Supabase (Docker) czy testcontainer?
   CI dziś nie ma env Supabase dla testów; realna DB w CI wymaga sekretów/serwisu. To decyzja dla `/10x-plan`.
2. **Ciche usuwanie nieznanych kluczy przez Zod** — pożądane (defensywne) czy powinno failować?
   Test może zamrozić bieżące zachowanie jako świadomy kontrakt.
3. **Test parytetu seam ↔ `computeMetrics`** — czy przyjąć jako inwariant, czy zamiast tego
   refaktoryzować seam by delegował? (Refaktor poza zakresem Fazy 1, ale test parytetu chroni przed dryfem.)
4. **Golden vectors przez pełny draft** — jakie referencyjne wartości (BLG≈14.1, SRM≈4.0, IBU≈16.2,
   ABV≈4.9 z testów silnika) przyjąć jako oczekiwane po przejściu przez seam dla każdego scenariusza?
5. **Ekstrakcja wspólnych fixtures** — czy wydzielić `draft()`/`boilHop()` do współdzielonego helpera
   (dziś zduplikowane), czy trzymać się konwencji inline?
