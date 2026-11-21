import { test } from "node:test";
import assert from "node:assert/strict";
import { local, weekdayOf, addDays, dayHours, openStatus, reservationSlots, orderWindow, isDate } from "../src/time.js";
import { DEFAULTS } from "../src/settings.js";

const H = DEFAULTS.godziny;
const at = (s) => new Date(`${s}:00+01:00`); // czas zimowy w Polsce

test("czas lokalny liczony w strefie Europe/Warsaw, także latem", () => {
  assert.deepEqual(local(at("2026-11-23T13:05")), { date: "2026-11-23", minutes: 785, weekday: 0 });
  assert.equal(local(new Date("2026-07-01T10:00:00Z")).minutes, 12 * 60); // UTC+2
  assert.equal(local(new Date("2026-11-23T23:30:00Z")).date, "2026-11-24"); // po północy w Polsce
});

test("dni tygodnia od poniedziałku i dodawanie dni przez koniec miesiąca", () => {
  assert.equal(weekdayOf("2026-11-23"), 0);
  assert.equal(weekdayOf("2026-11-29"), 6);
  assert.equal(addDays("2026-11-30", 1), "2026-12-01");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(isDate("2026-02-30"), false);
  assert.equal(isDate("2026-02-28"), true);
});

test("status: otwarte, przed otwarciem i po zamknięciu", () => {
  assert.equal(openStatus(H, at("2026-11-23T13:00")).otwarte, true);
  const rano = openStatus(H, at("2026-11-23T09:00"));
  assert.equal(rano.otwarte, false);
  assert.deepEqual(rano.nastepneOtwarcie, { data: "2026-11-23", godzina: "12:00", kiedy: "dzis" });
  const noc = openStatus(H, at("2026-11-23T22:00"));
  assert.equal(noc.otwarte, false);
  assert.equal(noc.nastepneOtwarcie.kiedy, "jutro");
});

test("wyjątek w godzinach zamyka dzień i przesuwa następne otwarcie", () => {
  const h = { ...H, wyjatki: [{ data: "2026-12-24", zamkniete: true, notatka: "Wigilia" }, { data: "2026-12-25", zamkniete: true }] };
  assert.equal(dayHours(h, "2026-12-24").closed, true);
  const s = openStatus(h, at("2026-12-23T23:00"));
  assert.equal(s.nastepneOtwarcie.data, "2026-12-26");
  assert.equal(openStatus(h, at("2026-12-24T14:00")).notatka, "Wigilia");
});

test("terminy rezerwacji: co 30 min, ostatni godzinę przed zamknięciem, dziś z wyprzedzeniem", () => {
  const cfg = DEFAULTS.rezerwacje;
  const jutro = reservationSlots(H, cfg, "2026-11-24", at("2026-11-23T13:00"));
  assert.equal(jutro[0], "12:00");
  assert.equal(jutro.at(-1), "21:00");
  assert.equal(jutro.length, 19);
  const dzis = reservationSlots(H, cfg, "2026-11-23", at("2026-11-23T13:10"));
  assert.equal(dzis[0], "14:30"); // co najmniej 60 min od teraz
  assert.deepEqual(reservationSlots(H, cfg, "2026-11-22", at("2026-11-23T13:00")), []); // przeszłość
});

test("okno zamówień: godziny odbioru i koniec przed zamknięciem", () => {
  const cfg = DEFAULTS.zamowienia;
  const w = orderWindow(H, cfg, at("2026-11-23T13:00"));
  assert.equal(w.mozna, true);
  assert.equal(w.godziny[0], "13:45");
  assert.equal(w.godziny.at(-1), "21:45");
  assert.equal(orderWindow(H, cfg, at("2026-11-23T21:30")).powod, "po_godzinach");
  assert.equal(orderWindow(H, cfg, at("2026-11-23T11:00")).powod, "przed_otwarciem");
});
