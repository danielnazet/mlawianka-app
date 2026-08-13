-- Uprawnienia SELECT dla każdego (anonimowi i zalogowani użytkownicy)
DROP POLICY IF EXISTS "Aktualności są widoczne dla zalogowanych" ON public.news;

CREATE POLICY "Aktualności są widoczne dla wszystkich" 
ON public.news FOR SELECT 
TO anon, authenticated 
USING (true);
