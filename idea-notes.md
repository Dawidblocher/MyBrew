# Beer Recipe Builder - MVP

## Główny problem

Tworzenie receptur piwa wymaga wykonywania wielu obliczeń, zarządzania dużą liczbą parametrów oraz ręcznego planowania procesu warzenia. Brak prostego narzędzia utrudnia szybkie przygotowanie poprawnej receptury i zwiększa ryzyko błędów.

## Najmniejszy zestaw funkcjonalności

- Tworzenie receptury piwa w formie wieloetapowego kreatora
- Definiowanie podstawowych informacji o piwie (nazwa, styl)
- Konfiguracja parametrów warki
- Zarządzanie zasypem poprzez dynamiczną listę słodów (DND)
- Zarządzanie chmieleniem poprzez dynamiczną listę dodatków chmielowych (DND)
- Wybór drożdży dla receptury
- Zarządzanie dodatkami poprzez dynamiczną listę dodatków (DND)
- Konfiguracja procesu zacierania
- Automatyczne wyliczanie parametrów receptury:
  - BLG
  - ABV
  - SRM
  - IBU
- Zapisywanie, edycja i usuwanie receptur

## Co NIE wchodzi w zakres MVP

- Zarządzanie fermentacją i harmonogramem warzenia
- Generowanie receptur przez AI
- Współdzielenie receptur między użytkownikami
- Aplikacje mobilne (na początek tylko web)
- Zaawansowane raporty i analizy receptur
- Automatyczne sugerowanie składników na podstawie stylu piwa

## Kryteria sukcesu

- Użytkownik może utworzyć kompletną recepturę w mniej niż 5 minut
- 90% zapisanych receptur zawiera poprawnie wyliczone parametry BLG, ABV, SRM i IBU
- Użytkownicy zapisują i edytują receptury bez konieczności korzystania z zewnętrznych kalkulatorów

## Przepływ tworzenia receptury

### Krok 1: Podstawy

- Nazwa piwa
- Styl piwa

### Krok 2: Zasyp

#### Parametry warki

- Oczekiwana ilość gotowego piwa
- Czas gotowania
- Szybkość odparowywania
- Straty z gotowania
- Straty z fermentacji
- Straty z chmielenia na zimno

#### Lista słodów (dynamiczna, DND)

- Nazwa słodu
- Ilość
- Ekstrakcja
- EBC
- Udział procentowy w zasypie

### Krok 3: Zacieranie

- Wydajność zacierania
- Stosunek wody do ziarna

#### Lista przerw zacierania (dynamiczna, DND)

- Temperatura
- Czas trwania

### Krok 4: Chmielenie

#### Lista dodatków chmielowych (dynamiczna, DND)

- Nazwa chmielu
- Ilość
- Alfa-kwasy (AA%)
- Etap dodania:
  - Gotowanie
  - Whirlpool
  - Chmielenie na zimno
- Czas dodania

### Krok 5: Drożdże

- Szczep drożdży
- Producent
- Typ drożdży (suche / płynne)
- Stopień odfermentowania
- Zalecany zakres temperatur fermentacji

### Krok 6: Dodatki

#### Lista dodatków (dynamiczna, DND)

- Nazwa dodatku
- Ilość
- Jednostka
- Etap dodania:
  - Zacieranie
  - Gotowanie
  - Whirlpool
  - Fermentacja burzliwa
  - Fermentacja cicha
  - Refermentacja / rozlew
- Czas dodania (opcjonalnie)
- Notatka

#### Przykładowe dodatki

- Cukier
- Miód
- Laktoza
- Płatki owsiane
- Płatki pszenne
- Skórka pomarańczy
- Kolendra
- Kawa
- Kakao
- Owoce
- Puree owocowe
- Wiórki dębowe
- Przyprawy
- Środki klarujące (np. Irish Moss)

## Parametry wyliczane automatycznie

- BLG
- ABV
- SRM
- IBU