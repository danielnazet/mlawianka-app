-- Allow admins full control and coaches control ONLY over their assigned teams for matches and trainings

-- 1. Matches RLS
drop policy if exists "Admin i trener mogą zarządzać meczami" on public.matches;
drop policy if exists "Admin i trener mogą dodawać/edytować mecze" on public.matches;
drop policy if exists "Admin i przypisany trener mogą zarządzać meczami" on public.matches;

create policy "Admin i przypisany trener mogą zarządzać meczami"
  on public.matches for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
    or
    (
      exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'coach'
      )
      and (
        team_id in (
          select id from public.teams where coach_id = auth.uid()
        )
        or
        team_id in (
          select team_id from public.profiles where id = auth.uid() and team_id is not null
        )
      )
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
    or
    (
      exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'coach'
      )
      and (
        team_id in (
          select id from public.teams where coach_id = auth.uid()
        )
        or
        team_id in (
          select team_id from public.profiles where id = auth.uid() and team_id is not null
        )
      )
    )
  );

-- 2. Trainings RLS (spójne zasady dla treningów)
drop policy if exists "Tylko admin może dodawać/edytować/usuwać treningi" on public.trainings;
drop policy if exists "Admin i trener mogą zarządzać treningami" on public.trainings;
drop policy if exists "Admin i przypisany trener mogą zarządzać treningami" on public.trainings;

create policy "Admin i przypisany trener mogą zarządzać treningami"
  on public.trainings for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
    or
    (
      exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'coach'
      )
      and (
        team_id in (
          select id from public.teams where coach_id = auth.uid()
        )
        or
        team_id in (
          select team_id from public.profiles where id = auth.uid() and team_id is not null
        )
      )
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
    or
    (
      exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'coach'
      )
      and (
        team_id in (
          select id from public.teams where coach_id = auth.uid()
        )
        or
        team_id in (
          select team_id from public.profiles where id = auth.uid() and team_id is not null
        )
      )
    )
  );
