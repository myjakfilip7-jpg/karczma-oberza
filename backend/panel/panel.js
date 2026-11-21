// Panel właściciela Karczmy Oberża. Bez frameworków; cała treść wstawiana przez textContent (bez innerHTML).
"use strict";

const ORDER_LABEL = { nowe: "Nowe", przyjete: "Przyjęte", w_drodze: "W drodze", gotowe: "Gotowe do odbioru", zrealizowane: "Zrealizowane", odrzucone: "Odrzucone" };
const RES_LABEL = { nowa: "Nowa", potwierdzona: "Potwierdzona", odrzucona: "Odrzucona", anulowana: "Anulowana" };
const DNI = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"];
const POLL_MS = 15000;

const app = document.getElementById("app");
const state = { tab: "zamowienia", ordersView: "aktywne", ordersDate: "", resFrom: "", summary: null, seen: null, sound: false, fresh: new Set(), settings: null };

// ── narzędzia ──
function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k in el && k !== "list" && typeof v !== "string") el[k] = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}
const zl = (gr) => (gr % 100 === 0 ? `${gr / 100} zł` : `${(gr / 100).toFixed(2).replace(".", ",")} zł`);
const godzina = (iso) => new Date(iso).toLocaleTimeString("pl-PL", { timeZone: "Europe/Warsaw", hour: "2-digit", minute: "2-digit" });
const dataPl = (ds) => new Date(ds + "T12:00:00Z").toLocaleDateString("pl-PL", { timeZone: "Europe/Warsaw", weekday: "long", day: "numeric", month: "long" });
const dzisDs = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" }).format(new Date());
const telHref = (t) => "tel:" + t.replace(/[^\d+]/g, "");

let toastTimer;
function toast(text, blad = false) {
  const t = document.getElementById("toast");
  t.textContent = text;
  t.className = "toast" + (blad ? " blad" : "");
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
}

