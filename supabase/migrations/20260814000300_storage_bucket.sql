-- Tworzymy kubełek storage na zdjęcia newsów
INSERT INTO storage.buckets (id, name, public)
VALUES ('news-images', 'news-images', true)
ON CONFLICT (id) DO NOTHING;

-- Zezwalamy wszystkim na odczyt plików z kubełka 'news-images'
CREATE POLICY "Publiczny odczyt zdjęć newsów"
ON storage.objects FOR SELECT USING (bucket_id = 'news-images');

-- Zezwalamy zalogowanym administratorom i trenerom na wgrywanie zdjęć
CREATE POLICY "Wgrywanie zdjęć newsów przez admina i trenera"
ON storage.objects FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'news-images' AND
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND (role = 'admin' OR role = 'coach')
    )
);

-- Zezwalamy na usuwanie zdjęć przez adminów
CREATE POLICY "Usuwanie zdjęć newsów przez adminów"
ON storage.objects FOR DELETE TO authenticated USING (
    bucket_id = 'news-images' AND
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);
