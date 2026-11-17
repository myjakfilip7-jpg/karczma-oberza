// Karczma Oberża — wspólne zachowania prototypu
document.documentElement.classList.add("js");

// Status „otwarte teraz” liczony w czasie Krynicy (codziennie 12:00–22:00)
(function status() {
  const OD = 12, DO = 22;
  const czesci = new Intl.DateTimeFormat("pl-PL", { timeZone: "Europe/Warsaw", hour: "numeric", minute: "numeric", hour12: false }).formatToParts(new Date());
  const h = Number(czesci.find(c => c.type === "hour").value);
  const otwarte = h >= OD && h < DO;
  const tekst = otwarte ? "Otwarte · do 22:00" : h < OD ? "Zamknięte · otwieramy o 12:00" : "Zamknięte · otwieramy jutro o 12:00";
  document.querySelectorAll("[data-status]").forEach(el => {
    el.textContent = tekst;
    el.dataset.stan = otwarte ? "otwarte" : "zamkniete";
  });
})();

// Nagłówek: tło po przewinięciu
const naglowek = document.querySelector(".naglowek");
if (naglowek && !naglowek.hasAttribute("data-zawsze")) {
  const przewin = () => naglowek.classList.toggle("stala", scrollY > 24);
  addEventListener("scroll", przewin, { passive: true });
  przewin();
}

// Menu mobilne
const btn = document.querySelector(".menu-btn");
const menu = document.getElementById("menu");
if (btn && menu) {
  const ustaw = otwarte => {
    menu.classList.toggle("otwarte", otwarte);
    menu.inert = !otwarte;
    btn.setAttribute("aria-expanded", String(otwarte));
    btn.setAttribute("aria-label", otwarte ? "Zamknij menu" : "Otwórz menu");
    document.body.style.overflow = otwarte ? "hidden" : "";
    if (naglowek) naglowek.classList.toggle("stala", otwarte || scrollY > 24 || naglowek.hasAttribute("data-zawsze"));
  };
  ustaw(false);
  btn.addEventListener("click", () => ustaw(btn.getAttribute("aria-expanded") !== "true"));
  menu.addEventListener("click", e => { if (e.target.closest("a")) ustaw(false); });
  addEventListener("keydown", e => { if (e.key === "Escape" && btn.getAttribute("aria-expanded") === "true") { ustaw(false); btn.focus(); } });
  matchMedia("(min-width: 961px)").addEventListener("change", e => { if (e.matches) ustaw(false); });
}

// Wejścia przy przewijaniu i „wyszywanie” haftu
const obs = new IntersectionObserver(wpisy => wpisy.forEach(w => {
  if (w.isIntersecting) { w.target.classList.add("widac"); obs.unobserve(w.target); }
}), { threshold: 0.12 });
document.querySelectorAll(".pokaz, .haft.szyj").forEach(el => obs.observe(el));
