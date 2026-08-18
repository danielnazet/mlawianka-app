Moje przemyslenia:
Rejestracja -> zawodnik -> Zespol i grupe przypisuje sytem zalezy jaki wiek jest podany.
Rejestracja -> Rodzic -> Dzieci -> system przypisze im grupy na podstawie wieku. Administraor moze recznie zmienic grupe dziecka oraz zawodnika
Strona logowania - > brak buttona na powrót do strony z aktualnosciami dlaczego nie ma klawiszy nawigacji na dole?
Rejestracja brak buttona na powrot oraz nawigacji
dla gosci terminarz tab rowniez jest zbedny zamiast tego moze trzeba zrobic jakies api zeby sciagal tabele liga pierwszego zespolu?


ok a [booking.tsx](file;file:///d%3A/Nowy%20folder/mlawianka-app/app/%28tabs%29/booking.tsx) orlik co

# Plan Działania (Roadmap) – Aplikacja Mlawianka

Ten dokument przedstawia podsumowanie wykonanych prac oraz plan dalszego rozwoju aplikacji uzgodniony podczas dzisiejszych prac.

---

## 📅 Stan Obecny (Zakończone Zadania)

1. **Aktualizacja struktury i konfiguracji**:
   - Podniesienie wersji projektu do **Expo SDK 54** (najnowsze biblioteki, stabilność na iOS/Android).
   - Skonfigurowanie pliku [`.env`](./.env) z prefiksem `EXPO_PUBLIC_` dla bezpiecznego połączenia z Supabase.
   - Naprawienie nazwy pliku `_lauyout.js` -> `_layout.js` (uruchomienie prawidłowej hierarchii widoków).
   - Rozwiązanie problemów z Metro Bundlerem (wyłączenie `unstable_enablePackageExports` w [`metro.config.js`](./metro.config.js) w celu obejścia konfliktów z Supabase).

2. **Baza Danych w Chmurze (Supabase CLI)**:
   - Skonfigurowanie i połączenie projektu z lokalnym Supabase CLI.
   - Podzielenie schematu bazy danych na osobne, czytelne migracje w katalogu [`supabase/migrations/`](./supabase/migrations/) (tabele `profiles`, `trainings`, `bookings`, `news` oraz przykładowe dane testowe).
   - Wdrożenie bazy danych na zdalny serwer poleceniem `npx supabase db push`.

3. **Uwierzytelnianie i Publiczny Start**:
   - Stworzenie publicznej reguły odczytu aktualności (RLS dla tabeli `news`), co umożliwia przeglądanie postów bez logowania.
   - Zmiana punktu startowego aplikacji na ekran Aktualności (`/news`) zamiast zmuszania użytkownika do logowania na start.
   - Wdrożenie rzeczywistego logowania i rejestracji za pomocą Supabase Auth z automatycznym usuwaniem zbędnych spacji (`.trim()`) w polach e-mail.
   - Zabezpieczenie prywatnych zakładek (Treningi, Rezerwacje, Profil) – niezalogowany użytkownik widzi estetyczną kartę z zachętą do logowania.

4. **Kolorystyka klubowa (UI/UX)**:
   - Dodanie pliku motywu [`css/colors.js`](./css/colors.js) z oficjalną zielenią Mławianki (`#008751`) i bielą.
   - Przepisanie stylów formularzy, przycisków, awatarów i pasków nawigacji na barwy zielono-białe.
   - Usunięcie powtarzających się, nieczytelnych teł z logo, zastępując je spójnym jasnym tłem i nowoczesnymi białymi kartami.

---

## 🚀 Plan na Kolejne Sesje (Następne Kroki)

### Krok 1: Wdrożenie dynamicznego pobierania danych (Etap 3)
* **Aktualności (`news.js`)**: Wyświetlanie wpisów pobranych z tabeli `news` w Supabase (obecnie zasilonej przykładowymi danymi) wraz z obsługą gestu odświeżania (pull-to-refresh).
* **Treningi (`training.js`)**: Wyświetlanie planu zajęć z bazy danych (`trainings`) zamiast statycznej listy.
* **Rezerwacje (`booking.js`)**:
  - Pobieranie listy treningów oraz statusów rezerwacji zalogowanego zawodnika z tabeli `bookings`.
  - Możliwość kliknięcia "Zarezerwuj" (dodanie rekordu do bazy) lub "Odwołaj rezerwację" (usunięcie rekordu).
* **Profil (`profile.js`)**:
  - Wyświetlanie rzeczywistych danych zalogowanego zawodnika (imię, nazwisko, grupa treningowa pobrane z tabeli `profiles`).
  - Działający przycisk wylogowania (`supabase.auth.signOut()`).

### Krok 2: Panel Administratora (Zarządzanie z poziomu telefonu)
* Rozróżnianie roli zalogowanego użytkownika (`user` lub `admin`).
* Stworzenie strefy admina w aplikacji:
  - Dla użytkowników z rolą `admin` na ekranie profilu lub w osobnym menu pojawi się opcja dodania nowej wiadomości (News) lub nowego treningu (Training).
  - Formularz wysyłający dane bezpośrednio do tabel w Supabase.

### Krok 3: Dalsze ulepszenia UI/UX i Powiadomienia
* Wprowadzenie ładniejszych kart treningowych z dynamicznymi statusami zapełnienia (np. "Zostało 3 z 15 miejsc").
* Wyświetlanie na profilu zawodnika listy jego nadchodzących, zarezerwowanych treningów w ładnej formie graficznej.



