# Backend Karczmy Oberża

Serwer strony Karczmy Oberża: karta dań z bazy, status otwarcia na żywo, rezerwacje stolików, panel właściciela i powiadomienia. Zamówień przez stronę nie ma — dowóz i na wynos przyjmowane są telefonicznie.

Jeden proces Node.js serwuje wszystko naraz:

| Adres | Co to jest |
|---|---|
| `/` | Strona (pliki z `prototyp/`), z formularzem rezerwacji |
| `/panel/` | Panel właściciela (hasło) |
| `/api/...` | API dla strony i panelu |

Ta sama strona na GitHub Pages (bez backendu) działa dalej jak wcześniej: karta z `menu.json`, kontakt telefoniczny, bez formularza rezerwacji. Skrypt `prototyp/online.js` sam sprawdza, czy jest API, i dopiero wtedy włącza funkcje online.

## Co umie

**Dla gości (strona)**
- Status „Otwarte / Zamknięte · otwieramy o 12:00” liczony na serwerze, z wyjątkami (święta, imprezy zamknięte).
- Komunikat z panelu jako pasek na górze strony (np. „W Wigilię nieczynne”), z datą wygaśnięcia.
- Rezerwacja stolika: dzień, wolne godziny pobierane z serwera, liczba osób, opcja Rondla, uwagi. Status rezerwacji widoczny dla gościa; e-mail z potwierdzeniem, jeśli podał adres i skonfigurowano SMTP.
- Karta z bazy: aktualne ceny, pozycje „chwilowo niedostępne” i ukryte ustawiane w panelu.
- Wszystko po polsku i angielsku.

**Dla obsługi (panel `/panel/`)**
- Rezerwacje: nowe z dźwiękiem i licznikiem w karcie przeglądarki; lista po dniach z liczbą gości, potwierdzenie, odrzucenie, anulowanie.
- Karta: ceny, „dostępne” (np. skończyła się golonka), „ukryte”, edycja nazw i opisów PL/EN, dodawanie i usuwanie pozycji, kilka cen (rozmiary).
- Godziny: zwykły tydzień i wyjątki.
- Ustawienia: rezerwacje online wł./wył., limit gości na godzinę, największa grupa online, komunikat na stronie.
- Odświeża się co 15 s, więc działa na kilku urządzeniach naraz (np. tablet w kuchni i telefon właściciela).

## Uruchomienie lokalne

Wymaga Node.js 22.13 lub nowszego (wbudowane SQLite).

```bash
npm install
```

```bash
cp backend/.env.example backend/.env
```

W `backend/.env` ustaw co najmniej `PANEL_PASSWORD`, `NODE_ENV=development` i np. `PORT=4190`. Potem:

```bash
npm start
```

Strona: `http://localhost:4190`, panel: `http://localhost:4190/panel/`. Przy pierwszym starcie karta wczytuje się z `prototyp/menu.json`.

Przykładowe rezerwacje do obejrzenia panelu (tylko lokalna baza SQLite):

```bash
node backend/scripts/demo-data.js
```

## Testy

```bash
npm test
```

27 testów (`backend/test/`): godziny i strefa czasowa, rezerwacje (walidacja, duplikaty, limit miejsc, limit prób, pułapka na boty), logowanie (ciasteczko, wygasanie, blokada po 5 złych hasłach), operacje panelu, ustawienia, powiadomienia, RODO. Każdy test ma własną bazę w pamięci i sterowany zegar. CI uruchamia je przy każdym pushu (`.github/workflows/ci.yml`).

## Wdrożenie na Hostingerze (jak N°75 Osteria)

1. **Baza.** hPanel → Bazy danych → MySQL → nowa baza i użytkownik. Zapisz nazwę bazy, użytkownika i hasło.
2. **Aplikacja.** hPanel → Websites → Node.js Web App → wdrożenie z GitHuba, repozytorium `karczma-oberza`, gałąź `main`. Katalog główny: korzeń repozytorium. Polecenie startu: `npm start`. Wersja Node: 22 lub 24.
3. **Zmienne środowiskowe** (aplikacja → Environment variables), opis w `backend/.env.example`:

   | Zmienna | Wartość |
   |---|---|
   | `NODE_ENV` | `production` |
   | `PANEL_PASSWORD` | hasło do panelu |
   | `PANEL_SECRET` | losowy ciąg, np. wynik `openssl rand -hex 32` |
   | `DATABASE_URL` | `mysql://UŻYTKOWNIK:HASŁO@127.0.0.1:3306/BAZA` — z aplikacji zawsze `127.0.0.1`, nie adres `srvNNNN.hstgr.io` |
   | `PUBLIC_URL` | adres strony, np. `https://karczmaoberza.pl` |
   | `NOTIFY_EMAIL`, `SMTP_*` | opcjonalnie: powiadomienia e-mail (np. skrzynka w Hostinger Mail, `smtp.hostinger.com`, port 465) |
   | `NOTIFY_WEBHOOK_URL` | opcjonalnie: webhook (Make, n8n, Slack) |

