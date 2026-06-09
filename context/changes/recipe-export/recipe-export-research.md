# Research: biblioteki eksportu przepisu (S-06 / `recipe-export`)

> Powiązane z `change.md` (change_id: `recipe-export`, PRD FR-013, roadmap S-06).
> Cel research: jakie biblioteki pozwalają zaimplementować eksport zapisanego
> przepisu jako **PDF** lub **JSON**, zgodnie z `context/foundation/tech-stack.md`.
> Data: 2026-06-10. Metoda: web search (uwaga: `web_search_exa` MCP nie jest
> dostępny w tym workspace — dostępne serwery MCP to Linear, Context7, GitLens —
> użyto wbudowanego web search).

## Kluczowe ograniczenie ze stacku

Aplikacja deployuje się na **Cloudflare Workers / Pages (edge runtime)** —
patrz `tech-stack.md` (`deployment_target: cloudflare-pages`) oraz `CLAUDE.md`
(adapter `@astrojs/cloudflare`, `output: "server"`). Edge runtime:

- brak natywnych API Node (`fs`, `Buffer`, strumienie Node),
- ograniczenia WASM / fontkit,
- brak headless Chromium (Puppeteer/Playwright odpadają na edge).

Wniosek: najczystsze rozwiązanie to **generowanie PDF po stronie klienta**
(React island na stronie podglądu przepisu z S-05) — omija wszystkie problemy
edge runtime. Jeśli kiedyś potrzebny serwerowy endpoint, jedyną z popularnych
bibliotek pewnie działającą na Workers jest `pdf-lib` (czysty JS, bez natywnych
zależności).

## JSON — bez biblioteki

Encja przepisu jest już typowana (`src/types.ts`, F-01). Eksport = `JSON.stringify(recipe)`:

- trasa Astro API `GET /api/recipes/[id]/export.json` z nagłówkiem
  `Content-Disposition: attachment`, lub
- pobranie po stronie klienta przez `Blob`.

**Nie dodawać zależności dla JSON.**

## PDF — porównanie dojrzałych bibliotek

| Biblioteka | Podejście | Edge / CF Workers (serwer) | Klient (przeglądarka) | Najlepsze do | Dojrzałość |
|---|---|---|---|---|---|
| **jsPDF** (+ `jspdf-autotable`) | Imperatywne API | częściowe | tak | Proste, ustrukturyzowane dokumenty (tabele składników, metryki) | ~2M pobrań/tydz., bardzo dojrzała |
| **pdf-lib** | Niskopoziomowe, czysty JS | tak (bez natywnych zależności) | tak | Programowy layout; działa wszędzie, też na Workers | ~1.5M pobrań/tydz., dojrzała |
| **@react-pdf/renderer** | Komponenty JSX → PDF | nie (`renderToBuffer`/`renderToStream` są Node-only; fontkit WASM) | tak (build przeglądarkowy) | Komponentowe, brandowane layouty | ~500–860K pobrań/tydz., dojrzała |

Uwagi:

- **`@react-pdf/renderer`** — najwygodniejszy dla zespołu React (PDF opisywany
  jako JSX), ale używać **tylko po stronie klienta**; jego API serwerowe są
  potwierdzone jako niedziałające na Cloudflare
  ([react-pdf#2757](https://github.com/diegomura/react-pdf/issues/2757)).
- **`pdf-lib`** — jedyna z trójki pewnie działająca **serwerowo na Workers**,
  kosztem ręcznego layoutu.
- **`jsPDF`** — najlżejsza, jeśli PDF to "tytuł + kilka tabel + cztery metryki",
  co dobrze pasuje do eksportu przepisu.
- **Nowe biblioteki "edge-native"** (boxpdf, imprint-pdf, pretext-docgen,
  pdfnative) — **odradzane na teraz**: bardzo świeże, niska adopcja, agresywne
  niezweryfikowane deklaracje marketingowe. Niewart ryzyka przy nice-to-have v1.

## Rekomendacja dla projektu

Biorąc pod uwagę `main_goal: speed`, status S-06 jako nice-to-have / ostatni
slice oraz ograniczenie Cloudflare:

1. **JSON** — zero zależności, pobranie przez `Blob` po stronie klienta lub
   trywialna trasa Astro API.
2. **PDF** — **`@react-pdf/renderer` (klient, w React island)** dla dopracowanego,
   brandowanego layoutu w duchu komponentów React, **albo `jsPDF` + `jspdf-autotable`**
   dla najmniejszej i najszybszej ścieżki. Oba trzymają generowanie w przeglądarce,
   więc nic nie dotyka edge runtime.

To rozwiązuje też otwarte pytanie z roadmapy (czy v1 wymaga obu formatów): można
dostarczyć **najpierw sam JSON** (prawie zerowy nakład), a PDF dodać później za
tym samym menu eksportu — żaden z formatów nie wymaga pracy po stronie backendu.

## Źródła

- boxpdf — <https://boxpdf.dev/>
- imprint-pdf — <https://github.com/tamimbinhakim/imprint-pdf>
- pretext-docgen — <https://github.com/ShipItAndPray/pretext-docgen>
- pdfnative — <https://pdfnative.dev/>
- Cloudflare worker compatibility (react-pdf#2757) — <https://github.com/diegomura/react-pdf/issues/2757>
- Porównanie react-pdf vs @react-pdf/renderer vs jsPDF (2026) — <https://www.pkgpulse.com/guides/react-pdf-vs-react-pdf-renderer-vs-jspdf-pdf-in-react-2026>
- Konwersja HTML→PDF z jsPDF (Nutrient) — <https://www.nutrient.io/blog/how-to-convert-html-to-pdf-using-react/>
