// Funkcje online — działają tylko wtedy, gdy strona stoi na backendzie (np. Hostinger):
// status otwarcia z serwera, komunikat z panelu i formularz rezerwacji.
// Na GitHub Pages (bez API) skrypt nic nie zmienia, strona działa jak wcześniej.
// Zamówień przez stronę nie ma — dowóz i na wynos tylko telefonicznie.
(() => {
  "use strict";
  const EN = document.documentElement.lang.startsWith("en");
  const DNI = EN
    ? ["on Monday", "on Tuesday", "on Wednesday", "on Thursday", "on Friday", "on Saturday", "on Sunday"]
    : ["w poniedziałek", "we wtorek", "w środę", "w czwartek", "w piątek", "w sobotę", "w niedzielę"];
  const T = EN ? {
    otwarte: (d) => `Open · until ${d}`,
    zamkniete: "Closed",
    otwieramy: (kiedy, g, dzien) => `Closed · opens ${kiedy === "dzis" ? "" : kiedy === "jutro" ? "tomorrow " : dzien + " "}at ${g}`,
    dzisNieczynne: (n) => `Closed today${n ? " · " + n : ""}`,
    zamknij: "Close",
    rezOk: "Thank you! Your booking request has been sent. We will confirm it by phone or email.",
    rezStatus: { nowa: "Waiting for confirmation", potwierdzona: "Confirmed — see you!", odrzucona: "We cannot take this booking — please call us", anulowana: "Cancelled" },
    osob: "people",
    wybierzDzien: "Choose a day first", brakTerminow: "No times available that day", zamknietyDzien: "We are closed that day",
    blad: "Something went wrong. Please call +48 505 176 315.",
  } : {
    otwarte: (d) => `Otwarte · do ${d}`,
    zamkniete: "Zamknięte",
    otwieramy: (kiedy, g, dzien) => `Zamknięte · otwieramy ${kiedy === "dzis" ? "" : kiedy === "jutro" ? "jutro " : dzien + " "}o ${g}`,
    dzisNieczynne: (n) => `Dziś nieczynne${n ? " · " + n : ""}`,
    zamknij: "Zamknij",
    rezOk: "Dziękujemy! Prośba o rezerwację została wysłana. Potwierdzimy ją telefonicznie albo e-mailem.",
    rezStatus: { nowa: "Czeka na potwierdzenie", potwierdzona: "Potwierdzona — do zobaczenia!", odrzucona: "Nie możemy przyjąć — zadzwoń do nas", anulowana: "Anulowana" },
    osob: "os.",
    wybierzDzien: "Najpierw wybierz dzień", brakTerminow: "Tego dnia nie ma wolnych godzin", zamknietyDzien: "Tego dnia jesteśmy nieczynni",
    blad: "Coś poszło nie tak. Zadzwoń: 505 176 315.",
  };

  const h = (tag, props = {}, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === "class") e.className = v;
      else if (k === "text") e.textContent = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? "" : v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) e.append(c);
    return e;
  };
  const store = {
    get(k, d) { try { return JSON.parse(sessionStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* tryb prywatny */ } },
  };
  async function api(method, path, body) {
    const r = await fetch("/api" + path, {
      method, headers: body ? { "content-type": "application/json" } : {}, body: body ? JSON.stringify({ ...body, jezyk: EN ? "en" : "pl" }) : undefined,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(data.komunikat || T.blad); e.data = data; throw e; }
    return data;
  }

  async function detect() {
    if (location.protocol === "file:") return null;
    try {
      const r = await fetch("/api/status", { cache: "no-store", signal: AbortSignal.timeout(4000) });
      if (!r.ok || !(r.headers.get("content-type") || "").includes("application/json")) return null;
      return await r.json();
    } catch { return null; }
  }

  const ready = detect();
  window.Oberza = { ready };

  // ── status otwarcia i komunikat z panelu ──
  function statusText(s) {
    if (s.otwarte) return T.otwarte(s.zamkniecie);
    if (!s.dzis && s.notatka) return T.dzisNieczynne(s.notatka);
    const n = s.nastepneOtwarcie;
    if (!n) return T.zamkniete;
    const wd = (new Date(n.data + "T12:00:00Z").getUTCDay() + 6) % 7;
    return T.otwieramy(n.kiedy, n.godzina, DNI[wd]);
  }

  function banner(k) {
    const tekst = EN ? k.tekst_en || k.tekst : k.tekst;
    const key = "oberza-komunikat-zamkniety";
    if (store.get(key, "") === tekst) return;
    const b = h("div", { class: "komunikat-pasek", role: "status" },
      h("p", { text: tekst }),
      h("button", { type: "button", "aria-label": T.zamknij, text: "×", onclick: () => { store.set(key, tekst); b.remove(); } }));
    document.body.append(b);
  }

  function errorsInto(form, err) {
    form.querySelectorAll(".blad-pola").forEach((x) => x.remove());
    for (const [name, text] of Object.entries(err.data?.pola || {})) {
      const anchor = form.elements[name]?.closest?.("label, fieldset");
      if (anchor) anchor.append(h("span", { class: "blad-pola", text }));
    }
    form.querySelector(".wynik-formularza").textContent = err.message;
    form.querySelector(".blad-pola")?.closest("label, fieldset")?.querySelector("input, select, textarea")?.focus();
  }

  // ── formularz rezerwacji ──
  function reservations(st) {
    const form = document.getElementById("rezerwacja-form");
    if (!form || !st.rezerwacje.online) return;
    document.getElementById("rezerwacja").hidden = false;
    const f = form.elements;
    const dzis = st.teraz.data;
    const max = new Date(dzis + "T12:00:00Z");
    max.setUTCDate(max.getUTCDate() + st.rezerwacje.dniNaprzod);
    f.data.min = dzis;
    f.data.max = max.toISOString().slice(0, 10);
    f.osoby.replaceChildren(...Array.from({ length: st.rezerwacje.maksOsob }, (_, i) => h("option", { value: String(i + 1), selected: i === 1, text: String(i + 1) })));
    const loadSlots = async () => {
      f.godzina.replaceChildren(h("option", { value: "", text: "…" }));
      if (!f.data.value) return f.godzina.replaceChildren(h("option", { value: "", text: T.wybierzDzien }));
      try {
        const r = await api("GET", "/rezerwacje/terminy?data=" + f.data.value);
        if (!r.godziny.length) return f.godzina.replaceChildren(h("option", { value: "", text: r.zamkniete ? T.zamknietyDzien : T.brakTerminow }));
        f.godzina.replaceChildren(...r.godziny.map((g) => h("option", { value: g, text: g })));
        f.godzina.value = r.godziny.find((g) => g >= "18:00") || r.godziny[0];
      } catch (e) { f.godzina.replaceChildren(h("option", { value: "", text: e.message })); }
    };
    f.data.addEventListener("change", loadSlots);
    if (!f.data.value) {
      const jutro = new Date(dzis + "T12:00:00Z");
      jutro.setUTCDate(jutro.getUTCDate() + 1);
      f.data.value = jutro.toISOString().slice(0, 10);
    }
    loadSlots();

    // przycisk „Zarezerwuj stół” przy Rondlu prowadzi do formularza z zaznaczonym Rondlem
    document.querySelectorAll("[data-rondel-cta]").forEach((a) => {
      a.href = "#rezerwacja";
      a.addEventListener("click", () => { f.rondel.checked = true; if (Number(f.osoby.value) < 4) f.osoby.value = "4"; });
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = form.querySelector("button[type=submit]");
      btn.disabled = true;
      form.querySelector(".wynik-formularza").textContent = "";
      try {
        const r = await api("POST", "/rezerwacje", {
          data: f.data.value, godzina: f.godzina.value, osoby: Number(f.osoby.value), imie: f.imie.value, telefon: f.telefon.value,
          email: f.email.value, uwagi: f.uwagi.value, rondel: f.rondel.checked, firma: f.firma.value,
        });
        form.replaceChildren(h("div", { class: "cala potwierdzenie" },
          h("p", { class: "h-m", text: T.rezOk }),
          h("p", { class: "cichy", text: `${r.data} · ${r.godzina} · ${r.osoby} ${T.osob}` }),
          h("p", { class: "maly", text: T.rezStatus[r.status] || "" })));
      } catch (err) {
        errorsInto(form, err);
      } finally {
        btn.disabled = false;
      }
    });
  }

  // ── start ──
  ready.then((st) => {
    if (!st) return;
    document.documentElement.classList.add("online");
    document.querySelectorAll("[data-status]").forEach((el) => {
      el.textContent = statusText(st);
      el.dataset.stan = st.otwarte ? "otwarte" : "zamkniete";
    });
    if (st.komunikat) banner(st.komunikat);
    reservations(st);
  });
})();
