# Lessons Learned

> Append-only register of recurring rules and patterns. Re-read at start by /10x-frame, /10x-research, /10x-plan, /10x-plan-review, /10x-implement, /10x-impl-review.

## Nie dodawaj lodash bez jawnego powodu

- **Context**: Implementacja funkcji w aplikacji TypeScript po stronie frontendu i backendu.
- **Problem**: Agent użył `_.filter()`, mimo że lodash nie jest częścią projektu. To dodałoby niepotrzebną zależność i rozjechało lokalną konwencję pracy z natywnymi API.
- **Rule**: Nie dodawaj lodash bez jasnego wskazania. Projekt preferuje natywne funkcje JS/TS w standardzie 2026+.
- **Applies to**: plan, implement, impl-review

## validateWizardStep musi mapować błędy tablic Zod

- **Context**: Walidacja kroku kreatora przez `validateWizardStep` + Zod (np. `hopsStepSchema`, `gristStepSchema`).
- **Problem**: Przekazanie pustego `fieldPaths` blokuje „Dalej” bez `setError` na wierszach tablicy — użytkownik nie widzi, co jest nie tak (np. alpha > 100, `NaN` w polu numerycznym).
- **Rule**: Przy walidacji kroków z dynamicznymi listami mapuj ścieżki Zod z indeksem (np. `hops.0.alphaAcidPercent`) na `FieldPath` formularza albo rozszerz `validateWizardStep` o obsługę `issue.path` z tablic.
- **Applies to**: implement, impl-review, plan
