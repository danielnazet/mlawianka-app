-- Allow both admins and coaches to INSERT, UPDATE, and DELETE trainings and matches
drop policy if exists "Tylko admin może dodawać/edytować/usuwać treningi" on public.trainings;
drop policy if exists "Admin i trener mogą zarządzać treningami" on public.trainings;

create policy "Admin i trener mogą zarządzać treningami"
  on public.trainings for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'coach')
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'coach')
    )
  );

drop policy if exists "Admin i trener mogą dodawać/edytować mecze" on public.matches;
drop policy if exists "Admin i trener mogą zarządzać meczami" on public.matches;

create policy "Admin i trener mogą zarządzać meczami"
  on public.matches for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'coach')
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'coach')
    )
  );
