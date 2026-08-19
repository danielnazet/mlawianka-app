-- 1. Add youtube_url column to public.news
alter table public.news
add column if not exists youtube_url text;

-- 2. Create public.news_reactions table for persistent fan reactions
create table if not exists public.news_reactions (
  id uuid primary key default gen_random_uuid(),
  news_id bigint not null references public.news(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz default now(),
  unique (news_id, user_id, emoji)
);

-- Enable RLS on news_reactions
alter table public.news_reactions enable row level security;

-- Policies for news_reactions
drop policy if exists "news_reactions_select_all" on public.news_reactions;
create policy "news_reactions_select_all"
on public.news_reactions
for select
to authenticated, anon
using (true);

drop policy if exists "news_reactions_insert_auth" on public.news_reactions;
create policy "news_reactions_insert_auth"
on public.news_reactions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "news_reactions_delete_auth" on public.news_reactions;
create policy "news_reactions_delete_auth"
on public.news_reactions
for delete
to authenticated
using (auth.uid() = user_id);
