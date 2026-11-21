// Wspólne narzędzia testów: świeża baza SQLite w pamięci, sterowany zegar, serwer na losowym porcie.
import fs from "node:fs";
import { readConfig } from "../src/config.js";
import { openDb } from "../src/db/index.js";
import { createApp } from "../src/app.js";

export const PASSWORD = "test-haslo-123";

/** Zegar ustawiany w czasie polskim, np. clock.set("2026-11-23T13:00") = poniedziałek 13:00 w Krynicy. */
export function makeClock(start = "2026-11-23T13:00") {
  let t;
  const clock = {
    set(localIso) { t = new Date(`${localIso}:00+01:00`); }, // listopad–marzec: UTC+1
    advance(ms) { t = new Date(t.getTime() + ms); },
    now: () => new Date(t),
  };
  clock.set(start);
  return clock;
}

export async function startTestServer({ clock = makeClock(), env = {} } = {}) {
  const config = {
    ...readConfig({ PANEL_PASSWORD: PASSWORD, PANEL_SECRET: "sekret-testowy", ...env }),
    sqliteFile: ":memory:",
  };
  const db = await openDb(config);
  const sent = { reservations: [], statuses: [] };
  const notify = { reservation: async (r) => sent.reservations.push(r), reservationStatus: async (r) => sent.statuses.push(r) };
  const quiet = { error() {}, log() {}, warn() {} };
  const { app, repo } = createApp({ db, config, now: clock.now, notify, log: quiet });
  await repo.importMenu(JSON.parse(fs.readFileSync(config.menuSeedFile, "utf8")));
  const server = await new Promise((ok) => { const s = app.listen(0, "127.0.0.1", () => ok(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;

  let cookie = "";
  async function call(method, path, body, { headers = {}, auth = false } = {}) {
    const res = await fetch(base + path, {
      method,
      headers: { ...(body !== undefined ? { "content-type": "application/json" } : {}), ...(auth && cookie ? { cookie } : {}), ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get("set-cookie");
    if (set && auth) cookie = set.split(";")[0];
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* nie JSON */ }
    return { status: res.status, body: json, text, headers: res.headers };
  }
  async function login() {
    const r = await call("POST", "/api/panel/login", { haslo: PASSWORD }, { auth: true });
    if (r.status !== 200) throw new Error("login nieudany: " + r.status);
  }
  async function close() { server.closeAllConnections(); await new Promise((ok) => server.close(ok)); await db.close(); }
  return { base, call, login, close, repo, clock, sent, db };
}
