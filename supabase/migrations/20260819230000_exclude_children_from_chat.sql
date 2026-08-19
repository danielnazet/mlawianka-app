-- Migration: Exclude child profiles from chat contacts and ensure coaches chat directly with parents
drop function if exists public.list_chat_contacts();

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

      -- Dzieci (profile przypisane w parent_children lub bez rekordu w auth.users) NIGDY nie są adresatami czatu
      when exists (
        select 1
        from public.parent_children pc
        where pc.child_id = other_user.id
      ) then false

      when not exists (
        select 1
        from auth.users u
        where u.id = other_user.id
      ) then false

      -- Administrator może pisać do wszystkich głównych kont (rodzic, pełnoletni zawodnik, trener)
      when me.role = 'admin' and other_user.role in ('parent', 'player', 'coach') then true
      when me.role in ('parent', 'player', 'coach') and other_user.role = 'admin' then true

      -- Trener widzi rodziców i zawodników ze swoich drużyn (zarówno przez team_id rodzica, jak i team_id przypisanych dzieci)
      when me.role = 'coach' and other_user.role in ('parent', 'player') then exists (
        select 1
        from public.teams t
        where t.coach_id = me.id
          and (
            t.id = other_user.team_id
            or exists (
              select 1
              from public.parent_children pc
              join public.profiles cp on cp.id = pc.child_id
              where pc.parent_id = other_user.id
                and cp.team_id = t.id
            )
          )
      )

      -- Rodzic/zawodnik widzi trenera przypisanego do jego drużyny lub drużyny jego dzieci
      when me.role in ('parent', 'player') and other_user.role = 'coach' then exists (
        select 1
        from public.teams t
        where t.coach_id = other_user.id
          and (
            t.id = me.team_id
            or exists (
              select 1
              from public.parent_children pc
              join public.profiles cp on cp.id = pc.child_id
              where pc.parent_id = me.id
                and cp.team_id = t.id
            )
          )
      )

      else false
    end
    from me cross join other_user
  ), false);
$$;

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
        select string_agg(t.name::text, ', ')
        from public.teams t
        where t.coach_id = p.id
      )
      when p.role::text = 'parent' then (
        select coalesce(
          (
            select string_agg(distinct t.name::text, ', ')
            from public.parent_children pc
            join public.profiles cp on cp.id = pc.child_id
            join public.teams t on t.id = cp.team_id
            where pc.parent_id = p.id
          ),
          (
            select t.name::text
            from public.teams t
            where t.id = p.team_id
          )
        )
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
    and not exists (
      select 1
      from public.parent_children pc
      where pc.child_id = p.id
    )
    and exists (
      select 1
      from auth.users u
      where u.id = p.id
    )
  order by p.last_name nulls last, p.first_name nulls last;
$$;

revoke all on function public.can_chat_with(uuid) from public;
revoke all on function public.list_chat_contacts() from public;

grant execute on function public.can_chat_with(uuid) to authenticated;
grant execute on function public.list_chat_contacts() to authenticated;
