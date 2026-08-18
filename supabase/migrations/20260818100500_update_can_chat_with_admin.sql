-- Drop existing function first to prevent return type conversion errors in PostgreSQL
drop function if exists public.list_chat_contacts();

-- Update can_chat_with function to allow admins to chat with coaches (and vice versa)
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

      -- Administrator może pisać do wszystkich (rodzic, zawodnik, trener)
      when me.role = 'admin' and other_user.role in ('parent', 'player', 'coach') then true
      when me.role in ('parent', 'player', 'coach') and other_user.role = 'admin' then true

      -- Trener widzi wyłącznie rodziców/zawodników ze swoich drużyn
      when me.role = 'coach' and other_user.role in ('parent', 'player') then exists (
        select 1
        from public.teams t
        where t.coach_id = me.id
          and t.id = other_user.team_id
      )

      -- Rodzic/zawodnik widzi trenera przypisanego do jego team_id
      when me.role in ('parent', 'player') and other_user.role = 'coach' then exists (
        select 1
        from public.teams t
        where t.coach_id = other_user.id
          and t.id = me.team_id
      )

      else false
    end
    from me cross join other_user
  ), false);
$$;

-- Redefine list_chat_contacts function
create or replace function public.list_chat_contacts()
returns table (
  id uuid,
  first_name text,
  last_name text,
  role text,
  team_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.first_name,
    p.last_name,
    p.role::text,
    case
      when p.role::text = 'coach' then (
        select name::text
        from public.teams t
        where t.coach_id = p.id
        limit 1
      )
      else (
        select name::text
        from public.teams t
        where t.id = p.team_id
      )
    end as team_name
  from public.profiles p
  where public.can_chat_with(p.id)
  order by p.last_name nulls last, p.first_name nulls last;
$$;
