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
* Zmodyfikowano [`app.json`](./app.json) i [`package.json`](./package.json), wprowadzając nową nazwę i identyfikatory pakietu `com.gksstrzegowo.app`.
* Utworzono plik [`css/colors.ts`](./css/colors.ts) ze schematem niebiesko-białym (Royal Blue). Usunięto wszelkie odcienie zieleni z kart meczy, rezerwacji Orlika oraz odznak w aplikacji.
* Dodano nowe logo [`app/assets/logo_gks.png`](./app/assets/logo_gks.png) w tle wszystkich 5 zakładek (Aktualności, Harmonogram, Rezerwacje, Czat, Profil) oraz ekranów logowania i rejestracji. Konfiguracja `resizeMode: "cover"` zapewnia pokrycie całego tła z subtelną przezroczystością (`opacity: 0.045`).
* Dodano nagłówek z dużym logo klubowym, tytułem i podtytułem na ekranie rejestracji [`app/auth/register.tsx`](./app/auth/register.tsx) w celu ujednolicenia szaty graficznej z ekranem logowania.

### 2. TypeScript i Uporządkowanie Kodu
* Przepisano i zmigrowano wszystkie pliki z rozszerzenia `.js` do `.tsx` / `.ts` w folderach `app/`, `contexts/` oraz `lib/`. Usunięto zduplikowany stary plik `App.js`.
* **Modularyzacja Typów**: Stworzono dedykowane pliki typów w katalogu [`types/`](./types/) (`profile.ts`, `news.ts`, `training.ts`, `booking.ts`, `chat.ts`), połączone za pomocą jednego punktu wejściowego [`types/index.ts`](./types/index.ts).
* **Separacja Stałych**: Wydzielono stałe statyczne do pliku [`constants/news.ts`](./constants/news.ts), dostępnego przez barrel export [`constants/index.ts`](./constants/index.ts).
* Zweryfikowano poprawność kompilacji poleceniem `npx tsc --noEmit` (0 błędów typowania w całym projekcie).

### 3. Logika Uwierzytelniania i Bazy Danych
* Utworzono pliki migracji SQL w katalogu `supabase/migrations/` tworzące tabele `teams`, `matches`, `announcements`, `orlik_bookings`, `chat_messages` oraz powiązanie `parent_children`.
* Utworzono plik migracji [`20260814000100_create_admin.sql`](./supabase/migrations/20260814000100_create_admin.sql), który automatycznie rejestruje w Supabase konto głównego administratora aplikacji (`admin@gksstrzegowo.pl` / `Admin123!`).
* Rozszerzono [`contexts/AuthContext.tsx`](./contexts/AuthContext.tsx), by automatycznie po zalogowaniu pobierał profil zalogowanego użytkownika z tabeli `profiles`.
* Wdrożono bezpieczne czyszczenie unieważnionych tokenów sesji (`AsyncStorage.removeItem`) w `AuthContext.tsx` eliminujące błędy `[AuthApiError: Invalid Refresh Token]`.

### 4. Ekran Harmonogramu i Nowy Układ Aktualności
* [`app/(tabs)/news.tsx`](./app/(tabs)/news.tsx) wdrożyło profesjonalny wygląd aktualności:
  - Zmieniono nazwę pierwszej zakładki na zwięzłą **News**.
  - Pierwszy news jest wyróżniony (duża karta, zaokrąglone krawędzie i cover).
  - Kolejne newsy wyświetlają się w poziomym układzie w stylu **Flashscore**.
  - Kliknięcie w wiadomość otwiera modal z pełną treścią, tytułem umieszczonym pod zdjęciami oraz przewijaną poziomą karuzelą zdjęć (ze wskaźnikami pagination dots).
  - Dodano możliwość wgrywania **do 3 zdjęć** na jeden news z podglądem miniatur w edytorze i opcją usuwania `✕`.
  - Wdrożono przycisk FAB (`+`) wypozycjonowany na dole nad dolnym paskiem nawigacyjnym (`right: 20`, `bottom: 18`).
