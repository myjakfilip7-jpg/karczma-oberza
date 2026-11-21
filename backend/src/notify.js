// Powiadomienia dla obsługi o nowym zamówieniu lub rezerwacji: e-mail (SMTP) i/lub webhook (np. Make, n8n, Slack).
// Bez konfiguracji nic nie wysyła — panel i tak pokazuje nowe zgłoszenia z dźwiękiem.
import { zl } from "./repo.js";

export function createNotifier(cfg, { publicUrl = "", log = console } = {}) {
  let transport = null;
  async function mailer() {
    if (!cfg.smtpHost || !cfg.email) return null;
    if (!transport) {
      const nodemailer = (await import("nodemailer")).default;
      transport = nodemailer.createTransport({
        host: cfg.smtpHost, port: cfg.smtpPort, secure: cfg.smtpPort === 465,
        auth: cfg.smtpUser ? { user: cfg.smtpUser, pass: cfg.smtpPass } : undefined,
      });
    }
    return transport;
  }

  async function send(kind, subject, text, payload) {
    const jobs = [];
    const m = await mailer().catch((e) => { log.error("[powiadomienia] SMTP:", e.message); return null; });
    if (m) jobs.push(m.sendMail({ from: cfg.smtpFrom || cfg.email, to: cfg.email, subject, text }));
    if (cfg.webhookUrl) {
      jobs.push(fetch(cfg.webhookUrl, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ typ: kind, tytul: subject, tekst: text, dane: payload }),
        signal: AbortSignal.timeout(5000),
      }).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); }));
    }
    for (const r of await Promise.allSettled(jobs)) if (r.status === "rejected") log.error(`[powiadomienia] ${kind}:`, r.reason?.message || r.reason);
  }

  const panel = publicUrl ? `\n\nPanel: ${publicUrl}/panel/` : "";

  // Wiadomość do gościa — tylko e-mailem, tylko gdy podał adres i SMTP jest skonfigurowane.
  async function toGuest(to, subject, text) {
    const m = await mailer().catch(() => null);
    if (!m || !to) return;
    await m.sendMail({ from: cfg.smtpFrom || cfg.email, to, replyTo: cfg.email, subject, text }).catch((e) => log.error("[powiadomienia] gość:", e.message));
  }

  return {
    order(o) {
      const lines = o.pozycje.map((p) => `${p.ilosc} × ${p.nazwa}${p.wariant ? ` (${p.wariant})` : ""} — ${zl(p.suma)} zł`);
      const text = [
        `${o.typ === "dowoz" ? "DOWÓZ" : "NA WYNOS"} · ${o.godzina ? `na ${o.godzina}` : "jak najszybciej"}`,
        `${o.imie}, tel. ${o.telefon}`,
        o.adres ? `Adres: ${o.adres}` : "",
        "",
        ...lines,
        `Razem: ${zl(o.suma)} zł`,
        o.uwagi ? `\nUwagi: ${o.uwagi}` : "",
      ].filter((l) => l !== "").join("\n") + panel;
      return send("zamowienie", `Nowe zamówienie #${o.id} — ${zl(o.suma)} zł`, text, { id: o.id });
    },
    reservation(r) {
      const text = [
        `${r.data} o ${r.godzina} · ${r.osoby} os.${r.rondel ? " · Rondel" : ""}`,
        `${r.imie}, tel. ${r.telefon}${r.email ? `, ${r.email}` : ""}`,
        r.uwagi ? `Uwagi: ${r.uwagi}` : "",
      ].filter(Boolean).join("\n") + panel;
      return send("rezerwacja", `Nowa rezerwacja #${r.id} — ${r.data} ${r.godzina}, ${r.osoby} os.`, text, { id: r.id });
    },
    reservationStatus(r) {
      if (!r.email || !["potwierdzona", "odrzucona", "anulowana"].includes(r.status)) return Promise.resolve();
      const en = r.jezyk === "en";
      const when = `${r.data}, ${r.godzina}, ${r.osoby} ${en ? "people" : "os."}`;
      const T = {
        potwierdzona: en ? ["Your table is booked", `See you on ${when}.`] : ["Rezerwacja potwierdzona", `Do zobaczenia: ${when}.`],
        odrzucona: en ? ["We cannot take this booking", `Unfortunately we cannot take your booking for ${when}. Please call us to find another time.`] : ["Nie możemy przyjąć rezerwacji", `Niestety nie możemy przyjąć rezerwacji na ${when}. Zadzwoń, znajdziemy inny termin.`],
        anulowana: en ? ["Booking cancelled", `Your booking for ${when} has been cancelled. Please call us with any questions.`] : ["Rezerwacja anulowana", `Rezerwacja na ${when} została anulowana. W razie pytań zadzwoń.`],
      }[r.status];
      const footer = en ? "\n\nKarczma Oberża, ul. Piłsudskiego 23, Krynica-Zdrój\nTel. +48 505 176 315" : "\n\nKarczma Oberża, ul. Piłsudskiego 23, Krynica-Zdrój\nTel. 505 176 315";
      return toGuest(r.email, `Karczma Oberża — ${T[0]}`, T[1] + footer);
    },
  };
}
