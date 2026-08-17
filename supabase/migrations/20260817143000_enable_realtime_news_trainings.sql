-- Enable Supabase Realtime for news, announcements, and trainings tables
alter publication supabase_realtime add table public.news;
alter publication supabase_realtime add table public.announcements;
alter publication supabase_realtime add table public.trainings;
