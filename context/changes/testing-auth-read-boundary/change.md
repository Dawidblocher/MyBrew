---
change_id: testing-auth-read-boundary
title: "Testy: granica auth na odczyt (Plan testów — Faza 2, Ryzyko #4)"
status: implemented
created: 2026-08-01
updated: 2026-08-01



archived_at: null
---

## Notes

Część Fazy 2 fazowanego rollout planu testów (`context/foundation/test-plan.md` §3).
Zakres tej zmiany zawężony do **Ryzyka #4 — granica auth na odczyt**: strony
przepisów i trasy API dostępne bez ważnej sesji lub zwracające dane cudzego
użytkownika. Ryzyko #2 (IDOR na mutacjach PATCH/DELETE) zostaje na osobną zmianę.

Typy testów rozważane: integracyjne (Vitest, `node`) oraz E2E (Playwright — już
skonfigurowany w repo, `playwright.config.ts` + `tests/auth.setup.ts`).

Research: `research.md` w tym folderze.
