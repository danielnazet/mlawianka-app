drop function if exists public.list_chat_contacts();

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
    t.name::text as team_name,
    p.avatar_url
  from public.profiles p
  left join public.teams t on t.id = p.team_id
  where public.can_chat_with(p.id)
  order by p.last_name nulls last, p.first_name nulls last;
$$;

grant execute on function public.list_chat_contacts() to authenticated;
