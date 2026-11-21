import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createNotifier } from "../src/notify.js";

test("webhook dostaje czytelne powiadomienie o rezerwacji", async () => {
  const got = [];
  const srv = http.createServer((req, res) => {
    let b = "";
    req.on("data", (c) => { b += c; });
    req.on("end", () => { got.push(JSON.parse(b)); res.end("ok"); });
  });
  await new Promise((ok) => srv.listen(0, "127.0.0.1", ok));
  const n = createNotifier({ webhookUrl: `http://127.0.0.1:${srv.address().port}/hook` }, { publicUrl: "https://karczmaoberza.pl", log: { error() {} } });
  await n.reservation({ id: 3, data: "2026-11-24", godzina: "18:00", osoby: 4, rondel: true, imie: "Jan", telefon: "505111222", email: "" });
  srv.close();
  assert.equal(got[0].typ, "rezerwacja");
  assert.equal(got[0].tytul, "Nowa rezerwacja #3 — 2026-11-24 18:00, 4 os.");
  assert.match(got[0].tekst, /Rondel/);
  assert.match(got[0].tekst, /Panel: https:\/\/karczmaoberza\.pl\/panel\//);
});

test("bez konfiguracji powiadomienia nic nie robią i nie rzucają błędów", async () => {
  const n = createNotifier({}, { log: { error() { throw new Error("nie powinno logować"); } } });
  await n.reservation({ id: 1, data: "2026-11-24", godzina: "18:00", osoby: 2, rondel: false, imie: "A", telefon: "1", email: "" });
  await n.reservationStatus({ status: "potwierdzona", email: "" });
});
