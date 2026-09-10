-- Optymalizacja Disk IO i indeksy wydajnościowe dla bazy Supabase

-- 1. Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_team_id ON public.profiles(team_id);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at);

-- 2. Teams
CREATE INDEX IF NOT EXISTS idx_teams_coach_id ON public.teams(coach_id);
CREATE INDEX IF NOT EXISTS idx_teams_is_active ON public.teams(is_active);

-- 3. Matches
CREATE INDEX IF NOT EXISTS idx_matches_team_id ON public.matches(team_id);
CREATE INDEX IF NOT EXISTS idx_matches_match_date ON public.matches(match_date);
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON public.matches(created_at);

-- 4. Trainings
CREATE INDEX IF NOT EXISTS idx_trainings_team_id ON public.trainings(team_id);
CREATE INDEX IF NOT EXISTS idx_trainings_created_at ON public.trainings(created_at);

-- 5. Announcements
CREATE INDEX IF NOT EXISTS idx_announcements_team_id ON public.announcements(team_id);
CREATE INDEX IF NOT EXISTS idx_announcements_sender_id ON public.announcements(sender_id);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON public.announcements(created_at);

-- 6. Orlik Bookings
CREATE INDEX IF NOT EXISTS idx_orlik_bookings_booking_date ON public.orlik_bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_orlik_bookings_booked_by ON public.orlik_bookings(booked_by);

-- 7. Parent-Children
CREATE INDEX IF NOT EXISTS idx_parent_children_parent_id ON public.parent_children(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_children_child_id ON public.parent_children(child_id);

-- 8. News & Reactions
CREATE INDEX IF NOT EXISTS idx_news_created_at ON public.news(created_at);
CREATE INDEX IF NOT EXISTS idx_news_reactions_news_id ON public.news_reactions(news_id);
CREATE INDEX IF NOT EXISTS idx_news_reactions_user_id ON public.news_reactions(user_id);

-- 9. Chat
CREATE INDEX IF NOT EXISTS idx_chat_members_conversation_id ON public.chat_members(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON public.chat_messages(sender_id);
