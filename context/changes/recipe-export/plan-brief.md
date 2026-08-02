# Eksport zapisanego przepisu (PDF / JSON) — Plan Brief

> Full plan: `context/changes/recipe-export/plan.md`
> Research: `context/changes/recipe-export/research.md`

## What & Why

S-06 (PRD FR-013): let a signed-in user export a saved recipe from the detail page
as **PDF** and **JSON**. It closes the create→save→view loop with a portable,
shareable, brew-day-ready artifact. Both formats are generated **entirely in the
browser**, so nothing runs on the Cloudflare edge runtime.

## Starting Point

The recipe detail page (`src/pages/recipes/[id].astro`) already loads the full
`RecipeRecord` (with nested `RecipeDraft`) server-side and renders every section,
but it's 100% static Astro — no React island, and no export code anywhere in `src/`.
The data needed for both exports is already in scope on the page.

## Desired End State

Two buttons — **"Pobierz PDF"** and **"Pobierz JSON"** — sit in the detail-page
header. JSON downloads instantly; PDF shows a brief loading state then downloads a
faithful, full-recipe, Polish-language PDF with correct diacritics. `npm run build`
and `npm run lint` pass and the browser island bundles cleanly.

## Key Decisions Made

| Decision            | Choice                                     | Why (1 sentence)                                                     | Source   |
| ------------------- | ------------------------------------------ | -------------------------------------------------------------------- | -------- |
| PDF library         | `@react-pdf/renderer` (client-only)        | Edge-safe in a browser island; JSX-described, React-team-friendly.   | Research |
| Generation location | Client island, no API route                | Edge runtime can't run Node PDF APIs; data is already on the page.   | Research |
| Mount point         | `[id].astro` header island                 | Full record already loaded server-side; only place with `data`.      | Research |
| Format scope (v1)   | Both PDF + JSON now                        | Architecture for both already settled; marginal cost low.            | Plan     |
| PDF trigger         | Imperative `pdf().toBlob()` on click       | No PDF work until requested; one shared handler style; plain Button. | Plan     |
| Export UI           | Two buttons (no dropdown)                  | No dropdown primitive exists yet; most discoverable, least scope.    | Plan     |
| Font                | Self-hosted Inter (Regular + Bold)         | Full Polish Latin-Extended coverage; matches app look; OFL.          | Plan     |
| PDF layout          | Full recipe (all sections)                 | Genuinely useful printout; data already in props.                    | Plan     |
| Font acquisition    | Plan specifies files; fetched at implement | Keeps plan clean; binary assets land at implement time.              | Plan     |

## Scope

**In scope:** Client-side PDF + JSON export of one saved recipe from the detail
page; self-hosted Inter font + registration; two-button island; small `src/lib`
export helpers; shared Polish stage-label maps.

**Out of scope:** Server/API export route; `renderToBuffer`/`renderToStream`;
`PDFDownloadLink`/`usePDF`/`BlobProvider`; dropdown menu; export from the list page;
emoji/hyphenation registration; edit/delete.

## Architecture / Approach

`[id].astro` (server, loads `record`) → `<RecipeExportActions record client:load />`
island → two shadcn buttons. JSON path: `JSON.stringify` → `Blob` → download. PDF
path: on click, dynamically import `@react-pdf/renderer` + `RecipePdf`, build the
document from `record`, `pdf().toBlob()`, download. Inter is registered once at
module load in `src/lib/pdf-fonts.ts`; helpers (filename, download, JSON) live in
`src/lib/recipe-export.ts`; stage labels shared via `src/lib/recipe-labels.ts`.

## Phases at a Glance

| Phase                             | What it delivers                                               | Key risk                                            |
| --------------------------------- | -------------------------------------------------------------- | --------------------------------------------------- |
| 1. Dependency, fonts & bundling   | Library installed, Inter self-hosted + registered, clean build | fontkit/WASM bundling in an Astro client island     |
| 2. PDF component + export helpers | `RecipePdf` (full layout) + `src/lib` helpers (tested)         | Polish diacritics; faithful section mapping         |
| 3. Export island + page wiring    | Two-button island mounted on the detail page                   | Download UX, loading/error state, filename sanitize |

**Prerequisites:** S-05 detail page exists (it does); ability to download the two
Inter TTFs into `public/fonts/` during implementation.
**Estimated effort:** ~2-3 focused sessions across the 3 phases.

## Open Risks & Assumptions

- Browser-island bundling of `@react-pdf/renderer` (fontkit/WASM) may need a small
  `vite.optimizeDeps`/`ssr.noExternal` tweak in `astro.config.mjs` — verified in
  Phase 1; only added if the default build fails.
- Inter TTFs must actually be added in implementation — the PDF won't render
  diacritics without them.

## Success Criteria (Summary)

- From a saved recipe, the user can download a valid JSON file containing the full record.
- From the same page, the user can download a full, multi-section PDF with correct Polish diacritics.
- Build and lint pass; no regressions on the detail page; nothing runs on the edge.
