# Karczma Oberża — research marki

Robocze opracowanie marki Karczmy Oberża (ul. Piłsudskiego 23, Krynica-Zdrój) na podstawie publicznych źródeł. Stan na 17.11.2026.

## Zawartość

| Plik | Co zawiera |
|---|---|
| `index.html` | Strona startowa z linkami do podstron |
| `branding.html` | Stan obecny marki oraz propozycja: znak, sygnet, fonty, kolory, motyw haftu, makiety, głos marki |
| `media.html` | Kanały social, Google Maps, Tripadvisor, oceny, galeria, najnowsze publikacje, podsumowanie opinii |
| `prototyp/index.html` | Prototyp strony głównej karczmy |
| `prototyp/karta.html` | Prototyp karty dań, renderowany z `prototyp/menu.json` (jedno źródło cen) |
| `prototyp/strona.css`, `prototyp/strona.js` | System wizualny prototypu (tokeny, komponenty) i wspólne zachowania: status otwarcia, menu mobilne, animacje |
| `prototyp/build.py` | Generator: buduje wszystkie strony prototypu (PL i EN) z jednego źródła. Po zmianie tekstów uruchom `python3 prototyp/build.py` |
| `prototyp/dowoz.html` | Podstrona dowozu i zamówień na wynos |
| `prototyp/en/` | Wersja angielska (generowana przez `build.py`; tłumaczenia dań w `menu.json` jako pola `_en`) |
| `data/menu.md` | Karta dań spisana z Facebooka (wydanie z 1.11.2026) i pozycje ze starszej karty |
| `assets/style.css` | Wspólne style |
| `assets/haft.svg` | Uproszczona rekonstrukcja motywu haftu krzyżykowego |

## Podgląd

Strony są statyczne. Wystarczy otworzyć `index.html` w przeglądarce albo uruchomić:

```bash
python3 -m http.server 4173
```

## Uwagi

- Logo i zdjęcia karczmy są podlinkowane z serwerów Google, nie zapisane w repozytorium. Należą do właściciela karczmy.
- Znak na stronach jest odtworzony krojem Bodoni Moda jako propozycja, to nie jest plik źródłowy logo.
- Kroje w obecnych materiałach rozpoznano wizualnie. Kolory haftu pobrano próbką z JPEG, wartości są przybliżone.
- Liczby opinii i obserwujących zmieniają się w czasie.
