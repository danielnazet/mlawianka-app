# Uruchomienie czatu GKS Strzegowo

## Kolejność wdrożenia
1. **Wdrożenie bazy danych**: Migracja `20260814000700_chat_schema_rls_and_realtime.sql` została pomyślnie automatycznie zepchnięta do Twojej bazy danych Supabase za pomocą polecenia `npx supabase db push`.
2. **Aktualizacja kodu aplikacji**: Ekran czatu w `app/(tabs)/chat.tsx` został zaktualizowany o nowy interfejs i integrację z nowym bezpiecznym API.
3. **Uruchomienie aplikacji ponownie**: Uruchom polecenie `npx expo start -c` (z flagą `-c` aby wyczyścić cache Metra).

## Wymagane dane w bazie
* `profiles.id` musi być UUID użytkownika z Supabase Auth.
* `profiles.role` przyjmuje: `admin`, `coach`, `parent`, `player`.
* `profiles.team_id` wskazuje `teams.id` dla zawodnika i rodzica.
* `teams.coach_id` wskazuje profil trenera (`profiles.id`).

Obecny model rodzica zakłada jedną drużynę w `profiles.team_id`. To pasuje do aktualnego formularza rejestracji, który wyznacza drużynę na podstawie wieku dziecka. Gdy jeden rodzic ma mieć kilkoro dzieci w różnych drużynach, trzeba przenieść powiązania do `parent_children` i rozszerzyć funkcję `can_chat_with`.

## Reguły dostępu (RLS)
* **Administrator**: wspólny czat sztabu + czaty 1:1 ze wszystkimi rodzicami i zawodnikami.
* **Trener**: wspólny czat sztabu + czaty 1:1 tylko z rodzicami/zawodnikami jego drużyn.
* **Rodzic / zawodnik**: czaty 1:1 z administratorami i trenerem przypisanym do `team_id`.

Nowy trener trafia do czatu sztabu automatycznie po ustawieniu `profiles.role = 'coach'`. Nie trzeba dopisywać go do `chat_members`.

## Test przed wdrożeniem
Utwórz konta testowe: administrator, dwóch trenerów, rodzic i zawodnik. Przypisz trenerów do różnych drużyn i sprawdź:
1. Trener A nie widzi rodziców i zawodników drużyny trenera B.
2. Obaj trenerzy widzą wspólny czat sztabu.
3. Rodzic widzi administratorów oraz trenera swojej drużyny.
4. Rodzic nie potrafi otworzyć rozmowy z obcym trenerem nawet po ręcznej zmianie identyfikatora w żądaniu (RLS to zablokuje).
5. Po wysłaniu wiadomości pojawia się ona na drugim telefonie bez odświeżania (dzięki Postgres Realtime Changes).

## Co warto dodać później
* Tabela `chat_reads` i licznik nieprzeczytanych wiadomości.
* Powiadomienia push przez Expo Notifications + Supabase Edge Function.
* Zgłaszanie i moderacja wiadomości.
* Archiwizacja rozmów zamiast kasowania.
* Obsługa załączników w prywatnym buckecie Supabase Storage.
