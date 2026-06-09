# Eksport zapisanego przepisu (PDF / JSON) — Implementation Plan

## Overview

Implement S-06 (`recipe-export`, PRD FR-013): let a signed-in user export a saved
recipe from the detail page as **PDF** and **JSON**. Both artifacts are generated
**entirely client-side** inside a single `client:load` React island that receives
the already-loaded `RecipeRecord` as a prop. PDF uses `@react-pdf/renderer` with a
self-hosted Inter font (for Polish diacritics); JSON uses a zero-dependency `Blob`.
Nothing touches the Cloudflare edge runtime.

## Current State Analysis

- **Detail page already has everything the export needs.**
  `src/pages/recipes/[id].astro:27` loads the full record via
  `getRecipe(supabase, user.id, id)` and destructures `data: RecipeDraft`
  (`[id].astro:33`). The record is JSON-serializable (`createdAt: string`,
  `src/types.ts:84`), so it can be passed directly into a `client:load` island.
- **The page is 100% static Astro today** — there is no React island on it yet,
  and no export/PDF/JSON/Blob/download code anywhere in `src/` (green field).
- **Island convention is `client:load` with props** — `RecipeWizard client:load`
  (`src/pages/recipes/new.astro:9`), `SignInForm ... client:load`
  (`src/pages/auth/signin.astro:16`). The repo uses **only** `client:load`.
- **shadcn `Button`** lives at `src/components/ui/button.tsx`; no dropdown-menu
  primitive exists, which is why the export UI is two plain buttons.
- **`@react-pdf/renderer` is NOT installed** (`package.json:18-43`). React 19 is
  supported from v4.1.0; latest is 4.5.x. Single React version in the tree
  (`react@^19.2.6`), so the known react-pdf RSC/monorepo reconciler issues do not
  apply (single app, browser-side generation).
- **No fonts in repo** — `public/` only has `.assetsignore`; no `public/fonts/`.
  Built-in Helvetica does not reliably render `ą ć ę ł ń ó ś ż`, and the UI is
  fully Polish, so `Font.register()` with a Unicode TTF is mandatory.
- **Edge/runtime**: `output: "server"`, `adapter: cloudflare()`,
  `integrations: [react(), ...]` (`astro.config.mjs:11-16`). Server (Worker) PDF
  APIs (`renderToBuffer`/`renderToStream`) are Node-only and must stay unused.
- **Conventions** (`CLAUDE.md`): no `"use client"`; hooks → `src/components/hooks/`;
  helpers → `src/lib/`; types → `src/types.ts`; `cn()` for class merging; alias `@/*`.
- **`lessons.md`**: "don't add dependencies without a clear reason" — JSON stays
  dependency-free; `@react-pdf/renderer` is the single justified addition (PDF only).

## Desired End State

On `/recipes/[id]`, a user sees two buttons in the page header — **"Pobierz PDF"**
and **"Pobierz JSON"**. Clicking **JSON** instantly downloads
`<recipe-name>.json` containing the full record. Clicking **PDF** shows a brief
loading state, then downloads `<recipe-name>.pdf` — a faithful, Polish-language
rendering of the whole recipe (4-metric summary + all sections) with correct
diacritics. `npm run build` and `npm run lint` pass; the island bundles cleanly
for the browser without breaking the Cloudflare SSR build.

### Key Discoveries:

- Mount point: `src/pages/recipes/[id].astro` header block (`[id].astro:58-68`),
  inside the `record && data` branch where `record` is in scope.
- Reuse the Polish label maps already defined in `[id].astro:10-21`
  (`HOP_STAGE_LABELS`, `ADJUNCT_STAGE_LABELS`) — the PDF must match the page wording.
- `getRecipe` (`src/lib/recipe-queries.ts:21-26`) returns the full `RecipeRecord`
  via `select("*")` → sufficient for both JSON and full PDF, no new endpoint.
- Inter example is literally in `recipe-export-docs.md:160-167`.

