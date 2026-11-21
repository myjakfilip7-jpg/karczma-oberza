// Komunikaty błędów dla gości (PL/EN). Kod błędu jest stały i trafia do odpowiedzi API razem z tekstem.
const M = {
  wymagane: ["To pole jest wymagane.", "This field is required."],
  za_dlugie: ["Ten tekst jest za długi.", "This text is too long."],
  za_krotkie: ["Wpisz co najmniej 2 znaki.", "Enter at least 2 characters."],
  telefon: ["Wpisz numer telefonu, np. 505 176 315.", "Enter a phone number, e.g. +48 505 176 315."],
  email: ["Wpisz poprawny adres e-mail albo zostaw pole puste.", "Enter a valid email address or leave it empty."],
  liczba_osob: ["Wybierz liczbę osób.", "Choose the number of people."],
  za_duzo_osob: ["Przy takiej liczbie osób zadzwoń do nas: 505 176 315.", "For a group this size, please call us: +48 505 176 315."],
  data: ["Wybierz dzień.", "Choose a day."],
  godzina: ["Wybierz godzinę.", "Choose a time."],
  termin_niedostepny: ["Ten termin nie jest dostępny. Wybierz inną godzinę.", "This time is not available. Please choose another one."],
  brak_miejsc: ["O tej godzinie nie mamy już wolnych miejsc. Wybierz inną godzinę albo zadzwoń.", "We are fully booked at this time. Choose another time or call us."],
  duplikat: ["Masz już rezerwację na ten termin. Czekaj na potwierdzenie albo zadzwoń.", "You already have a booking for this time. Wait for confirmation or call us."],
  rezerwacje_wylaczone: ["Rezerwacje przez stronę są teraz wyłączone. Zadzwoń: 505 176 315.", "Online booking is currently off. Please call +48 505 176 315."],
  zamowienia_wylaczone: ["Zamówienia przez stronę są teraz wyłączone. Zadzwoń: 505 176 315.", "Online ordering is currently off. Please call +48 505 176 315."],
  zamowienia_wstrzymane: ["Kuchnia ma teraz komplet zamówień. Spróbuj za chwilę albo zadzwoń.", "The kitchen is at capacity right now. Try again shortly or call us."],
  poza_godzinami: ["Teraz nie przyjmujemy zamówień. Zamówienia online przyjmujemy w godzinach otwarcia.", "We are not taking orders right now. Online orders are accepted during opening hours."],
  dowoz_wylaczony: ["Dowóz jest dziś niedostępny. Możesz zamówić na wynos.", "Delivery is unavailable today. You can order for takeaway."],
  typ: ["Wybierz dowóz albo odbiór.", "Choose delivery or takeaway."],
  adres: ["Wpisz adres dostawy.", "Enter the delivery address."],
  pusty_koszyk: ["Koszyk jest pusty.", "Your basket is empty."],
  za_duzo_pozycji: ["Za dużo pozycji w jednym zamówieniu. Zadzwoń do nas.", "Too many items in one order. Please call us."],
  pozycja_niedostepna: ["Któraś pozycja jest chwilowo niedostępna. Odśwież kartę.", "One of the items is unavailable right now. Refresh the menu."],
  ilosc: ["Nieprawidłowa ilość.", "Invalid quantity."],
  minimum: ["Zamówienie jest poniżej minimalnej kwoty dowozu.", "The order is below the minimum for delivery."],
  zly_token: ["Nie znaleźliśmy takiego zgłoszenia.", "We could not find this request."],
  za_duzo_prob: ["Za dużo prób. Spróbuj ponownie za kilka minut.", "Too many attempts. Please try again in a few minutes."],
  zle_haslo: ["Nieprawidłowe hasło.", "Wrong password."],
  brak_hasla: ["Panel nie ma ustawionego hasła (PANEL_PASSWORD).", "The panel has no password set (PANEL_PASSWORD)."],
  brak_sesji: ["Zaloguj się ponownie.", "Please log in again."],
  niedozwolone_zrodlo: ["Żądanie z niedozwolonej strony.", "Request from a disallowed site."],
  zle_dane: ["Nieprawidłowe dane.", "Invalid data."],
  nie_znaleziono: ["Nie znaleziono.", "Not found."],
  blad_serwera: ["Coś poszło nie tak po naszej stronie. Zadzwoń: 505 176 315.", "Something went wrong on our side. Please call +48 505 176 315."],
};

export function msg(code, lang = "pl") {
  const m = M[code] || M.zle_dane;
  return lang === "en" ? m[1] : m[0];
}