* [`app/(tabs)/training.tsx`](./app/(tabs)/training.tsx) obsługuje **Interaktywny Kalendarz Dni (Date Strip Carousel)** z automatycznym centrowaniem, wskaźnikami kropkowymi (🔵 Treningi, 🟡 Mecze), szybką nawigacją (`<`, `Dziś`, `>`), dużym rozwijanym selektorem widoków (Dropdown + powiększone kafelki `Dzień`, `Treningi`, `Mecze`) oraz dużym, wygodnym przyciskiem mobilnym *„Dodaj trening lub mecz”*.
* [`app/(tabs)/booking.tsx`](./app/(tabs)/booking.tsx) zawiera dedykowany **Grafik & Rezerwacje Boisk Orlik** z pełną synchronizacją treningów klubowych, dużym selektorem obiektów (Dropdown + kafelki *Wszystkie*, *Orlik SP*, *Orlik Parkowa*) oraz powiększonym przyciskiem *„Zarezerwuj godziny na Orliku”*.

### 5. Czat Realtime i Pełnoekranowy Widok Rozmowy
* [`app/(tabs)/chat.tsx`](./app/(tabs)/chat.tsx) implementuje dynamiczne pokoje rozmów w oparciu o Supabase Realtime ze wskaźnikami unread badges i awatarami rozmówców.
* **Dedykowana kategoria „Trenerzy” (dla Administratora)**: Administrator ma wydzieloną sekcję z listą wszystkich trenerów i ich drużyn, co umożliwia natychmiastowe rozpoczęcie rozmowy 1-na-1.
* **Pełnoekranowy widok aktywnej rozmowy**: Po wejściu w czat, główny pasek „GKS Strzegowo” oraz dolny pasek zakładek (TabBar) są płynnie ukrywane. Na samej górze widoczny jest tylko pasek z rozmówcą, a na dole nowoczesny, zaokrąglony pasek wiadomości (`Pill Input`) z okrągłym przyciskiem wysyłki (`Ionicons send`) oraz pełnym wsparciem dolnego wcięcia ekranu (Safe Area).

### 6. Panel Administratora (Zarządzanie)
* [`app/admin/manage_members.tsx`](./app/admin/manage_members.tsx) umożliwia edycję ról, przenoszenie członków między zespołami i usuwanie kont.
* [`app/admin/manage_teams.tsx`](./app/admin/manage_teams.tsx) pozwala na tworzenie grup treningowych, archiwizację (`is_active`) i przydzielanie im trenerów.
* [`app/admin/manage_coaches.tsx`](./app/admin/manage_coaches.tsx) umożliwia rejestrowanie trenerów **bez wymogu potwierdzania e-maila** – konta są natychmiast aktywowane przez funkcję RPC `confirm_user_email`.
* [`app/admin/manage_sponsors.tsx`](./app/admin/manage_sponsors.tsx) umożliwia dodawanie, edycję, ustalanie kolejności oraz włączanie/wyłączanie widoczności oficjalnych sponsorów i partnerów klubu.

### 7. Moduł Sponsorzy i Partnerzy Klubu (Prezentacja & WOW Factor)
* **Baza danych i RLS**: Tabela `public.sponsors` z polami `name`, `category` (`main`, `strategic`, `partner`), `description`, `logo_url`, `website_url`, `phone`, `display_order`, `is_active`. Bezpieczne polityki RLS (publiczny odczyt, pełne zarządzanie dla roli `admin`).
* **Sekcja SponsorsSection** ([`components/SponsorsSection.tsx`](./components/SponsorsSection.tsx)):
  - **Sponsor Tytularny / Główny**: Ekskluzywna złoto-granatowa karta wyróżniająca sponsora tytularnego z koroną, opisem i linkiem do strony WWW.
  - **Partnerzy Strategiczni**: Siatka partnerów strategicznych z dedykowanymi ikonami i odnośnikami.
  - **Partnerzy i Darczyńcy**: Eleganckie kafelki lokalnych przedsiębiorców i instytucji wspierających klub.
  - **Interaktywny Banner CTA**: Zachęta dla lokalnych sponsorów do dołączenia z szybkim kontaktem telefonicznym/mailowym z zarządem.
* **Integracja**:
  - Kanał Aktualności ([`app/(tabs)/news.tsx`](./app/(tabs)/news.tsx)): Wyświetlanie partnerów na dole kanału newsów.
  - Profil Użytkownika ([`app/(tabs)/profile.tsx`](./app/(tabs)/profile.tsx)): Prezentacja partnerów dla gości i zalogowanych oraz kafelek zarządzania w panelu administratora.

