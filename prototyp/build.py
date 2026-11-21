#!/usr/bin/env python3
"""Generator stron prototypu Karczmy Oberża (PL + EN) z jednego źródła.

Uruchom:  python3 build.py
Tworzy:   index.html, karta.html, dowoz.html oraz en/index.html, en/karta.html, en/dowoz.html
Teksty są w słownikach PL i EN poniżej. Dania i ceny są w menu.json.
"""
from pathlib import Path

TU = Path(__file__).parent
V = "7"  # podbij po zmianie CSS/JS, żeby przeglądarki pobrały nowe pliki

G = "https://lh3.googleusercontent.com/"
FOTO = {
    "hero": G + "p/AF1QipOSeys_npF8Xah7IwXnAehq6G_f6IDwejX0O6Ee",
    "rondel": G + "DvEfEYEnMaFjNR80USnoaYkQ0IC77WeWu5UMaJc1zP1Ab2JbsyghBpxNZf3Wg7Ee8x7iE1plhD074zsDxA",
    "sala1": G + "p/AF1QipNoap9a81pJ_YAtxOZfeL4Tcv0ag-Ii3Z2Izvqs",
    "sala2": G + "kW-tjC2bmHlWuEyp4dfy6Sqc_hebBILbNXSdo7TzTmK62GlUMNDMIkmInXxBeQCiMAhHa32xYh4dE7Favw",
    "sala3": G + "Mr0HQ7Bultxn5wUZh1g30zfcVMkGtJTIrLKTRjTs95meieqEaQiz3XyR6kpFG92RQmITJpL-OrYUATPihQ",
    "placki": G + "p/AF1QipNWTpvurcGIDxCuzmfPUa67HhGbkCvC5QpPA7c9",
}
TEL = "tel:+48505176315"
MAPA_TRASA = "https://www.google.com/maps/dir/?api=1&destination=Karczma+Ober%C5%BCa,+Pi%C5%82sudskiego+23,+Krynica-Zdr%C3%B3j"
MAPA_OPINIE = "https://www.google.com/maps/search/?api=1&query=Karczma+Ober%C5%BCa+Krynica-Zdr%C3%B3j+Pi%C5%82sudskiego+23"
MAPA_EMBED = "https://www.google.com/maps?q=Karczma+Ober%C5%BCa,+Pi%C5%82sudskiego+23,+Krynica-Zdr%C3%B3j&output=embed"
FONTY = "https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,500;1,6..96,400&family=Hanken+Grotesk:wght@400;500;600&display=swap"
WM = '<small>KARCZMA</small><b>OBER<i class="z">Z</i>A</b>'
STRZ = '<span class="strz" aria-hidden="true">→</span>'
STRZ_Z = '<span class="strz" aria-hidden="true">↗</span>'

