---
date: 2026-08-02T13:20:00+02:00
researcher: Dawid
git_commit: a7a6c348f517033cac72ea173edc025c50740c2f
branch: master
repository: Dawidblocher/MyBrew
topic: "Faza 3 test-planu — round-trip edycji i usuwania (Ryzyko #5)"
tags: [research, codebase, recipe-mappers, recipe-queries, recipe-save, edit-mode, delete, vitest, playwright]
status: complete
last_updated: 2026-08-02
last_updated_by: Dawid
---

# Research: Faza 3 — Round-trip edycji i usuwania

**Date**: 2026-08-02 13:20 (UTC+2)
**Researcher**: Dawid
**Git Commit**: `a7a6c348f517033cac72ea173edc025c50740c2f`
**Branch**: `master`
**Repository**: Dawidblocher/MyBrew

## Research Question

Co trzeba wiedzieć o kodzie, żeby zaplanować Fazę 3 z `context/foundation/test-plan.md` — „Round-trip edycji i usuwania" (Ryzyko #5: tryb edycji S-07 korumpuje dane przy save; usuwanie ma być trwałe i wymagać własności).

## Summary

**Najważniejszy wniosek: nie ma żadnego mappera DB→draft.** Test-plan zakłada, że „mapowanie DB→draft (recipe-mappers) może różnić się od mapowania nowego przepisu" — w kodzie taka warstwa nie istnieje. `mapRowToRecord` robi wyłącznie rename snake_case→camelCase i przepuszcza `data` bez zmian (`src/lib/recipe-mappers.ts:38`), a strona edycji wstrzykuje `record.data` prosto jako `defaultValues` formularza (`src/pages/recipes/[id]/edit.astro:42` → `useWizardRecipe.ts:11`). Ryzyko #5 trzeba więc przeformułować: **dryf nie leży w mapowaniu, lecz w jego braku** — nic nie waliduje, nie uzupełnia ani nie normalizuje jsonb przy odczycie, podczas gdy zapis normalizuje agresywnie (trim, `z.coerce.number()`, strip nieznanych kluczy).

