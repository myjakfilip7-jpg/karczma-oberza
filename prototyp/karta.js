// Karczma Oberża — karta dań renderowana z menu.json (PL i PO_ANG z jednego pliku)
// Sam sprawdza język strony. Gdy działa backend (online.js), bierze kartę z /api/menu i dokłada przyciski zamawiania.
const PO_ANG = document.documentElement.lang.startsWith("en");
const BAZA = document.currentScript.dataset.baza || "";

const T = PO_ANG ? {
  wydanie: d => "Edition of " + d + " · prices in PLN",
  wszystkie: n => n + (n === 1 ? " dish" : " dishes") + " on the menu",
  trafienia: (n, q) => n + (n === 1 ? " result" : " results") + " for “" + q + "”",
  pusto: q => "Nothing on the menu matches “" + q + "”",
  blad: "The menu did not load. Refresh the page or call us: +48 505 176 315.",
  niedostepne: "currently unavailable",
  doKoszyka: "+ Add",
  dodaj: (n, w) => `Add ${n}${w ? " " + w : ""} to basket`,
} : {
  wydanie: d => "Wydanie z " + d + " · ceny w złotych",
  wszystkie: n => n + " " + odmiana(n) + " w karcie",
  trafienia: (n, q) => n + " " + odmiana(n) + " dla „" + q + "”",
  pusto: q => "Nie mamy w karcie „" + q + "”",
  blad: "Karta nie wczytała się. Odśwież stronę albo zadzwoń: 505 176 315.",
  niedostepne: "chwilowo niedostępne",
  doKoszyka: "+ Do koszyka",
  dodaj: (n, w) => `Dodaj do koszyka: ${n}${w ? " " + w : ""}`,
};

function odmiana(n) {
  return n === 1 ? "pozycja" : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) ? "pozycje" : "pozycji";
}
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l");
const tl = (obj, pole) => (PO_ANG && obj[pole + "_en"]) || obj[pole];

const nav = document.getElementById("kat-nav");
const lista = document.getElementById("lista");
const wynik = document.getElementById("wynik");
const pusto = document.getElementById("pusto");
const pole = document.getElementById("szukaj");
const form = document.getElementById("szukaj-form");

