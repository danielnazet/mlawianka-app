-- Dodanie kolumny wiek dla profilu zawodnika oraz kolumny wiek dziecka dla profilu rodzica
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS age INT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS child_age INT;
