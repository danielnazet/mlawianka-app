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
* [`app/(tabs)/training.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/(tabs)/training.tsx) obsługuje dwie zakładki: Treningi i Mecze w oparciu o autorski **Pill Tab Switcher** z czcionkami **Outfit Bold**:
  - Rodzice i Zawodnicy w zakładce Mecze widzą zarówno mecze własnej drużyny, jak i mecze **Głównego Zespołu Seniorów**.
  - Niezalogowani goście widzą bezpośrednio terminarz meczowy Głównego Zespołu Seniorów z przyjaznym banerem zachęcającym do zalogowania.
  - Trenerzy dodając wydarzenia są ograniczeni wyłącznie do zespołów, którymi opiekują się w klubie.

### 5. Grafik i Rezerwacje Orlika
* [`app/(tabs)/booking.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/(tabs)/booking.tsx) zawiera zapisy na treningi oraz całotygodniowy grafik Orlika z niebiesko-białą kolorystyką klubową (Royal Blue).

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
   - **Wykrywanie Nowego Konta (`NavigationGuard` w `app/_layout.tsx`)**: Po pierwszym zalogowaniu przez Google profil nie ma wybranej roli. Aplikacja automatycznie przekierowuje użytkownika na ekran onboardingowy **`app/auth/complete_profile.tsx`**, tworząc/aktualizując profil metodą `.upsert()`, co gwarantuje pełną spójność relacji w bazie z tabelą `parent_children`.
   - **Przycisk „Zaloguj się przez Google”**: Dodano na ekranach logowania i rejestracji (`app/auth/login.tsx`) w pełnej marce Google z ikoną `google`.
   - **Poprawka Obrazków w Aktualnościach (`app/(tabs)/news.tsx`)**: Zbudowano wszechstronną funkcję `extractFirstImageUrl()`, obsługującą wgrane obrazy w formacie tablicy JS `images[]`, zserializowanego stringa JSON `'["http..."]'` oraz pola `image_url`. Usunięto niepotrzebny filtr wykluczający adresy URL, co zagwarantowało 100% natychmiastowe wyświetlanie pierwszego (wyróżnionego) newsa na głównej liście w wyrazistym formacie `<Image resizeMode="cover" />`.
   - **Nowa Karta Akceptacji Regulaminu (`privacyCard`)**: Przeprojektowano UI/UX akceptacji zgód i polityki prywatności w `app/auth/register.tsx` oraz `app/auth/complete_profile.tsx` na czytelną, interaktywną kartę z tarczą bezpieczeństwa (`shield-check-outline`), podświetleniem tła po kliknięciu i walidacją.
   - **Wskazówka o Wielu Dzieciach dla Rodziców (`multiChildHintBox`)**: Dodano wyrazisty baner informacyjny w formularzu Rodzica wyjaśniający, że w formularzu podaje się pierwsze dziecko, a drugie i kolejne dziecko można bez przeszkód dodać w dowolnym momencie w zakładce **Profil**.
   - **Zarządzanie Wieloma Dziećmi w Profilu (`app/(tabs)/profile.tsx`)**: Dla rodziców dodano sekcję **„Moje Dzieci w Klubie”** z automatycznym dobiorem grupy wg wieku oraz zablokowaną edycją grupy.

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
18. [`20260819140000_profiles_default_uuid.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260819140000_profiles_default_uuid.sql) – Dodanie domyślnej wartości `DEFAULT gen_random_uuid()` w PostgreSQL dla kolumny `public.profiles.id`, usuwające potrzebę wywoływania `crypto.randomUUID()` w silniku JS (Hermes) i pozwalające na bezbłędne natywne generowanie identyfikatorów kont dzieci.
19. [`20260819150000_profiles_email_nullable.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260819150000_profiles_email_nullable.sql) – Złożenie klauzuli `ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL`, dzięki czemu dzieci tworzone przez rodziców nie wymagają posiadania własnego adresu e-mail.
20. [`20260819160000_drop_profiles_id_fkey.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260819160000_drop_profiles_id_fkey.sql) – Usunięcie klucza obcego `profiles_id_fkey` wymuszającego wpis w `auth.users`, umożliwiające przechowywanie w `public.profiles` profili dzieci nieposiadających własnego loginu w systemie auth.
21. [`20260819170000_profiles_parent_select_rls.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260819170000_profiles_parent_select_rls.sql) – Rozszerzenie polityki RLS `profiles_select_authenticated` pozwalające Rodzicowi na odczytywanie profili swoich powiązanych dzieci z tabeli `public.profiles`.
22. [`20260819180000_fix_profiles_rls_recursion.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260819180000_fix_profiles_rls_recursion.sql) – Utworzenie funkcji `SECURITY DEFINER` `public.is_current_user_coach()` i zastąpienie zapytania podrzędnego w RLS.
23. [`20260819190000_fix_all_profiles_rls_recursion.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260819190000_fix_all_profiles_rls_recursion.sql) – Ostateczna eliminacja błędu `42P17` (`infinite recursion detected in policy for relation "profiles"`) poprzez dedykowaną funkcję `SECURITY DEFINER` `public.can_select_profile()`, łączącą pełen dostęp dla własnego profilu, dzieci oraz uprawnień sztabu bez wyzwalania pętli RLS.
24. [`20260819200000_update_trigger_fan_role.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260819200000_update_trigger_fan_role.sql) – Aktualizacja triggera rejestracyjnego `handle_new_user()` o obsługę roli `'fan'`, ułatwiająca tradycyjną rejestrację konta Kibica.

---

## 🧹 Czyszczenie Cache Metro Bundlera (Expo)
```bash
npx expo start -c
```

---

## 📂 Spis Zmian w Plikach (File Diff List)

| Plik | Status | Opis zmiany |
| :--- | :--- | :--- |
| [`app.json`](file:///d:/Nowy%20folder/mlawianka-app/app.json) | Zmodyfikowany | Nowa nazwa "GKS Strzegowo", slug, bundleIdentifier i Android package. |
| [`package.json`](file:///d:/Nowy%20folder/mlawianka-app/package.json) | Zmodyfikowany | Zależności `expo-image-picker`, `expo-notifications`. |
| [`css/colors.ts`](file:///d:/Nowy%20folder/mlawianka-app/css/colors.ts) | Zmodyfikowany | Kolorystyka klubowa GKS Strzegowo (Royal Blue). Usunięty zielony kolor. |
| [`css/news.ts`](file:///d:/Nowy%20folder/mlawianka-app/css/news.ts) | Zmodyfikowany | Stylizacje karuzeli zdjęć, klawiatury emotek i rozwijanych selektorów zespołów. |
| [`app/(tabs)/news.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/(tabs)/news.tsx) | Zmodyfikowany | Karuzela do 3 zdjęć, Pill Tab Switcher, siatka emotek, multi-team targeting ogłoszeń, nowy pozycjonowany FAB. |
| [`app/(tabs)/training.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/(tabs)/training.tsx) | Zmodyfikowany | Pill Tab Switcher, podgląd meczów Seniorów dla gości i rodziców, restrykcje zespołów trenera, nowy modal wydarzeń. |
| [`app/(tabs)/booking.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/(tabs)/booking.tsx) | Zmodyfikowany | Pill Tab Switcher z czcionkami Outfit i niebiesko-białą kolorystyką (Royal Blue). |
| [`app/(tabs)/chat.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/(tabs)/chat.tsx) | Zmodyfikowany | Realtime chat z powiadomieniami i niebieskimi odznakami badge. |
| [`components/ClubTabBar.tsx`](file:///d:/Nowy%20folder/mlawianka-app/components/ClubTabBar.tsx) | Zmodyfikowany | Jasny motyw nawigacji, szara kapsułka i niebieskie wskaźniki odznaki. |
| [`contexts/NotificationContext.tsx`](file:///d:/Nowy%20folder/mlawianka-app/contexts/NotificationContext.tsx) | **Nowy** | Globalny manager powiadomień realtime, liczników nieprzeczytanych i odznaki. |
| [`supabase/migrations/20260818120000_news_images_array.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260818120000_news_images_array.sql) | **Nowy** | Dodanie kolumny `images text[]` do tabeli `news`. |
| [`supabase/migrations/20260818125000_announcements_target_team_ids.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260818125000_announcements_target_team_ids.sql) | **Nowy** | Dodanie kolumny `target_team_ids integer[]` do `announcements`. |
| [`supabase/migrations/20260818150000_matches_and_teams_anon_select.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260818150000_matches_and_teams_anon_select.sql) | **Nowy** | Zezwolenie na anonimowy odczyt RLS meczy i zespołów dla gości. |