PL = dict(
    lang="pl", inny="en", inny_kod="EN", inny_dlugi="English version", inny_aria="English version",
    skok="Przejdź do treści", nav_aria="Główna", szybkie="Szybkie akcje", otworz_menu="Otwórz menu", home_aria="strona główna",
    n_karta="Karta", n_rondel="Rondel", n_karczma="Karczma", n_dowoz="Dowóz", n_kontakt="Kontakt", n_start="Strona główna",
    m_pozycji="60 pozycji", m_czterech="dla czterech", m_darmowy="darmowy w Krynicy",
    codziennie="Codziennie 12:00–22:00", adres_krotki="Piłsudskiego 23, Krynica-Zdrój", adres_menu="ul. Piłsudskiego 23, Krynica-Zdrój",
    tel_txt="505 176 315", zadzwon="Zadzwoń", zadzwon_dlugi="Zadzwoń 505 176 315", zadzwon_aria="Zadzwoń: 505 176 315", dojazd="Dojazd",
    zl="zł",
    # strona główna
    t_index="Karczma Oberża — Krynica-Zdrój · swojskie smaki, ciepło i gościnność",
    d_index="Karczma Oberża w Krynicy-Zdroju: golonka z pieca, kwaśnica z żeberkiem, pierogi i pizza. Codziennie 12:00–22:00, darmowa dostawa w Krynicy. Tel. 505 176 315.",
    hero_et="Karczma · Krynica-Zdrój", hero_h1="Swojskie smaki, ciepło i gościnność",
    hero_cta="Zobacz kartę", hero_link="Zamów z dowozem", hero_ocena="4,5 w Google · 4 589 opinii",
    man_et="Karczma",
    man_1="Drewno, kominek i stół zastawiony po swojemu. Gotujemy tradycyjnie, według sprawdzonych receptur, z sezonowych i lokalnych produktów.",
    man_2="Na rodzinny obiad, wieczór z przyjaciółmi albo porządny posiłek po zejściu z gór.",
    alt_sala1="Sala Karczmy Oberża", alt_sala2="Wnętrze Karczmy Oberża wieczorem",
    spec_et="Z naszej kuchni", spec_h2="Po to się do nas wraca", spec_link="Cała karta",
    spec=[
        ("dania-glowne", "Golonka pieczona", "Z kością, na kapuście zasmażanej, z musztardą, chrzanem i pieczywem.", "69"),
        ("zupy", "Kwaśnica z żeberkiem", "650 ml. Porcja, która wystarczy za cały obiad.", "28"),
        ("zupy", "Żurek w chlebie", "Podany w wydrążonym bochenku.", "32"),
        ("pierogi", "Pyzdryki z jagnięciną", "Dziesięć pierogów z jagnięciną, z okrasą ze skwarek.", "45"),
        ("dania-glowne", "Górski pstrąg smażony", "Z frytkami i sałatką szefa.", "67"),
        ("dania-glowne", "Pieczeń wieprzowa Bacy", "W sosie borowikowym, z kopytkami i burakami.", "63"),
    ],
    ron_et="Dla całej kompanii", ron_h2="Rondel Głodnego Chłopa",
    ron_rym="A jak przyjdziesz z kompanią całą, to wołaj o RONDEL.",
    ron_opis="Golonka, żebro BBQ, pieczeń w borowikach, dwa rodzaje mięsa z grilla, trzy rodzaje pierogów, smażone ziemniaczki i kapusta zasmażana. Jeden rondel na środek stołu.",
    ron_cena="249 zł", ron_dla="dla czterech osób", ron_cta="Zarezerwuj stół", alt_rondel="Rondel Głodnego Chłopa: żeliwna patelnia z mięsami, pierogami i ziemniakami",
    dow_et="Dowóz i na wynos", dow_link="Jak działa dowóz",
    kroki=[("Wybierzcie z karty", "Wszystkie dania z cenami i gramaturami są na stronie."),
           ("Zadzwońcie", "Przyjmujemy zamówienia codziennie od 12:00 do 22:00."),
           ("Odbierzcie", "Darmowa dostawa w Krynicy-Zdroju albo odbiór w karczmie.")],
    op_et="Opinie gości", op_cytat="Golonka rozpływa się w ustach", op_zrodlo="z opinii w Google",
    op_ocena="4,5", op_ile="4 589 opinii w Google", op_link="Czytaj opinie",
    tematy=[("Jedzenie", "Goście najczęściej wracają po golonkę, kwaśnicę z żeberkiem i placki z gulaszem."),
            ("Obsługa", "Uprzejmi kelnerzy z poczuciem humoru, chwaleni w opiniach z imienia. Dania na stole zwykle w kwadrans."),
            ("Klimat", "Nastrojowe wnętrze z kominkiem i porcje, po których nikt nie wychodzi głodny.")],
    gal_et="Galeria", gal_h2="Zajrzyjcie do środka", gal_link="Więcej na Instagramie",
    alt_g=["Danie i kufel na stole w Karczmie Oberża", "Sala Karczmy Oberża z gośćmi", "Talerz z plackami ziemniaczanymi i gulaszem", "Wnętrze Karczmy Oberża wieczorem", "Rondel Głodnego Chłopa"],
    kon_et="Kontakt", kon_h2="Do zobaczenia przy stole",
    k_dzis="Dziś", k_godziny="Godziny", k_adres="Adres", k_tel="Telefon", k_mail="E-mail",
    kon_adres="ul. Piłsudskiego 23<br>33-380 Krynica-Zdrój", kon_trasa="Wyznacz trasę", mapa_tytul="Mapa dojazdu do Karczmy Oberża",
    # stopka
    f_odwiedz="Odwiedź nas", f_miasto="33-380 Krynica-Zdrój", f_zamow="Zamów", f_karta="Karta dań", f_dowoz="Dowóz i na wynos", f_obserwuj="Obserwuj",
    f_nota="Prototyp strony · zdjęcia tymczasowe z wizytówki Google", f_wroc="Wróć do researchu",
    # karta
    t_karta="Karta dań — Karczma Oberża, Krynica-Zdrój",
    d_karta="Karta dań Karczmy Oberża w Krynicy-Zdroju: zupy, dania główne, pierogi, burgery, pizza i desery z cenami.",
    kar_et="Ceny w złotych", kar_h1="Karta dań", kar_szukaj="Szukaj w karcie", kar_ph="Szukaj dania lub składnika", kar_wyczysc="Wyczyść wyszukiwanie",
    kar_kat="Kategorie", kar_noscript="Karta wymaga włączonego JavaScriptu. Zadzwoń: 505 176 315.",
    kar_pusto="Spróbuj krótszego słowa, na przykład „pierogi” albo „oscypek”. Możesz też zapytać o danie telefonicznie.",
    kar_cala="Pokaż całą kartę", kar_gora="Wróć na górę karty",
    # dowóz
    t_dowoz="Dowóz i na wynos — Karczma Oberża, Krynica-Zdrój",
    d_dowoz="Darmowy dowóz jedzenia w Krynicy-Zdroju z Karczmy Oberża: dania z karty, pizza, burgery i pierogi. Zamówienia telefoniczne codziennie 12:00–22:00, tel. 505 176 315.",
    dz_h1="Oberża przyjedzie do Was",
    dz_lead="Darmowa dostawa na terenie Krynicy-Zdroju. Zamawiacie telefonicznie, my pakujemy tak, żeby dojechało gorące.",
    dz_m2="Darmowa dostawa w Krynicy-Zdroju", dz_m3="Na wynos: odbiór przy Piłsudskiego 23",
    dz_co_et="Co zamówić", dz_co_h2="Cała karta jedzie w dowozie",
    dz_kat=[("pizza", "Pizza", "Trzynaście rodzajów, w tym Góralska z oscypkiem i żurawiną. 22 lub 30 cm."),
            ("burgery", "Burgery", "Z frytkami w zestawie. Jest też wegetariański z camembertem."),
            ("pierogi", "Pierogi", "Po dziesięć sztuk, z okrasą ze skwarek. Ruskie, z kapustą, z mięsem, z rydzami."),
            ("dania-glowne", "Dania główne", "Golonka, żeberko BBQ, pstrąg, gulasze. Z dodatkami w cenie."),
            ("zupy", "Zupy", "Kwaśnica z żeberkiem, żurek, rosół, flaczki."),
            ("rondel", "Rondel dla czterech", "Golonka, żebro, pieczeń, pierogi i dodatki na kolację dla całej ekipy.")],
    dz_jak_et="Jak zamówić", dz_jak_h2="Trzy kroki, jeden telefon",
    dz_kroki=[("Wybierzcie z karty", 'Wszystkie dania z cenami i gramaturami są w <a href="karta.html">karcie</a>. Wyszukiwarka znajdzie też składnik.'),
              ("Zadzwońcie", "505 176 315, codziennie od 12:00 do 22:00. Podajcie adres i numer do kontaktu."),
              ("Odbierzcie", "Kierowca przywiezie zamówienie pod drzwi. Na wynos odbierzecie je w karczmie.")],
    dz_pyt_et="Pytania", dz_pyt_h2="Zanim zadzwonicie",
    dz_pyt=[("Dokąd dowozicie?", "Na terenie Krynicy-Zdroju dowozimy za darmo. Jeśli mieszkacie poza miastem, zapytajcie przez telefon, czy dojedziemy."),
            ("W jakich godzinach przyjmujecie zamówienia?", "Codziennie od 12:00 do 22:00. W święta godziny bywają inne, ogłaszamy je na Facebooku."),
            ("Ile czeka się na dostawę?", "To zależy od pory dnia i wielkości zamówienia. Przybliżony czas podamy od razu przy zamówieniu."),
            ("Jak mogę zapłacić?", "Formę płatności ustalicie z nami przy składaniu zamówienia."),
            ("Czy mogę zamówić na konkretną godzinę?", "Tak, zadzwońcie wcześniej i podajcie godzinę. Przy większych zamówieniach, na przykład kilku Rondlach, prosimy o telefon z wyprzedzeniem.")],
    dz_nota="Prototyp strony · warunki dowozu do potwierdzenia z karczmą",
    dz_online_cta="Zamów online z karty",
    rz_et="Rezerwacja", rz_h2="Zarezerwuj stolik",
    rz_opis="Wybierz dzień i godzinę. Rezerwację potwierdzimy telefonicznie albo e-mailem. Przy większej grupie zadzwoń: 505 176 315.",
    rz_data="Dzień", rz_godzina="Godzina", rz_wybierz="Najpierw wybierz dzień", rz_osoby="Liczba osób", rz_imie="Imię i nazwisko",
    rz_tel="Telefon", rz_email="E-mail", opcj="(opcjonalnie)", rz_uwagi="Uwagi", rz_uwagi_ph="np. urodziny, krzesełko dla dziecka",
    rz_rondel="Zamawiamy Rondel Głodnego Chłopa (danie dla 4 osób, 249 zł)", rz_wyslij="Wyślij rezerwację",
    rz_zgoda="Dane z formularza wykorzystamy tylko do obsługi tej rezerwacji.",
    meta_js='(n === 1 ? ceny[0] + " zł" : n + " " + (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? "pozycje" : "pozycji") + " · od " + Math.min(...ceny) + " zł")',
)

