-- Redefine handle_new_user to whitelist 'coach' and 'admin' roles during registration
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

  -- Whitelist 'coach' and 'admin' in addition to 'player' and 'parent'
  selected_role := case
    when metadata ->> 'role' in ('player', 'parent', 'coach', 'admin')
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
