-- Update can_chat_with function to allow Kibic (fan) to chat ONLY with admins (and vice versa)
create or replace function public.can_chat_with(p_other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select id, role::text as role, team_id
    from public.profiles
    where id = auth.uid()
  ), other_user as (
    select id, role::text as role, team_id
    from public.profiles
    where id = p_other_user_id
  )
  select coalesce((
    select case
      when me.id = other_user.id then false

      -- Kibic może rozmawiać WYŁĄCZNIE z administratorem
      when me.role = 'fan' and other_user.role = 'admin' then true
      when me.role = 'admin' and other_user.role = 'fan' then true

      -- Administrator może pisać do wszystkich (rodzic, zawodnik, trener, kibic)
      when me.role = 'admin' and other_user.role in ('parent', 'player', 'coach', 'fan') then true

      -- Trener widzi wyłącznie rodziców/zawodników ze swoich drużyn + administratorów
      when me.role = 'coach' and other_user.role in ('parent', 'player') then exists (
        select 1
        from public.teams t
        where t.coach_id = me.id
          and t.id = other_user.team_id
      )
      when me.role = 'coach' and other_user.role = 'admin' then true

      -- Rodzic/zawodnik widzi trenera przypisanego do jego team_id + administratorów
      when me.role in ('parent', 'player') and other_user.role = 'coach' then exists (
        select 1
        from public.teams t
        where t.coach_id = other_user.id
          and t.id = me.team_id
      )
      when me.role in ('parent', 'player') and other_user.role = 'admin' then true

      else false
    end
    from me cross join other_user
  ), false);
$$;
