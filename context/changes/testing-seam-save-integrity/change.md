---
change_id: testing-seam-save-integrity
title: "Testy: integralność seamu i zapisu (Plan testów — Faza 1)"
status: complete
created: 2026-07-08
updated: 2026-07-08
archived_at: null
---

## Notes

Faza 1 fazowanego rollout planu testów (`context/foundation/test-plan.md` §3).
Cel: udowodnić, że wizard draft → silnik obliczeniowy mapuje poprawnie dla
wszystkich stanów kreatora (**Ryzyko #1** — dryf seamu `recipe-to-calc.ts`) oraz
że round-trip zapisu nie gubi danych (**Ryzyko #3** — korupcja zapisu przepisu).

Typy testów: integracyjne (Vitest, środowisko `node`, bez UI/przeglądarki).

Research: `research.md` w tym folderze.
