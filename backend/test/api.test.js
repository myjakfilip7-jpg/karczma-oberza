import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { startTestServer, makeClock } from "./helpers.js";

let t;
beforeEach(async () => { t = await startTestServer({ clock: makeClock("2026-11-23T13:00") }); });
afterEach(async () => { await t.close(); });

const rezerwacja = (x = {}) => ({ imie: "Jan Kowalski", telefon: "505 111 222", osoby: 4, data: "2026-11-24", godzina: "18:00", jezyk: "pl", ...x });
const zamowienie = (x = {}) => ({
  typ: "wynos", imie: "Anna Nowak", telefon: "+48 600 700 800",
  pozycje: [{ id: "golonka-pieczona", ilosc: 1 }, { id: "kozacka", wariant: 1, ilosc: 2 }], ...x,
});

test("status mówi, że jest otwarte, i podaje okno zamówień", async () => {
  const r = await t.call("GET", "/api/status");
  assert.equal(r.status, 200);
  assert.equal(r.body.otwarte, true);
  assert.deepEqual(r.body.dzis, { od: "12:00", do: "22:00" });
  assert.equal(r.body.zamowienia.mozna, true);
  assert.equal(r.body.zamowienia.godziny[0], "13:45");
  assert.equal(r.body.komunikat, null);
  assert.equal(r.headers.get("cache-control"), "no-store");
});

test("karta: 60 pozycji, ceny w groszach, pizza w dwóch rozmiarach", async () => {
  const r = await t.call("GET", "/api/menu");
  const all = r.body.kategorie.flatMap((k) => k.pozycje);
  assert.equal(all.length, 60);
  assert.equal(r.body.wydanie, "1.11.2026");
  const pizza = all.find((p) => p.id === "kozacka");
  assert.equal(pizza.c, "36 / 46");
  assert.deepEqual(pizza.warianty.map((w) => [w.etykieta, w.cena]), [["22 cm", 3600], ["30 cm", 4600]]);
  const chrzan = all.find((p) => p.id === "chrzan-musztarda");
  assert.equal(chrzan.c, "?");
  assert.equal(chrzan.warianty[0].cena, null);
});

test("rezerwacja: zapis, powiadomienie, podgląd statusu po tokenie", async () => {
  const r = await t.call("POST", "/api/rezerwacje", rezerwacja({ rondel: true, uwagi: "Urodziny" }));
  assert.equal(r.status, 201);
  assert.equal(r.body.status, "nowa");
  assert.match(r.body.token, /^[A-Za-z0-9_-]{24}$/);
  await new Promise((ok) => setTimeout(ok, 20));
  assert.equal(t.sent.reservations.length, 1);
  assert.equal(t.sent.reservations[0].rondel, true);
  const s = await t.call("GET", `/api/rezerwacje/${r.body.token}`);
  assert.deepEqual(s.body, { status: "nowa", data: "2026-11-24", godzina: "18:00", osoby: 4, rondel: true });
  assert.equal(s.body.telefon, undefined); // podgląd nie zdradza danych osobowych
});

test("rezerwacja: walidacja pól z komunikatami po polsku i angielsku", async () => {
  const r = await t.call("POST", "/api/rezerwacje", { imie: "", telefon: "123", osoby: 0, data: "jutro", godzina: "25:00" });
  assert.equal(r.status, 400);
  assert.deepEqual(Object.keys(r.body.pola).sort(), ["data", "godzina", "imie", "osoby", "telefon"]);
  assert.match(r.body.pola.telefon, /numer telefonu/);
  const en = await t.call("POST", "/api/rezerwacje", rezerwacja({ telefon: "abc", jezyk: "en" }));
  assert.match(en.body.komunikat, /phone number/);
});

test("rezerwacja: odrzuca przeszłość, zamknięty dzień, godzinę poza grafikiem i za dużą grupę", async () => {
  assert.equal((await t.call("POST", "/api/rezerwacje", rezerwacja({ data: "2026-11-22" }))).body.blad, "termin_niedostepny");
  assert.equal((await t.call("POST", "/api/rezerwacje", rezerwacja({ godzina: "21:30" }))).body.blad, "termin_niedostepny");
  assert.equal((await t.call("POST", "/api/rezerwacje", rezerwacja({ data: "2026-11-23", godzina: "13:30" }))).body.blad, "termin_niedostepny");
  assert.equal((await t.call("POST", "/api/rezerwacje", rezerwacja({ osoby: 31 }))).body.blad, "za_duzo_osob");
  await t.repo.setSetting("godziny", { dni: Array.from({ length: 7 }, (_, i) => ({ od: "12:00", do: "22:00", zamkniete: i === 1 })), wyjatki: [] });
  assert.equal((await t.call("POST", "/api/rezerwacje", rezerwacja())).body.blad, "termin_niedostepny"); // wtorek zamknięty
});

