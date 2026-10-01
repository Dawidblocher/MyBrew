# design-source

Rozpakowane źródła prototypu `design-app-example.html` (bundle „myGrowl — Dashboard piwowara”).
Pominięte: vendorowe React/ReactDOM/Babel oraz osadzone fonty woff2 (Fraunces, IBM Plex Sans, IBM Plex Mono — Google Fonts).

| Plik | Oryginał w bundlu | Zawartość |
|------|-------------------|-----------|
| tokens.css | `<style>` w template | Zmienne CSS (paper/dark/swiss), density, klasy `.mono`/`.serif` |
| shared.jsx | src/components.jsx | Ikony, Logo, Button, Badge, Card, Field, Input, SectionTitle, StatTile, ColorSwatch, Bar |
| app.jsx | src/app.jsx | Shell: sidebar + NavItem + DashboardView |
| recipes.jsx | src/recipes.jsx | Lista receptur (master) + szczegóły z zakładkami |
| new-recipe.jsx | src/new_recipe.jsx | Kreator nowej receptury + ComputedStrip |
| i18n.jsx | src/i18n.jsx | Teksty PL/EN |
| data.jsx | src/data.jsx | Dane przykładowe |
| materials.jsx, protocol.jsx, tweaks.jsx | — | Poza zakresem (Surowce, Protokół, panel tweaków) |

Tylko materiał referencyjny — nie jest importowany przez aplikację.
