# Kreator: zacieranie i chmiel z IBU na żywo (S-02) — Plan Brief

> Full plan: `context/changes/wizard-mash-hops-ibu/plan.md`

## What & Why

Slice S-02 rozszerza kreator przepisu o kroki **Zacieranie** i **Chmiel** oraz dodaje **IBU** do metryk liczonych na żywo. To trzecia z czterech metryk rdzennej obietnicy produktu (BLG/SRM/IBU/ABV) — domyka ścieżkę chmielu, od której zależy gorzkość piwa.

## Starting Point

S-01 (kreator: podstawy + zasyp z BLG/SRM) i F-02 (silnik obliczeń + harness) są już w kodzie. Kreator to 2-krokowy flow `react-hook-form`; silnik ma w pełni zaimplementowane i otestowane IBU (Tinseth), ale wizard używa stałej wydajności `0.75` i liczy tylko BLG/SRM. Kontrakt `HopAddition` nie zna „etapu" chmielu.

## Desired End State

Użytkownik przechodzi Podstawy → Zasyp → **Zacieranie** → **Chmiel**, konfiguruje wydajność, stosunek woda/słód, przerwy zacierania oraz listę dodatków chmielu (nazwa, alfa%, ilość, etap, czas), i widzi **BLG, SRM i IBU** aktualizujące się na żywo. Whirlpool daje mniejszy wkład IBU niż boil; dry hop — żadnego.

## Key Decisions Made

| Decision                       | Choice                                                       | Why                                                  | Source |
| ------------------------------ | ------------------------------------------------------------ | ---------------------------------------------------- | ------ |
| Struktura kroków               | Dwa osobne: Zacieranie + Chmiel                              | Czytelniejszy podział, zgodny z modelem kroków       | Plan   |
| Etap chmielu vs IBU            | Mnożnik wykorzystania: boil 1.0 / whirlpool 0.25 / dry hop 0 | Wierne IBU bez fałszywego wkładu dry hop             | Plan   |
| Przerwy zacierania + woda/słód | Dane-tylko (bez wpływu na obliczenia)                        | Żaden wzór ich nie konsumuje; FR-006 wymaga zebrania | Plan   |
| Wydajność zacierania           | Procent 0–100, domyślnie 75%                                 | Naturalne dla brewera; mapowane na ułamek            | Plan   |
| Pola chmielu                   | nazwa + alfa% + ilość(g) + etap + czas(min)                  | Pełny opis dodatku dla IBU i wyświetlania            | Plan   |
| Walidacja kroków               | Łagodna; wymagana tylko wydajność > 0                        | Spójne z S-01 (puste listy dozwolone)                | Plan   |
| SG dla IBU                     | OG z zasypu+wydajności                                       | Zgodne z istniejącym `computeMetrics`                | Plan   |
| Realizacja etapu               | `utilizationFactor` w silniku (nie skalowanie czasu)         | Tinseth nieliniowy w czasie; mnożnik na utilization  | Plan   |
| Selektor etapu                 | Natywny stylowany `<select>`                                 | Bez nowej zależności Radix Select                    | Plan   |

## Scope

**In scope:** krok Zacieranie (wydajność, woda/słód, przerwy), krok Chmiel (lista dodatków z etapem), IBU na żywo, rozszerzenie silnika o `utilizationFactor`, testy.

**Out of scope:** ABV i drożdże (S-03), zapis/persystencja (F-01/S-04), wpływ przerw zacierania na obliczenia, model boil volume/pre-boil gravity, instalacja shadcn Select.

## Architecture / Approach

Cztery fazy w kolejności zależności: **silnik** (pole `utilizationFactor` w `HopAddition` + Tinseth) → **model** (`RecipeDraft.mash`/`.hops` + schematy Zod) → **seam** (`recipe-to-calc.ts`: wydajność z inputu, mapowanie etapu→IBU, IBU w `MetricsPanel`) → **UI** (kroki Zacieranie/Chmiel wg wzorca listy dynamicznej `MaltList`/`MaltRow`). Fazy 1–3 jednostkowo testowalne (Vitest), faza 4 weryfikowana manualnie. Etap mapowany w seamie na współczynnik; IBU liczone ze współdzielonej grawitacji (SG = OG).

## Phases at a Glance

| Phase              | What it delivers                               | Key risk                                                       |
| ------------------ | ---------------------------------------------- | -------------------------------------------------------------- |
| 1. Silnik          | `utilizationFactor` + Tinseth + golden vectors | Regresja istniejących wektorów IBU (mitygacja: test zgodności) |
| 2. Model + schemat | `mash`/`hops` w `RecipeDraft`, Zod, defaults   | Rozjazd typ ↔ schemat                                          |
| 3. Seam + metryki  | wydajność z inputu, IBU na żywo w panelu       | Poprawne źródło SG i propagacja sentinela                      |
| 4. UI kroków       | kroki Zacieranie/Chmiel + walidacja            | Selektor etapu i wpięcie walidacji per-krok                    |

**Prerequisites:** S-01 i F-02 w kodzie (spełnione).
**Estimated effort:** ~1–2 sesje, 4 fazy.

## Open Risks & Assumptions

- Współczynnik whirlpool 0.25 to udokumentowane przybliżenie, nie fizyczny model — akceptowalne dla v1.
- IBU = OG jako SG (jak agregat) — wystarczające bez modelu objętości warzenia.
- Przerwy zacierania i woda/słód są zbierane, ale nie wpływają na żadną metrykę w v1.

## Success Criteria (Summary)

- Użytkownik przechodzi 4 kroki i widzi BLG/SRM/IBU na żywo.
- IBU reaguje poprawnie na etap (whirlpool < boil, dry hop = bez wkładu) i na wydajność.
- `npm run test`, `npm run lint`, `npm run build` przechodzą.
