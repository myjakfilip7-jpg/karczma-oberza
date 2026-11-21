// Start aplikacji: konfiguracja → baza → (pierwsze uruchomienie: import karty) → serwer HTTP.
import fs from "node:fs";
import { loadDotEnv, readConfig } from "./config.js";
import { openDb } from "./db/index.js";
import { createApp } from "./app.js";
import { createNotifier } from "./notify.js";

loadDotEnv();
const config = readConfig();

if (config.production && !config.panelPassword) console.warn("[uwaga] Brak PANEL_PASSWORD — panel nikogo nie wpuści.");
if (config.production && !config.panelSecret) console.warn("[uwaga] Brak PANEL_SECRET — sesje panelu podpisywane hasłem. Ustaw losowy sekret.");

const db = await openDb(config);
const notify = createNotifier(config.notify, { publicUrl: config.publicUrl });
const { app, repo } = createApp({ db, config, notify });

if (await repo.menuIsEmpty()) {
  if (fs.existsSync(config.menuSeedFile)) {
    const r = await repo.importMenu(JSON.parse(fs.readFileSync(config.menuSeedFile, "utf8")));
    console.log(`[karta] Pierwsze uruchomienie: wczytano ${r.pozycje} pozycji w ${r.kategorie} kategoriach.`);
  } else console.warn(`[karta] Pusta baza i brak pliku ${config.menuSeedFile}.`);
}

async function purge() {
  try {
    const r = await repo.purgePersonalData(config.retentionDays);
    if (r.rezerwacje) console.log(`[rodo] Usunięto dane osobowe z ${r.rezerwacje} rezerwacji starszych niż ${config.retentionDays} dni.`);
  } catch (e) { console.error("[rodo]", e.message); }
}
await purge();
const purgeTimer = setInterval(purge, 12 * 3600e3);
purgeTimer.unref();

const server = app.listen(config.port, () => {
  console.log(`[serwer] Karczma Oberża działa na http://localhost:${config.port} (baza: ${db.dialect})`);
});

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    server.close(async () => { await db.close(); process.exit(0); });
    setTimeout(() => process.exit(0), 5000).unref();
  });
}
