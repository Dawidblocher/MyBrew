# Docs: `@react-pdf/renderer` dla eksportu PDF (S-06 / `recipe-export`)

> Powiązane z `change.md` (change_id: `recipe-export`, PRD FR-013, roadmap S-06)
> oraz `recipe-export-research.md`.
> Źródło: Context7 MCP, library ID `/diegomura/react-pdf` (pakd. `@react-pdf/renderer`).
> Data: 2026-06-10.
> Zakres: tylko to, co potrzebne do implementacji eksportu zapisanego przepisu
> jako **PDF** (klient) i **JSON** (bez biblioteki), zgodnie z ograniczeniem
> Cloudflare edge (patrz research → generowanie **tylko po stronie klienta**).

## Ograniczenia projektu (kontekst implementacji)

- **Tylko React island po stronie klienta.** `renderToBuffer`/`renderToStream`
  są Node-only i nie działają na Cloudflare Workers — używać wyłącznie API
  przeglądarkowych (`PDFDownloadLink`, `usePDF`, `pdf().toBlob()`).
- Per `CLAUDE.md`: brak dyrektyw `"use client"`; ewentualne hooki → `src/components/hooks/`.
- **JSON** nie wymaga zależności — `JSON.stringify(recipe)` → `Blob` w tym samym
  menu „Eksportuj".

## Bloki budulcowe

PDF opisuje się jako JSX z prymitywów (`Document` → `Page` → `View`/`Text`/`Image`)
+ `StyleSheet.create`:

```jsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 30, fontFamily: 'Inter', fontSize: 11 },
  section: { marginBottom: 12 },
});

const RecipePdf = ({ recipe }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.section}>
        <Text>{recipe.name}</Text>
      </View>
    </Page>
  </Document>
);
```

## Wyzwalanie pobrania (kluczowe dla S-06)

Trzy opcje po stronie klienta:

### 1. `PDFDownloadLink` — najprostszy (link z wbudowanym loading/error)

```jsx
import { PDFDownloadLink } from '@react-pdf/renderer';

<PDFDownloadLink
  document={<RecipePdf recipe={recipe} />}
  fileName={`${recipe.name}.pdf`}
>
  {({ blob, url, loading, error }) =>
    loading ? 'Generuję PDF…' : error ? `Błąd: ${error.message}` : 'Pobierz PDF'
  }
</PDFDownloadLink>;
```

### 2. `usePDF` hook — reaktywny (gdy dane mogą się zmienić przed eksportem)

```jsx
import { usePDF } from '@react-pdf/renderer';

const [instance, updateInstance] = usePDF({ document: <RecipePdf recipe={recipe} /> });
// instance.{ loading, error, url, blob }
// updateInstance(<RecipePdf recipe={nextRecipe} />) — wymusza re-render PDF
if (instance.loading) return <div>Generuję…</div>;
if (instance.error) return <div>Błąd: {instance.error}</div>;
// <a href={instance.url} download="przepis.pdf">Pobierz PDF</a>
```

### 3. `pdf().toBlob()` — imperatywny (na klik, bez renderu linku)

```jsx
import { pdf } from '@react-pdf/renderer';

const blob = await pdf(<RecipePdf recipe={recipe} />).toBlob();
const url = URL.createObjectURL(blob);
// utwórz <a download> programowo, kliknij, następnie URL.revokeObjectURL(url)

// Dynamiczna aktualizacja / nasłuch zmian:
const instance = pdf();
instance.updateContainer(<RecipePdf recipe={recipe} />);
instance.on('change', () => console.log('Document changed'));
const blob2 = await instance.toBlob();
```

### `BlobProvider` — dostęp do surowego blob/url (np. upload)

```jsx
import { BlobProvider } from '@react-pdf/renderer';

<BlobProvider document={<RecipePdf recipe={recipe} />}>
  {({ blob, url, loading, error }) => {
    if (loading) return <div>Generuję PDF…</div>;
    if (error) return <div>Błąd: {error.message}</div>;
    return <a href={url} target="_blank" rel="noopener noreferrer">Otwórz w nowej karcie</a>;
  }}
</BlobProvider>;
```

> Dla S-06 wystarczą opcje 1–3; `BlobProvider` tylko gdy potrzebny surowy blob.

