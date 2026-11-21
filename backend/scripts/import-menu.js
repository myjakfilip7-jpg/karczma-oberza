// Wczytuje kartę z pliku menu.json do bazy.
//   npm run import-menu            — tylko gdy baza jest pusta
//   npm run import-menu -- --force — zastępuje obecną kartę (zmiany z panelu przepadną)
//   npm run import-menu -- --force sciezka/do/menu.json
import fs from "node:fs";
import path from "node:path";
import { loadDotEnv, readConfig } from "../src/config.js";
import { openDb } from "../src/db/index.js";
import { createRepo } from "../src/repo.js";

loadDotEnv();
const config = readConfig();
const args = process.argv.slice(2);
const force = args.includes("--force");
const file = path.resolve(args.find((a) => !a.startsWith("--")) || config.menuSeedFile);

const db = await openDb(config);
const repo = createRepo(db);
const r = await repo.importMenu(JSON.parse(fs.readFileSync(file, "utf8")), { force });
console.log(r.pominieto
  ? "Baza ma już kartę — nic nie zmieniono. Użyj --force, żeby ją zastąpić."
  : `Wczytano ${r.pozycje} pozycji w ${r.kategorie} kategoriach z ${file}.`);
await db.close();