EN = dict(
    lang="en", inny="pl", inny_kod="PL", inny_dlugi="Wersja polska", inny_aria="Wersja polska",
    skok="Skip to content", nav_aria="Main", szybkie="Quick actions", otworz_menu="Open menu", home_aria="home",
    n_karta="Menu", n_rondel="Rondel", n_karczma="The inn", n_dowoz="Delivery", n_kontakt="Contact", n_start="Home",
    m_pozycji="60 dishes", m_czterech="for four", m_darmowy="free in Krynica",
    codziennie="Daily 12:00–22:00", adres_krotki="Piłsudskiego 23, Krynica-Zdrój", adres_menu="ul. Piłsudskiego 23, Krynica-Zdrój, Poland",
    tel_txt="+48 505 176 315", zadzwon="Call", zadzwon_dlugi="Call +48 505 176 315", zadzwon_aria="Call: +48 505 176 315", dojazd="Directions",
    zl="PLN",
    t_index="Karczma Oberża — traditional Polish restaurant in Krynica-Zdrój",
    d_index="Karczma Oberża in Krynica-Zdrój: roast pork knuckle, highlander sauerkraut soup, pierogi and pizza. Open daily 12:00–22:00, free delivery in Krynica. Tel. +48 505 176 315.",
    hero_et="Traditional inn · Krynica-Zdrój", hero_h1="Home-style cooking, warmth and hospitality",
    hero_cta="See the menu", hero_link="Order delivery", hero_ocena="4.5 on Google · 4,589 reviews",
    man_et="The inn",
    man_1="Timber, a fireplace and a table laid the local way. We cook traditional Polish food from proven recipes, with seasonal and local produce.",
    man_2="For a family lunch, an evening with friends or a proper meal after a day in the mountains.",
    alt_sala1="The dining room at Karczma Oberża", alt_sala2="Karczma Oberża in the evening",
    spec_et="From our kitchen", spec_h2="What people come back for", spec_link="Full menu",
    spec=[
        ("dania-glowne", "Roast pork knuckle", "On the bone, on braised cabbage, with mustard, horseradish and bread.", "69"),
        ("zupy", "Kwaśnica with a pork rib", "Highlander sauerkraut soup. 650 ml, a meal in itself.", "28"),
        ("zupy", "Żurek in a bread bowl", "Sour rye soup served in a hollowed-out loaf.", "32"),
        ("pierogi", "Pyzdryki, lamb pierogi", "Ten dumplings filled with lamb, topped with pork cracklings.", "45"),
        ("dania-glowne", "Pan-fried mountain trout", "With fries and chef's salad.", "67"),
        ("dania-glowne", "Shepherd's roast pork", "In porcini sauce, with potato dumplings and beetroot.", "63"),
    ],
    ron_et="For the whole table", ron_h2="The Hungry Peasant's Pan",
    ron_rym="Bring the whole company and call for the RONDEL.",
    ron_opis="Pork knuckle, BBQ ribs, roast pork in porcini sauce, two kinds of grilled meat, three kinds of pierogi, fried potatoes and braised cabbage. One pan for the middle of the table. Ask for “Rondel Głodnego Chłopa”.",
    ron_cena="249 PLN", ron_dla="for four people", ron_cta="Book a table", alt_rondel="The Hungry Peasant's Pan: a cast-iron pan of meats, pierogi and potatoes",
    dow_et="Delivery and takeaway", dow_link="How delivery works",
    kroki=[("Choose from the menu", "Every dish, with prices and portion sizes, is on this site."),
           ("Call us", "We take orders daily from 12:00 to 22:00."),
           ("Collect", "Free delivery within Krynica-Zdrój, or pick up at the inn.")],
    op_et="Guest reviews", op_cytat="The pork knuckle melts in your mouth", op_zrodlo="from a Google review, translated",
    op_ocena="4.5", op_ile="4,589 Google reviews", op_link="Read the reviews",
    tematy=[("Food", "Guests come back most often for the pork knuckle, the kwaśnica with a pork rib and the potato pancakes with goulash."),
            ("Service", "Friendly waiters with a sense of humour, praised by name in reviews. Food usually reaches the table in about fifteen minutes."),
            ("Atmosphere", "A cosy interior with a fireplace, and portions nobody leaves hungry after.")],
    gal_et="Gallery", gal_h2="Take a look inside", gal_link="More on Instagram",
    alt_g=["A dish and a mug of beer on a table at Karczma Oberża", "The dining room with guests", "A plate of potato pancakes and goulash", "Karczma Oberża in the evening", "The Hungry Peasant's Pan"],
    kon_et="Contact", kon_h2="See you at the table",
    k_dzis="Today", k_godziny="Hours", k_adres="Address", k_tel="Phone", k_mail="Email",
    kon_adres="ul. Piłsudskiego 23<br>33-380 Krynica-Zdrój, Poland", kon_trasa="Get directions", mapa_tytul="Map showing Karczma Oberża",
    f_odwiedz="Visit us", f_miasto="33-380 Krynica-Zdrój, Poland", f_zamow="Order", f_karta="Menu", f_dowoz="Delivery and takeaway", f_obserwuj="Follow",
    f_nota="Website prototype · temporary photos from the Google listing", f_wroc="Back to the research",
    t_karta="Menu — Karczma Oberża, Krynica-Zdrój",
    d_karta="The menu at Karczma Oberża in Krynica-Zdrój: soups, main courses, pierogi, burgers, pizza and desserts, with prices in PLN.",
    kar_et="Prices in PLN", kar_h1="Menu", kar_szukaj="Search the menu", kar_ph="Search a dish or ingredient", kar_wyczysc="Clear search",
    kar_kat="Categories", kar_noscript="The menu needs JavaScript. Call us: +48 505 176 315.",
    kar_pusto="Try a shorter word, such as “pierogi” or “trout”. You can also ask about a dish by phone.",
    kar_cala="Show the full menu", kar_gora="Back to the top of the menu",
    t_dowoz="Delivery and takeaway — Karczma Oberża, Krynica-Zdrój",
    d_dowoz="Free food delivery in Krynica-Zdrój from Karczma Oberża: dishes from the menu, pizza, burgers and pierogi. Phone orders daily 12:00–22:00, tel. +48 505 176 315.",
    dz_h1="Oberża comes to you",
    dz_lead="Free delivery within Krynica-Zdrój. You order by phone, we pack it to arrive hot. From a foreign phone, dial +48 first.",
    dz_m2="Free delivery in Krynica-Zdrój", dz_m3="Takeaway: collect at Piłsudskiego 23",
    dz_co_et="What to order", dz_co_h2="The whole menu travels",
    dz_kat=[("pizza", "Pizza", "Thirteen kinds, including Góralska with oscypek cheese and cranberry. 22 or 30 cm."),
            ("burgery", "Burgers", "Served with fries. There is a vegetarian one with camembert too."),
            ("pierogi", "Pierogi", "Ten dumplings a portion, topped with pork cracklings. Potato and cheese, cabbage, meat, wild mushroom."),
            ("dania-glowne", "Main courses", "Pork knuckle, BBQ ribs, trout, goulash. Sides included."),
            ("zupy", "Soups", "Kwaśnica with a pork rib, sour rye soup, chicken broth, tripe soup."),
            ("rondel", "The pan for four", "Pork knuckle, ribs, roast pork, pierogi and sides: dinner for the whole group.")],
    dz_jak_et="How to order", dz_jak_h2="Three steps, one phone call",
    dz_kroki=[("Choose from the menu", 'Every dish, with prices and portion sizes, is on the <a href="karta.html">menu</a>. Each one shows its Polish name, which helps on the phone.'),
              ("Call us", "+48 505 176 315, daily from 12:00 to 22:00. Give your address and a contact number."),
              ("Collect", "The driver brings your order to the door. Takeaway orders are collected at the inn.")],
    dz_pyt_et="Questions", dz_pyt_h2="Before you call",
    dz_pyt=[("Where do you deliver?", "Delivery is free within Krynica-Zdrój. If you are staying outside the town, ask on the phone whether we can reach you."),
            ("When do you take orders?", "Daily from 12:00 to 22:00. Hours can differ on public holidays; we announce them on Facebook."),
            ("How long does delivery take?", "It depends on the time of day and the size of the order. We will give you an estimate when you order."),
            ("How can I pay?", "You agree the payment method with us when you place the order."),
            ("Can I order for a set time?", "Yes. Call ahead and tell us the time. For larger orders, such as several pans for four, please call well in advance.")],
    dz_nota="Website prototype · delivery terms to be confirmed with the restaurant",
    dz_online_cta="Order online from the menu",
    rz_et="Booking", rz_h2="Book a table",
    rz_opis="Choose a day and time. We will confirm by phone or email. For a larger group, please call +48 505 176 315.",
    rz_data="Day", rz_godzina="Time", rz_wybierz="Choose a day first", rz_osoby="Number of people", rz_imie="Full name",
    rz_tel="Phone", rz_email="Email", opcj="(optional)", rz_uwagi="Notes", rz_uwagi_ph="e.g. birthday, high chair",
    rz_rondel="We would like the Hungry Peasant's Pan (a dish for 4, 249 PLN)", rz_wyslij="Send booking request",
    rz_zgoda="We will use these details only to handle this booking.",
    meta_js='(n === 1 ? ceny[0] + " PLN" : n + " dishes · from " + Math.min(...ceny) + " PLN")',
)


