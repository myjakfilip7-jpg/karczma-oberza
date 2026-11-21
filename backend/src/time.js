// Czas lokalny Krynicy (Europe/Warsaw) i logika godzin: otwarte teraz, terminy rezerwacji, okno zamówień.
// Dni tygodnia liczone od poniedziałku: 0 = poniedziałek … 6 = niedziela.

const TZ = "Europe/Warsaw";
const fmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

export function local(date) {
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  const d = `${p.year}-${p.month}-${p.day}`;
  return { date: d, minutes: Number(p.hour) * 60 + Number(p.minute), weekday: weekdayOf(d) };
}

export const isDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + "T00:00:00Z")) && new Date(s + "T00:00:00Z").toISOString().startsWith(s);
export const isTime = (s) => typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
export const toMin = (s) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
export const toHHMM = (n) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

export function weekdayOf(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Godziny danego dnia z uwzględnieniem wyjątków (święta, imprezy zamknięte, inne godziny). */
export function dayHours(hours, dateStr) {
  const ex = (hours.wyjatki || []).find((w) => w.data === dateStr);
  if (ex) {
    if (ex.zamkniete) return { closed: true, note: ex.notatka || "" };
    return { closed: false, open: toMin(ex.od), close: toMin(ex.do), note: ex.notatka || "" };
  }
  const d = hours.dni[weekdayOf(dateStr)];
  if (!d || d.zamkniete) return { closed: true, note: "" };
  return { closed: false, open: toMin(d.od), close: toMin(d.do), note: "" };
}

export function openStatus(hours, now) {
  const n = local(now);
  const today = dayHours(hours, n.date);
  const otwarte = !today.closed && n.minutes >= today.open && n.minutes < today.close;
  let nastepne = null;
  if (!otwarte) {
    if (!today.closed && n.minutes < today.open) nastepne = { data: n.date, godzina: toHHMM(today.open), kiedy: "dzis" };
    else {
      for (let i = 1; i <= 21; i++) {
        const ds = addDays(n.date, i);
        const h = dayHours(hours, ds);
        if (!h.closed) { nastepne = { data: ds, godzina: toHHMM(h.open), kiedy: i === 1 ? "jutro" : "pozniej" }; break; }
      }
    }
  }
  return {
    otwarte,
    dzis: today.closed ? null : { od: toHHMM(today.open), do: toHHMM(today.close) },
    notatka: today.note || "",
    nastepneOtwarcie: nastepne,
    zamkniecie: otwarte ? toHHMM(today.close) : null,
    teraz: { data: n.date, godzina: toHHMM(n.minutes) },
  };
}

/** Wolne godziny rezerwacji w danym dniu (bez uwzględniania limitu miejsc — to robi repo). */
export function reservationSlots(hours, cfg, dateStr, now) {
  const h = dayHours(hours, dateStr);
  if (h.closed) return [];
  const n = local(now);
  if (dateStr < n.date) return [];
  const last = h.close - cfg.ostatniaMinPrzedZamknieciem;
  const earliest = dateStr === n.date ? n.minutes + cfg.minWyprzedzenieMin : 0;
  const out = [];
  for (let t = h.open; t <= last; t += cfg.slotMin) if (t >= earliest) out.push(toHHMM(t));
  return out;
}

/** Czy można teraz złożyć zamówienie i na jakie godziny (odbiór / dowóz „na godzinę”). */
export function orderWindow(hours, cfg, now) {
  const n = local(now);
  const h = dayHours(hours, n.date);
  if (h.closed) return { mozna: false, powod: "zamkniete_dzis", godziny: [] };
  if (n.minutes < h.open) return { mozna: false, powod: "przed_otwarciem", od: toHHMM(h.open), godziny: [] };
  const last = h.close - cfg.ostatnieMinPrzedZamknieciem;
  if (n.minutes >= last) return { mozna: false, powod: "po_godzinach", godziny: [] };
  const godziny = [];
  const start = Math.ceil((n.minutes + cfg.czasPrzygotowaniaMin) / 15) * 15;
  for (let t = start; t <= h.close - 15; t += 15) godziny.push(toHHMM(t));
  return { mozna: true, do: toHHMM(last), godziny };
}
