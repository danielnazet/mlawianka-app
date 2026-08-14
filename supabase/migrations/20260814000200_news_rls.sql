-- Zapewniamy włączenie RLS na tabeli news
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

-- Usuwamy stare reguły dla tabeli news (jeśli istnieją), aby zapobiec konfliktom
DROP POLICY IF EXISTS "Aktualności są widoczne dla wszystkich" ON public.news;
DROP POLICY IF EXISTS "Tylko admin może dodawać/zarządzać aktualnościami" ON public.news;
DROP POLICY IF EXISTS "News are viewable by everyone" ON public.news;
DROP POLICY IF EXISTS "Admins can insert news" ON public.news;
DROP POLICY IF EXISTS "Admins can update news" ON public.news;
DROP POLICY IF EXISTS "Admins can delete news" ON public.news;

-- Tworzymy politykę odczytu (widoczne dla wszystkich bez logowania)
CREATE POLICY "Aktualności są widoczne dla wszystkich" 
ON public.news FOR SELECT USING (true);

-- Tworzymy politykę zapisu/edycji/usuwania tylko dla administratorów
CREATE POLICY "Tylko admin może dodawać/zarządzać aktualnościami" 
ON public.news FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