---

## 🔄 Najnowsze Zmiany i Udoskonalenia (Pakiet Zmian UX/UI i Bazy Danych)

1. **Restrykcje Trenera do przypisanych drużyn dla Meczów i Treningów**:
   - Utworzono migrację SQL [`20260908204500_matches_coach_assigned_team_rls.sql`](./supabase/migrations/20260908204500_matches_coach_assigned_team_rls.sql).
   - Trenerzy mogą dodawać, edytować i usuwać mecze/treningi **wyłącznie dla drużyn, do których są przypisani w bazie**.
   - W formularzu dodawania wydarzenia (`training.tsx`) trener ma automatycznie wybrany i zablokowany swój zespół (`Twój przypisany zespół`), a w widoku terminarza gesty swipe (Edytuj/Usuń) pojawiają się tylko na wydarzeniach jego drużyny.

2. **Automatyczne Potwierdzanie Kont Trenerów**:
   - Utworzono migrację SQL [`20260817211000_confirm_user_email.sql`](./supabase/migrations/20260817211000_confirm_user_email.sql) z funkcją `SECURITY DEFINER confirm_user_email(p_user_id)`.
   - Administrator po utworzeniu trenera nie musi czekać na odbiór maila – konto trenera jest natychmiast gotowe do zalogowania.

3. **Nowoczesny Pasek Wiadomości w Czacie (Input Bar & Send Button)**:
   - Zastąpiono tradycyjne pole edycyjne zaokrągloną kapsułką (`borderRadius: 22`, tło `#f8fafc`).
   - Wdrożono okrągły przycisk wysyłki (44x44px) w kolorze `COLORS.primary` z ikoną `Ionicons send` i dynamicznym stanem aktywności.
   - Dodano pełne wsparcie dla dolnej bezpiecznej strefy (`paddingBottom: Math.max(insets.bottom, 12)`).

4. **Konfiguracja Budowania Plików APK (EAS Build)**:
   - Utworzono plik konfiguracyjny [`eas.json`](./eas.json) z profilem `preview` budującym samodzielny plik instalacyjny `.apk` na Androida (bez konieczności posiadania Expo Go).

15. **Ogólnodostępny Grafik Orlika, Wyraźne Oznaczenie 'ORLIK ZAJĘTY' & Rezerwacje dla Rodziców i Kibiców (`booking.tsx`)**:
    - **Dostęp dla gości i niezalogowanych**: Grafik i kalendarz zajętości Orlika jest teraz w 100% jawny i widoczny dla każdego mieszkańca, rodzica i kibica (bez konieczności logowania, aby sprawdzić wolne godziny).
    - **Rezerwacja wolnych terminów dla rodziców i kibiców**: Każdy zalogowany użytkownik (w tym rodzic `parent`, kibic `fan`, zawodnik `player`, trener i admin) może zarezerwować wolny termin na grę rekreacyjną, trening indywidualny czy sparing.
    - **Wyraźne oznaczenie 'ORLIK ZAJĘTY'**:
      - W przypadku treningów klubowych karta otrzymuje czerwoną belkę boczną oraz wyrazistą odznakę **`🚫 ORLIK ZAJĘTY`** z informacją o treningu i nazwiskiem trenera.
      - W przypadku innych rezerwacji wyświetla się odznaka **`🔴 REZERWACJA (ZAJĘTE)`** wraz z informacją o osobie rezerwującej.
    - **Dedykowany Klubowy Modal Logowania / Rejestracji (`authPromptModal`)**:
      - Zastąpiono systemowy `Alert.alert` w pełni customowym, eleganckim oknem dialogowym w barwach GKS Strzegowo (`COLORS.primary`, `COLORS.white`).
      - Wyświetla oficjalny herb/logo klubu w okrągłej oprawie z odznaką `GKS STRZEGOWO`.
      - Prezentuje czytelną listę korzyści z posiadania konta (dla rodziców, kibiców i zawodników, szybka rezerwacja, powiadomienia i zarządzanie terminami).
      - Posiada spójne, stylowe przyciski akcji: główny przycisk logowania (*"Zaloguj się do aplikacji"*), przycisk rejestracji (*"Załóż bezpłatne konto"*) oraz dyskretny przycisk powrotu do podglądu grafiku (*"Przeglądaj grafik bez logowania"*).
    - **Zarządzanie rezerwacjami**: Użytkownicy mogą edytować i anulować swoje własne rezerwacje, a administratorzy mają pełną kontrolę nad całym grafikiem.

