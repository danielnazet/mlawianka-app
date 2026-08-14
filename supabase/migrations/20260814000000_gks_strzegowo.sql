-- 1. Zmiana dopuszczalnych ról w tabeli profiles
-- Najpierw usuwamy stary warunek CHECK, aby móc zaktualizować dane bez błędów naruszenia reguł
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Aktualizujemy stare role 'user' lub niepoprawne na domyślne 'player'
UPDATE public.profiles 
SET role = 'player' 
WHERE role = 'user' OR role IS NULL OR role NOT IN ('admin', 'coach', 'player', 'parent');

-- Nakładamy nowy warunek CHECK
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'coach', 'player', 'parent'));
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'player';

-- 2. Tabela Zespołów (Teams)
CREATE TABLE IF NOT EXISTS public.teams (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    coach_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Zapewnienie powiązania profili z zespołami
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_training_group_check;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS training_group;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS team_id INT REFERENCES public.teams(id) ON DELETE SET NULL;

-- Pola na dane dziecka (dla rodziców)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS child_first_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS child_last_name TEXT;

-- Powiązanie treningów z zespołami
ALTER TABLE public.trainings ADD COLUMN IF NOT EXISTS team_id INT REFERENCES public.teams(id) ON DELETE CASCADE;

-- 3. Tabela powiązań rodzic-dziecko (Parent-Children)
CREATE TABLE IF NOT EXISTS public.parent_children (
    parent_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    child_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    PRIMARY KEY (parent_id, child_id)
);

-- 4. Tabela Meczy (Matches)
CREATE TABLE IF NOT EXISTS public.matches (
    id SERIAL PRIMARY KEY,
    team_id INT REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    opponent TEXT NOT NULL,
    match_date TIMESTAMP WITH TIME ZONE NOT NULL,
    location TEXT NOT NULL,
    result TEXT, -- np. '3:1' lub NULL jeśli się nie odbył
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabela Ogłoszeń (Announcements)
CREATE TABLE IF NOT EXISTS public.announcements (
    id SERIAL PRIMARY KEY,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    team_id INT REFERENCES public.teams(id) ON DELETE CASCADE, -- NULL oznacza ogólne
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Tabela Rezerwacji Orlika (Orlik Bookings)
CREATE TABLE IF NOT EXISTS public.orlik_bookings (
    id SERIAL PRIMARY KEY,
    booked_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Tabela Wiadomości / Czatów (Chat Messages)
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id SERIAL PRIMARY KEY,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    channel TEXT, -- np. 'coaches_admins' do czatu grupowego
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Aktualizacja tabeli news o kolumny pierwszej drużyny i obrazka
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS is_first_team BOOLEAN DEFAULT false;
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 9. Konfiguracja Row Level Security (RLS) dla nowych tabel

-- Teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Zespoły są widoczne dla wszystkich" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Tylko admin może zarządzać zespołami" ON public.teams FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Parent-Children
ALTER TABLE public.parent_children ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rodzice i dzieci widzą swoje powiązania" ON public.parent_children FOR SELECT TO authenticated USING (
    auth.uid() = parent_id OR auth.uid() = child_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Tylko admin może zarządzać powiązaniami" ON public.parent_children FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Matches
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mecze są widoczne dla wszystkich" ON public.matches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin i trener mogą dodawać/edytować mecze" ON public.matches FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'coach'))
);

-- Announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ogłoszenia są widoczne dla wszystkich zalogowanych" ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin i trener mogą dodawać/edytować ogłoszenia" ON public.announcements FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'coach'))
);

-- Orlik Bookings
ALTER TABLE public.orlik_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rezerwacje Orlika są widoczne dla zalogowanych" ON public.orlik_bookings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Trenerzy i admini mogą rezerwować Orlika" ON public.orlik_bookings FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'coach'))
);

-- Chat Messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Użytkownicy mogą odczytywać swoje wiadomości lub czat grupowy" ON public.chat_messages FOR SELECT TO authenticated USING (
    auth.uid() = sender_id OR 
    auth.uid() = recipient_id OR 
    (channel = 'coaches_admins' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'coach')))
);
CREATE POLICY "Użytkownicy mogą pisać wiadomości" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = sender_id
);

-- 10. Wstawienie przykładowych zespołów klubowych (Seed data)
INSERT INTO public.teams (name) VALUES 
('Główny Zespół (Seniorzy)'),
('Juniorzy U-8'),
('Juniorzy U-10'),
('Juniorzy U-12'),
('Juniorzy U-14')
ON CONFLICT DO NOTHING;

-- Aktualizacja przykładowych newsów, aby były powiązane z pierwszą drużyną i zawierały zdjęcia
UPDATE public.news SET is_first_team = true, image_url = 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=600' WHERE id = 1;
UPDATE public.news SET image_url = 'https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=600' WHERE id = 2;
