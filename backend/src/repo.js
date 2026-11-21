// Dostęp do danych: karta, ustawienia, rezerwacje, zamówienia. Zapytania wspólne dla SQLite i MySQL.
import { randomBytes } from "node:crypto";
import { DEFAULTS } from "./settings.js";

export const ORDER_STATUSES = ["nowe", "przyjete", "w_drodze", "gotowe", "zrealizowane", "odrzucone"];
export const RES_STATUSES = ["nowa", "potwierdzona", "odrzucona", "anulowana"];
const ACTIVE_RES = ["nowa", "potwierdzona"];

const token = () => randomBytes(18).toString("base64url");
const PL = { ą: "a", ć: "c", ę: "e", ł: "l", ń: "n", ó: "o", ś: "s", ź: "z", ż: "z" };
export const slugify = (s) =>
  String(s).toLowerCase().replace(/[ąćęłńóśźż]/g, (c) => PL[c]).normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "pozycja";

/** „26 / 36” → [2600, 3600]; „?” → [null]. */
export function parsePrices(c) {
  return String(c ?? "").split("/").map((p) => {
    const n = Number(p.trim().replace(",", "."));
    return p.trim() && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
  });
}

/** 2950 → „29,50”, 2600 → „26”. */
export const zl = (gr) => (gr % 100 === 0 ? String(gr / 100) : (gr / 100).toFixed(2).replace(".", ","));

const itemFromRow = (r) => ({
  id: r.id,
  kategoria: r.category_id,
  pozycja: Number(r.position),
  nazwa: r.name,
  nazwa_en: r.name_en || "",
  opis: r.description || "",
  opis_en: r.description_en || "",
  porcja: r.portion || "",
  porcja_en: r.portion_en || "",
  ceny: JSON.parse(r.prices),
  dostepne: Boolean(Number(r.available)),
  ukryte: Boolean(Number(r.hidden)),
});

const resFromRow = (r) => r && ({
  id: Number(r.id), token: r.token, utworzono: r.created_at, zmieniono: r.updated_at,
  data: r.date, godzina: r.time, osoby: Number(r.people), imie: r.name, telefon: r.phone,
  email: r.email || "", uwagi: r.note || "", rondel: Boolean(Number(r.rondel)), jezyk: r.lang,
  status: r.status, notatka: r.staff_note || "",
});

const orderFromRow = (r) => r && ({
  id: Number(r.id), token: r.token, utworzono: r.created_at, zmieniono: r.updated_at,
  typ: r.type, imie: r.name, telefon: r.phone, adres: r.address || "", uwagi: r.note || "",
  godzina: r.desired_time || "", pozycje: JSON.parse(r.items), suma: Number(r.total), jezyk: r.lang,
  status: r.status, eta: r.eta_minutes == null ? null : Number(r.eta_minutes), notatka: r.staff_note || "",
});

