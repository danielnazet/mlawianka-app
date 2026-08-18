-- Drop the existing function first to change return columns count and types
drop function if exists public.list_chat_contacts();

-- Redefine list_chat_contacts with avatar_url included
create or replace function public.list_chat_contacts()
returns table (
  id uuid,
  first_name text,
  last_name text,
  role text,
  team_name text,
  avatar_url text
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
    end as team_name,
    p.avatar_url
  from public.profiles p
  where public.can_chat_with(p.id)
  order by p.last_name nulls last, p.first_name nulls last;
$$;
