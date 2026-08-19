-- Fix handle_new_user() trigger for Google/Facebook OAuth users
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
  is_oauth boolean;
begin
  metadata := coalesce(
    new.raw_user_meta_data,
    '{}'::jsonb
  );

  -- Sprawdź czy to logowanie OAuth (Google, Facebook itp.)
  is_oauth := coalesce(new.raw_app_meta_data ->> 'provider', '') in ('google', 'facebook', 'oauth')
              or (metadata ? 'iss' and metadata ->> 'iss' like '%google%');

  selected_first_name := coalesce(
    nullif(btrim(metadata ->> 'first_name'), ''),
    nullif(btrim(metadata ->> 'given_name'), ''),
    nullif(btrim(split_part(metadata ->> 'full_name', ' ', 1)), ''),
    nullif(btrim(split_part(metadata ->> 'name', ' ', 1)), '')
  );

  selected_last_name := coalesce(
    nullif(btrim(metadata ->> 'last_name'), ''),
    nullif(btrim(metadata ->> 'family_name'), ''),
    nullif(btrim(substr(metadata ->> 'full_name', length(split_part(metadata ->> 'full_name', ' ', 1)) + 2)), ''),
    nullif(btrim(substr(metadata ->> 'name', length(split_part(metadata ->> 'name', ' ', 1)) + 2)), '')
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
    when metadata ->> 'role' in ('player', 'parent', 'fan', 'coach', 'admin')
      then metadata ->> 'role'
    when is_oauth then null -- dla nowego OAuth bez roli pozwól na uzupełnienie
    else 'fan'
  end;

  -- Dla tradycyjnej rejestracji email waliduj wymagane pola
  if not is_oauth then
    if selected_first_name is null or selected_last_name is null then
      raise exception 'Imię i nazwisko są wymagane';
    end if;

    if coalesce(metadata ->> 'privacy_accepted', 'false') not in ('true', 't', '1') then
      raise exception 'Akceptacja polityki prywatności jest wymagana';
    end if;
  end if;

  if coalesce(metadata ->> 'age', '') ~ '^[0-9]+$' then
    selected_age := (metadata ->> 'age')::integer;
  end if;

  if coalesce(metadata ->> 'child_age', '') ~ '^[0-9]+$' then
    selected_child_age := (metadata ->> 'child_age')::integer;
  end if;

  if selected_role = 'player' and not is_oauth then
    if selected_age is null or selected_age not between 4 and 100 then
      raise exception 'Nieprawidłowy wiek zawodnika';
    end if;
  end if;

  if selected_role = 'parent' and not is_oauth then
    if selected_child_first_name is null or selected_child_last_name is null then
      raise exception 'Dane dziecka są wymagane';
    end if;

    if selected_child_age is null or selected_child_age not between 3 and 18 then
      raise exception 'Nieprawidłowy wiek dziecka';
    end if;
  end if;

  selected_team_id := null;

  if coalesce(metadata ->> 'team_id', '') ~ '^[0-9]+$' then
    select teams.id
    into selected_team_id
    from public.teams
    where teams.id = (metadata ->> 'team_id')::bigint
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
    coalesce(selected_first_name, 'Użytkownik'),
    coalesce(selected_last_name, ''),
    new.email,
    selected_role,
    selected_team_id,
    case when selected_role = 'player' then selected_age else null end,
    case when selected_role = 'parent' then selected_child_first_name else null end,
    case when selected_role = 'parent' then selected_child_last_name else null end,
    case when selected_role = 'parent' then selected_child_age else null end,
    case when is_oauth or coalesce(metadata ->> 'privacy_accepted', 'false') in ('true', 't', '1') then now() else null end
  )
  on conflict (id) do update set
    email = excluded.email,
    first_name = coalesce(public.profiles.first_name, excluded.first_name),
    last_name = coalesce(public.profiles.last_name, excluded.last_name);

  return new;
end;
$$;
