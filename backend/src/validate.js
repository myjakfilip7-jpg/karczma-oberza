// Walidacja danych od gości. Każdy błąd to { pole, kod }; app.js zamienia kody na teksty.
import { isDate, isTime } from "./time.js";

export class Invalid extends Error {
  constructor(errors, status = 400) {
    super("invalid");
    this.errors = errors;
    this.status = status;
  }
}

export function collector() {
  const errors = [];
  const add = (pole, kod) => { if (!errors.some((e) => e.pole === pole)) errors.push({ pole, kod }); };
  return {
    errors,
    add,
    text(v, pole, { min = 0, max = 200, required = false } = {}) {
      const s = typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
      if (!s) { if (required) add(pole, "wymagane"); return ""; }
      if (s.length < min) add(pole, "za_krotkie");
      if (s.length > max) add(pole, "za_dlugie");
      return s.slice(0, max);
    },
    longText(v, pole, max = 500) {
      const s = typeof v === "string" ? v.replace(/\r\n/g, "\n").trim() : "";
      if (s.length > max) add(pole, "za_dlugie");
      return s.slice(0, max);
    },
    phone(v, pole = "telefon") {
      const raw = typeof v === "string" ? v.trim() : "";
      const s = raw.replace(/[\s\-().]/g, "");
      if (!raw) { add(pole, "wymagane"); return ""; }
      if (!/^\+?\d{9,15}$/.test(s)) add(pole, "telefon");
      return raw.slice(0, 30);
    },
    email(v, pole = "email") {
      const s = typeof v === "string" ? v.trim() : "";
      if (!s) return "";
      if (s.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) add(pole, "email");
      return s;
    },
    date(v, pole = "data") {
      if (!isDate(v)) { add(pole, "data"); return ""; }
      return v;
    },
    time(v, pole = "godzina") {
      if (!isTime(v)) { add(pole, "godzina"); return ""; }
      return v;
    },
    int(v, pole, min, max, kod = "zle_dane") {
      const n = typeof v === "string" && /^\d+$/.test(v) ? Number(v) : v;
      if (!Number.isInteger(n) || n < min || n > max) { add(pole, kod); return null; }
      return n;
    },
    throwIfAny(status = 400) { if (errors.length) throw new Invalid(errors, status); },
  };
}

export const lang = (v) => (v === "en" ? "en" : "pl");