def glowa(t, tytul, opis, plik, baza):
    pl = plik if t["lang"] == "pl" else "../" + plik
    en = "en/" + plik if t["lang"] == "pl" else plik
    return f'''<!doctype html>
<html lang="{t["lang"]}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex">
<meta name="referrer" content="no-referrer">
<meta name="theme-color" content="#12100e">
<title>{tytul}</title>
<meta name="description" content="{opis}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://lh3.googleusercontent.com">
<link href="{FONTY}" rel="stylesheet">
<link rel="alternate" hreflang="pl" href="{pl}">
<link rel="alternate" hreflang="en" href="{en}">
<link rel="stylesheet" href="{baza}strona.css?v={V}">
</head>
<body>
<a class="skok" href="#tresc">{t["skok"]}</a>
'''


def naglowek(t, plik, zawsze):
    inny = ("en/" + plik) if t["lang"] == "pl" else ("../" + plik)
    k = lambda p: ' aria-current="page"' if p == plik else ""
    start = "index.html" if plik != "index.html" else ""
    return f'''
<header class="naglowek{" stala" if zawsze else ""}"{" data-zawsze" if zawsze else ""}>
  <div class="wrap">
    <a class="wm" href="{start or "#top"}" aria-label="Karczma Oberża — {t["home_aria"]}">{WM}</a>
    <nav class="nawigacja" aria-label="{t["nav_aria"]}">
      <a href="karta.html"{k("karta.html")}>{t["n_karta"]}</a>
      <a href="{start}#rondel">{t["n_rondel"]}</a>
      <a href="{start}#karczma">{t["n_karczma"]}</a>
      <a href="dowoz.html"{k("dowoz.html")}>{t["n_dowoz"]}</a>
      <a href="{start}#kontakt">{t["n_kontakt"]}</a>
    </nav>
    <div class="prawa">
      <span class="status" data-status>{t["codziennie"]}</span>
      <a class="jezyk" href="{inny}" lang="{t["inny"]}" hreflang="{t["inny"]}" aria-label="{t["inny_aria"]}">{t["inny_kod"]}</a>
      <a class="tel" href="{TEL}">505 176 315</a>
      <button class="menu-btn" type="button" aria-controls="menu" aria-expanded="false" aria-label="{t["otworz_menu"]}"><span></span><span></span></button>
    </div>
  </div>
</header>

<div class="menu" id="menu">
  {f'<a class="duzy" href="index.html">{t["n_start"]}</a>' if start else ""}
  <a class="duzy" href="karta.html">{t["n_karta"]} <span>{t["m_pozycji"]}</span></a>
  <a class="duzy" href="{start}#rondel">{t["n_rondel"]} <span>{t["m_czterech"]}</span></a>
  <a class="duzy" href="{start}#karczma">{t["n_karczma"]}</a>
  <a class="duzy" href="dowoz.html">{t["n_dowoz"]} <span>{t["m_darmowy"]}</span></a>
  <a class="duzy" href="{start}#kontakt">{t["n_kontakt"]}</a>
  <div class="dol">
    <span class="status" data-status>{t["codziennie"]}</span>
    <span class="cichy">{t["adres_menu"]}</span>
    <a class="btn" href="{TEL}">{t["zadzwon_dlugi"]}</a>
    <a class="link" href="{inny}" lang="{t["inny"]}" hreflang="{t["inny"]}">{t["inny_dlugi"]}</a>
  </div>
</div>
'''


