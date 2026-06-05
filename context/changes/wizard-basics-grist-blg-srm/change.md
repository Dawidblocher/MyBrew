---
change_id: wizard-basics-grist-blg-srm
title: Kreator — podstawy i zasyp z BLG/SRM na żywo
status: impl_reviewed
created: 2026-05-31
updated: 2026-06-05
archived_at: null
---

## Notes

Roadmap slice **S-01** (`context/foundation/roadmap.md`).

- **Outcome:** użytkownik może rozpocząć nowy przepis w kreatorze, wpisać podstawy (nazwa, styl) oraz skonfigurować parametry warki i dynamiczną listę słodów (dodaj/przesuń/usuń), i widzi na żywo aktualizowane BLG oraz SRM.
- **PRD refs:** FR-003, FR-004, FR-005, FR-010
- **Prerequisites:** F-02 (calc-engine-harness)
- **Parallel with:** F-01 (recipe-persistence-model)
- **Risk:** Pierwszy pionowy slice produktowy; ryzyko, że wiązanie kreatora z silnikiem obliczeń okaże się złożone — dlatego F-02 ustala kontrakt i harness wcześniej.
