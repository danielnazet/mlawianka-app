alter table public.profiles
  add column if not exists age integer,
  add column if not exists child_first_name text,
  add column if not exists child_last_name text,
  add column if not exists child_age integer,
  add column if not exists privacy_accepted_at timestamptz,
  add column if not exists created_at timestamptz default now();

alter table public.profiles
  alter column created_at set default now();

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (
    role in ('player', 'parent', 'coach', 'admin')
  )
  not valid;

alter table public.profiles
  drop constraint if exists profiles_age_check;

alter table public.profiles
  add constraint profiles_age_check
  check (
    age is null or age between 4 and 100
  )
  not valid;

alter table public.profiles
  drop constraint if exists profiles_child_age_check;

alter table public.profiles
  add constraint profiles_child_age_check
  check (
    child_age is null or child_age between 3 and 18
  )
  not valid;

create or replace view public.registration_teams
with (security_barrier = true)
as
select
  id,
  name
from public.teams;

revoke all
on public.registration_teams
from public, anon, authenticated;

grant select
on public.registration_teams
to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  metadata jsonb;
  selected_role text;
  selected_age integer;
  selected_child_age integer;
  selected_team_id public.teams.id%type;
  selected_first_name text;
  selected_last_name text;
  selected_child_first_name text;
  selected_child_last_name text;
begin
  metadata := coalesce(
    new.raw_user_meta_data,
    '{}'::jsonb
  );

  selected_first_name := nullif(
    btrim(metadata ->> 'first_name'),
    ''
  );

  selected_last_name := nullif(
    btrim(metadata ->> 'last_name'),
    ''
  );

  selected_child_first_name := nullif(
    btrim(metadata ->> 'child_first_name'),
    ''
  );

  selected_child_last_name := nullif(
    btrim(metadata ->> 'child_last_name'),
    ''
  );

  selected_role := case
    when metadata ->> 'role' in ('player', 'parent')
      then metadata ->> 'role'
    else 'parent'
  end;

  if selected_first_name is null
    or selected_last_name is null
  then
    raise exception 'Imię i nazwisko są wymagane';
  end if;

  if coalesce(
    metadata ->> 'privacy_accepted',
    'false'
  ) <> 'true'
  then
    raise exception
      'Akceptacja polityki prywatności jest wymagana';
  end if;

  if coalesce(metadata ->> 'age', '') ~ '^[0-9]+$'
  then
    selected_age :=
      (metadata ->> 'age')::integer;
  end if;

  if coalesce(
    metadata ->> 'child_age',
    ''
  ) ~ '^[0-9]+$'
  then
    selected_child_age :=
      (metadata ->> 'child_age')::integer;
  end if;

  if selected_role = 'player' then
    if selected_age is null
      or selected_age not between 4 and 100
    then
      raise exception
        'Nieprawidłowy wiek zawodnika';
    end if;
  end if;

  if selected_role = 'parent' then
    if selected_child_first_name is null
      or selected_child_last_name is null
    then
      raise exception
        'Dane dziecka są wymagane';
    end if;

    if selected_child_age is null
      or selected_child_age not between 3 and 18
    then
      raise exception
        'Nieprawidłowy wiek dziecka';
    end if;
  end if;

  selected_team_id := null;

  if coalesce(
    metadata ->> 'team_id',
    ''
  ) ~ '^[0-9]+$'
  then
    select teams.id
    into selected_team_id
    from public.teams
    where teams.id = (
      metadata ->> 'team_id'
    )::bigint
    limit 1;
  end if;

  insert into public.profiles (
    id,
    first_name,
    last_name,
    email,
    role,
    team_id,
    age,
    child_first_name,
    child_last_name,
    child_age,
    privacy_accepted_at
  )
  values (
    new.id,
    selected_first_name,
    selected_last_name,
    new.email,
    selected_role,
    selected_team_id,
    case
      when selected_role = 'player'
        then selected_age
      else null
    end,
    case
      when selected_role = 'parent'
        then selected_child_first_name
      else null
    end,
    case
      when selected_role = 'parent'
        then selected_child_last_name
      else null
    end,
    case
      when selected_role = 'parent'
        then selected_child_age
      else null
    end,
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists
  on_auth_user_created
on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles
enable row level security;

create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all
on function public.is_current_user_admin()
from public;

grant execute
on function public.is_current_user_admin()
to authenticated;

drop policy if exists
  "profiles_select_own"
on public.profiles;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (
  (select auth.uid()) = id
);

drop policy if exists
  "profiles_select_admin"
on public.profiles;

create policy "profiles_select_admin"
on public.profiles
for select
to authenticated
using (
  (select public.is_current_user_admin())
);

drop policy if exists
  "profiles_update_admin"
on public.profiles;

create policy "profiles_update_admin"
on public.profiles
for update
to authenticated
using (
  (select public.is_current_user_admin())
)
with check (
  (select public.is_current_user_admin())
);

revoke insert, delete
on public.profiles
from anon, authenticated;

grant select, update
on public.profiles
to authenticated;