Tryb edycji różni się od trybu nowego przepisu dokładnie w trzech punktach: źródło `defaultValues`, metoda i URL fetcha (PUT `/api/recipes/:id` zamiast POST `/api/recipes`) oraz cel redirectu. Cała walidacja, przeliczanie metryk i kształt zapisywanych kolumn są wspólne — PUT i POST wołają ten sam `buildRecipeInsert` (`src/pages/api/recipes/[id].ts:34`, `src/pages/api/recipes/index.ts`). To znacząco zawęża realną powierzchnię ryzyka: **create i edit nie mogą policzyć różnych metryk dla tego samego draftu**, więc dosłowna teza z test-planu („metryki po edycji ≠ metryki oryginału") jest w obecnym kodzie prawie niefalsyfikowalna. Sygnał leży gdzie indziej — w tym, co dzieje się z draftem **między** odczytem a ponownym zapisem.

Znalazłem jedną prawdziwą asymetrię w samym zapisie: metryki liczone są z **surowego** `draft`, a do kolumny `data` trafia **sparsowany** `parsed.data` (`src/lib/recipe-save.ts:34` vs `:60`). Kolumny metryk i jsonb pochodzą więc z dwóch różnych wartości. Dotyczy to tak samo POST jak PUT, ale ujawnia się dopiero przy round-tripie: po pierwszym zapisie dane są już znormalizowane, więc „load → save bez zmian" powinno być idempotentne — i to jest najtańszy test o realnym sygnale dla Ryzyka #5.

Dla usuwania: Faza 2 udowodniła, że cross-user DELETE **nie** kasuje cudzego wiersza, ale **nikt nie udowodnił, że własny DELETE faktycznie kasuje po stronie odczytu** — jest tylko asercja na `fake._rows` (`src/lib/recipe-queries.test.ts:134-142`), bez `getRecipe` → `null` i bez `listRecipes` bez rekordu. To realna, tania luka.

## Detailed Findings

### 1. Tryb edycji — trzy punkty różnicy, reszta wspólna

Rozróżnienie trybu jest wyłącznie propsowe: `RecipeWizard({ recipeId, initialData })`. Strona nowego przepisu renderuje wizard bez propsów, strona edycji z obydwoma (`src/pages/recipes/[id]/edit.astro:42`).

| Aspekt | Nowy przepis | Edycja |
| --- | --- | --- |
| `defaultValues` | `defaultRecipeDraft` (`recipe-schema.ts:116-124`) | `record.data` z jsonb, bez merge i bez walidacji |
| Request | `POST /api/recipes` | `PUT /api/recipes/${recipeId}` |
| Redirect po sukcesie | `/recipes` | `/recipes/${recipeId}` |
| Walidacja klienta | `buildRecipeInsert(draft, "")` | identycznie |
| Body | `JSON.stringify(form.getValues())` | identycznie |
| Walidacja serwera, metryki, kształt kolumn | `buildRecipeInsert` | ten sam `buildRecipeInsert` |

```115:136:src/components/recipe/RecipeWizard.tsx
  async function handleSave() {
    setSaveErrors([]);
    setGenericSaveError(null);

    const draft = form.getValues();
    const gate = buildRecipeInsert(draft, "");
    if (!gate.ok) {
      applySaveErrors(gate.errors);
      return;
    }

    setIsSaving(true);
    try {
      const isEdit = Boolean(recipeId);
      const response = await fetch(isEdit ? `/api/recipes/${recipeId}` : "/api/recipes", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
```

Kroki kreatora (`BasicsStep`, `GristStep`, …) nie mają gałęzi edit-specific — czytają stan przez `FormProvider`/`useFormContext`. `useWizardRecipe` nie obsługuje submitu w ogóle; ustawia tylko `defaultValues` **przy instancji hooka**, co jest warunkiem wypełnienia się live-metrics na load (decyzja z planu S-07).

**Konsekwencja dla testów:** hipoteza „edycja liczy metryki inaczej niż create" jest fałszywa z konstrukcji kodu. Test, który to sprawdza, byłby zielony z niewłaściwego powodu (dowodziłby determinizmu `computeWizardMetrics`, nie poprawności trybu edycji).

### 2. Warstwa mapowania — czego nie ma

```33:40:src/lib/recipe-mappers.ts
export function mapRowToRecord(row: RecipeRecordRow): RecipeRecord {
  return {
    ...mapRowToListItem(row),
    userId: row.user_id,
    updatedAt: row.updated_at,
    data: row.data,
  };
}
```

`getRecipe` castuje wiersz bez re-walidacji Zod (`src/lib/recipe-queries.ts:25`). Cała normalizacja żyje po stronie zapisu:

- `saveRecipeSchema` trimuje `basics.name` / `basics.style` i wymusza `.min(1)`,
- wszystkie pola liczbowe to `z.coerce.number()`,
- brak `.strict()` → nieznane klucze są **cicho usuwane** (zamrożony kontrakt, `recipe-save-roundtrip.test.ts:69-84`),
- brak deep-merge z `defaultRecipeDraft` przy edycji — brakujący klucz w jsonb dociera do RHF jako `undefined`, a nie jako wartość domyślna (np. `efficiencyPct: 75`).

**Asymetria kierunkowa:** zapis normalizuje, odczyt nie. Dla wiersza zapisanego przez bieżącą aplikację round-trip powinien być idempotentny (dane są już po Zodzie). Dla wiersza „zdegradowanego" — starszy kształt, ręczna edycja w DB, `null` w polu liczbowym — odczyt wpuści go do formularza bez sygnału.

**Hipoteza do sprawdzenia testem, nie fakt:** `z.coerce.number()` na `null` daje `0` (`Number(null) === 0`), a na `undefined` daje `NaN` → błąd walidacji. Jeśli tak, to `null` w jsonb zamienia się przy zapisie w ciche `0`, podczas gdy brak klucza daje głośny błąd. Pola nieużywane w calc (`mash.waterToGrainRatio`, `yeast.fermTempMinC/MaxC`) przeszłyby przez bramkę metryk niezauważone. To jest najlepszy kandydat na scenariusz „plausible-but-wrong" w tej fazie.

### 3. Metryki liczone z innej wartości niż zapisywane dane

```23:60:src/lib/recipe-save.ts
  const parsed = saveRecipeSchema.safeParse(draft);
  ...
  const metrics = computeWizardMetrics(draft);
  ...
      blg: metrics.blg.value,
      ...
      data: parsed.data,
```

Kolumny `blg/srm/ibu/abv` pochodzą z **surowego** draftu z requestu, a `data` z **sparsowanego**. Dopóki koercja nic nie zmienia, obie wartości są zgodne. Rozjazd pojawia się dokładnie tam, gdzie Zod coś zmienia (string→number, `null`→`0`, trim). Efekt jest obserwowalny jako: strona szczegółów pokazuje zapisane kolumny, a wizard po ponownym wejściu w edycję przelicza metryki na żywo z `data` — te dwie liczby mogą się rozjechać dla tego samego rekordu.

To jest **jedyny znaleziony mechanizm, który realnie odpowiada opisowi Ryzyka #5** („save w trybie edycji korumpuje dane"), i jest testowalny najtaniej: invariant `computeWizardMetrics(record.data)` ≡ zapisane kolumny `record.blg/srm/ibu/abv`.

### 4. Usuwanie — co jest dowodem trwałości

```51:55:src/lib/recipe-queries.ts
export async function deleteRecipe(supabase: SupabaseClient, userId: string, id: string): Promise<{ ok: boolean }> {
  const { error } = await supabase.from("recipes").delete().eq("id", id).eq("user_id", userId);

  return { ok: !error };
}
```

DELETE jest idempotentny z decyzji S-07: `{ ok: true }` niezależnie od liczby usuniętych wierszy, API zwraca **204** (`src/pages/api/recipes/[id].ts:70-75`). Status HTTP i wynik `deleteRecipe` **nie są dowodem usunięcia** — dowodem jest stan odczytu. Istniejący test sprawdza tylko `fake._rows` (`recipe-queries.test.ts:134-142`), czyli wnętrze fake'a, a nie ścieżkę, którą chodzi aplikacja (`getRecipe`, `listRecipes`).

Asymetria kontraktów, którą trzeba respektować, a nie „naprawiać" testem: PUT na cudzy/nieistniejący rekord → **404**, DELETE → **204**.

### 5. Infrastruktura testowa: gotowe vs. luki

Gotowe do ponownego użycia bez zmian:

- `createFakeSupabase(seed)` obsługuje `update()` z filtrami `eq` i projekcją `select("id")` (`fake-supabase.ts:142-154`) oraz `delete()` (`:156-160`) — round-trip edycji nie wymaga rozbudowy fake'a.
- `insertRow()` ustawia `created_at === updated_at` (`fake-supabase.ts:116-129`), a `updateRecipe` patchuje `updated_at` nowym ISO (`recipe-queries.ts:38`) — asercja „`updatedAt` drgnęło po edycji" jest wykonalna offline.
- `seedRow()` i `updatePayload()` w `recipe-queries.test.ts:16-46` — `updatePayload` odtwarza dokładnie kształt, jaki PUT przekazuje po zdjęciu `user_id`. To kandydat do przeniesienia do `fixtures.ts`.
- Wzorzec `saveAndRead()` z `recipe-save-roundtrip.test.ts:12-23` — bezpośredni szablon dla `saveUpdateAndRead()`.

Luki istotne dla tej fazy:

| Luka | Warstwa | Uwaga |
| --- | --- | --- |
| insert → update → `getRecipe` (pełne `data` + metryki) | Vitest | rdzeń fazy |
| delete → `getRecipe` `null` + `listRecipes` bez rekordu | Vitest | dowód trwałości |
| idempotencja round-tripu (load → save bez zmian) | Vitest | najlepszy sygnał dla #5 |
| brak buildera wiersza DB w `fixtures.ts` | Vitest | dziś inline w dwóch plikach testowych |
| strip `user_id` w PUT (`[id].ts:39`) nie jest testowalny | — | trasa nieimportowalna w Vitest (brak stubu `astro:env/server`); fake robi `Object.assign`, więc przeciek `user_id` w payloadzie zmieniłby właściciela |
| gość: PUT/DELETE → 401 | Playwright `guest` | dziś pokryty tylko POST |

`vitest.config.ts` nie ma `setupFiles` ani stubów `astro:*`, więc handlery API pozostają poza zasięgiem Vitest — testy fazy muszą celować w `recipe-queries` / `recipe-save`, a kontrakt HTTP w Playwright.

### 6. Co jest już pokryte — nie duplikować

- Cross-user PUT → 404 i cross-user DELETE → 204 z nienaruszonym rekordem ofiary: Vitest (`recipe-queries.test.ts:92-132`) **i** E2E (`tests/idor-mutations.spec.ts`).
- Kontrole pozytywne: A PUT własny → 200, B DELETE własny → 204 + strona „Nie znaleziono przepisu" (E2E).
- Redirect gościa z `/recipes/:id/edit` (`tests/auth-read-boundary.spec.ts`).
- Walidacja payloadu PUT — to ten sam `buildRecipeInsert` co POST, pokryty w `recipe-save.test.ts`.
- Round-trip **create** (insert → `getRecipe`) z metrykami: `recipe-save-roundtrip.test.ts:26-44`.

## Code References

- [`src/lib/recipe-mappers.ts:33-40`](https://github.com/Dawidblocher/MyBrew/blob/a7a6c348f517033cac72ea173edc025c50740c2f/src/lib/recipe-mappers.ts#L33-L40) — `mapRowToRecord`, pass-through `data`
- [`src/lib/recipe-save.ts:23-60`](https://github.com/Dawidblocher/MyBrew/blob/a7a6c348f517033cac72ea173edc025c50740c2f/src/lib/recipe-save.ts#L23-L60) — metryki z `draft`, `data` z `parsed.data`
- [`src/lib/recipe-queries.ts:30-49`](https://github.com/Dawidblocher/MyBrew/blob/a7a6c348f517033cac72ea173edc025c50740c2f/src/lib/recipe-queries.ts#L30-L49) — `updateRecipe`, `notFound` przy zerowej liczbie wierszy
- [`src/lib/recipe-queries.ts:51-55`](https://github.com/Dawidblocher/MyBrew/blob/a7a6c348f517033cac72ea173edc025c50740c2f/src/lib/recipe-queries.ts#L51-L55) — `deleteRecipe`, idempotencja
- [`src/pages/api/recipes/[id].ts:34-49`](https://github.com/Dawidblocher/MyBrew/blob/a7a6c348f517033cac72ea173edc025c50740c2f/src/pages/api/recipes/%5Bid%5D.ts#L34-L49) — PUT: wspólny builder, strip `user_id`, 404
- [`src/pages/recipes/[id]/edit.astro:13-17`](https://github.com/Dawidblocher/MyBrew/blob/a7a6c348f517033cac72ea173edc025c50740c2f/src/pages/recipes/%5Bid%5D/edit.astro#L13-L17) — SSR `getRecipe`, 404 bez rekordu
- [`src/components/hooks/useWizardRecipe.ts:6-13`](https://github.com/Dawidblocher/MyBrew/blob/a7a6c348f517033cac72ea173edc025c50740c2f/src/components/hooks/useWizardRecipe.ts#L6-L13) — `initialData ?? defaultRecipeDraft`
- [`src/components/recipe/RecipeWizard.tsx:115-136`](https://github.com/Dawidblocher/MyBrew/blob/a7a6c348f517033cac72ea173edc025c50740c2f/src/components/recipe/RecipeWizard.tsx#L115-L136) — rozgałęzienie POST/PUT
- [`src/lib/__tests__/fake-supabase.ts:142-160`](https://github.com/Dawidblocher/MyBrew/blob/a7a6c348f517033cac72ea173edc025c50740c2f/src/lib/__tests__/fake-supabase.ts#L142-L160) — update/delete z filtrami
- [`src/lib/recipe-queries.test.ts:16-46`](https://github.com/Dawidblocher/MyBrew/blob/a7a6c348f517033cac72ea173edc025c50740c2f/src/lib/recipe-queries.test.ts#L16-L46) — `seedRow`, `updatePayload`
- [`src/lib/recipe-save-roundtrip.test.ts:12-23`](https://github.com/Dawidblocher/MyBrew/blob/a7a6c348f517033cac72ea173edc025c50740c2f/src/lib/recipe-save-roundtrip.test.ts#L12-L23) — wzorzec `saveAndRead`

## Architecture Insights

- **Jedna bramka zapisu.** `buildRecipeInsert` jest jedynym miejscem, gdzie draft staje się wierszem — używany przez POST, PUT i jako gate po stronie klienta. Każdy test zapisu, niezależnie od trybu, celuje w tę samą funkcję; różnicowanie „create vs edit" na tym poziomie nie ma sensu.
- **Autorytet metryk po stronie serwera.** Klient nie może wstrzyknąć `blg/srm/ibu/abv` — `RecipeDraft` w ogóle ich nie ma, a zatrute klucze są stripowane (dowód: `recipe-save-roundtrip.test.ts:46-67`).
- **Denormalizacja `name`/`style`.** Kolumny top-level i `data.basics.*` są zapisywane razem z `parsed.data`, ale edycja czyta wyłącznie `data`. Rozejście się tych dwóch źródeł jest możliwe tylko przez zmianę poza aplikacją.
- **Odczyt jest niewalidowany z premedytacją.** Ta decyzja została odnotowana już w Fazie 1 (`testing-seam-save-integrity/research.md`) jako świadomy dług: korupcja jsonb ujawnia się dopiero w runtime UI.

## Historical Context (from prior changes)

- `context/changes/recipe-edit-delete/plan-brief.md` — kontrakty S-07: PUT not-found → 404 (nie 403), „delete is idempotent (204 whether or not the row existed)", brak partial save (edycja przechodzi tę samą bramkę co create), brak undo.
- `context/changes/recipe-edit-delete/plan.md` — `updateRecipe`/`deleteRecipe` opisane jako „thin Supabase wrappers verified manually"; jedyny testem objęty element to rozszerzenie mappera o `updatedAt`. Stąd dzisiejsza luka w round-tripie update.
- `context/changes/testing-seam-save-integrity/plan.md` — sekcja „What We're NOT Doing" jawnie odkłada round-trip trybu edycji do Fazy 3; ustala fake Supabase zamiast Dockera i deep-equal `record.data` ↔ `parsed.data` jako właściwe porównanie.
- `context/changes/testing-auth-idor-mutations/` — zakres cross-user PUT/DELETE; wiążąca nota: kontraktu DELETE nie zmieniamy, dowodem jest stan danych, nie status HTTP.
- `context/changes/save-recipe/plan-brief.md` — recompute metryk serwerowo, `user_id` zawsze z sesji, nigdy z body.
- `context/foundation/roadmap.md` (S-07) — ryzyko slice'u sformułowane jako „dryf między kształtem formularza a zapisanym schematem"; to bliżej rzeczywistości niż sformułowanie z test-planu o mapperze.
- `context/archive/` — pusto (sam README); brak zarchiwizowanych decyzji o edycji/usuwaniu.

## Related Research

- `context/changes/testing-seam-save-integrity/research.md` — seam draft→silnik, konwencje golden-vector, nota o braku re-walidacji przy odczycie.
- `context/changes/testing-auth-read-boundary/research.md` — granica odczytu, `PROTECTED_ROUTES`, brak `GET /api/recipes`.

## Open Questions

1. **Czy Ryzyko #5 w test-planie wymaga przeformułowania?** Zapis „mapowanie DB→draft (recipe-mappers) może różnić się od mapowania nowego przepisu" nie odpowiada kodowi — mappera nie ma, a bramka zapisu jest wspólna. Realne sformułowanie: „odczyt nie waliduje ani nie uzupełnia jsonb, a zapis normalizuje — round-trip może cicho zmienić dane". Decyzja do podjęcia w `/10x-plan`.
2. **Co dokładnie robi `z.coerce.number()` z `null` i `undefined` w Zod 4 w tym projekcie?** Od tego zależy, czy scenariusz „zdegradowany jsonb" jest cichą korupcją (`null` → `0`), czy głośnym błędem. Do rozstrzygnięcia testem, nie lekturą.
3. **Czy invariant „kolumny metryk ≡ `computeWizardMetrics(data)`" ma być testem, czy asercją produkcyjną?** Jako test daje sygnał tylko dla ścieżek, które sam wykona; rozważyć, czy nie tańszy jest jeden test round-tripu na scenariuszu z koercją.
4. **Czy `updatePayload`/`seedRow` przenieść do `fixtures.ts`?** Trzy pliki testowe mają dziś własne inline seedy wiersza DB.
5. **Czy dodać stub `astro:env/server` do Vitest**, żeby dało się testować handlery PUT/DELETE (m.in. strip `user_id`)? To zmiana infrastruktury wykraczająca poza tę fazę — do rozważenia jako osobny wątek.
6. **Playwright: czy dokładać 401 dla PUT/DELETE gościa** do projektu `guest`, skoro POST jest już pokryty? Tanie, ale to raczej Ryzyko #4 niż #5.
