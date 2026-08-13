CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    training_group TEXT CHECK (training_group IN ('group_a', 'group_b', 'group_c', 'group_d')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profile są widoczne dla wszystkich zalogowanych" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Użytkownicy mogą edytować własne profile" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

CREATE POLICY "Zezwól na rejestrację (insert) z poziomu aplikacji" 
ON public.profiles FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);
