// Funkcje online — działają tylko wtedy, gdy strona stoi na backendzie (np. Hostinger):
// status z serwera, komunikat z panelu, formularz rezerwacji, koszyk i zamówienia z karty.
// Na GitHub Pages (bez API) skrypt nic nie zmienia, strona działa jak wcześniej.
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
    koszyk: (n, s) => `Basket · ${n} · ${s}`,
    zamow: "Order",
    dodano: (n) => `Added: ${n}`,
    tytul: "Your order",
    dowoz: "Delivery", wynos: "Takeaway",
    dowozNiedostepny: "Delivery is unavailable today",
    imie: "Name", telefon: "Phone", adres: "Delivery address", adresPh: "Street, number, flat; hotel name if you are staying in one",
    kiedy: "When", asap: "As soon as possible", uwagi: "Notes for the kitchen or driver", opcj: "(optional)",
    razem: "Total", oplata: "Delivery fee", minimum: (z) => `Minimum order for delivery: ${z}`,
    wyslij: "Send order", wysylanie: "Sending…",
    zgoda: "We will use these details only to prepare and deliver this order.",
    pusty: "Your basket is empty. Add dishes from the menu.",
    usun: "Remove", mniej: "One less", wiecej: "One more",
    nieTeraz: (st) => st.powod === "przed_otwarciem" ? `Online orders open at ${st.od}.` : st.powod === "wstrzymane" ? "The kitchen is at capacity — online ordering is paused for a moment. Please call us." : "We are not taking online orders right now. You can still call us.",
    st: { nowe: "Sent — waiting for the restaurant to accept", przyjete: "Accepted", w_drodze: "On its way", gotowe: "Ready for pickup", zrealizowane: "Done — enjoy your meal!", odrzucone: "We cannot fulfil this order — please call us" },
    eta: (m) => ` · about ${m} min`,
    statusTytul: "Order status", statusInfo: "This page refreshes the status by itself. You can close it — the restaurant has your phone number.",
    twoje: (s) => `Your order: ${s}`,
    rezOk: "Thank you! Your booking request has been sent. We will confirm it by phone or email.",
    rezStatus: { nowa: "Waiting for confirmation", potwierdzona: "Confirmed — see you!", odrzucona: "We cannot take this booking — please call us", anulowana: "Cancelled" },
    wybierzDzien: "Choose a day first", brakTerminow: "No times available that day", zamknietyDzien: "We are closed that day",
    blad: "Something went wrong. Please call +48 505 176 315.",
    online: "Online ordering is open", onlineDo: (d) => `Online ordering is open until ${d}.`,
  } : {
    otwarte: (d) => `Otwarte · do ${d}`,
    zamkniete: "Zamknięte",
    otwieramy: (kiedy, g, dzien) => `Zamknięte · otwieramy ${kiedy === "dzis" ? "" : kiedy === "jutro" ? "jutro " : dzien + " "}o ${g}`,
    dzisNieczynne: (n) => `Dziś nieczynne${n ? " · " + n : ""}`,
    zamknij: "Zamknij",
    koszyk: (n, s) => `Koszyk · ${n} · ${s}`,
    zamow: "Zamów",
    dodano: (n) => `Dodano: ${n}`,
    tytul: "Twoje zamówienie",
    dowoz: "Dowóz", wynos: "Odbiór na miejscu",
    dowozNiedostepny: "Dowóz jest dziś niedostępny",
    imie: "Imię", telefon: "Telefon", adres: "Adres dostawy", adresPh: "Ulica, numer, mieszkanie; nazwa pensjonatu, jeśli tam nocujesz",
    kiedy: "Na kiedy", asap: "Jak najszybciej", uwagi: "Uwagi dla kuchni lub kierowcy", opcj: "(opcjonalnie)",
    razem: "Razem", oplata: "Dowóz", minimum: (z) => `Minimalna kwota dowozu: ${z}`,
    wyslij: "Wyślij zamówienie", wysylanie: "Wysyłanie…",
    zgoda: "Dane wykorzystamy tylko do przygotowania i dostarczenia tego zamówienia.",
    pusty: "Koszyk jest pusty. Dodaj dania z karty.",
    usun: "Usuń", mniej: "O jeden mniej", wiecej: "O jeden więcej",
    nieTeraz: (st) => st.powod === "przed_otwarciem" ? `Zamówienia online przyjmujemy od ${st.od}.` : st.powod === "wstrzymane" ? "Kuchnia ma komplet — zamówienia online są na chwilę wstrzymane. Zadzwoń do nas." : "Teraz nie przyjmujemy zamówień online. Możesz zadzwonić.",
    st: { nowe: "Wysłane — czeka na przyjęcie", przyjete: "Przyjęte", w_drodze: "W drodze", gotowe: "Gotowe do odbioru", zrealizowane: "Zrealizowane — smacznego!", odrzucone: "Nie możemy zrealizować — zadzwoń do nas" },
    eta: (m) => ` · ok. ${m} min`,
    statusTytul: "Status zamówienia", statusInfo: "Status odświeża się sam. Możesz zamknąć stronę — mamy Twój numer telefonu.",
    twoje: (s) => `Twoje zamówienie: ${s}`,
    rezOk: "Dziękujemy! Prośba o rezerwację została wysłana. Potwierdzimy ją telefonicznie albo e-mailem.",
    rezStatus: { nowa: "Czeka na potwierdzenie", potwierdzona: "Potwierdzona — do zobaczenia!", odrzucona: "Nie możemy przyjąć — zadzwoń do nas", anulowana: "Anulowana" },
    wybierzDzien: "Najpierw wybierz dzień", brakTerminow: "Tego dnia nie ma wolnych godzin", zamknietyDzien: "Tego dnia jesteśmy nieczynni",
    blad: "Coś poszło nie tak. Zadzwoń: 505 176 315.",
    online: "Przyjmujemy zamówienia online", onlineDo: (d) => `Zamówienia online przyjmujemy dziś do ${d}.`,
  };

  const zl = (gr) => {
    const v = gr % 100 === 0 ? String(gr / 100) : (gr / 100).toFixed(2).replace(".", EN ? "." : ",");
    return EN ? `${v} PLN` : `${v} zł`;
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
    getL(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    setL(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* tryb prywatny */ } },
  };
  async function api(method, path, body) {
    const r = await fetch("/api" + path, {
      method, headers: body ? { "content-type": "application/json" } : {}, body: body ? JSON.stringify({ ...body, jezyk: EN ? "en" : "pl" }) : undefined,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(data.komunikat || T.blad); e.data = data; throw e; }
    return data;
  }

  let toastT;
  function toast(text) {
    let t = document.getElementById("online-toast");
    if (!t) { t = h("div", { id: "online-toast", class: "online-toast", role: "status" }); document.body.append(t); }
    t.textContent = text;
    t.classList.add("widac");
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove("widac"), 2400);
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
  window.Oberza = { ready, add: (x) => cart.add(x), T };

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

  // ── koszyk ──
  const KEY = "oberza-koszyk";
  const cart = {
    items: store.get(KEY, []),
    st: null,
    save() { store.set(KEY, this.items); this.render(); },
    add(x) {
      const i = this.items.find((y) => y.id === x.id && y.wariant === x.wariant);
      if (i) i.ilosc = Math.min(20, i.ilosc + 1); else this.items.push({ ...x, ilosc: 1 });
      this.save();
      const nazwa = (EN ? x.nazwa_en || x.nazwa : x.nazwa) + (x.etykieta ? ` (${x.etykieta})` : "");
      toast(T.dodano(nazwa));
    },
    count() { return this.items.reduce((a, x) => a + x.ilosc, 0); },
    total() { return this.items.reduce((a, x) => a + x.ilosc * x.cena, 0); },
    bar: null,
    render() {
      if (!this.bar) return;
      const n = this.count();
      this.bar.hidden = !n;
      this.bar.querySelector("span").textContent = T.koszyk(n, zl(this.total()));
    },
  };

  function cartBar() {
    cart.bar = h("div", { class: "koszyk", hidden: true },
      h("button", { type: "button", class: "btn", onclick: openOrder }, h("span", {}), h("b", { text: T.zamow + " →" })));
    document.body.append(cart.bar);
    cart.render();
  }

  // ── okno zamówienia ──
  let dlg;
  function dialog(title) {
    dlg?.remove();
    dlg = h("dialog", { class: "okno jasna", "aria-label": title });
    dlg.addEventListener("close", () => { dlg.remove(); dlg = null; });
    dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
    return dlg;
  }

  function errorsInto(form, err) {
    form.querySelectorAll(".blad-pola").forEach((x) => x.remove());
    const pola = err.data?.pola || {};
    for (const [name, text] of Object.entries(pola)) {
      const input = form.elements[name];
      const anchor = input?.closest ? input.closest("label, fieldset") : null;
      if (anchor) anchor.append(h("span", { class: "blad-pola", text }));
    }
    form.querySelector(".wynik-formularza").textContent = err.message;
    const first = form.querySelector(".blad-pola");
    first?.closest("label, fieldset")?.querySelector("input, select, textarea")?.focus();
  }

  function openOrder() {
    const st = cart.st;
    const d = dialog(T.tytul);
    const z = st.zamowienia;
    const lista = h("ul", { class: "koszyk-lista" });
    const suma = h("p", { class: "koszyk-suma" });
    const typy = [["dowoz", T.dowoz, !z.dowoz.aktywny], ["wynos", T.wynos, false]];
    const domyslny = z.dowoz.aktywny ? "dowoz" : "wynos";
    const adres = h("label", { class: "pole cala" }, h("span", { text: T.adres }),
      h("input", { type: "text", name: "adres", autocomplete: "street-address", maxlength: "200", placeholder: T.adresPh }));
    const typSet = h("fieldset", { class: "typ cala" }, h("legend", { class: "sr", text: T.tytul }),
      typy.map(([v, l, off]) => h("label", { class: "wybor-pill" },
        h("input", { type: "radio", name: "typ", value: v, checked: v === domyslny, disabled: off, onchange: refresh }), h("span", { text: off ? `${l} — ${T.dowozNiedostepny}` : l }))));
    const godz = h("select", { name: "godzina" }, h("option", { value: "asap", text: T.asap }), z.godziny.map((g) => h("option", { value: g, text: g })));
    const form = h("form", { class: "formularz", novalidate: true },
      h("h2", { class: "h-m cala", text: T.tytul }),
      lista, suma, typSet,
      h("label", { class: "pole" }, h("span", { text: T.imie }), h("input", { type: "text", name: "imie", autocomplete: "name", required: true, maxlength: "80" })),
      h("label", { class: "pole" }, h("span", { text: T.telefon }), h("input", { type: "tel", name: "telefon", autocomplete: "tel", required: true, maxlength: "30" })),
      adres,
      h("label", { class: "pole" }, h("span", { text: T.kiedy }), godz),
      h("label", { class: "pole cala" }, h("span", {}, T.uwagi + " ", h("small", { text: T.opcj })), h("textarea", { name: "uwagi", rows: "2", maxlength: "500" })),
      h("label", { class: "ukryte-pole", "aria-hidden": "true" }, "Firma", h("input", { type: "text", name: "firma", tabindex: "-1", autocomplete: "off" })),
      h("div", { class: "cala rzad-wyslij" },
        h("button", { class: "btn", type: "submit", text: T.wyslij }),
        h("button", { class: "btn kontur", type: "button", text: T.zamknij, onclick: () => d.close() })),
      h("p", { class: "maly cala", text: T.zgoda }),
      h("p", { class: "wynik-formularza cala", role: "status", "aria-live": "polite" }));

    function refresh() {
      const dow = form.elements.typ.value === "dowoz";
      adres.hidden = !dow;
      lista.replaceChildren(...cart.items.map((x, i) => h("li", {},
        h("span", { class: "nz", text: (EN ? x.nazwa_en || x.nazwa : x.nazwa) + (x.etykieta ? ` (${EN ? x.etykieta_en || x.etykieta : x.etykieta})` : "") }),
        h("span", { class: "ile" },
          h("button", { type: "button", "aria-label": T.mniej, text: "−", onclick: () => { x.ilosc--; if (x.ilosc < 1) cart.items.splice(i, 1); cart.save(); refresh(); } }),
          h("b", { text: String(x.ilosc) }),
          h("button", { type: "button", "aria-label": T.wiecej, text: "+", onclick: () => { x.ilosc = Math.min(20, x.ilosc + 1); cart.save(); refresh(); } })),
        h("span", { class: "cn", text: zl(x.ilosc * x.cena) }))));
      if (!cart.items.length) lista.replaceChildren(h("li", { class: "cichy", text: T.pusty }));
      const fee = dow ? (z.dowoz.oplataZl || 0) * 100 : 0;
      suma.replaceChildren(
        fee ? h("span", { class: "cichy", text: `${T.oplata}: ${zl(fee)}` }) : "",
        dow && z.minimumZl ? h("span", { class: "cichy", text: T.minimum(zl(z.minimumZl * 100)) }) : "",
        h("b", { text: `${T.razem}: ${zl(cart.total() + fee)}` }));
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = form.querySelector("button[type=submit]");
      const f = form.elements;
      btn.disabled = true;
      btn.textContent = T.wysylanie;
      try {
        const r = await api("POST", "/zamowienia", {
          typ: f.typ.value, imie: f.imie.value, telefon: f.telefon.value, adres: f.adres.value, godzina: f.godzina.value,
          uwagi: f.uwagi.value, firma: f.firma.value,
          pozycje: cart.items.map((x) => ({ id: x.id, wariant: x.wariant, ilosc: x.ilosc })),
        });
        cart.items = [];
        cart.save();
        if (r.token) { store.setL("oberza-zamowienie", { token: r.token, t: Date.now() }); showOrderStatus(r.token); }
        else d.close();
      } catch (err) {
        errorsInto(form, err);
      } finally {
        btn.disabled = false;
        btn.textContent = T.wyslij;
      }
    });

    d.append(form);
    document.body.append(d);
    refresh();
    d.showModal();
  }

  let statusTimer;
  function showOrderStatus(token) {
    clearInterval(statusTimer);
    const d = dialog(T.statusTytul);
    const line = h("p", { class: "h-m" });
    const items = h("ul", { class: "koszyk-lista" });
    d.append(h("div", { class: "formularz" },
      h("p", { class: "et cala", text: T.statusTytul }), line, items,
      h("p", { class: "maly cala", text: T.statusInfo }),
      h("div", { class: "cala rzad-wyslij" }, h("button", { class: "btn kontur", type: "button", text: T.zamknij, onclick: () => d.close() }))));
    d.addEventListener("close", () => clearInterval(statusTimer));
    document.body.append(d);
    d.showModal();
    const load = async () => {
      try {
        const o = await api("GET", "/zamowienia/" + token);
        line.textContent = T.st[o.status] + (o.status === "przyjete" && o.eta ? T.eta(o.eta) : "");
        items.replaceChildren(...o.pozycje.map((p) => h("li", {},
          h("span", { class: "nz", text: `${p.ilosc} × ${EN ? p.nazwa_en || p.nazwa : p.nazwa}${p.wariant ? ` (${p.wariant})` : ""}` }),
          h("span", { class: "cn", text: zl(p.suma) }))),
          h("li", {}, h("b", { class: "nz", text: T.razem }), h("b", { class: "cn", text: zl(o.suma) })));
        if (["zrealizowane", "odrzucone"].includes(o.status)) { clearInterval(statusTimer); store.setL("oberza-zamowienie", null); }
        updatePill(o.status);
      } catch { line.textContent = T.blad; clearInterval(statusTimer); }
    };
    load();
    statusTimer = setInterval(load, 15000);
  }

  // Przypomnienie o ostatnim zamówieniu (do 6 h), żeby gość mógł wrócić do statusu.
  let pill;
  function updatePill(status) {
    if (!pill) return;
    pill.hidden = !status || ["zrealizowane", "odrzucone"].includes(status);
    pill.textContent = T.twoje(T.st[status] || "");
  }
  async function orderPill() {
    const last = store.getL("oberza-zamowienie");
    if (!last || Date.now() - last.t > 6 * 3600e3) { store.setL("oberza-zamowienie", null); return; }
    pill = h("button", { type: "button", class: "zamowienie-pill", hidden: true, onclick: () => showOrderStatus(last.token) });
    document.body.append(pill);
    try { updatePill((await api("GET", "/zamowienia/" + last.token)).status); } catch { store.setL("oberza-zamowienie", null); }
  }

  // ── formularz rezerwacji ──
  function reservations(st) {
    const form = document.getElementById("rezerwacja-form");
    if (!form || !st.rezerwacje.online) return;
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
        const pref = r.godziny.find((g) => g >= "18:00") || r.godziny[0];
        f.godzina.value = pref;
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

    const out = form.querySelector(".wynik-formularza");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = form.querySelector("button[type=submit]");
      btn.disabled = true;
      out.textContent = "";
      try {
        const r = await api("POST", "/rezerwacje", {
          data: f.data.value, godzina: f.godzina.value, osoby: Number(f.osoby.value), imie: f.imie.value, telefon: f.telefon.value,
          email: f.email.value, uwagi: f.uwagi.value, rondel: f.rondel.checked, firma: f.firma.value,
        });
        form.querySelectorAll(".blad-pola").forEach((x) => x.remove());
        form.replaceChildren(h("div", { class: "cala potwierdzenie" },
          h("p", { class: "h-m", text: T.rezOk }),
          h("p", { class: "cichy", text: `${r.data} · ${r.godzina} · ${r.osoby} ${EN ? "people" : "os."}` }),
          h("p", { class: "maly", "data-rez-status": true, text: T.rezStatus[r.status] || "" })));
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
    document.querySelectorAll("[data-online]").forEach((el) => { el.hidden = false; });
    document.querySelectorAll("[data-offline]").forEach((el) => { el.hidden = true; });
    const z = st.zamowienia;
    document.querySelectorAll("[data-zamowienia-info]").forEach((el) => { el.textContent = z.mozna ? T.onlineDo(z.do) : T.nieTeraz(z); });
    reservations(st);
    if (z.online) { cart.st = st; cartBar(); }
    orderPill();
  });
})();
