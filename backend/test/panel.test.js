import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { startTestServer, makeClock, PASSWORD } from "./helpers.js";

let t;
beforeEach(async () => { t = await startTestServer({ clock: makeClock("2026-11-23T13:00") }); });
afterEach(async () => { await t.close(); });

test("panel bez logowania nic nie zdradza", async () => {
  for (const p of ["/api/panel/rezerwacje", "/api/panel/menu", "/api/panel/ustawienia", "/api/panel/podsumowanie"]) {
    const r = await t.call("GET", p);
    assert.equal(r.status, 401, p);
    assert.equal(r.body.blad, "brak_sesji");
  }
  assert.equal((await t.call("GET", "/api/panel/sesja", undefined, { headers: { cookie: "oberza_panel=9999999999.podrobione" } })).status, 401);
});

test("logowanie: ciasteczko httpOnly i SameSite=Strict, wylogowanie, wygaśnięcie po 12 h", async () => {
  const r = await t.call("POST", "/api/panel/login", { haslo: PASSWORD }, { auth: true });
  assert.equal(r.status, 200);
  const c = r.headers.get("set-cookie");
  assert.match(c, /HttpOnly/);
  assert.match(c, /SameSite=Strict/);
  assert.equal((await t.call("GET", "/api/panel/sesja", undefined, { auth: true })).status, 200);
  t.clock.advance(12 * 3600e3 + 1000);
  assert.equal((await t.call("GET", "/api/panel/sesja", undefined, { auth: true })).status, 401);
});

test("blokada po 5 złych hasłach z jednego adresu na 15 minut", async () => {
  for (let i = 0; i < 5; i++) assert.equal((await t.call("POST", "/api/panel/login", { haslo: "zle" })).status, 401);
  assert.equal((await t.call("POST", "/api/panel/login", { haslo: PASSWORD })).status, 429);
  t.clock.advance(15 * 60e3 + 1000);
  assert.equal((await t.call("POST", "/api/panel/login", { haslo: PASSWORD })).status, 200);
});

test("bez PANEL_PASSWORD panel odmawia logowania", async () => {
  const u = await startTestServer({ env: { PANEL_PASSWORD: "" } });
  try {
    const r = await u.call("POST", "/api/panel/login", { haslo: "" });
    assert.equal(r.status, 503);
    assert.equal(r.body.blad, "brak_hasla");
  } finally { await u.close(); }
});

test("obsługa rezerwacji: potwierdzenie widać w podglądzie gościa", async () => {
  const r = await t.call("POST", "/api/rezerwacje", { imie: "Jan", telefon: "505111222", osoby: 2, data: "2026-11-24", godzina: "19:00" });
  await t.login();
  const lista = await t.call("GET", "/api/panel/rezerwacje", undefined, { auth: true });
  assert.equal(lista.body.length, 1);
  await t.call("PATCH", `/api/panel/rezerwacje/${lista.body[0].id}`, { status: "potwierdzona", notatka: "stolik przy kominku" }, { auth: true });
  assert.equal((await t.call("GET", `/api/rezerwacje/${r.body.token}`)).body.status, "potwierdzona");
  await new Promise((ok) => setTimeout(ok, 20));
  assert.deepEqual(t.sent.statuses.map((x) => x.status), ["potwierdzona"]);
  assert.equal((await t.call("GET", "/api/panel/rezerwacje?od=2026-11-25", undefined, { auth: true })).body.length, 0);
});