def stopka(t, baza, nota, skrypty=""):
    return f'''
<div class="haft szyj" aria-hidden="true"></div>
<footer class="stopka">
  <div class="wrap">
    <div class="gora">
      <div>
        <h2>{t["f_odwiedz"]}</h2>
        <ul><li>ul. Piłsudskiego 23</li><li>{t["f_miasto"]}</li><li><span class="status" data-status>{t["codziennie"]}</span></li></ul>
      </div>
      <div>
        <h2>{t["f_zamow"]}</h2>
        <ul><li><a href="{TEL}">{t["tel_txt"]}</a></li><li><a href="karta.html">{t["f_karta"]}</a></li><li><a href="dowoz.html">{t["f_dowoz"]}</a></li></ul>
      </div>
      <div>
        <h2>{t["f_obserwuj"]}</h2>
        <ul>
          <li><a href="https://www.facebook.com/oberza.swojskie.jadlo" target="_blank" rel="noopener">Facebook</a></li>
          <li><a href="https://www.instagram.com/oberza_swojskie_jadlo/" target="_blank" rel="noopener">Instagram</a></li>
          <li><a href="https://www.tiktok.com/@karczma.oberza" target="_blank" rel="noopener">TikTok</a></li>
        </ul>
      </div>
      <div>
        <h2>{t["k_mail"]}</h2>
        <ul><li><a href="mailto:oberzaswojskiejadlo@gmail.com">oberzaswojskiejadlo@gmail.com</a></li></ul>
      </div>
    </div>
    <div class="nota maly">
      <span>{nota}</span>
      <a href="https://myjakfilip7-jpg.github.io/karczma-oberza/">{t["f_wroc"]}</a>
    </div>
  </div>
  <div class="olbrzym" aria-hidden="true">OBER<i class="z">Z</i>A</div>
</footer>

<nav class="pasek" aria-label="{t["szybkie"]}">
  <a class="glowny" href="{TEL}">{t["zadzwon"]}</a>
  <a href="karta.html">{t["n_karta"]}</a>
  <a href="{MAPA_TRASA}" target="_blank" rel="noopener">{t["dojazd"]}</a>
</nav>

<script src="{baza}strona.js?v={V}"></script>
<script src="{baza}online.js?v={V}"></script>
{skrypty}</body>
</html>
'''


