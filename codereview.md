# Podsumowanie Prac i Przegląd Kodu (Code Review) – GKS Strzegowo

E-mail: admin@gksstrzegowo.pl
Hasło: Admin123!

Ten dokument zawiera historię zmian, przegląd architektury kodu po migracji do TypeScript oraz instrukcję wdrożenia bazy danych na nowym komputerze.

---

## 📋 Oryginalny Plan Działania
1. **Dostosowanie Brandingu**: Przemianowanie aplikacji Mławianka Mława na **GKS Strzegowo**, zmiana schematów, identyfikatorów pakietów oraz wdrożenie niebiesko-białej kolorystyki klubowej.
2. **Pełna Migracja do TypeScript**: Przepisanie wszystkich plików `.js` (oprócz plików konfiguracyjnych Node.js) na format `.tsx` i `.ts` dla zwiększenia stabilności i bezpieczeństwa typów.
3. **Model Ról i Rejestracji**:
   - Rejestracja publiczna ograniczona do **Zawodnika** i **Rodzica**.
   - Rodzice deklarują imię i nazwisko dziecka w polach tekstowych.
   - Trenerzy są mianowani/dodawani wyłącznie przez Administratora.
4. **Harmonogram**: Integracja treningów i meczów w jedną zakładkę z podziałem sekcji. Trenerzy mogą dodawać mecze/treningi z poziomu aplikacji.
5. **Rezerwacja Orlika**: Wprowadzenie grafiku zajętości Orlika z możliwością rezerwacji i anulowania terminów tylko dla trenerów i administratorów.
6. **Czat w Czasie Rzeczywistym**: Czat oparty o technologię Supabase Realtime (czat grupowy trenerów/adminów oraz czaty indywidualne rodzic <-> trener).
7. **Panel Administratora**: Dodanie narzędzi administracyjnych do zarządzania zespołami, powiązaniami dzieci z rodzicami oraz kontami użytkowników.

---

## 🛠️ Co Zostało Zrobione (Wykonane Zadania)

