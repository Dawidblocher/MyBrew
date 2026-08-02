---
change_id: calc-engine-harness
title: Szkielet silnika obliczeń + harness testów poprawności
status: archived
created: 2026-06-04
updated: 2026-08-02
archived_at: 2026-08-02T13:21:00Z
---

## Notes

Roadmap foundation **F-02** (`context/foundation/roadmap.md`).

- **Outcome:** (foundation) struktura modułu obliczeń w `src/lib/calc/`, kontrakt wyjścia czterech metryk (BLG/ABV/SRM/IBU), dedykowane typy wejść metryk oraz harness testów (Vitest) potwierdzający poprawność formuł dla standardowych danych są na miejscu.
- **PRD refs:** FR-010, NFR (poprawność obliczeń — "brak cichych błędnych liczb")
- **Unlocks:** S-01 (pierwsze metryki na żywo) oraz ścieżkę weryfikacji poprawności obliczeń używaną przez S-01/S-02/S-03 (guardrail NFR).
- **Prerequisites:** — (auth + frontend obecne w baseline)
- **Parallel with:** F-01 (recipe-persistence-model)
- **Scope decision:** wszystkie cztery formuły implementowane teraz (świadome odstępstwo od roadmapowego "formuły per slice"), z pełnym harnessem golden-vector dla każdej metryki.