## Layout tabel składników / metryk

Brak prymitywu `<Table>` — wiersze/kolumny buduje się flexboxem na `View`.
Wspierane m.in.: `flexDirection`, `justifyContent`, `flex`, `gap`/`rowGap`/`columnGap`,
`width: '30%'`, `borderWidth`/`borderColor`/`borderStyle`, `backgroundColor`,
`position: 'absolute'`, `transform`, media queries (`'@media max-width: 500': {...}`).

```jsx
const t = StyleSheet.create({
  row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#ddd' },
  cell: { flex: 1, padding: 4 },
});

// Wiersz tabeli zasypu / chmielu:
<View style={t.row}>
  <Text style={t.cell}>Słód pilzneński</Text>
  <Text style={t.cell}>4.5 kg</Text>
</View>;
```

Dobrze pasuje do dynamicznych list (zasyp, chmiel, dodatki) oraz bloku
podsumowania czterech metryk (BLG / ABV / SRM / IBU).

## Komponent `Page`

```jsx
<Page size="A4" style={styles.page}>…</Page>          // standard
<Page size="A4" orientation="landscape">…</Page>      // pozioma
<Page size={[612, 792]}>…</Page>                      // własny rozmiar w punktach [w, h]
<Page size="LETTER" wrap>…</Page>                     // auto page-break dla długiej treści
<Page size="A4" bookmark="Rozdział 1">…</Page>        // zakładka nawigacji
<Page size="A4" dpi={300}>…</Page>                    // wysoka rozdzielczość do druku
```

`View` wspiera też `fixed` (stały nagłówek/stopka), `debug` (ramka pomocnicza)
oraz render prop z numerem strony:

```jsx
<View fixed style={styles.fixedHeader}><Text>Nagłówek</Text></View>
<View render={({ pageNumber }) => <Text>Strona {pageNumber}</Text>} />
```

## ⚠️ Polskie znaki diakrytyczne — wymagana rejestracja fontu

Wbudowane fonty (Helvetica) **nie renderują niezawodnie** `ą ć ę ł ń ó ś ż`.
Zarejestruj font Unicode TTF (np. self-hostowany Inter/Roboto/Open Sans) **przed**
renderem. Preferuj self-hosting `.ttf` w `public/fonts/` (offline, bez problemów
z siecią/CSP) zamiast URL Google Fonts.

```jsx
import { Font } from '@react-pdf/renderer';

Font.register({
  family: 'Inter',
  fonts: [
    { src: '/fonts/Inter-Regular.ttf', fontWeight: 400 },
    { src: '/fonts/Inter-Bold.ttf', fontWeight: 700 },
    { src: '/fonts/Inter-Italic.ttf', fontStyle: 'italic', fontWeight: 400 },
  ],
});

// opcjonalnie — emoji i własne dzielenie wyrazów:
Font.registerEmojiSource({ format: 'png', url: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/' });
Font.registerHyphenationCallback((word) =>
  word.length > 12 ? [word.slice(0, 6) + '-', word.slice(6)] : [word],
);
```

Następnie ustaw `fontFamily: 'Inter'` w stylach (np. na `page` lub per `Text`).

## Eksport JSON (bez zależności)

```js
const blob = new Blob([JSON.stringify(recipe, null, 2)], { type: 'application/json' });
const url = URL.createObjectURL(blob);
// <a href={url} download={`${recipe.name}.json`}>Pobierz JSON</a> → revokeObjectURL po pobraniu
```

Encja przepisu jest już typowana w `src/types.ts` (F-01).

## Mapowanie na repo

- Render PDF **wyłącznie w React island** na stronie szczegółów przepisu (S-05).
- Wspólne menu „Eksportuj" z dwoma akcjami: **PDF** (`@react-pdf/renderer`) i
  **JSON** (`Blob`) — żadna nie dotyka edge runtime.
- Hooki (jeśli wydzielane) → `src/components/hooks/`; typy → `src/types.ts`;
  helpery → `src/lib/`.

## Źródła

- Context7 MCP — `/diegomura/react-pdf` (`@react-pdf/renderer`)
- README: <https://github.com/diegomura/react-pdf>
