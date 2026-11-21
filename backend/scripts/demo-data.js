// Przykładowe zamówienia i rezerwacje do obejrzenia panelu lokalnie.
// Działa tylko na lokalnej bazie SQLite — nigdy na produkcji.
//   node scripts/demo-data.js
import { loadDotEnv, readConfig } from "../src/config.js";
import { openDb } from "../src/db/index.js";
import { createRepo } from "../src/repo.js";
import { local, addDays } from "../src/time.js";

loadDotEnv();
const config = readConfig();
if (config.production || config.databaseUrl) {
  console.error("Dane przykładowe tylko lokalnie (bez NODE_ENV=production i bez DATABASE_URL).");
  process.exit(1);
}
const db = await openDb(config);
const repo = createRepo(db);
const it = async (id, ilosc, w = 0) => {
  const p = await repo.item(id);
  const c = p.ceny[w];
  return { id, nazwa: p.nazwa, nazwa_en: p.nazwa_en, wariant: c.etykieta, wariant_en: c.etykieta_en, ilosc, cena: c.cena, suma: c.cena * ilosc };
};
const order = async (d) => {
  const pozycje = await Promise.all(d.pozycje);
  return repo.createOrder({ ...d, pozycje, suma: pozycje.reduce((a, p) => a + p.suma, 0), jezyk: d.jezyk || "pl" });
};
const a = await order({ typ: "dowoz", imie: "Anna Przykładowa", telefon: "600 000 001", adres: "ul. Zdrojowa 1 (przykład)", uwagi: "Domofon nie działa, proszę dzwonić.", pozycje: [it("golonka-pieczona", 1), it("kwasnica-standardowa", 2), it("kozacka", 1, 1)] });
await order({ typ: "wynos", imie: "Piotr Przykładowy", telefon: "600 000 002", godzina: "18:30", pozycje: [it("pierogi-ruskie", 2), it("zurek-w-chlebie", 1)] });
const c = await order({ typ: "dowoz", imie: "Tourist Example", telefon: "+44 7700 900000", adres: "Hotel przy deptaku (przykład)", jezyk: "en", pozycje: [it("rondel-glodnego-chlopa", 1)] });
await repo.updateOrder(c.id, { status: "przyjete", eta: 60 });
const today = local(new Date()).date;
await repo.createReservation({ imie: "Jan Przykładowy", telefon: "600 000 003", email: "", osoby: 4, data: addDays(today, 1), godzina: "18:00", uwagi: "Urodziny, poproszę stolik przy kominku.", rondel: true, jezyk: "pl" });
await repo.createReservation({ imie: "Maria Przykładowa", telefon: "600 000 004", email: "", osoby: 2, data: addDays(today, 1), godzina: "19:30", uwagi: "", rondel: false, jezyk: "pl" });
const r = await repo.createReservation({ imie: "Guest Example", telefon: "+49 151 0000000", email: "", osoby: 6, data: addDays(today, 2), godzina: "13:00", uwagi: "", rondel: false, jezyk: "en" });
await repo.updateReservation(r.rezerwacja.id, { status: "potwierdzona" });
console.log(`Dodano przykładowe dane (zamówienie #${a.id} i kolejne, 3 rezerwacje).`);
await db.close();
