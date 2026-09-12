-- Tabela Sponsorów i Partnerów Klubu (GKS Strzegowo)

CREATE TABLE IF NOT EXISTS public.sponsors (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'partner' CHECK (category IN ('main', 'strategic', 'partner')),
    description TEXT,
    logo_url TEXT,
    website_url TEXT,
    phone TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indeksy wydajnościowe
CREATE INDEX IF NOT EXISTS idx_sponsors_category ON public.sponsors(category);
CREATE INDEX IF NOT EXISTS idx_sponsors_is_active ON public.sponsors(is_active);
CREATE INDEX IF NOT EXISTS idx_sponsors_display_order ON public.sponsors(display_order);

-- Włączenie RLS
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;

-- 1. Odczyt publiczny dla wszystkich (zarówno zalogowani jak i anonimowi goście)
DROP POLICY IF EXISTS "Sponsorzy są widoczni dla wszystkich" ON public.sponsors;
CREATE POLICY "Sponsorzy są widoczni dla wszystkich"
    ON public.sponsors FOR SELECT
    TO anon, authenticated
    USING (is_active = true);

-- 2. Administrator ma pełne prawa (dodawanie, edycja, usuwanie)
DROP POLICY IF EXISTS "Tylko administrator może zarządzać sponsorami" ON public.sponsors;
CREATE POLICY "Tylko administrator może zarządzać sponsorami"
    ON public.sponsors FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Seed Data: Przykładowi sponsorzy na start prezentacji
INSERT INTO public.sponsors (name, category, description, website_url, display_order)
VALUES
    ('Bank Spółdzielczy w Strzegowie', 'main', 'Oficjalny Sponsor Główny Klubu & Akademii Młodzieżowej', 'https://www.bsstrzegowo.pl', 1),
    ('Gmina Strzegowo', 'strategic', 'Partner Samorządowy – Wsparcie Sportu Dzieci i Młodzieży', 'https://strzegowo.pl', 2),
    ('Auto-Centrum Strzegowo', 'strategic', 'Partner Motoryzacyjny & Transport Drużyn', 'https://gksstrzegowo.pl', 3),
    ('Pizzeria & Restauracja Bella', 'partner', 'Partner Gastronomiczny – Oficjalna Pizzeria Klubu', 'https://gksstrzegowo.pl', 4),
    ('Centrum Medyczne & Fizjoterapia Zdrowie', 'partner', 'Partner Medyczny – Opieka Zdrowotna Zawodników', 'https://gksstrzegowo.pl', 5)
ON CONFLICT DO NOTHING;