## What We're NOT Doing

- No server-side / API export route (no `GET /api/recipes/[id]/export`). Generation
  is client-only by design (edge constraint).
- No `renderToBuffer` / `renderToStream` / `BlobProvider` / `PDFDownloadLink` /
  `usePDF` — the trigger is imperative `pdf().toBlob()` on click.
- No dropdown-menu component — two buttons, no new shadcn primitive.
- No export from the list page (`/recipes`) — only the detail page (the list lacks
  the full `data`).
- No emoji source or custom hyphenation registration.
- No edit/delete (out of v1 scope per PRD).

## Implementation Approach

Three phases, each independently verifiable:

1. Lay the foundation: install the library, self-host the font, register it once,
   and prove the browser island bundles on Cloudflare.
2. Build the pure pieces: the `RecipePdf` document component and the small,
   framework-agnostic export helpers (filename, download, JSON) in `src/lib/`.
3. Wire it together: the `RecipeExportActions` island with two buttons and
   imperative download + state, mounted into `[id].astro`.

## Critical Implementation Details

- **Browser-island bundling is the one real risk.** `@react-pdf/renderer` pulls
  in `fontkit` (WASM) and Node-flavored deps. In an Astro `client:load` island on
  the Cloudflare adapter the client bundle is what matters, but the dev/build
  pipeline may need Vite hints. Approach: try the default build first; only if the
  build or dev island fails, add a minimal `vite.optimizeDeps.include` /
  `vite.ssr.noExternal` entry for `@react-pdf/renderer` in `astro.config.mjs`.
  Do not pre-add config that isn't needed.
- **Font registration must run before any PDF render**, exactly once. Register at
  module scope in the font module that the PDF component imports, so importing the
  component guarantees registration. Use absolute public paths (`/fonts/Inter-Regular.ttf`)
  — these resolve against the site origin in the browser island.
- **Edge safety**: the island file must not import Node APIs (`fs`, `Buffer`) and
  must use only `pdf()...toBlob()`. Keep all PDF code inside the `.tsx` island /
  its imports so it never enters the Astro server render path.
- **Filename sanitization**: recipe `name` is user-controlled Polish text; strip
  characters illegal in filenames before building `<name>.pdf` / `<name>.json`,
  with a non-empty fallback (e.g. `przepis`).

## Phase 1: Dependency, fonts & bundling foundation

### Overview

Install `@react-pdf/renderer`, self-host the Inter font, add a one-time font
registration module, and confirm a clean build with a throwaway smoke import.

### Changes Required:

#### 1. Add the PDF dependency

**File**: `package.json`

**Intent**: Add `@react-pdf/renderer` as the only new runtime dependency, pinned to
the React-19-compatible line. JSON export adds nothing.

**Contract**: New entry under `dependencies`: `@react-pdf/renderer` at `^4.5.0`
(installed via `npm install @react-pdf/renderer@^4.5.0` so `package-lock.json`
updates). No other dependency changes.

#### 2. Self-host the Inter font

**File**: `public/fonts/Inter-Regular.ttf`, `public/fonts/Inter-Bold.ttf`

**Intent**: Provide a Unicode TTF with full Polish Latin-Extended coverage so the
PDF renders `ą ć ę ł ń ó ś ż` correctly. Two weights (400/700) cover headings vs body.

**Contract**: Two static TTF assets in a new `public/fonts/` directory.
Source: Inter (SIL Open Font License) from the official release —
`https://github.com/rsms/inter` (or `https://rsms.me/inter/`), files
`Inter-Regular.ttf` and `Inter-Bold.ttf` from the `extras/ttf` (static) set.
The implementer must download these during implementation — the PDF will not
render diacritics without them.

#### 3. Font registration module

**File**: `src/lib/pdf-fonts.ts`

**Intent**: Register the Inter family with `@react-pdf/renderer` exactly once, at
module load, so any module importing it has fonts ready before render.