async function api(method, path, body) {
  const res = await fetch("/api" + path, {
    method,
    credentials: "same-origin",
    headers: body !== undefined ? { "content-type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== "/panel/login") { showLogin(); throw new Error("sesja"); }
  if (!res.ok) {
    const err = new Error(data.komunikat || "Nie udało się zapisać.");
    err.data = data;
    throw err;
  }
  return data;
}

async function act(btn, fn, ok) {
  if (btn) btn.disabled = true;
  try { await fn(); if (ok) toast(ok); } catch (e) { if (e.message !== "sesja") toast(e.message, true); } finally { if (btn) btn.disabled = false; }
}

// ── dźwięk nowego zgłoszenia ──
let audio;
function beep() {
  if (!state.sound) return;
  try {
    audio ||= new AudioContext();
    const t0 = audio.currentTime;
    for (const [i, f] of [[0, 880], [0.18, 1175]]) {
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0 + i);
      g.gain.exponentialRampToValueAtTime(0.25, t0 + i + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + i + 0.16);
      o.connect(g).connect(audio.destination);
      o.start(t0 + i);
      o.stop(t0 + i + 0.18);
    }
  } catch { /* przeglądarka bez dźwięku */ }
}

// ── logowanie ──
function showLogin() {
  stopPolling();
  const err = h("p", { class: "blad", role: "alert" });
  const pass = h("input", { type: "password", name: "haslo", autocomplete: "current-password", required: true, "aria-label": "Hasło" });
  const btn = h("button", { class: "btn ok", type: "submit", text: "Zaloguj" });
  const form = h("form", {
    onsubmit: async (e) => {
      e.preventDefault();
      err.textContent = "";
      btn.disabled = true;
      try { await api("POST", "/panel/login", { haslo: pass.value }); start(); } catch (x) { err.textContent = x.message; pass.select(); } finally { btn.disabled = false; }
    },
  }, h("h1", { text: "Karczma Oberża" }), h("p", { text: "Panel obsługi: zamówienia, rezerwacje, karta i godziny." }), pass, btn, err);
  app.replaceChildren(h("div", { class: "login" }, form));
  pass.focus();
}

// ── szkielet ──
const TABS = [["zamowienia", "Zamówienia"], ["rezerwacje", "Rezerwacje"], ["karta", "Karta"], ["godziny", "Godziny"], ["ustawienia", "Ustawienia"]];
let main, badges, statusEl, pauseInput;

function shell() {
  badges = { zamowienia: h("span", { class: "licznik", hidden: true }), rezerwacje: h("span", { class: "licznik", hidden: true }) };
  statusEl = h("span", { class: "stan", text: "…" });
  pauseInput = h("input", { type: "checkbox", onchange: (e) => togglePause(e.target) });
  const sound = h("input", { type: "checkbox", onchange: (e) => { state.sound = e.target.checked; if (state.sound) beep(); } });
  const nav = h("nav", { class: "zakladki", "aria-label": "Sekcje panelu" }, TABS.map(([id, label]) =>
    h("button", { type: "button", "data-tab": id, "aria-current": state.tab === id ? "page" : undefined, onclick: () => go(id) }, label, badges[id] || null)));
  main = h("main", { id: "tresc" });
  app.replaceChildren(
    h("header", { class: "gora" },
      h("div", { class: "pas" },
        h("span", { class: "znak" }, "Oberża", h("small", { text: "panel" })),
        statusEl,
        h("label", { class: "przelacznik alarm", title: "Strona przestaje przyjmować zamówienia, dopóki nie wyłączysz" }, pauseInput, "Wstrzymaj zamówienia"),
        h("label", { class: "przelacznik" }, sound, "Dźwięk"),
        h("button", { class: "przycisk-maly", type: "button", text: "Wyloguj", onclick: async () => { await api("POST", "/panel/logout").catch(() => {}); showLogin(); } })),
      nav),
    main,
  );
}

function go(tab) {
  state.tab = tab;
  document.querySelectorAll(".zakladki button").forEach((b) => { if (b.dataset.tab === tab) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
  render();
}

function render() {
  const views = { zamowienia: viewOrders, rezerwacje: viewReservations, karta: viewMenu, godziny: viewHours, ustawienia: viewSettings };
  main.replaceChildren(h("p", { class: "ladowanie", text: "Ładowanie…" }));
  views[state.tab]().catch((e) => { if (e.message !== "sesja") main.replaceChildren(h("div", { class: "pusto", text: e.message })); });
}

// ── odświeżanie i powiadomienia ──
let pollTimer;
function stopPolling() { clearInterval(pollTimer); pollTimer = null; }

async function poll(first = false) {
  try {
    const s = await api("GET", "/panel/podsumowanie");
    const st = await fetch("/api/status").then((r) => r.json());
    statusEl.textContent = st.otwarte ? `Otwarte do ${st.zamkniecie}` : "Zamknięte";
    statusEl.classList.toggle("zamkniete", !st.otwarte);
    badges.zamowienia.textContent = s.zamowienia.nowe;
    badges.zamowienia.hidden = !s.zamowienia.nowe;
    badges.rezerwacje.textContent = s.rezerwacje.nowe;
    badges.rezerwacje.hidden = !s.rezerwacje.nowe;
    const total = s.zamowienia.nowe + s.rezerwacje.nowe;
    document.title = (total ? `(${total}) ` : "") + "Panel · Karczma Oberża";
    const prev = state.seen;
    state.seen = { z: s.zamowienia.ostatnieId, r: s.rezerwacje.ostatnieId };
    state.summary = s;
    if (!first && prev && (state.seen.z > prev.z || state.seen.r > prev.r)) {
      beep();
      toast(state.seen.z > prev.z ? "Nowe zamówienie" : "Nowa rezerwacja");
      if (state.tab === "zamowienia" && state.seen.z > prev.z) { for (let i = prev.z + 1; i <= state.seen.z; i++) state.fresh.add(i); render(); }
      if (state.tab === "rezerwacje" && state.seen.r > prev.r) render();
    } else if (!first && state.tab === "zamowienia" && state.ordersView !== "historia") {
      // ciche odświeżenie, żeby statusy i czasy zgadzały się z innymi urządzeniami
      viewOrders(true).catch(() => {});
    }
  } catch { /* brak sieci — spróbuje przy kolejnym cyklu */ }
}

async function loadSettings() { state.settings = await api("GET", "/panel/ustawienia"); pauseInput.checked = state.settings.zamowienia.wstrzymane; return state.settings; }

async function togglePause(input) {
  const s = state.settings || (await loadSettings());
  await act(null, async () => {
    s.zamowienia = await api("PUT", "/panel/ustawienia/zamowienia", { ...s.zamowienia, wstrzymane: input.checked });
  }, input.checked ? "Zamówienia online wstrzymane" : "Zamówienia online znów przyjmowane");
  input.checked = s.zamowienia.wstrzymane;
}

// ── zamówienia ──
async function viewOrders(silent = false) {
  let path = "/panel/zamowienia?widok=" + state.ordersView;
  if (state.ordersView === "historia") path += "&data=" + (state.ordersDate || dzisDs());
  const list = await api("GET", path);
  if (state.tab !== "zamowienia") return;
  const seg = h("div", { class: "segment", role: "group", "aria-label": "Widok" },
    [["aktywne", "Aktywne"], ["dzis", "Dziś"], ["historia", "Historia"]].map(([id, l]) =>
      h("button", { type: "button", "aria-pressed": String(state.ordersView === id), onclick: () => { state.ordersView = id; render(); } }, l)));
  const tools = h("div", { class: "pasek-narzedzi" }, h("h2", { text: "Zamówienia" }), seg);
  if (state.ordersView === "historia") {
    tools.append(h("input", { type: "date", value: state.ordersDate || dzisDs(), "aria-label": "Dzień", onchange: (e) => { state.ordersDate = e.target.value; render(); } }));
  }
  const s = state.summary;
  const liczby = s ? h("div", { class: "dzis-liczby" },
    h("span", {}, h("b", { text: s.dzis.zamowien }), "zamówień dziś"),
    h("span", {}, h("b", { text: zl(s.dzis.obrot) }), "wartość"),
    h("span", {}, h("b", { text: s.dzis.rezerwacji }), `rezerwacji dziś (${s.dzis.gosci} os.)`)) : null;
  const body = list.length
    ? h("div", { class: "lista" }, list.map(orderCard))
    : h("div", { class: "pusto", text: state.ordersView === "aktywne" ? "Brak zamówień do obsługi. Nowe pojawią się tu same, z dźwiękiem, jeśli go włączysz." : "Brak zamówień w tym widoku." });
  if (silent && document.activeElement && main.contains(document.activeElement)) return; // nie przerywaj pisania
  main.replaceChildren(...[tools, liczby, body].filter(Boolean));
}

function orderCard(o) {
  const dowoz = o.typ === "dowoz";
  const card = h("article", { class: "karta" + (o.status === "nowe" ? " nowe" : "") + (state.fresh.has(o.id) ? " swieze" : "") });
  state.fresh.delete(o.id);
  const patch = (btn, body, ok) => act(btn, async () => { await api("PATCH", `/panel/zamowienia/${o.id}`, body); render(); poll(); }, ok);
  const akcje = h("div", { class: "akcje" });
  if (o.status === "nowe") {
    const eta = h("select", { "aria-label": "Czas realizacji" }, [20, 30, 45, 60, 75, 90, 120].map((m) => h("option", { value: m, selected: m === (dowoz ? 60 : 30) ? true : undefined }, `${m} min`)));
    const przyjmij = h("button", { class: "btn ok", type: "button", text: "Przyjmij", onclick: () => patch(przyjmij, { status: "przyjete", eta: Number(eta.value) }, `Przyjęto #${o.id}`) });
    const odrzuc = h("button", {
      class: "btn niebezp", type: "button", text: "Odrzuć",
      onclick: () => {
        const powod = prompt("Powód odrzucenia (zobaczy go obsługa; klientowi zadzwoń):", "");
        if (powod === null) return;
        patch(odrzuc, { status: "odrzucone", notatka: powod }, `Odrzucono #${o.id}`);
      },
    });
    akcje.append(eta, przyjmij, odrzuc);
  } else if (o.status === "przyjete") {
    const dalej = h("button", { class: "btn", type: "button", text: dowoz ? "Wyjechało" : "Gotowe do odbioru", onclick: () => patch(dalej, { status: dowoz ? "w_drodze" : "gotowe" }) });
    akcje.append(dalej);
  } else if (o.status === "w_drodze" || o.status === "gotowe") {
    const koniec = h("button", { class: "btn ok", type: "button", text: dowoz ? "Dostarczone" : "Odebrane", onclick: () => patch(koniec, { status: "zrealizowane" }) });
    akcje.append(koniec);
  }
  card.append(...[
    h("div", { class: "naglowek" },
      h("span", { class: "numer", text: `#${o.id}` }),
      h("span", { class: "czas" }, `${godzina(o.utworzono)} · ${o.godzina ? "na " + o.godzina : "jak najszybciej"}`)),
    h("div", { class: "akcje" },
      h("span", { class: "znacznik " + (dowoz ? "dowoz" : "wynos"), text: dowoz ? "Dowóz" : "Na wynos" }),
      h("span", { class: "znacznik st-" + o.status, text: ORDER_LABEL[o.status] + (o.eta && o.status === "przyjete" ? ` · ${o.eta} min` : "") }),
      o.jezyk === "en" ? h("span", { class: "znacznik", text: "EN" }) : null),
    h("div", { class: "klient" },
      h("b", { text: o.imie }),
      o.telefon !== "—" ? h("a", { href: telHref(o.telefon), text: o.telefon }) : null,
      o.adres ? h("a", { href: "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(o.adres + ", Krynica-Zdrój"), target: "_blank", rel: "noopener", text: o.adres }) : null),
    h("ul", { class: "pozycje" }, o.pozycje.map((p) => h("li", {}, h("span", { text: `${p.ilosc} × ${p.nazwa}${p.wariant ? ` (${p.wariant})` : ""}` }), h("span", { text: zl(p.suma) })))),
    h("div", { class: "suma" }, h("span", { text: "Razem" }), h("span", { text: zl(o.suma) })),
    o.uwagi ? h("div", { class: "uwagi", text: o.uwagi }) : null,
    o.notatka ? h("div", { class: "notatka", text: "Notatka: " + o.notatka }) : null,
    akcje.childNodes.length ? akcje : null,
  ].filter(Boolean));
  return card;
}

// ── rezerwacje ──
async function viewReservations() {
  const od = state.resFrom || dzisDs();
  const list = await api("GET", "/panel/rezerwacje?od=" + od);
  if (state.tab !== "rezerwacje") return;
  const tools = h("div", { class: "pasek-narzedzi" }, h("h2", { text: "Rezerwacje" }),
    h("label", { class: "pole" }, h("span", { text: "Od dnia" }), h("input", { type: "date", value: od, onchange: (e) => { state.resFrom = e.target.value; render(); } })));
  if (!list.length) return main.replaceChildren(tools, h("div", { class: "pusto", text: "Brak rezerwacji od tego dnia." }));
  const byDay = new Map();
  for (const r of list) { if (!byDay.has(r.data)) byDay.set(r.data, []); byDay.get(r.data).push(r); }
  const out = [tools];
  for (const [d, rs] of byDay) {
    const goscie = rs.filter((r) => r.status === "nowa" || r.status === "potwierdzona").reduce((a, r) => a + r.osoby, 0);
    out.push(h("h3", { class: "dzien" }, dataPl(d), h("small", { text: `${goscie} os.` })), h("div", { class: "lista" }, rs.map(resCard)));
  }
  main.replaceChildren(...out);
}

function resCard(r) {
  const patch = (btn, body, ok) => act(btn, async () => { await api("PATCH", `/panel/rezerwacje/${r.id}`, body); render(); poll(); }, ok);
  const akcje = h("div", { class: "akcje" });
  if (r.status === "nowa") {
    const ok = h("button", { class: "btn ok", type: "button", text: "Potwierdź", onclick: () => patch(ok, { status: "potwierdzona" }, "Potwierdzono") });
    const no = h("button", { class: "btn niebezp", type: "button", text: "Odrzuć", onclick: () => { if (confirm("Odrzucić tę rezerwację? Zadzwoń do gościa, żeby dać znać.")) patch(no, { status: "odrzucona" }, "Odrzucono"); } });
    akcje.append(ok, no);
  } else if (r.status === "potwierdzona") {
    const c = h("button", { class: "btn niebezp", type: "button", text: "Anuluj", onclick: () => { if (confirm("Anulować potwierdzoną rezerwację?")) patch(c, { status: "anulowana" }, "Anulowano"); } });
    akcje.append(c);
  }
  return h("article", { class: "karta" + (r.status === "nowa" ? " nowe" : "") },
    h("div", { class: "naglowek" }, h("span", { class: "numer", text: r.godzina }), h("span", { class: "czas", text: `${r.osoby} os. · zgłoszono ${godzina(r.utworzono)}` })),
    h("div", { class: "akcje" },
      h("span", { class: "znacznik st-" + r.status, text: RES_LABEL[r.status] }),
      r.rondel ? h("span", { class: "znacznik rondel", text: "Rondel" }) : null,
      r.jezyk === "en" ? h("span", { class: "znacznik", text: "EN" }) : null),
    h("div", { class: "klient" },
      h("b", { text: r.imie }),
      r.telefon !== "—" ? h("a", { href: telHref(r.telefon), text: r.telefon }) : null,
      r.email ? h("a", { href: "mailto:" + r.email, text: r.email }) : null),
    r.uwagi ? h("div", { class: "uwagi", text: r.uwagi }) : null,
    akcje.childNodes.length ? akcje : null);
}

// ── karta dań ──
async function viewMenu() {
  const m = await api("GET", "/panel/menu");
  if (state.tab !== "karta") return;
  const tools = h("div", { class: "pasek-narzedzi" }, h("h2", { text: "Karta" }), h("span", { class: "czas", text: m.wydanie ? `Wydanie z ${m.wydanie}` : "" }));
  const open = new Set([...document.querySelectorAll(".kategoria[open]")].map((d) => d.dataset.id));
  main.replaceChildren(tools, ...m.kategorie.map((k) => {
    const det = h("details", { class: "kategoria", "data-id": k.id, open: open.has(k.id) || undefined },
      h("summary", {}, k.nazwa, h("small", { text: `${k.pozycje.length} poz.` })),
      k.pozycje.map((p) => itemRow(p)),
      h("div", { class: "pozycja" }, h("div", { class: "rzad" }, h("button", { class: "btn drugi", type: "button", text: "+ Dodaj pozycję", onclick: (e) => e.target.closest(".pozycja").replaceWith(itemEditor({ kategoria: k.id, ceny: [{ etykieta: "", etykieta_en: "", cena: null }] }, true)) }))));
    return det;
  }));
}

function priceInput(w, i) {
  return h("input", { type: "number", min: "0", step: "0.5", inputmode: "decimal", value: w.cena == null ? "" : w.cena / 100, "data-i": i, "aria-label": `Cena${w.etykieta ? " " + w.etykieta : ""} w zł`, placeholder: "brak" });
}
const readPrice = (input) => (input.value.trim() === "" ? null : Math.round(Number(input.value.replace(",", ".")) * 100));

function itemRow(p) {
  const prices = p.ceny.map((w, i) => h("label", {}, w.etykieta || "zł", priceInput(w, i)));
  const save = h("button", {
    class: "btn drugi", type: "button", text: "Zapisz cenę",
    onclick: () => act(save, async () => {
      const ceny = p.ceny.map((w, i) => ({ ...w, cena: readPrice(prices[i].querySelector("input")) }));
      if (ceny.some((w) => w.cena !== null && (!Number.isFinite(w.cena) || w.cena < 0))) throw new Error("Wpisz cenę liczbą, np. 29 albo 29,50.");
      Object.assign(p, await api("PATCH", `/panel/menu/pozycje/${encodeURIComponent(p.id)}`, { ceny }));
    }, "Zapisano cenę"),
  });
  const toggle = (field, label) => h("label", { class: "przelacznik" },
    h("input", { type: "checkbox", checked: field === "dostepne" ? p.dostepne : p.ukryte, onchange: (e) => act(null, async () => {
      Object.assign(p, await api("PATCH", `/panel/menu/pozycje/${encodeURIComponent(p.id)}`, { [field]: e.target.checked }));
      row.classList.toggle("ukryta", p.ukryte);
    }, "Zapisano") }), label);
  const row = h("div", { class: "pozycja" + (p.ukryte ? " ukryta" : "") },
    h("div", { class: "rzad" },
      h("div", { class: "nazwa" }, p.nazwa, h("small", { text: [p.porcja, p.opis].filter(Boolean).join(" · ") })),
      h("div", { class: "ceny" }, prices, save),
      toggle("dostepne", "Dostępne"),
      toggle("ukryte", "Ukryte"),
      h("button", { class: "btn drugi", type: "button", text: "Edytuj", onclick: () => row.replaceWith(itemEditor(p, false)) })));
  return row;
}

function itemEditor(p, create) {
  const f = {};
  const field = (key, label, area = false, cls = "") => {
    f[key] = h(area ? "textarea" : "input", area ? { rows: 2 } : { type: "text" });
    f[key].value = p[key] || "";
    return h("label", { class: "pole " + cls }, label, f[key]);
  };
  const variants = (p.ceny || []).map((w) => ({ ...w }));
  const vbox = h("div", { class: "cala siatka" });
  const drawVariants = () => vbox.replaceChildren(...variants.map((w, i) => {
    const lab = h("input", { type: "text", value: w.etykieta, placeholder: "np. 30 cm (puste, gdy jedna cena)", oninput: (e) => { w.etykieta = e.target.value; } });
    const labEn = h("input", { type: "text", value: w.etykieta_en || "", placeholder: "po angielsku", oninput: (e) => { w.etykieta_en = e.target.value; } });
    const pr = priceInput(w, i);
    pr.addEventListener("input", () => { w.cena = readPrice(pr); });
    return h("div", { class: "pole" }, `Cena ${i + 1}`, lab, labEn, pr,
      variants.length > 1 ? h("button", { class: "btn niebezp", type: "button", text: "Usuń cenę", onclick: () => { variants.splice(i, 1); drawVariants(); } }) : null);
  }), variants.length < 4 ? h("button", { class: "btn drugi", type: "button", text: "+ Druga cena (np. rozmiar)", onclick: () => { variants.push({ etykieta: "", etykieta_en: "", cena: null }); drawVariants(); } }) : "");
  drawVariants();
  const saveBtn = h("button", {
    class: "btn ok", type: "button", text: create ? "Dodaj do karty" : "Zapisz",
    onclick: () => act(saveBtn, async () => {
      const body = Object.fromEntries(Object.entries(f).map(([k, el]) => [k, el.value]));
      if (!body.nazwa.trim()) throw new Error("Wpisz nazwę dania.");
      body.ceny = variants;
      if (create) { body.kategoria = p.kategoria; await api("POST", "/panel/menu/pozycje", body); }
      else await api("PATCH", `/panel/menu/pozycje/${encodeURIComponent(p.id)}`, body);
      await viewMenu();
    }, create ? "Dodano pozycję" : "Zapisano"),
  });
  const del = create ? null : h("button", {
    class: "btn niebezp", type: "button", text: "Usuń z karty",
    onclick: () => { if (confirm(`Usunąć „${p.nazwa}” z karty? Jeśli to tylko chwilowo, użyj „Dostępne” albo „Ukryte”.`)) act(del, async () => { await api("DELETE", `/panel/menu/pozycje/${encodeURIComponent(p.id)}`); await viewMenu(); }, "Usunięto"); },
  });
  return h("div", { class: "pozycja" }, h("div", { class: "edycja" },
    field("nazwa", "Nazwa"), field("nazwa_en", "Nazwa po angielsku"),
    field("opis", "Opis", true), field("opis_en", "Opis po angielsku", true),
    field("porcja", "Porcja (np. 400 ml)"), field("porcja_en", "Porcja po angielsku"),
    vbox,
    h("div", { class: "cala akcje" }, del, h("button", { class: "btn drugi", type: "button", text: "Anuluj", onclick: () => viewMenu() }), saveBtn)));
}

// ── godziny ──
async function viewHours() {
  const s = await loadSettings();
  if (state.tab !== "godziny") return;
  const g = structuredClone(s.godziny);
  const week = h("div", { class: "tydzien" }, g.dni.map((d, i) => {
    const od = h("input", { type: "time", value: d.od, "aria-label": `${DNI[i]} od`, oninput: (e) => { d.od = e.target.value; } });
    const doo = h("input", { type: "time", value: d.do, "aria-label": `${DNI[i]} do`, oninput: (e) => { d.do = e.target.value; } });
    const zam = h("input", { type: "checkbox", checked: d.zamkniete, onchange: (e) => { d.zamkniete = e.target.checked; od.disabled = doo.disabled = d.zamkniete; } });
    od.disabled = doo.disabled = d.zamkniete;
    return h("div", { class: "dzien-rzad" }, h("b", { text: DNI[i] }), od, doo, h("label", { class: "przelacznik" }, zam, "Nieczynne"));
  }));
  const exBox = h("div", { class: "tydzien" });
  const drawEx = () => exBox.replaceChildren(...g.wyjatki.map((w, i) => {
    const data = h("input", { type: "date", value: w.data, oninput: (e) => { w.data = e.target.value; } });
    const od = h("input", { type: "time", value: w.od || "12:00", oninput: (e) => { w.od = e.target.value; } });
    const doo = h("input", { type: "time", value: w.do || "22:00", oninput: (e) => { w.do = e.target.value; } });
    const zam = h("input", { type: "checkbox", checked: w.zamkniete, onchange: (e) => { w.zamkniete = e.target.checked; od.disabled = doo.disabled = w.zamkniete; } });
    od.disabled = doo.disabled = w.zamkniete;
    const note = h("input", { type: "text", value: w.notatka || "", placeholder: "np. Wigilia", oninput: (e) => { w.notatka = e.target.value; } });
    return h("div", { class: "wyjatek" }, data, h("label", { class: "przelacznik" }, zam, "Nieczynne"), od, doo, note,
      h("button", { class: "btn niebezp", type: "button", text: "Usuń", onclick: () => { g.wyjatki.splice(i, 1); drawEx(); } }));
  }), h("div", {}, h("button", { class: "btn drugi", type: "button", text: "+ Dodaj dzień", onclick: () => { g.wyjatki.push({ data: dzisDs(), zamkniete: true, od: "12:00", do: "22:00", notatka: "" }); drawEx(); } })));
  drawEx();
  const save = h("button", {
    class: "btn ok", type: "button", text: "Zapisz godziny",
    onclick: () => act(save, async () => {
      const body = { dni: g.dni, wyjatki: g.wyjatki.map((w) => (w.zamkniete ? { data: w.data, zamkniete: true, notatka: w.notatka } : w)) };
      try { s.godziny = await api("PUT", "/panel/ustawienia/godziny", body); } catch (e) { throw new Error("Sprawdź godziny: zamknięcie musi być po otwarciu, a każdy dzień wyjątku tylko raz."); }
    }, "Zapisano godziny"),
  });
  main.replaceChildren(
    h("div", { class: "pasek-narzedzi" }, h("h2", { text: "Godziny otwarcia" })),
    h("section", { class: "sekcja" }, h("h3", { text: "Zwykły tydzień" }), h("p", { class: "opis", text: "Na tej podstawie strona pokazuje „otwarte/zamknięte”, terminy rezerwacji i okno zamówień." }), week),
    h("section", { class: "sekcja" }, h("h3", { text: "Wyjątki" }), h("p", { class: "opis", text: "Święta, imprezy zamknięte, skrócone dni. Mają pierwszeństwo przed zwykłym tygodniem." }), exBox),
    h("div", { class: "stopka-sekcji" }, save));
}

// ── ustawienia ──
async function viewSettings() {
  const s = await loadSettings();
  if (state.tab !== "ustawienia") return;
  const num = (obj, key, label, opis) => {
    const el = h("input", { type: "number", min: "0", value: obj[key], oninput: (e) => { obj[key] = Number(e.target.value); } });
    return h("label", { class: "pole" }, label, opis ? h("span", { text: opis }) : null, el);
  };
  const sw = (obj, key, label) => h("label", { class: "przelacznik" }, h("input", { type: "checkbox", checked: obj[key], onchange: (e) => { obj[key] = e.target.checked; } }), label);
  const txt = (obj, key, label, area = false) => {
    const el = h(area ? "textarea" : "input", area ? { rows: 2 } : { type: "text" });
    el.value = obj[key] || "";
    el.addEventListener("input", () => { obj[key] = el.value; });
    return h("label", { class: "pole" }, label, el);
  };
  const saveBtn = (name, obj, ok) => {
    const b = h("button", { class: "btn ok", type: "button", text: "Zapisz", onclick: () => act(b, async () => { s[name] = await api("PUT", `/panel/ustawienia/${name}`, obj); if (name === "zamowienia") pauseInput.checked = s.zamowienia.wstrzymane; }, ok) });
    return h("div", { class: "stopka-sekcji" }, b);
  };
  const z = structuredClone(s.zamowienia);
  const d = structuredClone(s.dowoz);
  const r = structuredClone(s.rezerwacje);
  const k = structuredClone(s.komunikat);
  const kDo = h("input", { type: "date", value: k.do || "", oninput: (e) => { k.do = e.target.value; } });
  main.replaceChildren(
    h("div", { class: "pasek-narzedzi" }, h("h2", { text: "Ustawienia" })),
    h("section", { class: "sekcja" }, h("h3", { text: "Komunikat na stronie" }),
      h("p", { class: "opis", text: "Pasek na górze strony, np. „W Wigilię nieczynne”. Zostaw pusty, żeby go ukryć." }),
      h("div", { class: "siatka" }, txt(k, "tekst", "Po polsku", true), txt(k, "tekst_en", "Po angielsku (opcjonalnie)", true), h("label", { class: "pole" }, "Pokazuj do dnia", h("span", { text: "puste = bez końca" }), kDo)),
      saveBtn("komunikat", k, "Zapisano komunikat")),
    h("section", { class: "sekcja" }, h("h3", { text: "Zamówienia online" }),
      h("div", { class: "siatka" }, sw(z, "online", "Przyjmuj zamówienia przez stronę"), sw(z, "wstrzymane", "Wstrzymane (kuchnia pełna)")),
      h("div", { class: "siatka" },
        num(z, "ostatnieMinPrzedZamknieciem", "Ostatnie zamówienie", "minut przed zamknięciem"),
        num(z, "czasPrzygotowaniaMin", "Najwcześniejszy odbiór", "minut od złożenia"),
        num(z, "czasDostawyMin", "Czas dostawy pokazywany gościom", "minut"),
        num(z, "minimumZl", "Minimalna kwota dowozu", "zł, 0 = brak")),
      saveBtn("zamowienia", z, "Zapisano")),
    h("section", { class: "sekcja" }, h("h3", { text: "Dowóz" }),
      h("div", { class: "siatka" }, sw(d, "aktywny", "Dowóz dostępny"), txt(d, "obszar", "Obszar dowozu"), txt(d, "obszar_en", "Obszar po angielsku"), num(d, "oplataZl", "Opłata za dowóz", "zł, 0 = darmowy")),
      saveBtn("dowoz", d, "Zapisano")),
    h("section", { class: "sekcja" }, h("h3", { text: "Rezerwacje online" }),
      h("div", { class: "siatka" }, sw(r, "online", "Przyjmuj rezerwacje przez stronę")),
      h("div", { class: "siatka" },
        num(r, "maksOsob", "Największa grupa online", "więcej osób = telefon"),
        num(r, "limitOsobNaGodzine", "Limit gości na godzinę", "0 = bez limitu"),
        num(r, "minWyprzedzenieMin", "Najkrócej przed wizytą", "minut"),
        num(r, "ostatniaMinPrzedZamknieciem", "Ostatnia rezerwacja", "minut przed zamknięciem"),
        num(r, "dniNaprzod", "Rezerwacje do przodu", "dni")),
      saveBtn("rezerwacje", r, "Zapisano")),
  );
}

// ── start ──
async function start() {
  shell();
  await loadSettings().catch(() => {});
  await poll(true);
  render();
  stopPolling();
  pollTimer = setInterval(() => poll(), POLL_MS);
}

fetch("/api/panel/sesja", { credentials: "same-origin" }).then((r) => (r.ok ? start() : showLogin())).catch(showLogin);
