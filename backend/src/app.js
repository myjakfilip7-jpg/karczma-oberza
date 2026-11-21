// Aplikacja HTTP: publiczne API strony, API panelu, pliki strony i panelu.
import express from "express";
import fs from "node:fs";
import { createRepo, ORDER_STATUSES, RES_STATUSES, zl } from "./repo.js";
import { openStatus, reservationSlots, orderWindow, local, addDays, dayHours } from "./time.js";
import { collector, Invalid, lang as langOf } from "./validate.js";
import { msg } from "./messages.js";
import { createAuth, readCookie, cookieHeader, COOKIE } from "./auth.js";
import { limiter, loginGuard } from "./ratelimit.js";
import { cleanSetting, SettingError } from "./settings.js";

const TOKEN_RE = /^[A-Za-z0-9_-]{20,40}$/;
const EDITABLE_SETTINGS = ["godziny", "zamowienia", "dowoz", "rezerwacje", "komunikat"];
const PHONE = "+48505176315";

class Fail extends Error {
  constructor(status, kod) { super(kod); this.status = status; this.kod = kod; }
}

export function createApp({ db, config, now = () => new Date(), notify = null, log = console }) {
  const repo = createRepo(db, { now });
  const auth = createAuth({ password: config.panelPassword, secret: config.panelSecret, production: config.production });
  const guard = loginGuard();
  const limits = {
    rezerwacje: limiter({ windowMs: 15 * 60e3, max: 6 }),
    zamowienia: limiter({ windowMs: 15 * 60e3, max: 6 }),
    api: limiter({ windowMs: 60e3, max: 240 }),
  };
  const ms = () => now().getTime();
  const sec = () => Math.floor(ms() / 1000);

  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", config.trustProxy);

  app.use((req, res, next) => {
    res.set({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    });
    next();
  });

  // ── API: wspólne ──
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (!limits.api.take(req.ip, ms())) throw new Fail(429, "za_duzo_prob");
    // Żądania zmieniające dane tylko z tej samej strony (albo z ALLOWED_ORIGINS).
    if (req.method !== "GET" && req.method !== "HEAD") {
      const origin = req.get("origin");
      if (origin) {
        let ok = config.allowedOrigins.includes(origin);
        try { ok ||= new URL(origin).host === req.get("host"); } catch { /* zły nagłówek */ }
        if (!ok) throw new Fail(403, "niedozwolone_zrodlo");
      }
    }
    next();
  });
  app.use("/api", express.json({ limit: "32kb" }));

  const settings = () => repo.getSettings();
  const later = (fn) => Promise.resolve().then(fn).catch((e) => log.error("[powiadomienia]", e?.message || e));

  app.get("/api/health", (req, res) => res.json({ ok: true }));

  app.get("/api/status", async (req, res) => {
    const s = await settings();
    const n = now();
    const st = openStatus(s.godziny, n);
    const ow = orderWindow(s.godziny, s.zamowienia, n);
    const today = local(n).date;
    const k = s.komunikat;
    const z = s.zamowienia;
    res.json({
      ...st,
      telefon: PHONE,
      komunikat: k.tekst && (!k.do || k.do >= today) ? { tekst: k.tekst, tekst_en: k.tekst_en || k.tekst } : null,
      rezerwacje: { online: s.rezerwacje.online, maksOsob: s.rezerwacje.maksOsob, dniNaprzod: s.rezerwacje.dniNaprzod },
      zamowienia: {
        online: z.online,
        mozna: z.online && !z.wstrzymane && ow.mozna,
        powod: !z.online ? "wylaczone" : z.wstrzymane ? "wstrzymane" : ow.powod || null,
        od: ow.od || null,
        do: ow.do || null,
        godziny: ow.godziny,
        czasDostawyMin: z.czasDostawyMin,
        minimumZl: z.minimumZl,
        dowoz: { ...s.dowoz },
      },
    });
  });

  app.get("/api/menu", async (req, res) => {
    const s = await settings();
    const cats = await repo.menu();
    res.json({
      wydanie: s.karta.wydanie,
      kategorie: cats.filter((c) => c.pozycje.length).map((c) => ({
        id: c.id, nazwa: c.nazwa, nazwa_en: c.nazwa_en || undefined, uwaga: c.uwaga || undefined, uwaga_en: c.uwaga_en || undefined,
        pozycje: c.pozycje.map((p) => ({
          id: p.id,
          n: p.nazwa, n_en: p.nazwa_en || undefined,
          o: p.opis || undefined, o_en: p.opis_en || undefined,
          g: p.porcja || undefined, g_en: p.porcja_en || undefined,
          c: p.ceny.map((w) => (w.cena == null ? "?" : zl(w.cena))).join(" / "),
          warianty: p.ceny,
          dostepne: p.dostepne,
        })),
      })),
    });
  });

  // ── rezerwacje ──
  function checkDate(s, data, l) {
    const today = local(now()).date;
    if (data < today || data > addDays(today, s.rezerwacje.dniNaprzod)) throw new Invalid([{ pole: "data", kod: "termin_niedostepny" }]);
    return l;
  }

  app.get("/api/rezerwacje/terminy", async (req, res) => {
    const s = await settings();
    const v = collector();
    const data = v.date(req.query.data);
    v.throwIfAny();
    checkDate(s, data);
    const day = dayHours(s.godziny, data);
    let godziny = reservationSlots(s.godziny, s.rezerwacje, data, now());
    const limit = s.rezerwacje.limitOsobNaGodzine;
    if (limit > 0) {
      const kept = [];
      for (const g of godziny) if ((await repo.reservedPeople(data, g)) < limit) kept.push(g);
      godziny = kept;
    }
    res.json({ data, zamkniete: day.closed, notatka: day.note, godziny });
  });

  app.post("/api/rezerwacje", async (req, res) => {
    const b = req.body || {};
    const l = langOf(b.jezyk);
    if (!limits.rezerwacje.take(req.ip, ms())) throw new Fail(429, "za_duzo_prob");
    const s = await settings();
    if (!s.rezerwacje.online) throw new Fail(403, "rezerwacje_wylaczone");
    if (b.firma) return res.status(201).json({ token: null, status: "nowa" }); // pułapka na boty
    const v = collector();
    const d = {
      imie: v.text(b.imie, "imie", { min: 2, max: 80, required: true }),
      telefon: v.phone(b.telefon),
      email: v.email(b.email),
      osoby: v.int(b.osoby, "osoby", 1, 1000, "liczba_osob"),
      data: v.date(b.data),
      godzina: v.time(b.godzina),
      uwagi: v.longText(b.uwagi, "uwagi", 500),
      rondel: b.rondel === true,
      jezyk: l,
    };
    v.throwIfAny();
    if (d.osoby > s.rezerwacje.maksOsob) throw new Invalid([{ pole: "osoby", kod: "za_duzo_osob" }]);
    checkDate(s, d.data);
    if (dayHours(s.godziny, d.data).closed) throw new Invalid([{ pole: "data", kod: "termin_niedostepny" }]);
    if (!reservationSlots(s.godziny, s.rezerwacje, d.data, now()).includes(d.godzina)) throw new Invalid([{ pole: "godzina", kod: "termin_niedostepny" }]);
    const r = await repo.createReservation(d, { limit: s.rezerwacje.limitOsobNaGodzine });
    if (r.blad) throw new Invalid([{ pole: "godzina", kod: r.blad }], 409);
    if (notify) later(() => notify.reservation(r.rezerwacja));
    const x = r.rezerwacja;
    res.status(201).json({ token: x.token, status: x.status, data: x.data, godzina: x.godzina, osoby: x.osoby });
  });

  app.get("/api/rezerwacje/:token", async (req, res) => {
    if (!TOKEN_RE.test(req.params.token)) throw new Fail(404, "zly_token");
    const r = await repo.reservationByToken(req.params.token);
    if (!r) throw new Fail(404, "zly_token");
    res.json({ status: r.status, data: r.data, godzina: r.godzina, osoby: r.osoby, rondel: r.rondel });
  });

  // ── zamówienia ──
  app.post("/api/zamowienia", async (req, res) => {
    const b = req.body || {};
    const l = langOf(b.jezyk);
    if (!limits.zamowienia.take(req.ip, ms())) throw new Fail(429, "za_duzo_prob");
    const s = await settings();
    if (!s.zamowienia.online) throw new Fail(403, "zamowienia_wylaczone");
    if (s.zamowienia.wstrzymane) throw new Fail(409, "zamowienia_wstrzymane");
    const ow = orderWindow(s.godziny, s.zamowienia, now());
    if (!ow.mozna) throw new Fail(409, "poza_godzinami");
    if (b.firma) return res.status(201).json({ token: null, status: "nowe" });

    const v = collector();
    const typ = b.typ === "dowoz" || b.typ === "wynos" ? b.typ : (v.add("typ", "typ"), null);
    if (typ === "dowoz" && !s.dowoz.aktywny) throw new Fail(409, "dowoz_wylaczony");
    const imie = v.text(b.imie, "imie", { min: 2, max: 80, required: true });
    const telefon = v.phone(b.telefon);
    const adres = typ === "dowoz" ? v.text(b.adres, "adres", { min: 5, max: 200, required: true }) : "";
    if (typ === "dowoz" && !adres) v.add("adres", "adres");
    const uwagi = v.longText(b.uwagi, "uwagi", 500);
    const godzina = !b.godzina || b.godzina === "asap" ? "" : String(b.godzina);
    if (godzina && !ow.godziny.includes(godzina)) v.add("godzina", "termin_niedostepny");
    const lista = Array.isArray(b.pozycje) ? b.pozycje : [];
    if (!lista.length) v.add("pozycje", "pusty_koszyk");
    if (lista.length > 40) v.add("pozycje", "za_duzo_pozycji");
    v.throwIfAny();

    // Ceny zawsze z bazy — nigdy z przeglądarki.
    const merged = new Map();
    for (const x of lista) {
      const id = typeof x?.id === "string" ? x.id : "";
      const wariant = x?.wariant == null ? 0 : x.wariant;
      const ilosc = x?.ilosc;
      if (!id || !Number.isInteger(wariant) || wariant < 0 || !Number.isInteger(ilosc) || ilosc < 1 || ilosc > 20) {
        throw new Invalid([{ pole: "pozycje", kod: "ilosc" }]);
      }
      const key = `${id}#${wariant}`;
      merged.set(key, { id, wariant, ilosc: (merged.get(key)?.ilosc || 0) + ilosc });
    }
    const pozycje = [];
    for (const x of merged.values()) {
      const it = await repo.item(x.id);
      const w = it?.ceny[x.wariant];
      if (!it || it.ukryte || !it.dostepne || !w || w.cena == null) throw new Invalid([{ pole: "pozycje", kod: "pozycja_niedostepna" }], 409);
      if (x.ilosc > 50) throw new Invalid([{ pole: "pozycje", kod: "ilosc" }]);
      pozycje.push({
        id: it.id, nazwa: it.nazwa, nazwa_en: it.nazwa_en || it.nazwa,
        wariant: w.etykieta || "", wariant_en: w.etykieta_en || w.etykieta || "",
        ilosc: x.ilosc, cena: w.cena, suma: w.cena * x.ilosc,
      });
    }
    const wartosc = pozycje.reduce((a, p) => a + p.suma, 0);
    if (typ === "dowoz" && s.zamowienia.minimumZl > 0 && wartosc < s.zamowienia.minimumZl * 100) {
      throw new Invalid([{ pole: "pozycje", kod: "minimum" }], 409);
    }
    if (typ === "dowoz" && s.dowoz.oplataZl > 0) {
      pozycje.push({ id: "dowoz", nazwa: "Dowóz", nazwa_en: "Delivery", wariant: "", wariant_en: "", ilosc: 1, cena: s.dowoz.oplataZl * 100, suma: s.dowoz.oplataZl * 100 });
    }
    const suma = pozycje.reduce((a, p) => a + p.suma, 0);
    const o = await repo.createOrder({ typ, imie, telefon, adres, uwagi, godzina, pozycje, suma, jezyk: l });
    if (notify) later(() => notify.order(o));
    res.status(201).json({ token: o.token, status: o.status, suma: o.suma, czasDostawyMin: s.zamowienia.czasDostawyMin });
  });

  app.get("/api/zamowienia/:token", async (req, res) => {
    if (!TOKEN_RE.test(req.params.token)) throw new Fail(404, "zly_token");
    const o = await repo.orderByToken(req.params.token);
    if (!o) throw new Fail(404, "zly_token");
    res.json({
      status: o.status, typ: o.typ, suma: o.suma, eta: o.eta, godzina: o.godzina, utworzono: o.utworzono, zmieniono: o.zmieniono,
      pozycje: o.pozycje.map((p) => ({ nazwa: p.nazwa, nazwa_en: p.nazwa_en, wariant: p.wariant, wariant_en: p.wariant_en, ilosc: p.ilosc, suma: p.suma })),
    });
  });

  // ── panel: logowanie ──
  const secure = (req) => config.production || req.secure;

  app.post("/api/panel/login", async (req, res) => {
    if (!auth.configured) throw new Fail(503, "brak_hasla");
    if (guard.blocked(req.ip, ms())) throw new Fail(429, "za_duzo_prob");
    if (!auth.check(req.body?.haslo)) { guard.fail(req.ip, ms()); throw new Fail(401, "zle_haslo"); }
    guard.ok(req.ip);
    const s = auth.makeSession(sec());
    res.set("Set-Cookie", cookieHeader(COOKIE, s.value, { maxAge: s.maxAge, secure: secure(req) }));
    res.json({ ok: true });
  });

  app.post("/api/panel/logout", (req, res) => {
    res.set("Set-Cookie", cookieHeader(COOKIE, "", { maxAge: 0, secure: secure(req) }));
    res.json({ ok: true });
  });

  app.use("/api/panel", (req, res, next) => {
    if (!auth.verify(readCookie(req, COOKIE), sec())) throw new Fail(401, "brak_sesji");
    next();
  });

  // ── panel: dane ──
  const startOfLocalDay = (date = now()) => {
    const n = local(date);
    return new Date(date.getTime() - n.minutes * 60e3 - date.getUTCSeconds() * 1e3 - date.getUTCMilliseconds());
  };
  const startOfDate = (ds) => {
    // Północ czasu polskiego dla podanej daty: szukamy przesunięcia strefy w samo południe tego dnia.
    const noon = new Date(`${ds}T12:00:00Z`);
    return startOfLocalDay(noon);
  };

  app.get("/api/panel/sesja", (req, res) => res.json({ ok: true }));

  app.get("/api/panel/podsumowanie", async (req, res) => {
    const n = now();
    res.json(await repo.summary({ dzisData: local(n).date, dzisOdIso: startOfLocalDay(n).toISOString() }));
  });

  app.get("/api/panel/zamowienia", async (req, res) => {
    const widok = req.query.widok || "aktywne";
    if (widok === "aktywne") return res.json(await repo.orders({ aktywne: true }));
    if (widok === "dzis") return res.json(await repo.orders({ od: startOfLocalDay().toISOString() }));
    const v = collector();
    const data = v.date(req.query.data);
    v.throwIfAny();
    res.json(await repo.orders({ od: startOfDate(data).toISOString(), przed: startOfDate(addDays(data, 1)).toISOString() }));
  });

  app.patch("/api/panel/zamowienia/:id", async (req, res) => {
    const b = req.body || {};
    const patch = {};
    if (b.status !== undefined) { if (!ORDER_STATUSES.includes(b.status)) throw new Fail(400, "zle_dane"); patch.status = b.status; }
    if (b.eta !== undefined) { if (b.eta !== null && !(Number.isInteger(b.eta) && b.eta >= 0 && b.eta <= 600)) throw new Fail(400, "zle_dane"); patch.eta = b.eta; }
    if (b.notatka !== undefined) patch.notatka = String(b.notatka).slice(0, 500);
    const o = await repo.updateOrder(Number(req.params.id), patch);
    if (!o) throw new Fail(404, "nie_znaleziono");
    res.json(o);
  });

  app.get("/api/panel/rezerwacje", async (req, res) => {
    const v = collector();
    const od = req.query.od ? v.date(req.query.od, "od") : local(now()).date;
    const doo = req.query.do ? v.date(req.query.do, "do") : undefined;
    const status = RES_STATUSES.includes(req.query.status) ? req.query.status : undefined;
    v.throwIfAny();
    res.json(await repo.reservations({ od, doo, status }));
  });

  app.patch("/api/panel/rezerwacje/:id", async (req, res) => {
    const b = req.body || {};
    const patch = {};
    if (b.status !== undefined) { if (!RES_STATUSES.includes(b.status)) throw new Fail(400, "zle_dane"); patch.status = b.status; }
    if (b.notatka !== undefined) patch.notatka = String(b.notatka).slice(0, 500);
    const before = await repo.reservation(Number(req.params.id));
    const r = await repo.updateReservation(Number(req.params.id), patch);
    if (!r) throw new Fail(404, "nie_znaleziono");
    if (notify?.reservationStatus && patch.status && patch.status !== before?.status) later(() => notify.reservationStatus(r));
    res.json(r);
  });

  app.get("/api/panel/menu", async (req, res) => {
    const s = await settings();
    res.json({ wydanie: s.karta.wydanie, kategorie: await repo.menu({ includeHidden: true }) });
  });

  function cleanItem(b, { create }) {
    const v = collector();
    const out = {};
    const str = (k, max, req) => { if (create || k in b) out[k] = v.text(b[k], k, { max, required: req }); };
    str("nazwa", 120, true);
    str("nazwa_en", 120);
    for (const k of ["opis", "opis_en"]) if (create || k in b) out[k] = v.longText(b[k], k, 400).replace(/\n+/g, " ");
    str("porcja", 60);
    str("porcja_en", 60);
    if ("kategoria" in b || create) out.kategoria = v.text(b.kategoria, "kategoria", { max: 64, required: true });
    if ("pozycja" in b) out.pozycja = v.int(b.pozycja, "pozycja", 0, 999);
    if ("dostepne" in b) out.dostepne = b.dostepne === true;
    if ("ukryte" in b) out.ukryte = b.ukryte === true;
    if (create || "ceny" in b) {
      const c = b.ceny;
      if (!Array.isArray(c) || c.length < 1 || c.length > 4) v.add("ceny", "zle_dane");
      else {
        out.ceny = c.map((w) => {
          const cena = w?.cena;
          if (!(cena === null || (Number.isInteger(cena) && cena >= 0 && cena <= 1_000_000))) v.add("ceny", "zle_dane");
          return {
            etykieta: typeof w?.etykieta === "string" ? w.etykieta.trim().slice(0, 30) : "",
            etykieta_en: typeof w?.etykieta_en === "string" ? w.etykieta_en.trim().slice(0, 30) : "",
            cena: cena ?? null,
          };
        });
      }
    }
    v.throwIfAny();
    return out;
  }

  const categoryExists = async (id) => (await repo.menu({ includeHidden: true })).some((c) => c.id === id);

  app.patch("/api/panel/menu/pozycje/:id", async (req, res) => {
    const patch = cleanItem(req.body || {}, { create: false });
    if (patch.kategoria && !(await categoryExists(patch.kategoria))) throw new Invalid([{ pole: "kategoria", kod: "zle_dane" }]);
    const it = await repo.updateItem(req.params.id, patch);
    if (!it) throw new Fail(404, "nie_znaleziono");
    res.json(it);
  });

  app.post("/api/panel/menu/pozycje", async (req, res) => {
    const d = cleanItem(req.body || {}, { create: true });
    const it = await repo.createItem(d);
    if (!it) throw new Invalid([{ pole: "kategoria", kod: "zle_dane" }]);
    res.status(201).json(it);
  });

  app.delete("/api/panel/menu/pozycje/:id", async (req, res) => {
    if (!(await repo.deleteItem(req.params.id))) throw new Fail(404, "nie_znaleziono");
    res.json({ ok: true });
  });

  app.get("/api/panel/ustawienia", async (req, res) => res.json(await settings()));

  app.put("/api/panel/ustawienia/:name", async (req, res) => {
    const name = req.params.name;
    if (!EDITABLE_SETTINGS.includes(name)) throw new Fail(404, "nie_znaleziono");
    let value;
    try { value = cleanSetting(name, req.body); } catch (e) {
      if (e instanceof SettingError) throw new Invalid([{ pole: e.pole, kod: "zle_dane" }]);
      throw e;
    }
    await repo.setSetting(name, value);
    res.json(value);
  });

  app.use("/api", () => { throw new Fail(404, "nie_znaleziono"); });

  // ── pliki: panel, grafiki, strona ──
  const noIndexHtml = { extensions: ["html"], setHeaders(res, p) { if (p.endsWith(".html")) res.set("Cache-Control", "no-cache"); } };
  app.use("/panel", (req, res, next) => {
    res.set({
      "X-Robots-Tag": "noindex, nofollow",
      "X-Frame-Options": "DENY",
      "Content-Security-Policy": "default-src 'self'; img-src 'self' data:; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    });
    next();
  });
  if (config.panelDir && fs.existsSync(config.panelDir)) app.use("/panel", express.static(config.panelDir, noIndexHtml));
  // Pliki źródłowe generatora nie są częścią strony.
  app.use((req, res, next) => (/\.(py|md)$/i.test(req.path) ? res.status(404).end() : next()));
  if (config.assetsDir && fs.existsSync(config.assetsDir)) app.use("/assets", express.static(config.assetsDir, { maxAge: "7d" }));
  if (config.siteDir && fs.existsSync(config.siteDir)) app.use("/", express.static(config.siteDir, noIndexHtml));

  // ── błędy ──
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const l = langOf(req.body?.jezyk || req.query?.jezyk);
    if (err instanceof Invalid) {
      const pola = Object.fromEntries(err.errors.map((e) => [e.pole, msg(e.kod, l)]));
      return res.status(err.status).json({ blad: err.errors[0].kod, komunikat: msg(err.errors[0].kod, l), pola });
    }
    if (err instanceof Fail) return res.status(err.status).json({ blad: err.kod, komunikat: msg(err.kod, l) });
    if (err?.type === "entity.parse.failed") return res.status(400).json({ blad: "zle_dane", komunikat: msg("zle_dane", l) });
    if (err?.type === "entity.too.large") return res.status(413).json({ blad: "zle_dane", komunikat: msg("zle_dane", l) });
    log.error("[blad]", req.method, req.path, err);
    res.status(500).json({ blad: "blad_serwera", komunikat: msg("blad_serwera", l) });
  });

  return { app, repo };
}
