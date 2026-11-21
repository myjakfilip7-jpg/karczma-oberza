import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createNotifier } from "../src/notify.js";

test("webhook dostaje czytelne powiadomienie o zamówieniu i rezerwacji", async () => {
  const got = [];
  const srv = http.createServer((req, res) => {
    let b = "";
    req.on("data", (c) => { b += c; });
    req.on("end", () => { got.push(JSON.parse(b)); res.end("ok"); });
  });
  await new Promise((ok) => srv.listen(0, "127.0.0.1", ok));
  const n = createNotifier({ webhookUrl: `http://127.0.0.1:${srv.address().port}/hook` }, { publicUrl: "https://karczmaoberza.pl", log: { error() {} } });
  await n.order({ id: 5, typ: "dowoz", godzina: "", imie: "Anna", telefon: "600700800", adres: "ul. Zdrojowa 5", uwagi: "Bez cebuli", suma: 16100,
    pozycje: [{ nazwa: "Golonka pieczona", wariant: "", ilosc: 1, suma: 6900 }, { nazwa: "Kozacka", wariant: "30 cm", ilosc: 2, suma: 9200 }] });
  await n.reservation({ id: 3, data: "2026-11-24", godzina: "18:00", osoby: 4, rondel: true, imie: "Jan", telefon: "505111222", email: "" });
  srv.close();
  assert.equal(got[0].typ, "zamowienie");
  assert.equal(got[0].tytul, "Nowe zamówienie #5 — 161 zł");
  assert.match(got[0].tekst, /DOWÓZ · jak najszybciej/);
  assert.match(got[0].tekst, /2 × Kozacka \(30 cm\) — 92 zł/);
  assert.match(got[0].tekst, /Uwagi: Bez cebuli/);
  assert.match(got[0].tekst, /Panel: https:\/\/karczmaoberza\.pl\/panel\//);
  assert.equal(got[1].tytul, "Nowa rezerwacja #3 — 2026-11-24 18:00, 4 os.");
  assert.match(got[1].tekst, /Rondel/);
});

test("bez konfiguracji powiadomienia nic nie robią i nie rzucają błędów", async () => {
  const n = createNotifier({}, { log: { error() { throw new Error("nie powinno logować"); } } });
  await n.order({ id: 1, typ: "wynos", imie: "A", telefon: "1", suma: 100, pozycje: [] });
  await n.reservationStatus({ status: "potwierdzona", email: "" });
});