**Contract**: Module-scope `Font.register({ family: "Inter", fonts: [ { src: "/fonts/Inter-Regular.ttf", fontWeight: 400 }, { src: "/fonts/Inter-Bold.ttf", fontWeight: 700 } ] })`. Export a `INTER_FAMILY = "Inter"` constant (or similar) for styles to reference. No side effects beyond registration.

#### 4. Verify island bundling (and add Vite config only if required)

**File**: `astro.config.mjs` (conditional)

**Intent**: Confirm `@react-pdf/renderer` builds inside a browser island; apply a
minimal Vite adjustment only if the default build fails.

**Contract**: If needed, add to the existing `vite` block one of
`optimizeDeps: { include: ["@react-pdf/renderer"] }` and/or
`ssr: { noExternal: ["@react-pdf/renderer"] }`. Leave `astro.config.mjs` untouched
if the build is already clean.

### Success Criteria:

#### Automated Verification:

- Dependency present: `@react-pdf/renderer` appears in `package.json` and `package-lock.json`
- Font assets exist: `public/fonts/Inter-Regular.ttf` and `public/fonts/Inter-Bold.ttf` are present and non-empty
- Type checking passes: `npm run build` (runs `astro check` via the toolchain) completes without errors
- Linting passes: `npm run lint`

#### Manual Verification:

- A temporary smoke test (an island that calls `pdf(<minimal Document/>).toBlob()`)
  produces a downloadable PDF in the browser, confirming the bundle works; remove it after.
- No new console errors related to `fontkit`/WASM in the browser island.

**Implementation Note**: After this phase and all automated verification passes,
pause for manual confirmation that the smoke PDF generated in-browser before
proceeding. Phase blocks use plain bullets; checkbox state lives in `## Progress`.

---

## Phase 2: PDF document component + export helpers

### Overview

Build the `RecipePdf` component (full recipe layout) and the small, UI-agnostic
export helpers in `src/lib/`.

### Changes Required:

#### 1. Export helpers

**File**: `src/lib/recipe-export.ts`

**Intent**: Centralize the non-React export plumbing so the island stays thin and
the logic is unit-testable (Vitest `environment: "node"` covers `src/lib/**`).

**Contract**: Exports:
- `sanitizeFilename(name: string): string` — strips/normalizes filesystem-illegal
  characters, trims, falls back to `"przepis"` when empty.
- `triggerBlobDownload(blob: Blob, filename: string): void` — creates an object
  URL, programmatically clicks an `<a download>`, then `URL.revokeObjectURL`.
- `buildRecipeJsonBlob(record: RecipeRecord): Blob` — `new Blob([JSON.stringify(record, null, 2)], { type: "application/json" })`.

#### 2. PDF document component

**File**: `src/components/recipe/RecipePdf.tsx`

**Intent**: Define the full-recipe PDF as a `@react-pdf/renderer` component tree
that mirrors the on-screen detail page, in Polish, using the registered Inter font.

**Contract**: `export function RecipePdf({ record }: { record: RecipeRecord })`
returning `<Document><Page size="A4" wrap>…</Page></Document>`. Imports
`src/lib/pdf-fonts.ts` (guarantees registration) and sets `fontFamily: "Inter"` on
the page style. Sections, matching `[id].astro`:
- Header: `record.name`, `record.style`.
- Metric summary row: BLG / ABV / SRM / IBU (from `record` — `RecipeMetricsSnapshot` fields).
- Podstawy (`data.basics`), Parametry warki (`data.batch.volumeL`).
- Zasyp (`data.malts[]`: name, amountKg, colorEbc, extractPercent) — "brak" when empty.
- Zacieranie (`data.mash`: efficiencyPct, waterToGrainRatio, rests[] temp/duration).
- Chmiel (`data.hops[]`: name, alphaAcidPercent, amountG, stage→label, timeMin).
- Drożdże (`data.yeast`: strain, type, attenuationPct, ferm temp range).
- Dodatki (`data.adjuncts[]`: name, stage→label, timeMin, notes).