test("karta z panelu: cena, dostępność, ukrycie, nowa pozycja, usunięcie", async () => {
  await t.login();
  const p = await t.call("PATCH", "/api/panel/menu/pozycje/golonka-pieczona", { ceny: [{ etykieta: "", cena: 7200 }], dostepne: false }, { auth: true });
  assert.equal(p.status, 200);
  let menu = (await t.call("GET", "/api/menu")).body;
  let golonka = menu.kategorie.flatMap((k) => k.pozycje).find((x) => x.id === "golonka-pieczona");
  assert.equal(golonka.c, "72");
  assert.equal(golonka.dostepne, false);
  assert.match(menu.wydanie, /^23\.11\.2026$/);
  await t.call("PATCH", "/api/panel/menu/pozycje/golonka-pieczona", { ukryte: true }, { auth: true });
  menu = (await t.call("GET", "/api/menu")).body;
  assert.equal(menu.kategorie.flatMap((k) => k.pozycje).some((x) => x.id === "golonka-pieczona"), false);
  const n = await t.call("POST", "/api/panel/menu/pozycje", { kategoria: "zupy", nazwa: "Żurek śląski", nazwa_en: "Silesian sour rye soup", ceny: [{ etykieta: "", cena: 2950 }] }, { auth: true });
  assert.equal(n.status, 201);
  assert.equal(n.body.id, "zurek-slaski");
  menu = (await t.call("GET", "/api/menu")).body;
  assert.equal(menu.kategorie.find((k) => k.id === "zupy").pozycje.at(-1).c, "29,50");
  assert.equal((await t.call("POST", "/api/panel/menu/pozycje", { kategoria: "nie-ma", nazwa: "X", ceny: [{ cena: 100 }] }, { auth: true })).status, 400);
  assert.equal((await t.call("PATCH", "/api/panel/menu/pozycje/zurek-slaski", { ceny: [{ cena: -5 }] }, { auth: true })).status, 400);
  assert.equal((await t.call("DELETE", "/api/panel/menu/pozycje/zurek-slaski", undefined, { auth: true })).status, 200);
  assert.equal((await t.call("DELETE", "/api/panel/menu/pozycje/zurek-slaski", undefined, { auth: true })).status, 404);
});

test("ustawienia: zapis godzin z wyjątkiem i odrzucanie złych danych", async () => {
  await t.login();
  const dni = Array.from({ length: 7 }, () => ({ od: "12:00", do: "22:00", zamkniete: false }));
  const ok = await t.call("PUT", "/api/panel/ustawienia/godziny", { dni, wyjatki: [{ data: "2026-11-24", zamkniete: true, notatka: "Impreza zamknięta" }] }, { auth: true });
  assert.equal(ok.status, 200);
  const st = await t.call("GET", "/api/rezerwacje/terminy?data=2026-11-24");
  assert.equal(st.body.zamkniete, true);
  assert.deepEqual(st.body.godziny, []);
  dni[0] = { od: "22:00", do: "12:00", zamkniete: false };
  assert.equal((await t.call("PUT", "/api/panel/ustawienia/godziny", { dni, wyjatki: [] }, { auth: true })).status, 400);
  assert.equal((await t.call("PUT", "/api/panel/ustawienia/karta", { wydanie: "x" }, { auth: true })).status, 404);
  const r = await t.call("PUT", "/api/panel/ustawienia/rezerwacje", { online: true, maksOsob: 9999, limitOsobNaGodzine: 20 }, { auth: true });
  assert.equal(r.body.maksOsob, 30); // wartość spoza zakresu wraca do domyślnej
  assert.equal(r.body.limitOsobNaGodzine, 20);
  assert.equal((await t.call("PUT", "/api/panel/ustawienia/zamowienia", { online: true }, { auth: true })).status, 404);
});

test("RODO: dane osobowe znikają po okresie przechowywania, termin i liczba osób zostają", async () => {
  await t.call("POST", "/api/rezerwacje", { imie: "Anna", telefon: "600700800", email: "anna@example.com", osoby: 3, data: "2026-11-24", godzina: "18:00" });
  t.clock.advance(181 * 864e5);
  const r = await t.repo.purgePersonalData(180);
  assert.equal(r.rezerwacje, 1);
  const [x] = await t.repo.reservations({});
  assert.equal(x.telefon, "—");
  assert.equal(x.email, "");
  assert.equal(x.osoby, 3);
});
