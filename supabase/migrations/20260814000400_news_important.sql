-- Dodanie kolumny określającej, czy aktualność jest "najważniejsza" (wyróżniona)
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS is_important BOOLEAN DEFAULT false;