### 1. Branding i Konfiguracja
* Zmodyfikowano [`app.json`](file:///d:/Nowy%20folder/mlawianka-app/app.json) i [`package.json`](file:///d:/Nowy%20folder/mlawianka-app/package.json), wprowadzając nową nazwę i identyfikatory pakietu `com.gksstrzegowo.app`.
* Utworzono plik [`css/colors.ts`](file:///d:/Nowy%20folder/mlawianka-app/css/colors.ts) ze schematem niebiesko-białym (Royal Blue). Usunięto wszelkie odcienie zieleni z kart meczy, rezerwacji Orlika oraz odznak w aplikacji.
* Dodano nowe logo [`app/assets/logo_gks.png`](file:///d:/Nowy%20folder/mlawianka-app/app/assets/logo_gks.png) w tle wszystkich 5 zakładek (Aktualności, Harmonogram, Rezerwacje, Czat, Profil) oraz ekranów logowania i rejestracji. Konfiguracja `resizeMode: "cover"` zapewnia pokrycie całego tła z subtelną przezroczystością (`opacity: 0.045`).
* Dodano nagłówek z dużym logo klubowym, tytułem i podtytułem na ekranie rejestracji [`app/auth/register.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/auth/register.tsx) w celu ujednolicenia szaty graficznej z ekranem logowania.

### 2. TypeScript i Uporządkowanie Kodu
* Przepisano i zmigrowano wszystkie pliki z rozszerzenia `.js` do `.tsx` / `.ts` w folderach `app/`, `contexts/` oraz `lib/`. Usunięto zduplikowany stary plik `App.js`.
* **Modularyzacja Typów**: Stworzono dedykowane pliki typów w katalogu [`types/`](file:///d:/Nowy%20folder/mlawianka-app/types/) (`profile.ts`, `news.ts`, `training.ts`, `booking.ts`, `chat.ts`), połączone za pomocą jednego punktu wejściowego [`types/index.ts`](file:///d:/Nowy%20folder/mlawianka-app/types/index.ts).
* **Separacja Stałych**: Wydzielono stałe statyczne do pliku [`constants/news.ts`](file:///d:/Nowy%20folder/mlawianka-app/constants/news.ts), dostępnego przez barrel export [`constants/index.ts`](file:///d:/Nowy%20folder/mlawianka-app/constants/index.ts).
* Zweryfikowano poprawność kompilacji poleceniem `npx tsc --noEmit` (0 błędów typowania w całym projekcie).

### 3. Logika Uwierzytelniania i Bazy Danych
* Utworzono pliki migracji SQL w katalogu `supabase/migrations/` tworzące tabele `teams`, `matches`, `announcements`, `orlik_bookings`, `chat_messages` oraz powiązanie `parent_children`.
* Utworzono plik migracji [`20260814000100_create_admin.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260814000100_create_admin.sql), który automatycznie rejestruje w Supabase konto głównego administratora aplikacji (`admin@gksstrzegowo.pl` / `Admin123!`).
* Rozszerzono [`contexts/AuthContext.tsx`](file:///d:/Nowy%20folder/mlawianka-app/contexts/AuthContext.tsx), by automatycznie po zalogowaniu pobierał profil zalogowanego użytkownika z tabeli `profiles`.

### 4. Ekran Harmonogramu i Nowy Układ Aktualności
* [`app/(tabs)/news.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/(tabs)/news.tsx) wdrożyło profesjonalny wygląd aktualności:
  - Zmieniono nazwę pierwszej zakładki na zwięzłą **News**.
  - Pierwszy news jest wyróżniony (duża karta, zaokrąglone krawędzie i cover).
  - Kolejne newsy wyświetlają się w poziomym układzie w stylu **Flashscore**.
  - Kliknięcie w wiadomość otwiera modal z pełną treścią, tytułem umieszczonym pod zdjęciami oraz przewijaną poziomą karuzelą zdjęć (ze wskaźnikami pagination dots).
  - Dodano możliwość wgrywania **do 3 zdjęć** na jeden news z podglądem miniatur w edytorze i opcją usuwania `✕`.
  - Wdrożono przycisk FAB (`+`) wypozycjonowany na dole nad dolnym paskiem nawigacyjnym (`right: 20`, `bottom: 18`).
* [`app/(tabs)/training.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/(tabs)/training.tsx) obsługuje **Interaktywny Kalendarz Dni (Date Strip Carousel)** z automatycznym centrowaniem, wskaźnikami kropkowymi (🔵 Treningi, 🟡 Mecze), szybką nawigacją (`<`, `Dziś`, `>`), dużym rozwijanym selektorem widoków (Dropdown + powiększone kafelki `Dzień`, `Treningi`, `Mecze`) oraz dużym, wygodnym przyciskiem mobilnym *„Dodaj trening lub mecz”*.
* [`app/(tabs)/booking.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/(tabs)/booking.tsx) zawiera dedykowany **Grafik & Rezerwacje Boisk Orlik** z pełną synchronizacją treningów klubowych, dużym selektorem obiektów (Dropdown + kafelki *Wszystkie*, *Orlik SP*, *Orlik Parkowa*) oraz powiększonym przyciskiem *„Zarezerwuj godziny na Orliku”*.

### 6. Czat Realtime
* [`app/(tabs)/chat.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/(tabs)/chat.tsx) implementuje dynamiczne pokoje rozmów w oparciu o Supabase Realtime ze wskaźnikami unread badges i awatarami rozmówców.

### 7. Panel Administratora (Zarządzanie)
* [`app/admin/manage_members.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/admin/manage_members.tsx) umożliwia edycję ról, przenoszenie członków między zespołami i usuwanie kont.
* [`app/admin/manage_teams.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/admin/manage_teams.tsx) pozwala na tworzenie grup treningowych i przydzielanie im trenerów.

---

## 🔄 Najnowsze Zmiany i Udoskonalenia (Pakiat Zmian UX/UI i Bazy Danych)

1. **Autorski Przełącznik Zakładek (Pill Tab Switcher)**:
   - Przeprojektowano zakładek w Aktualnościach ([`news.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/(tabs)/news.tsx)), Terminarzu ([`training.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/(tabs)/training.tsx)) oraz Rezerwacji Orlika ([`booking.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/(tabs)/booking.tsx)).
   - Przełącznik wykorzystuje kapsułkę (`#F1F5F9`) z obwódką (`#E2E8F0`), tło aktywnej karty Royal Blue (`COLORS.primary`), cienie oraz typografię **Outfit Bold** i **Outfit SemiBold**.

2. **Karuzela do 3 Zdjęć w Aktualnościach**:
   - Utworzono migrację SQL [`20260818120000_news_images_array.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260818120000_news_images_array.sql) dodającą kolumnę `images text[]`.
   - Edytor umożliwia dodanie do 3 zdjęć z miniaturkami. Okno szczegółów aktualności posiada poziomą karuzelę zdjęć ze wskaźnikiem białych kropek pagination dots.

3. **Multi-Team Targeting Ogłoszeń & Hierarchia Zespołów**:
   - Utworzono migrację SQL [`20260818125000_announcements_target_team_ids.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260818125000_announcements_target_team_ids.sql) z kolumną `target_team_ids integer[]`.
   - Wdrożono rozwijane menu (Dropdown Select) pozwalające kierować ogłoszenie do **wielu grup naraz**.
   - Stworzono algorytm `sortTeamsOrdered`, który automatycznie układa zespoły w selektorach rocznikowo: **Pierwszy Zespół / Seniorzy** na samej górze, po czym grupy młodzieżowe od najstarszych (`U-19`) do najmłodszych (`U-7`).

4. **Wielorządkowa Klawiatura Emotek (Emoji Grid Keypad)**:
   - Zastąpiono jednorządkowy pasek emotek czytelną, wielorządkową **siatką emotek** w zaokrąglonym panelu (`#F8FAFC`).

5. **Dostęp Niezalogowanych Gości (Anon RLS)**:
   - Utworzono migrację SQL [`20260818150000_matches_and_teams_anon_select.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260818150000_matches_and_teams_anon_select.sql) nadającą uprawnienia `TO anon, authenticated` dla tabel `matches` i `teams`.
   - Niezalogowani goście wchodząc w **Terminarz** widzą bezpośrednio terminarz meczowy **Głównego Zespołu Seniorów GKS Strzegowo** z kartą zachęcającą do zalogowania. Zakładka Treningów jest dla nich ukryta.

6. **Restrykcje Trenera & Nowy Modal Wydarzeń**:
   - Trenerzy przy dodawaniu treningów i meczów są ograniczeni wyłącznie do swoich przypisanych zespołów.
   - Przeprojektowano formularz dodawania wydarzenia w `training.tsx` w oparciu o przełączniki **Event Type Pills** (Trening vs Mecz), rozwijany selektor zespołu oraz czytelne ikony pomocnicze w polach tekstowych (`format-title`, `account-tie`, `shield-outline`, `clock-outline`, `map-marker-outline`, `scoreboard-outline`).
   - **Chronologiczne Sortowanie & Wyróżnienie Najbliższego Wydarzenia**: Dodano automatyczne parsowanie dat i sortowanie chronologiczne dla treningów jednorazowych i cyklicznych oraz meczów. Najbliższy nadchodzący trening lub mecz jest wyeliminowany z masowego chaosu i wyróżniony na samej górze w specjalnej dużej karcie **⚡ NAJBLIŻSZE WYDARZENIE / MECZ** z akcentami Royal Blue.
   - **Sekcja Archiwum Minionych Wydarzeń**: Wszystkie zrealizowane/minione treningi i mecze są automatycznie przenoszone na sam dół listy do zwijanego kontenera **📁 Archiwum minionych wydarzeń**, który nie zaśmieca głównego widoku i może być w każdej chwili rozwinięty przez użytkownika.
   - **Wizualne Selektory Daty i Godziny (DateTimePickerModal)**: Daty formatowane są po polsku (np. *Czwartek, 20 sierpnia 17:00*). Zegary zostały skonfigurowane na skok **co pół godziny** (`minuteInterval={30}` oraz zaokrąglanie do 00 / 30 minut) bez konieczności wybierania pojedynczych minut.
   - Usunięto zbędne pole „Limit miejsc” z formularza tworzenia treningów.
   - **Rozwijany Selektor Miejsca (Location Dropdown Selector)**: Usunięto ręczne wpisywanie miejsca w formularzu. Dodano selektor z adresami obiektów klubowych:
     1. **Stadion Miejski w Strzegowie** (*Stadion Miejski, ul. Sportowa 4, 06-540 Strzegowo*)
     2. **Orlik nr 1 przy SP** (*Orlik nr 1, ul. Wojska Polskiego 1, 06-540 Strzegowo*)
     3. **Orlik Gminny (Parkowa)** (*Orlik Gminny, ul. Parkowa 2, 06-540 Strzegowo*)
     4. **Hala Sportowa przy SP** (*Hala Sportowa, ul. Wojska Polskiego 1, 06-540 Strzegowo*)
     5. **Mecz wyjazdowy / Inny adres** (pozwala na wpisanie własnego adresu wyjazdowego)

7. **Logowanie Google OAuth, Nowa Rola Kibica & Ekran Uzupełnienia Profilu**:
   - **Wykrywanie Nowego Konta i Jednolity System Przekierowań (`app/_layout.tsx`, `contexts/AuthContext.tsx` i `app/auth/login.tsx`)**: Zunifikowano przekierowania po logowaniu (Single Source of Truth w `NavigationGuard`). Usunięto zduplikowane wywołania nawigacji z `login.tsx`, eliminując ostrzeżenia `POP_TO_TOP` i wyścigi stanów pomiędzy komponentami.
   - Zunifikowano przekierowania po logowaniu w `NavigationGuard`.
   - Dodano przycisk „Zaloguj się przez Google”.
   - **Kompletny Redesign Wyglądu Aktualności i Modalu Szczegółów (`app/(tabs)/news.tsx` i `css/news.ts`)**: Przeprojektowano wygląd aktualności w 100% zgodnie z motywem aplikacji i z wykorzystaniem oficjalnych tokenów `COLORS` (`#1d4ed8`, `#1e3a8a`, `#f8fafc`) oraz czcionek `FONTS` (`Outfit`).
     - **Hero Featured Card**: Główny news zyskał podświetlony baner ze zdjęciem, profilowaną gradientową nakładką (`LinearGradient`), pigułkami kategorii (`🔥 NAJWAŻNIEJSZE`, `GKS STRZEGOWO`) i ikoną zegara.
     - **Karty Nowości (Flashscore Style)**: Wyrazista pozioma kompozycja z zaokrągloną okładką `86x86px`, pigułką `Aktualności Klubowe` oraz czystym układem.
     - **Modal Szczegółów (News Details)**: Pływający przycisk zamykania `✕`, wskaźnik autora `Redakcja GKS Strzegowo`, czas czytania oraz **Pasek Szybkich Reakcji Kibiców** (👍 ⚽ 🔥 💪 ❤️).
   - **Nowa Karta Akceptacji Regulaminu (`privacyCard`)**: Przeprojektowano UI/UX akceptacji zgód i polityki prywatności w `app/auth/register.tsx` oraz `app/auth/complete_profile.tsx` na czytelną, interaktywną kartę z tarczą bezpieczeństwa (`shield-check-outline`), podświetleniem tła po kliknięciu i walidacją.
   - **Wskazówka o Wielu Dzieciach dla Rodziców (`multiChildHintBox`)**: Dodano wyrazisty baner informacyjny w formularzu Rodzica.

8. **Interaktywny Kalendarz Dni & Mobilny UX w Terminarzu (`training.tsx`)**:
   - Wdrożono poziomy pasek kalendarza (**Date Strip Carousel**) z automatycznym centrowaniem aktywnego dnia, kropkami wskaźnikowymi (🔵 Treningi, 🟡 Mecze) i strzałkami nawigacji tygodniowej.
   - **Czysty przełącznik widoków**: Usunięto zbędny podwójny dropdown z nagłówkiem `[ Widok: Wybrany dzień ▾ ]` i powiązanym modalem, pozostawiając bezpośrednie, duże dotykowe kafelki widoków (`Dzień`, `Treningi`, `Mecze`) ułatwiające błyskawiczne przełączanie kciukiem.
   - Przycisk **„Dodaj trening lub mecz”** został powiększony do pełnowymiarowego przycisku akcji o wysokości ~50px z dużą ikoną `+`.

9. **Optymalizacja Nawigacji i Renderowania**:
   - Oczyszczono zbędne przejścia ekranowe i wyeliminowano migotanie zakładek.

10. **Aktualizacja do Expo SDK 57 & Eliminacja Błędu Reanimated/Worklets**:
   - Zaktualizowano projekt do **Expo SDK 57** (`expo: ~57.0.20`, `react: 19.2.3`, `react-native: ^0.86.3`).
   - Rozwiązano krytyczny błąd Expo Go `[ReanimatedError: Your installed version of Worklets (0.10.1) is not compatible with installed version of Reanimated (4.1.7)]`.
   - W [`components/ClubTabBar.tsx`](file:///d:/Nowy%20folder/mlawianka-app/components/ClubTabBar.tsx) całkowicie wyeliminowano zależność od `react-native-reanimated` i `react-native-worklets` na rzecz natywnego mechanizmu `Animated` z `react-native` (`useNativeDriver: true`). Zapewnia to identyczną płynność 60 FPS animacji paska dolnego bez ryzyka awarii natywnych bibliotek C++ w Expo Go.
   - Oczyszczono konfigurację [`babel.config.js`](file:///d:/Nowy%20folder/mlawianka-app/babel.config.js) i [`package.json`](file:///d:/Nowy%20folder/mlawianka-app/package.json).

11. **System Wykrywania i Blokady Kolizji Terminów na Orliku & Uproszczony Pasek Wyboru Boisk (`booking.tsx`)**:
    - **Usunięcie podwójnego wyboru boisk**: Wyeliminowano zduplikowany górny pasek z dropdownem `Aktywne boisko: ... Zmień` oraz powiązany modal, pozostawiając bezpośrednie, ergonomiczne kafelki wyboru (`Wszystkie`, `Orlik SP (nr 1)`, `Orlik Parkowa (Gminny)`).
    - **Algorytm weryfikacji kolizji (`checkBookingConflict`)**: Aplikacja sprawdza w czasie rzeczywistym nakładanie się przedziałów czasowych (`newStart < existingEnd && newEnd > existingStart`) z:
      1. Wszystkimi istniejącymi rezerwacjami sztabu na danym Orliku (`orlik_bookings`),
      2. Zaplanowanymi treningami drużyn klubowych odbywającymi się na danym Orliku (`trainings`).
    - **Wizualny baner ostrzegawczy (`conflictBanner`)**: W momencie wybrania kolizyjnej godziny lub boiska, modal natychmiast wyświetla czerwony baner z informacją, przez kogo i w jakich godzinach boisko jest już zajęte.
    - **Blokada zatwierdzenia formularza**: Przycisk zapisu zostaje wyszarzony, zablokowany i zmienia etykietę na `🚫 Termin zajęty` uniemożliwiając podwójną rezerwację.

12. **Wyśrodkowany 5-Dniowy Pasek Kalendarza (2 Dni po Lewej, Środek, 2 Dni po Prawej)**:
    - Wdrożono dynamiczne obliczanie szerokości kafelka dnia w oparciu o szerokość ekranu urządzenia:
      `DAY_ITEM_WIDTH = Math.floor((SCREEN_WIDTH - CALENDAR_PADDING * 2 - 4 * DAY_GAP) / 5)`.
    - Na ekranie mieści się zawsze dokładnie **5 kafelków dni** bez ucinania krawędzi: **2 dni po lewej, wybrany/obecny dzień idealnie pośrodku, 2 dni po prawej**.
    - Dodano automatyczne centrowanie aktywnego dnia przy starcie ekranu oraz przy zmianie daty (`scrollToIndex({ index: Math.max(0, activeIndex - 2) })`).
    - Zaimplementowano w [`app/(tabs)/booking.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/(tabs)/booking.tsx) oraz [`app/(tabs)/training.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/(tabs)/training.tsx).

13. **Responsywne Menu Rozwijane (Drop Menu) zamiast Zagnieżdżonych Modali / List**:
    - Zastąpiono niewygodne listy i sub-modale eleganckimi, rozwijanymi menu selekcyjnymi (Dropdown Select).
    - **Rezerwacja Orlika (`booking.tsx`)**:
      - Wybór boiska Orlik z podglądem adresu (`SP / Wojska Polskiego` vs `Orlik Gminny / Parkowa`),
      - Gotowe szybkie sloty czasowe (`16:00 - 17:30`, `17:00 - 18:30`, `18:30 - 20:00`, `20:00 - 21:30`) lub wybór manualny,
      - Szablony celu rezerwacji (np. *Trening drużyny*, *Mecz sparingowy*, *Zajęcia indywidualne*, *Konserwacja/Prace*).
    - **Terminarz Treningów i Meczów (`training.tsx`)**:
      - Rozwijany selektor drużyny trenera,
      - Szablony jednostek treningowych (*Trening techniczny*, *Trening taktyczny*, *Trening motoryczny / siłowy*, *Gry wewnętrzne / sparing*),
      - Szybkie godziny rozpoczęcia,
      - Rozwijany wybór obiektu klubowego.

14. **Nowy Design Przycisków Akcji w Modalach Formularzy**:
    - Usunięto przestarzałe przyciski na rzecz nowoczesnego, responsywnego paska akcji `modalActionRow`:
      - **Przycisk Anuluj (`modalCancelBtn`)**: Estetyczne jasnoszare tło (`#F1F5F9`), stonowany tekst i ikona `close-circle-outline`.
      - **Przycisk Zapisu / Rezerwacji (`modalSubmitBtn`)**: Nowoczesny zaokrąglony przycisk (radius `14px`) w barwach Royal Blue (`COLORS.primary`), z cieniami, wyrazistymi ikonami (`calendar-plus`, `check-circle-outline`, `content-save-outline`) oraz dynamiczną obsługą stanu zablokowania przy kolizji.

---

## 🚀 Spis Wszystkich Migracji Bazy Danych (Supabase SQL)

Wszystkie migracje znajdują się w folderze `supabase/migrations/` i zostały wdrożone na serwer komendą `supabase db push`:

1. [`20260814000000_gks_strzegowo.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260814000000_gks_strzegowo.sql) – Główna struktura tabel bazy danych.
2. [`20260814000100_create_admin.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260814000100_create_admin.sql) – Tworzenie konta administratora.
3. [`20260814000200_news_rls.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260814000200_news_rls.sql) – Polityki RLS dla tabeli news.
4. [`20260814000300_storage_bucket.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260814000300_storage_bucket.sql) – Kubełek storage `news-images`.
5. [`20260814000400_news_important.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260814000400_news_important.sql) – Wyróżnienie ważnych newsów.
6. [`20260817131000_update_trigger_coach.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260817131000_update_trigger_coach.sql) – Triggery rejestracji ról.
7. [`20260817134000_profiles_push_token.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260817134000_profiles_push_token.sql) – Kolumna `push_token` dla powiadomień.
8. [`20260817143000_enable_realtime_news_trainings.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260817143000_enable_realtime_news_trainings.sql) – Usługa Realtime dla tabel.
9. [`20260818100500_update_can_chat_with_admin.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260818100500_update_can_chat_with_admin.sql) – Uprawnienia czatu admin-trener.
10. [`20260818101000_list_chat_contacts_avatar.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260818101000_list_chat_contacts_avatar.sql) – Awatary w czacie.
11. [`20260818103000_news_is_important_not_null.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260818103000_news_is_important_not_null.sql) – Sortowanie newsów.
12. [`20260818120000_news_images_array.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260818120000_news_images_array.sql) – Kolumna `images text[]` (karuzela do 3 zdjęć).
13. [`20260818125000_announcements_target_team_ids.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260818125000_announcements_target_team_ids.sql) – Kolumna `target_team_ids integer[]` (wiele grup).
14. [`20260818150000_matches_and_teams_anon_select.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260818150000_matches_and_teams_anon_select.sql) – Dostęp anonimowy RLS dla meczy i zespołów.
15. [`20260818160000_trainings_coach_rls.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260818160000_trainings_coach_rls.sql) – Uprawnienia RLS zapisu/edycji/usuwania treningów i meczów dla Trenerów (`role IN ('admin', 'coach')`).
16. [`20260819120000_fix_profiles_insert_and_fan_role.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260819120000_fix_profiles_insert_and_fan_role.sql) – Nadanie uprawnień `GRANT INSERT, SELECT, UPDATE ON public.profiles TO authenticated`, dodanie roli `'fan'` do klauzuli `CHECK` tabeli profiles oraz dostosowanie polityk RLS dla tworzenia profilu dziecka.
17. [`20260819130000_fan_chat_with_admin.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260819130000_fan_chat_with_admin.sql) – Aktualizacja funkcji bazy `can_chat_with` pozwalająca na bezpośredni czat pomiędzy Kibicem (`role = 'fan'`) a Administratorem Klubu.
18. [`20260819140000_profiles_default_uuid.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260819140000_profiles_default_uuid.sql) – Dodanie domyślnej wartości `DEFAULT gen_random_uuid()` w PostgreSQL dla kolumny `public.profiles.id`.
19. [`20260819150000_profiles_email_nullable.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260819150000_profiles_email_nullable.sql) – Zniesienie wymogu unikalnego e-maila dla dzieci (`ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL`).
20. [`20260819160000_drop_profiles_id_fkey.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260819160000_drop_profiles_id_fkey.sql) – Usunięcie klucza obcego `profiles_id_fkey` dla profili subkont dzieci.
21. [`20260819170000_profiles_parent_select_rls.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260819170000_profiles_parent_select_rls.sql) – Polityka RLS odczytu dzieci przez rodzica.
22. [`20260819180000_fix_profiles_rls_recursion.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260819180000_fix_profiles_rls_recursion.sql) – Funkcja `SECURITY DEFINER` `public.is_current_user_coach()`.
23. [`20260819190000_fix_all_profiles_rls_recursion.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260819190000_fix_all_profiles_rls_recursion.sql) – Ostateczna funkcja `SECURITY DEFINER` `public.can_select_profile()`.
24. [`20260819200000_update_trigger_fan_role.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260819200000_update_trigger_fan_role.sql) – Rejestracja roli `'fan'` w triggerze.
25. [`20260819210000_news_reactions_and_youtube_url.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260819210000_news_reactions_and_youtube_url.sql) – Tabela `news_reactions` oraz obsługa `keyboardShouldPersistTaps="handled"` we wszystkich formularzach.
26. [`20260819220000_fix_oauth_trigger.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260819220000_fix_oauth_trigger.sql) – Obsługa logowania Google OAuth w triggerze i poprawka ścieżek `/news`.
27. [`20260819230000_exclude_children_from_chat.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260819230000_exclude_children_from_chat.sql) – Wykluczenie subprofili dzieci z listy kontaktów czatu i połączenie trenerów z rodzicami.
28. [`20260821140000_orlik_location.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260821140000_orlik_location.sql) – Dodanie kolumny `location` do tabeli `orlik_bookings`.

---

## 🧹 Czyszczenie Cache Metro Bundlera (Expo)
```bash
npx expo start -c
```

---

## 📂 Spis Zmian w Plikach (File Diff List)

| Plik | Status | Opis zmiany |
| :--- | :--- | :--- |
| [`app.json`](file:///d:/Nowy%20folder/mlawianka-app/app.json) | Zmodyfikowany | Konfiguracja SDK 57, splash screen plugin, platforms i permisje. |
| [`package.json`](file:///d:/Nowy%20folder/mlawianka-app/package.json) | Zmodyfikowany | Aktualizacja do Expo SDK 57, React 19, React Native 0.86, usunięcie niekompatybilnego `react-native-reanimated`. |
| [`babel.config.js`](file:///d:/Nowy%20folder/mlawianka-app/babel.config.js) | Zmodyfikowany | Usunięcie wtyczki reanimated. |
| [`components/ClubTabBar.tsx`](file:///d:/Nowy%20folder/mlawianka-app/components/ClubTabBar.tsx) | Zmodyfikowany | Zastąpienie Reanimated wbudowanym `Animated` z `useNativeDriver: true`. |
| [`css/colors.ts`](file:///d:/Nowy%20folder/mlawianka-app/css/colors.ts) | Zmodyfikowany | Kolorystyka klubowa GKS Strzegowo (Royal Blue). |
| [`types/booking.ts`](file:///d:/Nowy%20folder/mlawianka-app/types/booking.ts) | Zmodyfikowany | Dodanie pola `location?: string` w `OrlikBooking`. |
| [`app/(tabs)/news.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/(tabs)/news.tsx) | Zmodyfikowany | Karuzela do 3 zdjęć, siatka emotek, reakcje kibiców, multi-team targeting, FAB. |
| [`app/(tabs)/training.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/(tabs)/training.tsx) | Zmodyfikowany | Wyśrodkowany 5-dniowy kalendarz (2 po lewej, 1 środek, 2 po prawej), responsywny modal z Dropdown Menus (drużyna, szablon jednostki, godzina, obiekt) oraz nowoczesne przyciski akcji. |
| [`app/(tabs)/booking.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/(tabs)/booking.tsx) | Zmodyfikowany | Algorytm wykrywania i blokady kolizji terminów na Orliku, interaktywny baner, responsywne Drop Menu (boisko, sloty, cel) oraz wyśrodkowany 5-dniowy kalendarz i nowe przyciski akcji. |
| [`app/(tabs)/chat.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/(tabs)/chat.tsx) | Zmodyfikowany | Czat realtime z wykluczeniem dzieci i bezpośrednim kontaktem rodzic-trener. |
| [`supabase/migrations/20260821140000_orlik_location.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260821140000_orlik_location.sql) | **Nowy** | Kolumna `location` w `orlik_bookings`. |
