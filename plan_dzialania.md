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


---

## 💰 Obliczenia Biznesowe i Skalowanie (Model 5 Klubów)

### 📌 Strategia Cenowa (Niski Start + Abonament)
* **Opłata Wdrożeniowa (Start):** **990 zł** *(jednorazowo na start)*
* **Abonament Miesięczny:** **390 zł / miesiąc** *(umowa na 12 miesięcy)* lub **3 900 zł / rok** *(przy płatności z góry – 2 miesiące gratis)*
* **Opcja Sponsora Tytularnego:** Aplikacja jest bezpłatna dla klubu, jeśli 1 lokalny sponsor pokryje abonament 390 zł/mc w zamian za stały baner na ekranie głównym.

### 📊 Bilans Finansowy na 1 Klubie:
* **Przychód w 1. roku z 1 klubu:**
  * Wdrożenie: `990 zł`
  * Abonament (12 x 390 zł): `4 680 zł`
  * **Łączny przychód w 1. roku:** **5 670 zł**
* **Koszty własne (Infrastruktura):**
  * Supabase (Free Tier do 50k użytkowników): **0 zł**
  * Expo Push Notifications: **0 zł**
  * Meta/Facebook API & YouTube: **0 zł**
  * Konto Dewelopera Google Play (jednorazowo na całe życie): **~100 zł**
  * Konto Dewelopera Apple App Store (opcjonalnie rocznie): **~400 zł**
* **Czysty Zysk w 1. roku z 1 klubu:** **~5 170 zł** *(marża zysku > 90%)*
* **Czysty Zysk w kolejnych latach z 1 klubu:** **4 680 zł / rok**

### 🚀 Skalowanie (Cel: 5 Klubów Lokalnych):
* **Przychód miesięczny z abonamentów (5 x 390 zł):** **1 950 zł / miesiąc** na czysto
* **Przychód roczny z abonamentów (5 x 4 680 zł):** **23 400 zł / rok** na czysto
* **Koszty stałe przy 5 klubach:** **0 zł** *(każdy klub posiada własny darmowy projekt w chmurze Supabase Free Tier)*




