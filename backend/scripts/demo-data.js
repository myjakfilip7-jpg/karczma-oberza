// Przykładowe rezerwacje do obejrzenia panelu lokalnie.
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
const today = local(new Date()).date;
await repo.createReservation({ imie: "Jan Przykładowy", telefon: "600 000 003", email: "", osoby: 4, data: addDays(today, 1), godzina: "18:00", uwagi: "Urodziny, poproszę stolik przy kominku.", rondel: true, jezyk: "pl" });
await repo.createReservation({ imie: "Maria Przykładowa", telefon: "600 000 004", email: "", osoby: 2, data: addDays(today, 1), godzina: "19:30", uwagi: "", rondel: false, jezyk: "pl" });
const r = await repo.createReservation({ imie: "Guest Example", telefon: "+49 151 0000000", email: "", osoby: 6, data: addDays(today, 2), godzina: "13:00", uwagi: "", rondel: false, jezyk: "en" });
await repo.updateReservation(r.rezerwacja.id, { status: "potwierdzona" });
console.log("Dodano 3 przykładowe rezerwacje.");
await db.close();
