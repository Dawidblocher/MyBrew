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

## Zielony lint nie znaczy, że kod się typuje

- **Context**: Weryfikacja zmian w TS/TSX. CI i lokalna bramka to `npm run lint` + `npm run build`.
- **Problem**: `typescript-eslint` używa typów do reguł lintu, ale nie raportuje błędów kompilacji, a `astro build` nie odpala `astro check`. `npx tsc --noEmit` zgłasza dziś kilkanaście błędów, których nic nie pilnuje — m.in. `recipe-to-calc.ts:129`, brak `updatedAt` w `recipe-export.test.ts:7` oraz `DeepPartial<T[]>` rozwijające się do `(T | undefined)[]` w `src/lib/__tests__/fixtures.ts`.
- **Rule**: Nie traktuj zielonego `npm run lint` jako dowodu poprawności typów. Zanim uznasz błąd z `tsc --noEmit` za regresję swojej zmiany, odtwórz go na kopii kodu sprzed zmiany — większość z nich jest zastana. Dokładanie bramki typów to osobna zmiana z własnym budżetem na spłatę długu, nie doklejka do bieżącej fazy.
- **Applies to**: implement, impl-review, plan