def trojka(pary):
    return "\n".join(
        f'      <div class="pokaz" style="--i:{i}"><span class="nr">{i + 1}</span><h3>{a}</h3><p>{b}</p></div>' for i, (a, b) in enumerate(pary))


def rezerwacja(t):
    osoby = "".join(f'<option value="{i}"{" selected" if i == 2 else ""}>{i}</option>' for i in range(1, 31))
    return f'''
<section class="sekcja glebsza" id="rezerwacja" data-online hidden>
  <div class="wrap g12 rez">
    <div class="glowa pokaz">
      <p class="et">{t["rz_et"]}</p>
      <h2 class="h-l">{t["rz_h2"]}</h2>
      <p class="cichy">{t["rz_opis"]}</p>
    </div>
    <form class="formularz pokaz" id="rezerwacja-form" novalidate>
      <label class="pole"><span>{t["rz_data"]}</span><input type="date" name="data" required></label>
      <label class="pole"><span>{t["rz_godzina"]}</span><select name="godzina" required><option value="">{t["rz_wybierz"]}</option></select></label>
      <label class="pole"><span>{t["rz_osoby"]}</span><select name="osoby" required>{osoby}</select></label>
      <label class="pole"><span>{t["rz_imie"]}</span><input type="text" name="imie" autocomplete="name" required maxlength="80"></label>
      <label class="pole"><span>{t["rz_tel"]}</span><input type="tel" name="telefon" autocomplete="tel" required maxlength="30"></label>
      <label class="pole"><span>{t["rz_email"]} <small>{t["opcj"]}</small></span><input type="email" name="email" autocomplete="email" maxlength="200"></label>
      <label class="pole cala"><span>{t["rz_uwagi"]} <small>{t["opcj"]}</small></span><textarea name="uwagi" rows="3" maxlength="500" placeholder="{t["rz_uwagi_ph"]}"></textarea></label>
      <label class="wybor cala"><input type="checkbox" name="rondel"> <span>{t["rz_rondel"]}</span></label>
      <label class="ukryte-pole" aria-hidden="true">Firma <input type="text" name="firma" tabindex="-1" autocomplete="off"></label>
      <div class="cala rzad-wyslij"><button class="btn" type="submit">{t["rz_wyslij"]}</button></div>
      <p class="maly cala">{t["rz_zgoda"]}</p>
      <p class="wynik-formularza cala" role="status" aria-live="polite"></p>
    </form>
  </div>
</section>
'''