16. **Uproszczenie UI i Eliminacja Duplikatów**:
    - **Rezerwacja Orlika (`booking.tsx`)**: Usunięto powielony selektor wyboru boiska z górnej części ekranu, pozostawiając jeden spójny i ergonomiczny przełącznik.
    - **Terminarz (`training.tsx`)**: Usunięto zbędny pod-widok "Wybrany dzień", skupiając widoki na przejrzystych kategoriach: *Wszystko*, *Treningi*, *Mecze* wraz z interaktywnym paskiem dni (Date Strip).

17. **Wdrożenie Aktualizacji Bezprzewodowych (OTA - EAS Update)**:
    - Zainstalowano i skonfigurowano moduł `expo-updates`.
    - Umożliwiono natychmiastowe wdrażanie poprawek kodu i nowości (`npx eas-cli update --auto`) bezpośrednio na telefony użytkowników w czasie rzeczywistym, bez konieczności przechodzenia przez długi proces weryfikacji w Google Play / App Store.

---

## 🚀 Spis Wszystkich Migracji Bazy Danych (Supabase SQL)

Wszystkie migracje znajdują się w folderze `supabase/migrations/` i zostały wdrożone na serwer komendą `npx supabase db push`:

<<<<<<< HEAD
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
29. [`20260822100000_orlik_public_access_and_parent_booking.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260822100000_orlik_public_access_and_parent_booking.sql) – Polityki RLS udostępniające grafik Orlika gościom (`anon`) oraz pozwalające rodzicom i wszystkim zalogowanym użytkownikom rezerwować wolne godziny.
=======
1. `20260814000000_gks_strzegowo.sql` – Główna struktura tabel bazy danych.
2. `20260814000100_create_admin.sql` – Tworzenie konta administratora.
3. `20260814000200_news_rls.sql` – Polityki RLS dla tabeli news.
4. `20260814000300_storage_bucket.sql` – Kubełek storage `news-images`.
5. `20260814000400_news_important.sql` – Wyróżnienie ważnych newsów.
6. `20260817131000_update_trigger_coach.sql` – Triggery rejestracji ról.
7. `20260817134000_profiles_push_token.sql` – Kolumna `push_token` dla powiadomień.
8. `20260817143000_enable_realtime_news_trainings.sql` – Usługa Realtime dla tabel.
9. `20260817211000_confirm_user_email.sql` – Funkcja auto-potwierdzenia maila trenera (`confirm_user_email`).
10. `20260818100500_update_can_chat_with_admin.sql` – Uprawnienia czatu admin-trener.
11. `20260818101000_list_chat_contacts_avatar.sql` – Awatary w czacie.
12. `20260818103000_news_is_important_not_null.sql` – Sortowanie newsów.
13. `20260818120000_news_images_array.sql` – Kolumna `images text[]` (karuzela do 3 zdjęć).
14. `20260818125000_announcements_target_team_ids.sql` – Kolumna `target_team_ids integer[]` (wiele grup).
15. `20260818150000_matches_and_teams_anon_select.sql` – Dostęp anonimowy RLS dla meczy i zespołów.
16. `20260818160000_trainings_coach_rls.sql` – Uprawnienia RLS zapisu/edycji/usuwania treningów i meczów dla Trenerów.
17. `20260819120000_fix_profiles_insert_and_fan_role.sql` – Poprawki profilów i roli fan.
18. `20260819130000_fan_chat_with_admin.sql` – Czat Kibic <-> Admin.
19. `20260819140000_profiles_default_uuid.sql` – Domyślny `gen_random_uuid()` dla profiles.
20. `20260819150000_profiles_email_nullable.sql` – Opcjonalny email dla subkont dzieci.
21. `20260819160000_drop_profiles_id_fkey.sql` – Usunięcie klucza obcego dla dzieci.
22. `20260819170000_profiles_parent_select_rls.sql` – RLS odczytu dzieci przez rodzica.
23. `20260819180000_fix_profiles_rls_recursion.sql` – Funkcja `public.is_current_user_coach()`.
24. `20260819190000_fix_all_profiles_rls_recursion.sql` – Funkcja `public.can_select_profile()`.
25. `20260819200000_update_trigger_fan_role.sql` – Rejestracja roli `'fan'`.
26. `20260819210000_news_reactions_and_youtube_url.sql` – Reakcje i linki YouTube.
27. `20260819220000_fix_oauth_trigger.sql` – Obsługa Google OAuth.
28. `20260819230000_exclude_children_from_chat.sql` – Wykluczenie dzieci z kontaktów czatu.
29. `20260821140000_orlik_location.sql` – Kolumna `location` w `orlik_bookings`.
30. `20260908204500_matches_coach_assigned_team_rls.sql` – Ograniczenie dodawania/edycji meczów i treningów przez trenera wyłącznie do jego przypisanych drużyn.
>>>>>>> 4973256e2a300e8c3676c72716358c381bf998ba

---

## 🧹 Czyszczenie Cache Metro Bundlera (Expo)
```bash
npx expo start -c
```
<<<<<<< HEAD

---

## 📂 Spis Zmian w Plikach (File Diff List)

| Plik | Status | Opis zmiany |
| :--- | :--- | :--- |
| [`app.json`](file:///d:/Nowy%20folder/mlawianka-app/app.json) | Zmodyfikowany | Konfiguracja SDK 57, splash screen plugin, expo-updates i runtimeVersion. |
| [`package.json`](file:///d:/Nowy%20folder/mlawianka-app/package.json) | Zmodyfikowany | Aktualizacja do Expo SDK 57, React 19, React Native 0.86, instalacja `react-native-is-edge-to-edge`. |
| [`babel.config.js`](file:///d:/Nowy%20folder/mlawianka-app/babel.config.js) | Zmodyfikowany | Usunięcie wtyczki reanimated. |
| [`components/ClubTabBar.tsx`](file:///d:/Nowy%20folder/mlawianka-app/components/ClubTabBar.tsx) | Zmodyfikowany | Zastąpienie Reanimated wbudowanym `Animated` z `useNativeDriver: true`. |
| [`css/colors.ts`](file:///d:/Nowy%20folder/mlawianka-app/css/colors.ts) | Zmodyfikowany | Kolorystyka klubowa GKS Strzegowo (Royal Blue). |
| [`app/(tabs)/_layout.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/(tabs)/_layout.tsx) | Zmodyfikowany | Odblokowanie widoczności zakładki Orlik w dolnym pasku nawigacyjnym dla wszystkich użytkowników i gości. |
| [`app/(tabs)/news.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/(tabs)/news.tsx) | Zmodyfikowany | Karuzela do 3 zdjęć, siatka emotek, reakcje kibiców, multi-team targeting, FAB. |
| [`app/(tabs)/training.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/(tabs)/training.tsx) | Zmodyfikowany | Wyśrodkowany 5-dniowy kalendarz, czysty 3-kafelkowy przełącznik widoków (`Dzień`, `Treningi`, `Mecze`) i responsywny modal. |
| [`app/(tabs)/booking.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/(tabs)/booking.tsx) | Zmodyfikowany | Otwarty grafik Orlika dla gości, odznaka `🚫 ORLIK ZAJĘTY` przy treningach, możliwość rezerwacji dla rodziców/kibiców, wykrywanie kolizji i 5-dniowy kalendarz. |
| [`app/(tabs)/chat.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/(tabs)/chat.tsx) | Zmodyfikowany | Czat realtime z wykluczeniem dzieci i bezpośrednim kontaktem rodzic-trener. |
| [`supabase/migrations/20260822100000_orlik_public_access_and_parent_booking.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260822100000_orlik_public_access_and_parent_booking.sql) | **Nowy** | Uprawnienia RLS dla publicznego grafiku i rezerwacji przez rodziców. |
=======
>>>>>>> 4973256e2a300e8c3676c72716358c381bf998ba
