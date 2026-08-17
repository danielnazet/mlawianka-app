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
* Utworzono plik [`css/colors.ts`](file:///d:/Nowy%20folder/mlawianka-app/css/colors.ts) ze schematem niebiesko-białym (Royal Blue).
* Dodano nowe logo [`app/assets/logo_gks.png`](file:///d:/Nowy%20folder/mlawianka-app/app/assets/logo_gks.png) w tle wszystkich 5 zakładek (Aktualności, Harmonogram, Rezerwacje, Czat, Profil) oraz ekranów logowania i rejestracji. Konfiguracja `resizeMode: "cover"` zapewnia pokrycie całego tła z subtelną przezroczystością (`opacity: 0.08`).
* Dodano nagłówek z dużym logo klubowym, tytułem i podtytułem na ekranie rejestracji [`app/auth/register.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/auth/register.tsx) w celu ujednolicenia szaty graficznej z ekranem logowania.

### 2. TypeScript i Uporządkowanie Kodu
* Przepisano i zmigrowano wszystkie pliki z rozszerzenia `.js` do `.tsx` / `.ts` w folderach `app/`, `contexts/` oraz `lib/`.
* Usunięto nieużywane, zduplikowane pliki JavaScript oraz stary plik `App.js` w głównym katalogu.
* **Modularyzacja Typów**: Stworzono dedykowane pliki typów w katalogu [`types/`](file:///d:/Nowy%20folder/mlawianka-app/types/) (np. `profile.ts`, `news.ts`, `training.ts`, `booking.ts`, `chat.ts`), połączone za pomocą jednego punktu wejściowego [`types/index.ts`](file:///d:/Nowy%20folder/mlawianka-app/types/index.ts). Wszystkie komponenty zostały zaktualizowane do korzystania z tych zmodularyzowanych typów.
* **Separacja Stałych**: Wydzielono stałe statyczne i wartości domyślne (np. `SAMPLE_IMAGES`) do pliku [`constants/news.ts`](file:///d:/Nowy%20folder/mlawianka-app/constants/news.ts), dostępnego przez barrel export [`constants/index.ts`](file:///d:/Nowy%20folder/mlawianka-app/constants/index.ts).
* Zweryfikowano poprawność kompilacji poleceniem `npx tsc --noEmit` (0 błędów typowania w całym projekcie).

### 3. Logika Uwierzytelniania i Bazy Danych
* Utworzono plik migracji [`20260814000000_gks_strzegowo.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260814000000_gks_strzegowo.sql) dodający tabele: `teams`, `matches`, `announcements`, `orlik_bookings`, `chat_messages` oraz powiązanie `parent_children`.
* Utworzono plik migracji [`20260814000100_create_admin.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260814000100_create_admin.sql), który automatycznie rejestruje w Supabase konto głównego administratora aplikacji (`admin@gksstrzegowo.pl` / `Admin123!`).
* Rozszerzono [`contexts/AuthContext.tsx`](file:///d:/Nowy%20folder/mlawianka-app/contexts/AuthContext.tsx), by automatycznie po zalogowaniu pobierał profil zalogowanego użytkownika z tabeli `profiles`.
* Zaktualizowano formularz rejestracji [`app/auth/register.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/auth/register.tsx) o dynamiczny wybór zespołu oraz pola dziecka dla kont rodziców.

### 4. Ekran Harmonogramu i Nowy Układ Aktualności
* [`app/(tabs)/news.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/(tabs)/news.tsx) wdrożyło profesjonalny wygląd aktualności:
  - Pierwszy news jest wyróżniony (duża karta, zaokrąglone krawędzie i cover).
  - Kolejne newsy wyświetlają się w poziomym układzie w stylu **Flashscore** (miniaturka po lewej, tytuł i data po prawej).
  - Kliknięcie w dowolną wiadomość otwiera modalne okno dialogowe z pełną treścią.
  - Dodano sanitację linków obrazków pobieranych z bazy danych (podmiana ucieczki znaku `\u0026` na prawidłowy ampersand `&`), a także bezpieczne przekierowywanie błędnych/wolnych linków testowych z Unsplash na stabilne placeholdery Picsum.
  - Wdrożono przycisk FAB (Floating Action Button) oraz formularze dialogowe pozwalające administratorom i trenerom na dodawanie nowych aktualności (z opcją wyróżnienia w I zespole) i ogłoszeń (z przypisywaniem do konkretnych zespołów) bezpośrednio z aplikacji.
  - Zaimplementowano pełne wsparcie dla wyboru zdjęcia aktualności – zamiast wpisywania adresu URL, administrator klika przycisk "Aparat" (uruchomienie aparatu i zrobienie zdjęcia) lub "Galeria" (wybór z pamięci telefonu) przy użyciu biblioteki `expo-image-picker`.
  - Wybrane zdjęcie jest konwertowane do formatu Blob w locie i przesyłane do publicznego kubełka storage w Supabase (`news-images`), po czym jego publiczny adres URL jest zapisywany w rekordzie newsa.
* [`app/(tabs)/training.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/(tabs)/training.tsx) obsługuje dwie zakładki: Treningi i Mecze. Trenerzy i Admini mogą bezpośrednio dodawać treningi dla poszczególnych zespołów oraz planować mecze (przeciwnik, data, miejsce, wynik).

### 5. Grafik i Rezerwacje Orlika
* [`app/(tabs)/booking.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/(tabs)/booking.tsx) zawiera zapisy zawodników na treningi oraz całotygodniowy grafik Orlika. Rezerwacja boiska jest dostępna dla zalogowanych trenerów i adminów, pozostali użytkownicy mają podgląd w czasie rzeczywistym.

### 6. Czat Realtime
* [`app/(tabs)/chat.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/(tabs)/chat.tsx) implementuje dynamiczne pokoje rozmów:
  - Czat grupowy dla trenerów i administratorów (`channel = 'coaches_admins'`).
  - Czaty indywidualne rodziców z trenerami zespołów ich dzieci.
  - Automatyczna subskrypcja Supabase Realtime do aktualizowania bąbelków wiadomości natychmiast po wysłaniu.

### 7. Panel Administratora (Zarządzanie)
* [`app/admin/manage_members.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/admin/manage_members.tsx) umożliwia adminowi edycję ról (np. promowanie zawodnika na trenera), przypisywanie graczy do zespołów oraz łączenie kont rodziców z profilami dzieci.
* [`app/admin/manage_teams.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/admin/manage_teams.tsx) pozwala adminowi na tworzenie grup treningowych (np. U-10) i przydzielanie im trenerów prowadzących.

---

## 🚀 Instrukcja Wdrożenia Struktury Bazy Danych
Ponieważ na nowym komputerze klonowane repozytorium nie ma zapisanego tokenu uwierzytelniania Supabase CLI:

1. Otwórz plik: [`supabase/migrations/20260814000000_gks_strzegowo.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260814000000_gks_strzegowo.sql).
2. Skopiuj jego pełną zawartość (SQL).
3. Przejdź do swojego panelu projektu na [Supabase.com](https://supabase.com).
4. Kliknij zakładkę **SQL Editor** po lewej stronie, utwórz nowe zapytanie (**New query**), wklej kod SQL i kliknij przycisk **Run** w prawym dolnym rogu.
5. Następnie zrób to samo dla pozostałych plików migracji w kolejności numerycznej: [`supabase/migrations/20260814000100_create_admin.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260814000100_create_admin.sql), [`supabase/migrations/20260814000200_news_rls.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260814000200_news_rls.sql) oraz [`supabase/migrations/20260814000300_storage_bucket.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260814000300_storage_bucket.sql).

> [!WARNING]
> **Błąd: "Could not find the table 'public.teams' in the schema cache" (PGRST205)**:
> Jeżeli po uruchomieniu aplikacji napotkasz ten błąd, oznacza to, że nie wgrałeś jeszcze skryptu migracji SQL na swoją zdalną bazę Supabase. Po uruchomieniu tego zapytania w SQL Editorze, Supabase automatycznie utworzy tabelę `teams` i odświeży pamięć podręczną (schema cache), co natychmiast naprawi błąd.

---

## 🧹 Czyszczenie Cache Metro Bundlera (Expo)
Jeżeli w aplikacji nie widać zmian w stylach, zasobach (np. usuniętym logo) lub plikach TypeScript, zresetuj pamięć podręczną Expo uruchamiając serwer komendą:
```bash
npx expo start -c
```
*(Flaga `-c` lub `--clear` czyści pamięć podręczną i zmusza bundler do przeładowania wszystkich modułów).*

---

## 📂 Spis Zmian w Plikach (File Diff List)

| Plik | Status | Opis zmiany |
| :--- | :--- | :--- |
| [`app.json`](file:///d:/Nowy%20folder/mlawianka-app/app.json) | Zmodyfikowany | Nowa nazwa "GKS Strzegowo", slug, bundleIdentifier i Android package. |
| [`package.json`](file:///d:/Nowy%20folder/mlawianka-app/package.json) | Zmodyfikowany | Dodano zależność `expo-image-picker`. |
| [`App.js`](file:///d:/Nowy%20folder/mlawianka-app/App.js) | **Usunięty** | Usunięcie zbędnego i zduplikowanego pliku wejściowego. |
| [`css/colors.js`](file:///d:/Nowy%20folder/mlawianka-app/css/colors.js) | **Usunięty** | Zastąpiony przez wersję TypeScript. |
| [`css/colors.ts`](file:///d:/Nowy%20folder/mlawianka-app/css/colors.ts) | **Nowy** | Kolorystyka klubowa GKS Strzegowo (biało-niebieska). |
| [`lib/supabase.js`](file:///d:/Nowy%20folder/mlawianka-app/lib/supabase.js) | **Usunięty** | Zastąpiony przez wersję TypeScript. |
| [`lib/supabase.ts`](file:///d:/Nowy%20folder/mlawianka-app/lib/supabase.ts) | **Nowy** | Inicjalizacja Supabase w TS. |
| [`contexts/AuthContext.js`](file:///d:/Nowy%20folder/mlawianka-app/contexts/AuthContext.js) | **Usunięty** | Zastąpiony przez wersję TypeScript. |
| [`contexts/AuthContext.tsx`](file:///d:/Nowy%20folder/mlawianka-app/contexts/AuthContext.tsx) | **Nowy** | Kontekst sesji logowania z wbudowanym automatycznym pobieraniem profilu użytkownika. |
| [`app/_layout.js`](file:///d:/Nowy%20folder/mlawianka-app/app/_layout.js) | **Usunięty** | Zastąpiony przez wersję TypeScript. |
| [`app/_layout.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/_layout.tsx) | **Nowy** | Główny layout aplikacji w TypeScript. |
| [`app/index.js`](file:///d:/Nowy%20folder/mlawianka-app/app/index.js) | **Usunięty** | Zastąpiony przez wersję TypeScript. |
| [`app/index.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/index.tsx) | **Nowy** | Ekran startowy (przekierowanie na `/news`) w TS. |
| [`app/auth/login.js`](file:///d:/Nowy%20folder/mlawianka-app/app/auth/login.js) | **Usunięty** | Zastąpiony przez wersję TypeScript. |
| [`app/auth/login.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/auth/login.tsx) | **Nowy** | Logowanie z logo GKS Strzegowo jako przezroczystym tłem w TS. |
| [`app/auth/register.js`](file:///d:/Nowy%20folder/mlawianka-app/app/auth/register.js) | **Usunięty** | Zastąpiony przez wersję TypeScript. |
| [`app/auth/register.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/auth/register.tsx) | **Nowy** | Rejestracja z nowym logo na górze, dynamicznym zespołem w TS. |
| [`app/(tabs)/_layout.js`](file:///d:/Nowy%20folder/mlawianka-app/app/(tabs)/_layout.js) | **Usunięty** | Zastąpiony przez wersję TypeScript. |
| [`app/(tabs)/_layout.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/(tabs)/_layout.tsx) | **Nowy** | Pasek dolny z nową zakładką czatu w TS. |
| [`app/(tabs)/news.js`](file:///d:/Nowy%20folder/mlawianka-app/app/(tabs)/news.js) | **Usunięty** | Zastąpiony przez wersję TypeScript. |
| [`app/(tabs)/news.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/(tabs)/news.tsx) | **Nowy** | Nowy formularz dodawania postów z wbudowanym aparatem i galerii oraz uploadem. |
| [`app/(tabs)/training.js`](file:///d:/Nowy%20folder/mlawianka-app/app/(tabs)/training.js) | **Usunięty** | Zastąpiony przez wersję TypeScript. |
| [`app/(tabs)/training.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/(tabs)/training.tsx) | **Nowy** | Harmonogram treningów i meczów w TS. |
| [`app/(tabs)/booking.js`](file:///d:/Nowy%20folder/mlawianka-app/app/(tabs)/booking.js) | **Usunięty** | Zastąpiony przez wersję TypeScript. |
| [`app/(tabs)/booking.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/(tabs)/booking.tsx) | **Nowy** | Zapisy na treningi i rezerwacja Orlika w TS. |
| [`app/(tabs)/chat.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/(tabs)/chat.tsx) | **Nowy** | Czat w czasie rzeczywistym (Realtime) w TS. |
| [`app/(tabs)/profile.js`](file:///d:/Nowy%20folder/mlawianka-app/app/(tabs)/profile.js) | **Usunięty** | Zastąpiony przez wersję TypeScript. |
| [`app/(tabs)/profile.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/(tabs)/profile.tsx) | **Nowy** | Profil z przejściem do opcji administratorskich w TS. |
| [`app/admin/manage_members.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/admin/manage_members.tsx) | **Nowy** | Panel zarządzania rolami i łączeniem rodzic-dziecko w TS. |
| [`app/admin/manage_teams.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/admin/manage_teams.tsx) | **Nowy** | Panel zarządzania i tworzenia zespołów w TS. |
| [`types/index.ts`](file:///d:/Nowy%20folder/mlawianka-app/types/index.ts) | **Nowy** | Główny barrel export typów TypeScript. |
| [`types/profile.ts`](file:///d:/Nowy%20folder/mlawianka-app/types/profile.ts) | **Nowy** | Interfejs typów dla profili użytkowników. |
| [`types/team.ts`](file:///d:/Nowy%20folder/mlawianka-app/types/team.ts) | **Nowy** | Interfejs typów dla klubowych drużyn. |
| [`types/news.ts`](file:///d:/Nowy%20folder/mlawianka-app/types/news.ts) | **Nowy** | Interfejsy typów dla aktualności i ogłoszeń. |
| [`types/training.ts`](file:///d:/Nowy%20folder/mlawianka-app/types/training.ts) | **Nowy** | Interfejs typów dla treningów. |
| [`types/match.ts`](file:///d:/Nowy%20folder/mlawianka-app/types/match.ts) | **Nowy** | Interfejs typów dla meczów. |
| [`types/booking.ts`](file:///d:/Nowy%20folder/mlawianka-app/types/booking.ts) | **Nowy** | Interfejs typów dla rezerwacji Orlika. |
| [`types/chat.ts`](file:///d:/Nowy%20folder/mlawianka-app/types/chat.ts) | **Nowy** | Interfejsy typów dla wiadomości i pokoi rozmów. |
| [`constants/index.ts`](file:///d:/Nowy%20folder/mlawianka-app/constants/index.ts) | **Nowy** | Główny barrel export stałych aplikacji. |
| [`consta| [`supabase/migrations/20260814000200_news_rls.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260814000200_news_rls.sql) | **Nowy** | Reguły zapisu RLS dla tabeli news umożliwiające adminowi dodawanie aktualności. |
| [`supabase/migrations/20260814000300_storage_bucket.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260814000300_storage_bucket.sql) | **Nowy** | Utworzenie kubełka storage `news-images` i przypisanie polityk wgrania zdjęć. |
| [`supabase/migrations/20260814000400_news_important.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260814000400_news_important.sql) | **Nowy** | Dodanie kolumny `is_important` do tabeli news. |
| [`supabase/migrations/20260817131000_update_trigger_coach.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260817131000_update_trigger_coach.sql) | **Nowy** | Wyzwalacz rejestracji rozszerzony o role trenera i admina w public.handle_new_user(). |
| [`supabase/migrations/20260817134000_profiles_push_token.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260817134000_profiles_push_token.sql) | **Nowy** | Dodanie kolumny `push_token` do profili dla wysyłania powiadomień w tle. |
| [`supabase/migrations/20260817143000_enable_realtime_news_trainings.sql`](file:///d:/Nowy%20folder/mlawianka-app/supabase/migrations/20260817143000_enable_realtime_news_trainings.sql) | **Nowy** | Włączenie usługi Realtime dla tabel `news`, `announcements` oraz `trainings`. |
| [`contexts/NotificationContext.tsx`](file:///d:/Nowy%20folder/mlawianka-app/contexts/NotificationContext.tsx) | **Nowy** | Globalny manager powiadomień realtime, liczników nieprzeczytanych i odznaki. |
| [`app/admin/manage_members.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/admin/manage_members.tsx) | **Nowy** | Ekran administratora do usuwania i przenoszenia członków do innych grup. |
| [`components/ClubTabBar.tsx`](file:///d:/Nowy%20folder/mlawianka-app/components/ClubTabBar.tsx) | Zmodyfikowany | Przejście na jasny styl nawigacji, szara kapsułka i niebieskie wskaźniki odznaki. |

---

## 🔄 Najnowsze Zmiany i Udoskonalenia (Wdrożone Ostatnio)

1. **Nowy Styl Tab Baru (Zgodnie z projektem)**:
   - Zmieniono motyw dolnego paska nawigacji na jasnoszary (`#F9FAFB`) z jasnoszarą obwódką (`#E5E7EB`).
   - Aktywny tab wyróżnia się szarą kapsułką/pillsem (`#E5E7EB` z otoczką `#D1D5DB`) – dokładnie tak jak na przesłanym wzorze.
   - Aktywne ikony/teksty są niebieskie (`COLORS.primary`), a nieaktywne szare (`#64748b`).
   - Przy przełączaniu ikonka i napis płynnie się powiększają (`scale: 1.1`) z użyciem fizyki sprężyny (`withSpring`).

2. **Zarządzanie Członkami (Nowy panel dla Admina)**:
   - Dodano nowy ekran administracyjny [`app/admin/manage_members.tsx`](file:///d:/Nowy%20folder/mlawianka-app/app/admin/manage_members.tsx).
   - Pozwala on przeglądać zarejestrowanych zawodników (imię, nazwisko, e-mail, wiek, aktualna grupa) oraz rodziców (imię, nazwisko, e-mail, dane dziecka, wiek dziecka, grupa dziecka).
   - Administrator może przenieść każdego członka do innej grupy (dialog z listą grup i opcją "Brak przypisania") lub trwale usunąć profil.

3. **System Powiadomień Realtime, Odznaka i Pełna Synchronizacja**:
   - Wdrożono dostawcę [`contexts/NotificationContext.tsx`](file:///d:/Nowy%20folder/mlawianka-app/contexts/NotificationContext.tsx) obsługującego powiadomienia systemowe.
   - **Wskaźnik tab baru (Badge)**: W dolnym menu obok ikonek "Czat" oraz "Aktualności" pojawia się niebieskie kółko z liczbą nieprzeczytanych powiadomień.
   - **Wskaźniki czatów (Osoby kontaktowe)**: Na liście kontaktów obok każdego nadawcy (lub pokoju sztabu) wyświetla się niebieski badge z cyfrą nieprzeczytanych wiadomości od tej osoby. Licznik jest zapisywany w `AsyncStorage` (osobno dla każdego zalogowanego konta) i zeruje się w locie po otwarciu czatu, co natychmiast pomniejsza sumaryczny licznik na dolnym pasku nawigacyjnym.
   - **Realtime DB Publication**: Aktywowano nasłuchiwanie w czasie rzeczywistym dla tabel `news`, `announcements` oraz `trainings` poprzez skrypt migracji.

4. **Multiplatformowy Upload Zdjęć (Zgodność z Web)**:
   - Naprawiono błąd `readAsStringAsync is not available on web` przy dodawaniu trenera oraz dodawaniu aktualności w przeglądarce.
   - Na platformie Web pliki są odczytywane jako Blob przy użyciu natywnego `fetch()`, a na telefonach za pomocą Base64 z biblioteki `expo-file-system/legacy`.

5. **Poprawka Wyzwalacza Rejestracji Trenerów (Błąd Supabase)**:
   - Rozwiązano błąd `Database error saving new user` podczas tworzenia trenera przez admina. Whitelistowano role `coach` i `admin` w bazie danych w wyzwalaczu rejestracji, eliminując błędne wymuszanie danych dziecka dla profili trenerskich.

6. **Bezpieczne Area i Nawigacja**:
   - Dodano obsługę `useSafeAreaInsets` w nagłówkach paneli admina, zapobiegając ucinaniu paska na telefonach z notchem.
   - Wprowadzono bezpieczny mechanizm powrotu (`router.canGoBack()`) we wszystkich podstronach admina chroniący przed błędem `GO_BACK was not handled`.