const zMenuJson = () => fetch(BAZA + "menu.json?v=7").then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(menu => ({ menu, st: null }));
const zrodlo = (window.Oberza ? window.Oberza.ready : Promise.resolve(null)).then(st => !st ? zMenuJson()
  : fetch("/api/menu", { cache: "no-store" }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(menu => ({ menu, st })).catch(zMenuJson));

zrodlo.then(({ menu, st }) => {
  const zamawianie = Boolean(st && st.zamowienia.online && st.zamowienia.mozna);
  const info = document.getElementById("zamowienia-karta");
  if (info && st && st.zamowienia.online) { info.hidden = false; info.textContent = zamawianie ? "" : window.Oberza.T.nieTeraz(st.zamowienia); info.hidden = zamawianie; }
  document.getElementById("wydanie").textContent = T.wydanie(menu.wydanie);
  const wpisy = [];

  menu.kategorie.forEach(k => {
    const a = el("a", "", tl(k, "nazwa"));
    a.href = "#" + k.id;
    nav.append(a);

    const sekcja = el("section", "kat");
    sekcja.id = k.id;
    sekcja.append(el("h2", "kat-h", tl(k, "nazwa")));
    if (k.uwaga) sekcja.append(el("p", "uwaga", tl(k, "uwaga")));
    const ul = el("ul");
    k.pozycje.forEach(p => {
      const li = el("li");
      li.append(el("span", "n", tl(p, "n")), el("span", "c", p.c === "?" ? "—" : p.c));
      // w wersji angielskiej pokazujemy też polską nazwę — tak gość zamawia u kelnera
      if (PO_ANG && p.n_en && p.n_en !== p.n) { const pl = el("span", "pl", p.n); pl.lang = "pl"; li.append(pl); }
      if (p.o) li.append(el("span", "o", tl(p, "o")));
      if (p.g) li.append(el("span", "g", tl(p, "g")));
      if (st && p.dostepne === false) li.append(el("span", "brak", T.niedostepne));
      else if (zamawianie && Array.isArray(p.warianty)) {
        const box = el("span", "dodaj");
        p.warianty.forEach((w, i) => {
          if (w.cena == null) return;
          const etyk = tl(w, "etykieta") || "";
          const b = el("button", "plus", etyk ? `+ ${etyk}` : T.doKoszyka);
          b.type = "button";
          b.setAttribute("aria-label", T.dodaj(tl(p, "n"), etyk));
          b.addEventListener("click", () => window.Oberza.add({ id: p.id, wariant: i, nazwa: p.n, nazwa_en: p.n_en, etykieta: w.etykieta, etykieta_en: w.etykieta_en, cena: w.cena }));
          box.append(b);
        });
        if (box.childNodes.length) li.append(box);
      }
      ul.append(li);
      wpisy.push({ li, sekcja, tekst: norm([p.n, p.o || "", k.nazwa, p.n_en || "", p.o_en || "", k.nazwa_en || ""].join(" ")) });
    });
    sekcja.append(ul);
    lista.append(sekcja);
  });

  const wszystkie = wpisy.length;
  const filtruj = () => {
    const surowe = pole.value.trim();
    const q = norm(surowe);
    form.classList.toggle("ma-tekst", pole.value.length > 0);
    let trafienia = 0;
    const widoczne = new Set();
    wpisy.forEach(w => {
      const pasuje = !q || q.split(/\s+/).every(slowo => w.tekst.includes(slowo));
      w.li.hidden = !pasuje;
      if (pasuje) { trafienia++; widoczne.add(w.sekcja); }
    });
    document.querySelectorAll(".kat").forEach(s => { s.hidden = !widoczne.has(s); });
    nav.querySelectorAll("a").forEach(a => { a.hidden = !widoczne.has(document.getElementById(a.hash.slice(1))); });
    pusto.hidden = trafienia > 0;
    if (!q) wynik.textContent = T.wszystkie(wszystkie);
    else if (trafienia) wynik.textContent = T.trafienia(trafienia, surowe);
    else { wynik.textContent = ""; document.getElementById("pusto-tekst").textContent = T.pusto(surowe); }
  };
  const wyczysc = () => { pole.value = ""; filtruj(); pole.focus(); };
  pole.addEventListener("input", filtruj);
  form.addEventListener("submit", e => { e.preventDefault(); pole.blur(); });
  document.getElementById("wyczysc").addEventListener("click", wyczysc);
  document.getElementById("pusto-wyczysc").addEventListener("click", wyczysc);
  addEventListener("keydown", e => {
    if (e.key === "/" && document.activeElement !== pole) { e.preventDefault(); pole.focus(); }
    if (e.key === "Escape" && document.activeElement === pole && pole.value) wyczysc();
  });
  filtruj();

  // podświetlanie bieżącej kategorii
  const linki = [...nav.querySelectorAll("a")];
  const obs = new IntersectionObserver(wp => wp.forEach(w => {
    if (!w.isIntersecting) return;
    linki.forEach(l => l.classList.toggle("aktywna", l.hash === "#" + w.target.id));
    const akt = nav.querySelector(".aktywna");
    if (akt && nav.scrollWidth > nav.clientWidth) nav.scrollTo({ left: akt.offsetLeft - 20, behavior: "smooth" });
  }), { rootMargin: "-150px 0px -65% 0px" });
  document.querySelectorAll(".kat").forEach(s => obs.observe(s));

  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
}).catch(() => {
  wynik.textContent = "";
  lista.append(el("p", "lead", T.blad));
});

const doGory = document.getElementById("do-gory");
addEventListener("scroll", () => doGory.classList.toggle("widac", scrollY > 900), { passive: true });
doGory.addEventListener("click", () => scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }));
