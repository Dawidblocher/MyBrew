# Kreator: drożdże i dodatki z ABV na żywo (S-03) — Plan Brief

> Full plan: `context/changes/wizard-yeast-adjuncts-abv/plan.md`

## What & Why

Domknięcie rdzennej obietnicy produktu (north star S-03): dwa ostatnie kroki kreatora — **Drożdże** i **Dodatki** — oraz **ABV** jako czwarta metryka liczona na żywo. Po tym slice pełny kreator pokazuje wszystkie cztery metryki (BLG / Barwa / IBU / ABV) aktualizowane od wejścia danych po wynik.

## Starting Point

S-01 i S-02 są w kodzie: 4-krokowy kreator (Podstawy → Zasyp → Zacieranie → Chmiel) z BLG/Barwa/IBU na żywo. Silnik ABV (`calcABV`) jest **już zaimplementowany i otestowany**, a `computeMetrics` już wpina ABV — więc ten slice nie zmienia matematyki silnika.

## Desired End State

Użytkownik przechodzi 6 kroków (… → Drożdże → Dodatki), wpisuje szczep/typ/odfermentowanie/zakres temperatur oraz listę dodatków (etap, czas, notatki), i widzi cztery metryki na żywo. ABV reaguje na odfermentowanie i zasyp; dodatki są zapisywane, ale nie zmieniają żadnej metryki.

## Key Decisions Made

| Decision                         | Choice                                           | Why (1 sentence)                                                                | Source |
| -------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------- | ------ |
| Typ drożdży                      | Pole tekstowe (free text)                        | Najprostsze; szczep i typ to dane opisowe bez wpływu na obliczenia              | Plan   |
| Kształt dodatku                  | `{ name, stage, timeMin, notes }`                | Zgodne z definicją slice'a w roadmapie; brak `amount` bo nic go nie konsumuje   | Plan   |
| Etapy dodatków                   | Zacieranie / Gotowanie / Whirlpool / Fermentacja | Odzwierciedla realne miejsca dodawania dodatków                                 | Plan   |
| Wpływ na obliczenia              | Dodatki + zakres temp = tylko dane               | ABV liczone wyłącznie z odfermentowania + grawitacji zasypu; brak zmian silnika | Plan   |
| Gate walidacji (Drożdże/Dodatki) | Brak                                             | Wszystkie pola łagodne; domyślne odfermentowanie 75 daje ABV od razu            | Plan   |
| Jednostka odfermentowania        | Procent (0–100), domyślnie 75                    | Spójne z `mash.efficiencyPct`; seam konwertuje na ułamek                        | Plan   |
| Selektor etapu                   | Generalizacja `HopStageSelect`                   | Jeden czytelny na Windows dropdown, reuse zamiast duplikacji                    | Plan   |

## Scope

**In scope:** kroki Drożdże i Dodatki; ABV na żywo w panelu; rozszerzenie `RecipeDraft` o `yeast`/`adjuncts`; zgeneralizowany selektor.

**Out of scope:** zmiany silnika obliczeń; wpływ dodatków/temperatur na metryki; pole `amount` w dodatkach; gate walidacji nowych kroków; zapis/persystencja (S-04); shadcn `Select`/`Textarea`.

## Architecture / Approach

Model (`types.ts` + `recipe-schema.ts`) → seam (`recipe-to-calc.ts`: ABV ze współdzielonej grawitacji + odfermentowania) → panel (`MetricsPanel`: kafelek ABV, `useWatch` += `yeast`) → UI (zgeneralizowany selektor, `YeastStep`, `AdjunctsStep` + `AdjunctList`/`AdjunctRow`, wpięcie do `RecipeWizard`). Wzorce w całości skopiowane z S-01/S-02.

## Phases at a Glance

| Phase              | What it delivers                                  | Key risk                                                                |
| ------------------ | ------------------------------------------------- | ----------------------------------------------------------------------- |
| 1. Model + schemat | `yeast`/`adjuncts` w `RecipeDraft`, Zod, domyślne | Rozjazd typów i schematu — łapany przez `npm run lint`                  |
| 2. Seam + ABV      | ABV w `WizardMetrics` + kafelek w panelu          | Błędna propagacja sentinela atenuacji — pokryta testami seamu           |
| 3. UI kroków       | Selektor, kroki Drożdże/Dodatki, wpięcie          | Regresja UI chmielu przy generalizacji selektora — weryfikacja manualna |

**Prerequisites:** S-02 (w kodzie), F-02 silnik (ABV gotowe).
**Estimated effort:** ~1–2 sesje; faza 1–2 małe, faza 3 to większość pracy (UI).

## Open Risks & Assumptions

- Generalizacja `HopStageSelect` dotyka działającego UI chmielu — wymaga sprawdzenia braku regresji.
- Dodanie kroków po Chmielu aktywuje jego dotychczas martwą gałąź walidacji (impl-review S-02 F2) — zamierzone i pożądane, ale trzeba zweryfikować zachowanie.
- Brak gate'u na nowych krokach zakłada, że domyślne odfermentowanie 75 wystarcza, by ABV liczyło się bez akcji użytkownika.

## Success Criteria (Summary)

- Użytkownik kończy pełny 6-krokowy kreator i widzi cztery metryki na żywo (BLG/Barwa/IBU/ABV).
- ABV reaguje na odfermentowanie i zasyp; pokazuje `—` przy braku danych.
- Dodatki działają (add/move/remove) i nie zmieniają żadnej metryki; `npm run test`/`lint`/`build` przechodzą.
