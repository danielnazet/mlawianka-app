-- Allow anonymous and authenticated users to view Orlik bookings
-- Allow all logged in users (parents, fans, coaches, admins) to create bookings
-- Allow owners and admins to edit/delete bookings

DROP POLICY IF EXISTS "Rezerwacje Orlika są widoczne dla zalogowanych" ON public.orlik_bookings;
DROP POLICY IF EXISTS "Rezerwacje Orlika są widoczne dla wszystkich" ON public.orlik_bookings;
DROP POLICY IF EXISTS "Trenerzy i admini mogą rezerwować Orlika" ON public.orlik_bookings;
DROP POLICY IF EXISTS "Zalogowani użytkownicy mogą rezerwować Orlika" ON public.orlik_bookings;
DROP POLICY IF EXISTS "Właściciel lub admin może edytować/usuwać rezerwację Orlika" ON public.orlik_bookings;

-- 1. Odczyt dla wszystkich (w tym gości)
CREATE POLICY "Rezerwacje Orlika są widoczne dla wszystkich"
ON public.orlik_bookings
FOR SELECT
TO anon, authenticated
USING (true);

-- 2. Tworzenie rezerwacji przez każdego zalogowanego
CREATE POLICY "Zalogowani użytkownicy mogą rezerwować Orlika"
ON public.orlik_bookings
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = booked_by
);

-- 3. Edycja i usuwanie przez autora lub administratora
CREATE POLICY "Właściciel lub admin może edytować/usuwać rezerwację Orlika"
ON public.orlik_bookings
FOR ALL
TO authenticated
USING (
    auth.uid() = booked_by OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