4. **Redeploy.** Przy pierwszym starcie aplikacja sama zakłada tabele i wczytuje kartę.
5. **Sprawdzenie.** `https://<adres>/api/health` zwraca `{"ok":true}`; zaloguj się do `/panel/`, wyślij testową rezerwację ze strony i odrzuć ją w panelu.

Bez `DATABASE_URL` aplikacja używa pliku SQLite w `DATA_DIR`. Na Hostingerze plik w katalogu aplikacji może zniknąć przy kolejnym wdrożeniu, dlatego tam używamy MySQL.

## API

Publiczne (bez logowania):

| Metoda i adres | Opis |
|---|---|
| `GET /api/status` | Otwarte teraz, godziny dziś, następne otwarcie, komunikat, ustawienia rezerwacji |
| `GET /api/menu` | Karta (format jak `menu.json` + `id`, `warianty` z ceną w groszach, `dostepne`) |
| `GET /api/rezerwacje/terminy?data=RRRR-MM-DD` | Wolne godziny rezerwacji w danym dniu |
| `POST /api/rezerwacje` | Nowa rezerwacja → `token` |
| `GET /api/rezerwacje/:token` | Status rezerwacji (bez danych osobowych) |
| `GET /api/health` | Kontrola działania |

Panel (ciasteczko sesji po `POST /api/panel/login`): `GET /api/panel/podsumowanie`, `GET|PATCH /api/panel/rezerwacje`, `GET /api/panel/menu`, `POST|PATCH|DELETE /api/panel/menu/pozycje`, `GET /api/panel/ustawienia`, `PUT /api/panel/ustawienia/:nazwa`.

Błędy mają stały kod i komunikat w języku gościa, np. `{"blad":"termin_niedostepny","komunikat":"Ten termin nie jest dostępny…","pola":{…}}`.

## Bezpieczeństwo i dane

- Panel: hasło porównywane w stałym czasie, sesja 12 h w podpisanym ciasteczku `HttpOnly`, `SameSite=Strict`, `Secure` na produkcji. 5 złych haseł z jednego adresu = 15 min blokady, globalnie najwyżej 30 złych prób na godzinę.
- Formularze: limit 6 zgłoszeń na 15 min z jednego adresu, ukryte pole na boty, żądania zmieniające dane tylko z tej samej domeny (`ALLOWED_ORIGINS` dla wyjątków).
- Panel ma ścisłe CSP (tylko własne skrypty), zakaz osadzania w ramce i `noindex`. Cała treść w panelu wstawiana jako tekst, bez HTML.
- RODO: dane osobowe z rezerwacji są usuwane automatycznie po `RETENTION_DAYS` dniach (domyślnie 180); zostają termin i liczba osób.

## Założenia do potwierdzenia z karczmą

Wartości domyślne są w `backend/src/settings.js` i wszystkie da się zmienić w panelu:

- Godziny: codziennie 12:00–22:00 (tak jest w obecnych profilach).
- Rezerwacje: co 30 min, ostatnia godzinę przed zamknięciem, najwcześniej godzinę przed wizytą, do 30 osób, 60 dni do przodu, bez limitu miejsc.
- Przed uruchomieniem potrzebna jest polityka prywatności z danymi administratora (właściciela karczmy) i link do niej przy formularzach.
- W stopce prototypu są dopiski „Prototyp strony” i link do researchu — do usunięcia przed startem.

## Struktura

```
backend/
  src/server.js      start: konfiguracja, baza, pierwszy import karty, czyszczenie danych (RODO)
  src/app.js         wszystkie trasy HTTP (API, panel, pliki strony)
  src/repo.js        zapytania do bazy (wspólne dla SQLite i MySQL)
  src/db/            połączenie z bazą i schemat w dwóch dialektach
  src/time.js        czas polski, godziny, terminy rezerwacji
  src/settings.js    ustawienia panelu: wartości domyślne i walidacja
  src/auth.js        logowanie do panelu
  src/notify.js      powiadomienia e-mail / webhook
  panel/             panel właściciela (HTML, CSS, JS bez frameworka)
  scripts/           import karty, dane przykładowe
  test/              testy (node:test)
```

Karta w bazie jest od pierwszego startu niezależna od `prototyp/menu.json`. Żeby nadpisać ją plikiem (zmiany z panelu przepadną): `npm run import-menu -w backend -- --force`.

## Czego nie sprawdzono

Połączenie z MySQL nie było testowane (lokalnie nie ma serwera MySQL). Wszystkie zapytania są wspólne i przetestowane na SQLite; różni się tylko schemat i składnia „upsert”. Pierwsze uruchomienie na Hostingerze trzeba sprawdzić krokiem 5 powyżej.

## Historia

Do 21.11.2026 backend przyjmował też zamówienia online (koszyk, dowóz, status zamówienia, zakładka „Zamówienia” w panelu). Funkcję usunięto; kod jest w historii gita (commit `5c81a2f`).