test("rezerwacja: duplikat i limit miejsc na godzinę", async () => {
  assert.equal((await t.call("POST", "/api/rezerwacje", rezerwacja())).status, 201);
  const dup = await t.call("POST", "/api/rezerwacje", rezerwacja());
  assert.equal(dup.status, 409);
  assert.equal(dup.body.blad, "duplikat");
  await t.repo.setSetting("rezerwacje", { ...(await t.repo.getSettings()).rezerwacje, limitOsobNaGodzine: 6 });
  const full = await t.call("POST", "/api/rezerwacje", rezerwacja({ telefon: "505 333 444", osoby: 3 }));
  assert.equal(full.body.blad, "brak_miejsc");
  const terminy = await t.call("GET", "/api/rezerwacje/terminy?data=2026-11-24");
  assert.equal(terminy.body.godziny.includes("18:00"), true); // 4 z 6 miejsc zajęte, nadal można 1–2 os.
  assert.equal((await t.call("POST", "/api/rezerwacje", rezerwacja({ telefon: "505 333 444", osoby: 2 }))).status, 201);
  const pelne = await t.call("GET", "/api/rezerwacje/terminy?data=2026-11-24");
  assert.equal(pelne.body.godziny.includes("18:00"), false);
});

test("rezerwacja: limit prób z jednego adresu", async () => {
  for (let i = 0; i < 6; i++) await t.call("POST", "/api/rezerwacje", rezerwacja({ telefon: `505 000 00${i}` }));
  const r = await t.call("POST", "/api/rezerwacje", rezerwacja({ telefon: "505 000 099" }));
  assert.equal(r.status, 429);
  t.clock.advance(16 * 60e3);
  assert.equal((await t.call("POST", "/api/rezerwacje", rezerwacja({ telefon: "505 000 099" }))).status, 201);
});

test("pułapka na boty: wypełnione ukryte pole nie tworzy rezerwacji", async () => {
  const r = await t.call("POST", "/api/rezerwacje", rezerwacja({ firma: "Spam sp. z o.o." }));
  assert.equal(r.status, 201);
  assert.equal(r.body.token, null);
  assert.equal((await t.repo.reservations({})).length, 0);
});

test("zamówienie: ceny liczone z bazy, nie z przeglądarki", async () => {
  const r = await t.call("POST", "/api/zamowienia", zamowienie({ pozycje: [{ id: "golonka-pieczona", ilosc: 1, cena: 1 }, { id: "kozacka", wariant: 1, ilosc: 2 }] }));
  assert.equal(r.status, 201);
  assert.equal(r.body.suma, 6900 + 2 * 4600);
  const s = await t.call("GET", `/api/zamowienia/${r.body.token}`);
  assert.equal(s.body.status, "nowe");
  assert.deepEqual(s.body.pozycje.map((p) => [p.nazwa, p.wariant, p.ilosc, p.suma]), [["Golonka pieczona", "", 1, 6900], ["Kozacka", "30 cm", 2, 9200]]);
  await new Promise((ok) => setTimeout(ok, 20));
  assert.equal(t.sent.orders[0].suma, 16100);
});

test("zamówienie: dowóz wymaga adresu, scala powtórzone pozycje", async () => {
  const bez = await t.call("POST", "/api/zamowienia", zamowienie({ typ: "dowoz" }));
  assert.equal(bez.status, 400);
  assert.equal(bez.body.blad, "wymagane");
  assert.ok(bez.body.pola.adres);
  const r = await t.call("POST", "/api/zamowienia", zamowienie({ typ: "dowoz", adres: "ul. Zdrojowa 5, Krynica-Zdrój", pozycje: [{ id: "pierogi-ruskie", ilosc: 1 }, { id: "pierogi-ruskie", ilosc: 2 }] }));
  assert.equal(r.status, 201);
  const o = await t.repo.orderByToken(r.body.token);
  assert.equal(o.pozycje.length, 1);
  assert.equal(o.pozycje[0].ilosc, 3);
  assert.equal(o.adres, "ul. Zdrojowa 5, Krynica-Zdrój");
});

test("zamówienie: odrzuca pozycje bez ceny, niedostępne i nieistniejące", async () => {
  assert.equal((await t.call("POST", "/api/zamowienia", zamowienie({ pozycje: [{ id: "chrzan-musztarda", ilosc: 1 }] }))).body.blad, "pozycja_niedostepna");
  assert.equal((await t.call("POST", "/api/zamowienia", zamowienie({ pozycje: [{ id: "nie-ma-takiej", ilosc: 1 }] }))).body.blad, "pozycja_niedostepna");
  assert.equal((await t.call("POST", "/api/zamowienia", zamowienie({ pozycje: [{ id: "kozacka", wariant: 5, ilosc: 1 }] }))).body.blad, "pozycja_niedostepna");
  await t.repo.updateItem("golonka-pieczona", { dostepne: false });
  t.clock.advance(16 * 60e3);
  assert.equal((await t.call("POST", "/api/zamowienia", zamowienie())).body.blad, "pozycja_niedostepna");
  assert.equal((await t.call("POST", "/api/zamowienia", zamowienie({ pozycje: [] }))).body.blad, "pusty_koszyk");
  assert.equal((await t.call("POST", "/api/zamowienia", zamowienie({ pozycje: [{ id: "kozacka", ilosc: 0 }] }))).body.blad, "ilosc");
});