def index(t, baza):
    spec = "\n".join(
        f'        <li class="pokaz" style="--i:{i % 3}"><a href="karta.html#{kat}"><span class="nz">{n}</span><span class="cn">{c}<small>{t["zl"]}</small></span><span class="op">{o}</span></a></li>'
        for i, (kat, n, o, c) in enumerate(t["spec"]))
    tematy = "\n".join(
        f'      <div class="pokaz" style="--i:{i}"><h3>{a}</h3><p>{b}</p></div>' for i, (a, b) in enumerate(t["tematy"]))
    galeria = "\n".join(
        f'    <figure><img src="{FOTO[k]}=h900" alt="{alt}" loading="lazy"></figure>'
        for k, alt in zip(["hero", "sala3", "placki", "sala2", "rondel"], t["alt_g"]))
    ld = '''<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Restaurant","name":"Karczma Oberża","servesCuisine":["Polish","regional","pizza"],"priceRange":"$$","telephone":"+48505176315","email":"oberzaswojskiejadlo@gmail.com","address":{"@type":"PostalAddress","streetAddress":"ul. Marszałka Józefa Piłsudskiego 23","postalCode":"33-380","addressLocality":"Krynica-Zdrój","addressCountry":"PL"},"openingHours":"Mo-Su 12:00-22:00","hasMenu":"karta.html","sameAs":["https://www.facebook.com/oberza.swojskie.jadlo","https://www.instagram.com/oberza_swojskie_jadlo/","https://www.tiktok.com/@karczma.oberza"]}
</script>
'''
    return glowa(t, t["t_index"], t["d_index"], "index.html", baza) + ld + naglowek(t, "index.html", False) + f'''
<main id="tresc">
<span id="top"></span>

<section class="hero">
  <img class="tlo" src="{FOTO["hero"]}=w1920" alt="" fetchpriority="high">
  <div class="wrap tresc">
    <p class="et wejdz" style="--i:0">{t["hero_et"]}</p>
    <h1 class="h-xl wejdz" style="--i:1">{t["hero_h1"]}</h1>
    <div class="akcje wejdz" style="--i:2">
      <a class="btn" href="karta.html">{t["hero_cta"]} {STRZ}</a>
      <a class="link" href="dowoz.html">{t["hero_link"]} {STRZ}</a>
    </div>
    <div class="metryka wejdz" style="--i:3">
      <span class="status" data-status>{t["codziennie"]}</span>
      <a href="#kontakt">{t["adres_krotki"]}</a>
      <a href="#opinie">{t["hero_ocena"]}</a>
    </div>
  </div>
</section>
<div class="haft szyj" aria-hidden="true"></div>

<section class="sekcja manifest" id="karczma">
  <div class="wrap">
    <div class="g12">
      <p class="et pokaz">{t["man_et"]}</p>
      <div class="tekst h-m pokaz" style="--i:1">
        <p>{t["man_1"]}</p>
        <p class="cichy">{t["man_2"]}</p>
      </div>
    </div>
    <div class="g12 kadry">
      <figure class="a pokaz"><img src="{FOTO["sala1"]}=w1400" alt="{t["alt_sala1"]}" loading="lazy"></figure>
      <figure class="b pokaz" style="--i:1"><img src="{FOTO["sala2"]}=w1000" alt="{t["alt_sala2"]}" loading="lazy"></figure>
    </div>
  </div>
</section>

<section class="sekcja glebsza z-lista" id="specjaly">
  <div class="wrap g12">
    <div class="glowa pokaz">
      <p class="et">{t["spec_et"]}</p>
      <h2 class="h-l">{t["spec_h2"]}</h2>
      <a class="link" href="karta.html">{t["spec_link"]} {STRZ}</a>
    </div>
    <ul class="lista">
{spec}
    </ul>
  </div>
</section>

<section class="pelny" id="rondel">
  <img class="tlo" src="{FOTO["rondel"]}=w1920" alt="{t["alt_rondel"]}" loading="lazy">
  <div class="wrap tresc g12">
    <div class="lewa pokaz">
      <p class="et">{t["ron_et"]}</p>
      <h2 class="h-xl">{t["ron_h2"]}</h2>
    </div>
    <div class="prawa pokaz" style="--i:1">
      <p class="rym">{t["ron_rym"]}</p>
      <p class="cichy">{t["ron_opis"]}</p>
      <p class="cena-l">{t["ron_cena"]} <small>{t["ron_dla"]}</small></p>
      <a class="btn" href="{TEL}" data-rondel-cta>{t["ron_cta"]}</a>
    </div>
  </div>
</section>

<section class="sekcja jasna" id="dowoz">
  <div class="wrap">
    <p class="et pokaz">{t["dow_et"]}</p>
    <a class="telefon pokaz" href="{TEL}" aria-label="{t["zadzwon_aria"]}">505 176 315</a>
    <div class="g12 trojka">
{trojka(t["kroki"])}
    </div>
    <p style="margin-top:40px" class="pokaz"><a class="link" href="dowoz.html">{t["dow_link"]} {STRZ}</a></p>
  </div>
</section>

<section class="sekcja opinie" id="opinie">
  <div class="wrap">
    <div class="g12">
      <div class="cytat pokaz">
        <p class="et">{t["op_et"]}</p>
        <blockquote>„{t["op_cytat"]}”</blockquote>
        <cite>— {t["op_zrodlo"]}</cite>
      </div>
      <div class="ocena pokaz" style="--i:1">
        <b>{t["op_ocena"]}</b>
        <span class="maly">{t["op_ile"]}</span>
        <a class="link" style="margin-top:14px;justify-self:start" href="{MAPA_OPINIE}" target="_blank" rel="noopener">{t["op_link"]} {STRZ_Z}</a>
      </div>
    </div>
    <div class="g12 trojka">
{tematy}
    </div>
  </div>
</section>

<section class="sekcja glebsza" id="galeria" style="padding-bottom:calc(var(--sek) - 20px)">
  <div class="wrap galeria-glowa pokaz">
    <div style="display:grid;gap:16px">
      <p class="et">{t["gal_et"]}</p>
      <h2 class="h-l">{t["gal_h2"]}</h2>
    </div>
    <a class="link" href="https://www.instagram.com/oberza_swojskie_jadlo/" target="_blank" rel="noopener">{t["gal_link"]} {STRZ_Z}</a>
  </div>
  <div class="tasma" tabindex="0" role="region" aria-label="{t["gal_et"]}">
{galeria}
  </div>
</section>

''' + rezerwacja(t) + f'''
<section class="sekcja kontakt" id="kontakt">
  <div class="wrap g12">
    <div class="dane pokaz">
      <div style="display:grid;gap:16px">
        <p class="et">{t["kon_et"]}</p>
        <h2 class="h-l">{t["kon_h2"]}</h2>
      </div>
      <dl class="def">
        <div><dt>{t["k_dzis"]}</dt><dd><span class="status" data-status>12:00–22:00</span></dd></div>
        <div><dt>{t["k_godziny"]}</dt><dd>{t["codziennie"]}</dd></div>
        <div><dt>{t["k_adres"]}</dt><dd>{t["kon_adres"]}</dd></div>
        <div><dt>{t["k_tel"]}</dt><dd><a href="{TEL}">{t["tel_txt"]}</a></dd></div>
        <div><dt>{t["k_mail"]}</dt><dd><a href="mailto:oberzaswojskiejadlo@gmail.com">oberzaswojskiejadlo@gmail.com</a></dd></div>
      </dl>
      <div class="rzad">
        <a class="btn" href="{MAPA_TRASA}" target="_blank" rel="noopener">{t["kon_trasa"]} {STRZ_Z}</a>
        <a class="btn kontur" href="{TEL}">{t["zadzwon"]}</a>
      </div>
    </div>
    <iframe class="mapa pokaz" title="{t["mapa_tytul"]}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="{MAPA_EMBED}"></iframe>
  </div>
</section>

</main>
''' + stopka(t, baza, t["f_nota"])


