import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { startTestServer, makeClock } from "./helpers.js";

let t;
beforeEach(async () => { t = await startTestServer({ clock: makeClock("2026-11-23T13:00") }); });
afterEach(async () => { await t.close(); });

const rezerwacja = (x = {}) => ({ imie: "Jan Kowalski", telefon: "505 111 222", osoby: 4, data: "2026-11-24", godzina: "18:00", jezyk: "pl", ...x });
test("status mówi, że jest otwarte, i nie zawiera już zamówień online", async () => {
  const r = await t.call("GET", "/api/status");
  assert.equal(r.status, 200);
  assert.equal(r.body.otwarte, true);
  assert.deepEqual(r.body.dzis, { od: "12:00", do: "22:00" });
  assert.equal(r.body.zamowienia, undefined);
  assert.equal(r.body.rezerwacje.online, true);
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
  assert.equal((await t.call("GET", "/api/rezerwacje/krotki")).body.blad, "zly_token");
  assert.equal((await t.call("GET", "/api/rezerwacje/" + "a".repeat(24))).status, 404);
  assert.equal((await t.call("POST", "/api/zamowienia", { typ: "wynos" })).status, 404); // zamawianie online usunięte
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