Reuse the exact Polish stage labels from `[id].astro:10-21`
(`HOP_STAGE_LABELS`, `ADJUNCT_STAGE_LABELS`) — extract them to a shared location
(e.g. `src/lib/recipe-labels.ts`) and import in both the Astro page and the PDF so
wording cannot drift. Tabular sections use flexbox `View` rows (no `<Table>` primitive).

#### 3. Share stage label maps

**File**: `src/lib/recipe-labels.ts`, and update `src/pages/recipes/[id].astro`

**Intent**: Single source of truth for `HOP_STAGE_LABELS` / `ADJUNCT_STAGE_LABELS`
so the page and the PDF stay in sync.

**Contract**: New module exporting both maps typed by `HopStage` / `AdjunctStage`;
`[id].astro` imports them instead of defining them inline (remove the local consts
at `[id].astro:10-21`).

### Success Criteria:

#### Automated Verification:

- Helper unit tests pass: `npm run test:run` (cover `sanitizeFilename` edge cases:
  Polish chars, slashes, empty → fallback; `buildRecipeJsonBlob` produces valid JSON type)
- Type checking passes: `npm run build`
- Linting passes: `npm run lint`

#### Manual Verification:

- `RecipePdf` compiles and (via Phase 3 wiring or a temporary harness) renders all
  sections with correct Polish diacritics.
- Empty lists (no malts/hops/adjuncts) render "brak" rather than crashing.

**Implementation Note**: Pause for manual confirmation that the rendered PDF content
matches the page (labels, diacritics, all sections) before Phase 3 wiring is finalized.

---

## Phase 3: Export island + page wiring

### Overview

Create the `RecipeExportActions` island (two buttons, imperative download, state)
and mount it on the detail page.

### Changes Required:

#### 1. Export actions island

**File**: `src/components/recipe/RecipeExportActions.tsx`

**Intent**: Render the two export buttons and handle both downloads client-side with
per-action loading/error/disabled state, without rendering any PDF until clicked.

**Contract**: `export default function RecipeExportActions({ record }: { record: RecipeRecord })`.
- **JSON button** ("Pobierz JSON"): on click → `buildRecipeJsonBlob(record)` →
  `triggerBlobDownload(blob, sanitizeFilename(record.name) + ".json")`.
- **PDF button** ("Pobierz PDF"): on click → set loading → dynamically import the
  PDF module + `pdf` from `@react-pdf/renderer`, `await pdf(<RecipePdf record={record} />).toBlob()`,
  then `triggerBlobDownload(blob, sanitizeFilename(record.name) + ".pdf")`; clear
  loading in `finally`; on error set an inline error message. Disable the PDF
  button while loading and show "Generuję PDF…".
- Uses shadcn `Button` (`@/components/ui/button`) and `cn()`; no `"use client"`.
  Dynamically importing `@react-pdf/renderer` inside the handler keeps it out of
  the initial island payload (lighter first load).

#### 2. Mount the island on the detail page

**File**: `src/pages/recipes/[id].astro`

**Intent**: Place the export buttons in the header next to the recipe title, passing
the loaded record into the island.

**Contract**: Import `RecipeExportActions`; in the header block (`[id].astro:58-68`,
the right side of the `flex ... justify-between` row) render
`<RecipeExportActions record={record} client:load />`. Only rendered in the
`record && data` branch (record guaranteed non-null there).

### Success Criteria:

#### Automated Verification:

- Type checking passes: `npm run build`
- Linting passes: `npm run lint`
- Existing tests still pass: `npm run test:run`

#### Manual Verification:

- On `/recipes/[id]`, both buttons appear in the header and are styled consistently.
- "Pobierz JSON" downloads `<name>.json` with the full record; file opens as valid JSON.
- "Pobierz PDF" shows the loading label, then downloads `<name>.pdf`; the PDF shows
  all sections with correct Polish diacritics.