export function createRepo(db, { now = () => new Date() } = {}) {
  const iso = () => now().toISOString();

  // ── ustawienia ──
  async function getSettings() {
    const rows = await db.all("SELECT name, data FROM settings");
    const out = structuredClone(DEFAULTS);
    for (const r of rows) {
      if (!(r.name in out)) continue;
      try { out[r.name] = { ...out[r.name], ...JSON.parse(r.data) }; } catch { /* zostaje domyślne */ }
    }
    return out;
  }
  const setSetting = (name, value, h = db) => h.upsertSetting(name, JSON.stringify(value), iso());

  // ── karta ──
  async function menu({ includeHidden = false } = {}) {
    const cats = await db.all("SELECT * FROM menu_categories ORDER BY position, id");
    const items = (await db.all("SELECT * FROM menu_items ORDER BY position, id")).map(itemFromRow);
    return cats.map((c) => ({
      id: c.id, pozycja: Number(c.position), nazwa: c.name, nazwa_en: c.name_en || "", uwaga: c.note || "", uwaga_en: c.note_en || "",
      pozycje: items.filter((i) => i.kategoria === c.id && (includeHidden || !i.ukryte)),
    }));
  }

  async function item(id) {
    const r = await db.get("SELECT * FROM menu_items WHERE id = ?", [id]);
    return r ? itemFromRow(r) : null;
  }

  async function menuIsEmpty() {
    const r = await db.get("SELECT COUNT(*) AS n FROM menu_categories");
    return Number(r.n) === 0;
  }

  async function touchMenu(h = db) {
    const d = now();
    const wydanie = new Intl.DateTimeFormat("pl-PL", { timeZone: "Europe/Warsaw", day: "numeric", month: "numeric", year: "numeric" }).format(d);
    await setSetting("karta", { wydanie }, h);
  }

  /** Wczytuje kartę w formacie prototyp/menu.json. force = najpierw usuwa obecną. */
  async function importMenu(json, { force = false } = {}) {
    return db.tx(async (h) => {
      const existing = await h.get("SELECT COUNT(*) AS n FROM menu_categories");
      if (Number(existing.n) > 0 && !force) return { pominieto: true };
      if (force) { await h.run("DELETE FROM menu_items"); await h.run("DELETE FROM menu_categories"); }
      const used = new Set();
      let n = 0;
      for (const [ci, k] of json.kategorie.entries()) {
        await h.run("INSERT INTO menu_categories (id, position, name, name_en, note, note_en) VALUES (?, ?, ?, ?, ?, ?)",
          [k.id, ci, k.nazwa, k.nazwa_en, k.uwaga, k.uwaga_en]);
        for (const [pi, p] of k.pozycje.entries()) {
          let id = slugify(p.n);
          for (let i = 2; used.has(id); i++) id = `${slugify(p.n)}-${i}`;
          used.add(id);
          const ceny = parsePrices(p.c);
          const sizes = k.id === "pizza" && ceny.length === 2 ? ["22 cm", "30 cm"] : null;
          const warianty = ceny.map((cena, i) => ({
            etykieta: sizes ? sizes[i] : ceny.length > 1 ? `wariant ${i + 1}` : "",
            etykieta_en: sizes ? sizes[i] : ceny.length > 1 ? `option ${i + 1}` : "",
            cena,
          }));
          await h.run(
            "INSERT INTO menu_items (id, category_id, position, name, name_en, description, description_en, portion, portion_en, prices, available, hidden, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?)",
            [id, k.id, pi, p.n, p.n_en, p.o, p.o_en, p.g, p.g_en, JSON.stringify(warianty), iso()],
          );
          n++;
        }
      }
      await setSetting("karta", { wydanie: json.wydanie || "" }, h);
      return { kategorie: json.kategorie.length, pozycje: n };
    });
  }

  async function updateItem(id, patch) {
    const map = { nazwa: "name", nazwa_en: "name_en", opis: "description", opis_en: "description_en", porcja: "portion", porcja_en: "portion_en", pozycja: "position", kategoria: "category_id" };
    const sets = [];
    const vals = [];
    for (const [k, col] of Object.entries(map)) if (k in patch) { sets.push(`${col} = ?`); vals.push(patch[k]); }
    if ("ceny" in patch) { sets.push("prices = ?"); vals.push(JSON.stringify(patch.ceny)); }
    if ("dostepne" in patch) { sets.push("available = ?"); vals.push(patch.dostepne ? 1 : 0); }
    if ("ukryte" in patch) { sets.push("hidden = ?"); vals.push(patch.ukryte ? 1 : 0); }
    if (!sets.length) return item(id);
    sets.push("updated_at = ?");
    vals.push(iso(), id);
    const r = await db.run(`UPDATE menu_items SET ${sets.join(", ")} WHERE id = ?`, vals);
    if (!r.changes) return null;
    await touchMenu();
    return item(id);
  }

  async function createItem(d) {
    const cat = await db.get("SELECT id FROM menu_categories WHERE id = ?", [d.kategoria]);
    if (!cat) return null;
    let id = slugify(d.nazwa);
    for (let i = 2; await db.get("SELECT id FROM menu_items WHERE id = ?", [id]); i++) id = `${slugify(d.nazwa)}-${i}`;
    const last = await db.get("SELECT MAX(position) AS m FROM menu_items WHERE category_id = ?", [d.kategoria]);
    await db.run(
      "INSERT INTO menu_items (id, category_id, position, name, name_en, description, description_en, portion, portion_en, prices, available, hidden, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [id, d.kategoria, last?.m == null ? 0 : Number(last.m) + 1, d.nazwa, d.nazwa_en, d.opis, d.opis_en, d.porcja, d.porcja_en, JSON.stringify(d.ceny), d.dostepne !== false, Boolean(d.ukryte), iso()],
    );
    await touchMenu();
    return item(id);
  }

  async function deleteItem(id) {
    const r = await db.run("DELETE FROM menu_items WHERE id = ?", [id]);
    if (r.changes) await touchMenu();
    return r.changes > 0;
  }

  // ── rezerwacje ──
  async function reservedPeople(date, time, h = db) {
    const r = await h.get(`SELECT COALESCE(SUM(people), 0) AS n FROM reservations WHERE date = ? AND time = ? AND status IN ('nowa', 'potwierdzona')`, [date, time]);
    return Number(r.n);
  }

  async function createReservation(d, { limit = 0 } = {}) {
    return db.tx(async (h) => {
      const dup = await h.get(`SELECT id FROM reservations WHERE phone = ? AND date = ? AND time = ? AND status IN ('nowa', 'potwierdzona')`, [d.telefon, d.data, d.godzina]);
      if (dup) return { blad: "duplikat" };
      if (limit > 0 && (await reservedPeople(d.data, d.godzina, h)) + d.osoby > limit) return { blad: "brak_miejsc" };
      const t = token();
      const r = await h.run(
        "INSERT INTO reservations (token, created_at, date, time, people, name, phone, email, note, rondel, lang, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'nowa')",
        [t, iso(), d.data, d.godzina, d.osoby, d.imie, d.telefon, d.email || null, d.uwagi || null, d.rondel, d.jezyk],
      );
      return { rezerwacja: resFromRow(await h.get("SELECT * FROM reservations WHERE id = ?", [r.id])) };
    });
  }

  const reservationByToken = async (t) => resFromRow(await db.get("SELECT * FROM reservations WHERE token = ?", [t]));
  const reservation = async (id) => resFromRow(await db.get("SELECT * FROM reservations WHERE id = ?", [id]));

  async function reservations({ od, doo, status } = {}) {
    const where = [];
    const p = [];
    if (od) { where.push("date >= ?"); p.push(od); }
    if (doo) { where.push("date <= ?"); p.push(doo); }
    if (status) { where.push("status = ?"); p.push(status); }
    const rows = await db.all(`SELECT * FROM reservations ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY date, time, id LIMIT 500`, p);
    return rows.map(resFromRow);
  }

  async function updateReservation(id, { status, notatka }) {
    const sets = ["updated_at = ?"];
    const p = [iso()];
    if (status) { sets.push("status = ?"); p.push(status); }
    if (notatka !== undefined) { sets.push("staff_note = ?"); p.push(notatka); }
    p.push(id);
    const r = await db.run(`UPDATE reservations SET ${sets.join(", ")} WHERE id = ?`, p);
    return r.changes ? reservation(id) : null;
  }

  // ── zamówienia ──
  async function createOrder(d) {
    const t = token();
    const r = await db.run(
      "INSERT INTO orders (token, created_at, type, name, phone, address, note, desired_time, items, total, lang, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'nowe')",
      [t, iso(), d.typ, d.imie, d.telefon, d.adres || null, d.uwagi || null, d.godzina || null, JSON.stringify(d.pozycje), d.suma, d.jezyk],
    );
    return order(r.id);
  }

  const order = async (id) => orderFromRow(await db.get("SELECT * FROM orders WHERE id = ?", [id]));
  const orderByToken = async (t) => orderFromRow(await db.get("SELECT * FROM orders WHERE token = ?", [t]));

  async function orders({ od, przed, aktywne = false } = {}) {
    const where = [];
    const p = [];
    if (od) { where.push("created_at >= ?"); p.push(od); }
    if (przed) { where.push("created_at < ?"); p.push(przed); }
    if (aktywne) where.push("status IN ('nowe', 'przyjete', 'w_drodze', 'gotowe')");
    const rows = await db.all(`SELECT * FROM orders ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY id DESC LIMIT 300`, p);
    return rows.map(orderFromRow);
  }

  async function updateOrder(id, { status, eta, notatka }) {
    const sets = ["updated_at = ?"];
    const p = [iso()];
    if (status) { sets.push("status = ?"); p.push(status); }
    if (eta !== undefined) { sets.push("eta_minutes = ?"); p.push(eta); }
    if (notatka !== undefined) { sets.push("staff_note = ?"); p.push(notatka); }
    p.push(id);
    const r = await db.run(`UPDATE orders SET ${sets.join(", ")} WHERE id = ?`, p);
    return r.changes ? order(id) : null;
  }

  // ── podsumowanie dla panelu ──
  async function summary({ dzisData, dzisOdIso }) {
    const o = await db.get("SELECT COUNT(*) AS n, MAX(id) AS m FROM orders WHERE status = 'nowe'");
    const oAll = await db.get("SELECT MAX(id) AS m FROM orders");
    const r = await db.get("SELECT COUNT(*) AS n FROM reservations WHERE status = 'nowa'");
    const rAll = await db.get("SELECT MAX(id) AS m FROM reservations");
    const today = await db.get("SELECT COUNT(*) AS n, COALESCE(SUM(total), 0) AS s FROM orders WHERE created_at >= ? AND status <> 'odrzucone'", [dzisOdIso]);
    const rToday = await db.get(`SELECT COUNT(*) AS n, COALESCE(SUM(people), 0) AS p FROM reservations WHERE date = ? AND status IN ('nowa', 'potwierdzona')`, [dzisData]);
    return {
      zamowienia: { nowe: Number(o.n), ostatnieId: Number(oAll.m || 0) },
      rezerwacje: { nowe: Number(r.n), ostatnieId: Number(rAll.m || 0) },
      dzis: { zamowien: Number(today.n), obrot: Number(today.s), rezerwacji: Number(rToday.n), gosci: Number(rToday.p) },
    };
  }

  /** RODO: po N dniach usuwa dane osobowe, zostawia kwoty i daty do statystyk. */
  async function purgePersonalData(days) {
    if (!days) return { zamowienia: 0, rezerwacje: 0 };
    const cutoff = new Date(now().getTime() - days * 864e5).toISOString();
    const a = await db.run("UPDATE orders SET name = '—', phone = '—', address = NULL, note = NULL, staff_note = NULL WHERE created_at < ? AND phone <> '—'", [cutoff]);
    const b = await db.run("UPDATE reservations SET name = '—', phone = '—', email = NULL, note = NULL, staff_note = NULL WHERE created_at < ? AND phone <> '—'", [cutoff]);
    return { zamowienia: a.changes, rezerwacje: b.changes };
  }

  return {
    getSettings, setSetting, menu, item, menuIsEmpty, importMenu, updateItem, createItem, deleteItem,
    reservedPeople, createReservation, reservationByToken, reservation, reservations, updateReservation,
    createOrder, order, orderByToken, orders, updateOrder, summary, purgePersonalData, ACTIVE_RES,
  };
}