test("zamówienie: poza godzinami, wstrzymane, wyłączony dowóz, godzina spoza listy, minimum", async () => {
  t.clock.set("2026-11-23T21:40");
  assert.equal((await t.call("POST", "/api/zamowienia", zamowienie())).body.blad, "poza_godzinami");
  t.clock.set("2026-11-23T13:00");
  const s = await t.repo.getSettings();
  await t.repo.setSetting("zamowienia", { ...s.zamowienia, wstrzymane: true });
  const w = await t.call("POST", "/api/zamowienia", zamowienie());
  assert.equal(w.status, 409);
  assert.equal(w.body.blad, "zamowienia_wstrzymane");
  await t.repo.setSetting("zamowienia", { ...s.zamowienia, minimumZl: 100 });
  await t.repo.setSetting("dowoz", { ...s.dowoz, aktywny: false });
  assert.equal((await t.call("POST", "/api/zamowienia", zamowienie({ typ: "dowoz", adres: "ul. Zdrojowa 5" }))).body.blad, "dowoz_wylaczony");
  await t.repo.setSetting("dowoz", { ...s.dowoz, aktywny: true });
  assert.equal((await t.call("POST", "/api/zamowienia", zamowienie({ typ: "dowoz", adres: "ul. Zdrojowa 5", pozycje: [{ id: "pierogi-ruskie", ilosc: 1 }] }))).body.blad, "minimum");
  assert.equal((await t.call("POST", "/api/zamowienia", zamowienie({ godzina: "13:00" }))).body.blad, "termin_niedostepny");
  t.clock.advance(16 * 60e3);
  assert.equal((await t.call("POST", "/api/zamowienia", zamowienie({ godzina: "15:00" }))).status, 201);
});

test("opłata za dowóz trafia do zamówienia jako osobna pozycja", async () => {
  const s = await t.repo.getSettings();
  await t.repo.setSetting("dowoz", { ...s.dowoz, oplataZl: 10 });
  const r = await t.call("POST", "/api/zamowienia", zamowienie({ typ: "dowoz", adres: "ul. Zdrojowa 5", pozycje: [{ id: "pierogi-ruskie", ilosc: 1 }] }));
  assert.equal(r.body.suma, 4100 + 1000);
});

test("żądania z obcej strony są blokowane", async () => {
  const r = await t.call("POST", "/api/rezerwacje", rezerwacja(), { headers: { origin: "https://zla-strona.example" } });
  assert.equal(r.status, 403);
  assert.equal(r.body.blad, "niedozwolone_zrodlo");
  const ok = await t.call("POST", "/api/rezerwacje", rezerwacja(), { headers: { origin: t.base } });
  assert.equal(ok.status, 201);
});

test("zły JSON, nieznany adres API i zły token dają czytelne błędy", async () => {
  const bad = await fetch(t.base + "/api/rezerwacje", { method: "POST", headers: { "content-type": "application/json" }, body: "{" });
  assert.equal(bad.status, 400);
  assert.equal((await t.call("GET", "/api/nie-ma")).status, 404);
  assert.equal((await t.call("GET", "/api/zamowienia/krotki")).body.blad, "zly_token");
  assert.equal((await t.call("GET", "/api/zamowienia/" + "a".repeat(24))).status, 404);
});

test("strona i grafiki są serwowane, pliki źródłowe nie", async () => {
  const home = await t.call("GET", "/");
  assert.equal(home.status, 200);
  assert.match(home.text, /Karczma Oberża/);
  assert.equal((await t.call("GET", "/en/karta.html")).status, 200);
  assert.equal((await t.call("GET", "/assets/haft.svg")).status, 200);
  assert.equal((await t.call("GET", "/build.py")).status, 404);
  const panel = await t.call("GET", "/panel/");
  assert.equal(panel.status, 200);
  assert.match(panel.headers.get("content-security-policy"), /frame-ancestors 'none'/);
});

test("komunikat pokazuje się do wskazanej daty", async () => {
  await t.repo.setSetting("komunikat", { tekst: "W Wigilię nieczynne", tekst_en: "", do: "2026-11-24" });
  assert.deepEqual((await t.call("GET", "/api/status")).body.komunikat, { tekst: "W Wigilię nieczynne", tekst_en: "W Wigilię nieczynne" });
  t.clock.set("2026-11-25T13:00");
  assert.equal((await t.call("GET", "/api/status")).body.komunikat, null);
});