- Filename with Polish/odd characters in the recipe name is sanitized correctly.
- Error path: if PDF generation throws, an inline error shows and the button re-enables.
- No regressions on the detail page (static sections still render; 404 path unaffected).

**Implementation Note**: After automated verification, pause for manual confirmation
of both downloads in a real browser before considering S-06 done.

---

## Testing Strategy

### Unit Tests:

- `sanitizeFilename`: Polish characters preserved/transliterated as decided,
  illegal chars (`/ \ : * ? " < > |`) removed, leading/trailing dots/spaces trimmed,
  empty/whitespace → `"przepis"`.
- `buildRecipeJsonBlob`: returns a `Blob` of type `application/json` whose text
  round-trips to the input record.

### Integration Tests:

- Not adding a browser/jsdom harness for PDF (Vitest is `environment: "node"`;
  PDF rendering is browser-side). Covered by manual verification instead.

### Manual Testing Steps:

1. Open a saved recipe with all section types populated; click "Pobierz JSON" → verify file + content.
2. Click "Pobierz PDF" → verify loading label, then open the PDF and check every section + diacritics.
3. Open a recipe with empty malts/hops/adjuncts → verify "brak" in the PDF.
4. Use a recipe whose name contains spaces and Polish letters → verify sane filenames.
5. Simulate a generation failure (e.g. temporarily break the import) → verify inline error + re-enable.

## Performance Considerations

- PDF work happens only on click, and `@react-pdf/renderer` is dynamically imported
  inside the handler, so the detail page's initial island payload stays small.
- The font TTFs (~300KB each) load only when the browser fetches them for a PDF render.

## Migration Notes

None — no schema or data changes. Purely additive client-side feature.

## References

- Research (compatibility): `context/changes/recipe-export/research.md`
- Library docs: `context/changes/recipe-export/recipe-export-docs.md`
- Library comparison: `context/changes/recipe-export/recipe-export-research.md`
- Mount point: `src/pages/recipes/[id].astro:27,33,58-68`
- Island pattern: `src/pages/recipes/new.astro:9`, `src/pages/auth/signin.astro:16`
- Data access: `src/lib/recipe-queries.ts:21-26`, `src/lib/recipe-mappers.ts:32-38`
- Types: `src/types.ts:55-86`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Dependency, fonts & bundling foundation

#### Automated

- [x] 1.1 `@react-pdf/renderer` present in `package.json` and `package-lock.json` — c050c1d
- [x] 1.2 `public/fonts/Inter-Regular.ttf` and `Inter-Bold.ttf` present and non-empty — c050c1d
- [x] 1.3 `npm run build` completes without errors — c050c1d
- [x] 1.4 `npm run lint` passes — c050c1d

#### Manual

- [x] 1.5 Smoke island generates a downloadable PDF in-browser — c050c1d
- [x] 1.6 No fontkit/WASM console errors in the island — c050c1d

### Phase 2: PDF document component + export helpers

#### Automated

- [x] 2.1 Helper unit tests pass: `npm run test:run`
- [x] 2.2 `npm run build` passes
- [x] 2.3 `npm run lint` passes

#### Manual

- [x] 2.4 `RecipePdf` renders all sections with correct Polish diacritics
- [x] 2.5 Empty malts/hops/adjuncts render "brak" without crashing

### Phase 3: Export island + page wiring

#### Automated

- [x] 3.1 `npm run build` passes
- [x] 3.2 `npm run lint` passes
- [x] 3.3 Existing tests still pass: `npm run test:run`

#### Manual

- [x] 3.4 Both buttons appear in the detail header, consistently styled
- [x] 3.5 "Pobierz JSON" downloads valid `<name>.json` with the full record
- [x] 3.6 "Pobierz PDF" shows loading then downloads `<name>.pdf` with all sections + diacritics
- [x] 3.7 Filenames sanitized for Polish/odd characters
- [x] 3.8 PDF error path shows inline error and re-enables the button
- [x] 3.9 No regressions on the detail page (static sections + 404 path)