def karta(t, baza):
    return glowa(t, t["t_karta"], t["d_karta"], "karta.html", baza) + naglowek(t, "karta.html", True) + f'''
<main id="tresc">
  <div class="pod-glowa">
    <div class="wrap">
      <p class="et" id="wydanie">{t["kar_et"]}</p>
      <div class="rzad-glowa">
        <h1 class="h-xl">{t["kar_h1"]}</h1>
        <form class="szukaj" role="search" id="szukaj-form">
          <label class="sr" for="szukaj">{t["kar_szukaj"]}</label>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input id="szukaj" type="search" placeholder="{t["kar_ph"]}" autocomplete="off" enterkeyhint="search">
          <button type="button" id="wyczysc" aria-label="{t["kar_wyczysc"]}">×</button>
        </form>
      </div>
    </div>
  </div>

  <div class="jasna">
    <div class="wrap karta-uklad">
      <nav class="kat-nav" aria-label="{t["kar_kat"]}" id="kat-nav"></nav>
      <div id="karta">
        <p class="uwaga-online" id="zamowienia-karta" hidden></p>
        <p class="wynik" id="wynik" role="status" aria-live="polite"></p>
        <div id="lista"><noscript><p>{t["kar_noscript"]}</p></noscript></div>
        <div class="pusto" id="pusto" hidden>
          <h2 class="h-m" id="pusto-tekst"></h2>
          <p class="cichy">{t["kar_pusto"]}</p>
          <button class="btn" type="button" id="pusto-wyczysc">{t["kar_cala"]}</button>
        </div>
      </div>
    </div>
  </div>
</main>

<button class="do-gory" type="button" id="do-gory" aria-label="{t["kar_gora"]}">↑</button>
''' + stopka(t, baza, t["f_nota"], f'<script src="{baza}karta.js?v={V}" data-baza="{baza}"></script>\n')


def dowoz(t, baza):
    kat = "\n".join(
        f'        <li class="pokaz" style="--i:{i % 3}"><a href="karta.html#{k}" data-kat="{k}"><span class="nz">{n}</span><span class="cn meta" data-meta></span><span class="op">{o}</span></a></li>'
        for i, (k, n, o) in enumerate(t["dz_kat"]))
    pyt = "\n".join(f'      <details><summary>{q}</summary><p>{a}</p></details>' for q, a in t["dz_pyt"])
    js = ('<script>\n// liczba pozycji i cena „od” prosto z menu.json — jedno źródło prawdy\n'
          'fetch("' + baza + 'menu.json?v=' + V + '").then(r => r.json()).then(menu => {\n'
          '  document.querySelectorAll("[data-kat]").forEach(k => {\n'
          '    const kat = menu.kategorie.find(x => x.id === k.dataset.kat);\n'
          '    if (!kat) return;\n'
          '    const ceny = kat.pozycje.map(p => parseInt(p.c, 10)).filter(Number.isFinite);\n'
          '    const n = kat.pozycje.length;\n'
          '    k.querySelector("[data-meta]").textContent = ' + t["meta_js"] + ';\n'
          '  });\n}).catch(() => {});\n</script>\n')
    return glowa(t, t["t_dowoz"], t["d_dowoz"], "dowoz.html", baza) + naglowek(t, "dowoz.html", True) + f'''
<main id="tresc">
  <section class="pod-glowa">
    <div class="wrap">
      <p class="et">{t["dow_et"]}</p>
      <h1 class="h-l" style="margin-top:16px">{t["dz_h1"]}</h1>
      <a class="telefon" href="{TEL}" aria-label="{t["zadzwon_aria"]}">505 176 315</a>
      <p class="wstep">{t["dz_lead"]}</p>
      <div class="metryka">
        <span class="status" data-status>{t["codziennie"]}</span>
        <span>{t["dz_m2"]}</span>
        <span>{t["dz_m3"]}</span>
      </div>
      <div class="online-zam" data-online hidden>
        <a class="btn" href="karta.html">{t["dz_online_cta"]} {STRZ}</a>
        <p class="cichy" data-zamowienia-info></p>
      </div>
    </div>
  </section>
  <div class="haft szyj" aria-hidden="true"></div>

  <section class="sekcja glebsza z-lista">
    <div class="wrap g12">
      <div class="glowa pokaz">
        <p class="et">{t["dz_co_et"]}</p>
        <h2 class="h-l">{t["dz_co_h2"]}</h2>
        <a class="link" href="karta.html">{t["spec_link"]} {STRZ}</a>
      </div>
      <ul class="lista">
{kat}
      </ul>
    </div>
  </section>

  <section class="sekcja jasna">
    <div class="wrap">
      <div style="display:grid;gap:16px;margin-bottom:clamp(40px,6vw,80px)" class="pokaz">
        <p class="et">{t["dz_jak_et"]}</p>
        <h2 class="h-l">{t["dz_jak_h2"]}</h2>
      </div>
      <div class="g12 trojka">
{trojka(t["dz_kroki"])}
      </div>
      <p style="margin-top:48px" class="pokaz"><a class="btn" href="{TEL}">{t["zadzwon_dlugi"]}</a></p>
    </div>
  </section>

  <section class="sekcja pyt">
    <div class="wrap g12">
      <div class="glowa pokaz">
        <p class="et">{t["dz_pyt_et"]}</p>
        <h2 class="h-l">{t["dz_pyt_h2"]}</h2>
      </div>
      <div class="pytania pokaz" style="--i:1">
{pyt}
      </div>
    </div>
  </section>
</main>
''' + stopka(t, baza, t["dz_nota"], js)


if __name__ == "__main__":
    (TU / "en").mkdir(exist_ok=True)
    for t, katalog, baza in ((PL, TU, ""), (EN, TU / "en", "../")):
        for nazwa, fn in (("index.html", index), ("karta.html", karta), ("dowoz.html", dowoz)):
            (katalog / nazwa).write_text(fn(t, baza), encoding="utf-8")
            print("zapisano", (katalog / nazwa).relative_to(TU))
