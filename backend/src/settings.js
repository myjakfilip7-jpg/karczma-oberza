// Ustawienia edytowane w panelu: domyślne wartości i walidacja każdej grupy.
// Wartości domyślne to założenia do potwierdzenia z karczmą (opisane w README).
import { isDate, isTime, toMin } from "./time.js";

export const DEFAULTS = {
  godziny: {
    // poniedziałek … niedziela
    dni: Array.from({ length: 7 }, () => ({ od: "12:00", do: "22:00", zamkniete: false })),
    // wyjątki: [{ data: "2026-12-24", zamkniete: true, od, do, notatka }]
    wyjatki: [],
  },
  rezerwacje: {
    online: true,
    slotMin: 30,
    ostatniaMinPrzedZamknieciem: 60,
    minWyprzedzenieMin: 60,
    maksOsob: 30,
    dniNaprzod: 60,
    limitOsobNaGodzine: 0, // 0 = bez limitu
  },
  komunikat: { tekst: "", tekst_en: "", do: "" },
  karta: { wydanie: "" },
};

export const NAMES = Object.keys(DEFAULTS);

const bool = (v, d) => (typeof v === "boolean" ? v : d);
const intIn = (v, min, max, d) => (Number.isInteger(v) && v >= min && v <= max ? v : d);
const txt = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

class SettingError extends Error {
  constructor(pole) { super(pole); this.pole = pole; }
}

function hoursRange(od, doo, pole) {
  if (!isTime(od) || !isTime(doo) || toMin(doo) <= toMin(od)) throw new SettingError(pole);
}

/** Zwraca oczyszczoną wartość albo rzuca SettingError z nazwą złego pola. */
export function cleanSetting(name, input) {
  const d = DEFAULTS[name];
  if (!d || typeof input !== "object" || input === null) throw new SettingError(name);
  switch (name) {
    case "godziny": {
      if (!Array.isArray(input.dni) || input.dni.length !== 7) throw new SettingError("dni");
      const dni = input.dni.map((x, i) => {
        const zamkniete = Boolean(x?.zamkniete);
        if (!zamkniete) hoursRange(x?.od, x?.do, `dni.${i}`);
        return { od: isTime(x?.od) ? x.od : "12:00", do: isTime(x?.do) ? x.do : "22:00", zamkniete };
      });
      const wyjatki = (Array.isArray(input.wyjatki) ? input.wyjatki : []).slice(0, 100).map((w, i) => {
        if (!isDate(w?.data)) throw new SettingError(`wyjatki.${i}`);
        const zamkniete = Boolean(w.zamkniete);
        if (!zamkniete) hoursRange(w.od, w.do, `wyjatki.${i}`);
        return zamkniete
          ? { data: w.data, zamkniete: true, notatka: txt(w.notatka, 120) }
          : { data: w.data, zamkniete: false, od: w.od, do: w.do, notatka: txt(w.notatka, 120) };
      });
      const seen = new Set();
      for (const w of wyjatki) { if (seen.has(w.data)) throw new SettingError("wyjatki"); seen.add(w.data); }
      wyjatki.sort((a, b) => a.data.localeCompare(b.data));
      return { dni, wyjatki };
    }
    case "rezerwacje":
      return {
        online: bool(input.online, d.online),
        slotMin: [15, 30, 60].includes(input.slotMin) ? input.slotMin : d.slotMin,
        ostatniaMinPrzedZamknieciem: intIn(input.ostatniaMinPrzedZamknieciem, 0, 240, d.ostatniaMinPrzedZamknieciem),
        minWyprzedzenieMin: intIn(input.minWyprzedzenieMin, 0, 24 * 60, d.minWyprzedzenieMin),
        maksOsob: intIn(input.maksOsob, 1, 200, d.maksOsob),
        dniNaprzod: intIn(input.dniNaprzod, 1, 365, d.dniNaprzod),
        limitOsobNaGodzine: intIn(input.limitOsobNaGodzine, 0, 1000, d.limitOsobNaGodzine),
      };
    case "komunikat": {
      const doo = input.do ? String(input.do) : "";
      if (doo && !isDate(doo)) throw new SettingError("do");
      return { tekst: txt(input.tekst, 300), tekst_en: txt(input.tekst_en, 300), do: doo };
    }
    case "karta":
      return { wydanie: txt(input.wydanie, 20) };
    default:
      throw new SettingError(name);
  }
}

export { SettingError };
