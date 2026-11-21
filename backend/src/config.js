// Konfiguracja z zmiennych środowiskowych. Opis każdej zmiennej: .env.example
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const TU = path.dirname(fileURLToPath(import.meta.url));
export const BACKEND_DIR = path.resolve(TU, "..");
export const REPO_DIR = path.resolve(BACKEND_DIR, "..");

// Prosty loader pliku .env (bez zależności). Nie nadpisuje zmiennych już ustawionych.
export function loadDotEnv(file = path.join(BACKEND_DIR, ".env")) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith("#")) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}

const int = (v, d) => (v === undefined || v === "" || Number.isNaN(Number(v)) ? d : Number(v));

export function readConfig(env = process.env) {
  const production = env.NODE_ENV === "production";
  return {
    production,
    port: int(env.PORT, 3000),
    // Baza: DATABASE_URL=mysql://... (Hostinger) albo plik SQLite w DATA_DIR.
    databaseUrl: env.DATABASE_URL || "",
    dataDir: path.resolve(BACKEND_DIR, env.DATA_DIR || "data"),
    siteDir: path.resolve(BACKEND_DIR, env.SITE_DIR || "../prototyp"),
    assetsDir: path.resolve(BACKEND_DIR, env.ASSETS_DIR || "../assets"),
    panelDir: path.resolve(BACKEND_DIR, "panel"),
    menuSeedFile: path.resolve(BACKEND_DIR, env.MENU_SEED || "../prototyp/menu.json"),
    panelPassword: env.PANEL_PASSWORD || "",
    panelSecret: env.PANEL_SECRET || "",
    // Ile pośredników (proxy) przed aplikacją. Na Hostingerze 1, lokalnie bez znaczenia.
    trustProxy: int(env.TRUST_PROXY, 1),
    // Dodatkowe dozwolone źródła żądań POST, np. https://karczmaoberza.pl (oddzielone przecinkami).
    allowedOrigins: (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean),
    // Po ilu dniach usuwać dane osobowe z zamówień i rezerwacji (0 = nigdy).
    retentionDays: int(env.RETENTION_DAYS, 180),
    notify: {
      email: env.NOTIFY_EMAIL || "",
      smtpHost: env.SMTP_HOST || "",
      smtpPort: int(env.SMTP_PORT, 465),
      smtpUser: env.SMTP_USER || "",
      smtpPass: env.SMTP_PASS || "",
      smtpFrom: env.SMTP_FROM || env.SMTP_USER || "",
      webhookUrl: env.NOTIFY_WEBHOOK_URL || "",
    },
    publicUrl: (env.PUBLIC_URL || "").replace(/\/$/, ""),
  };
}
