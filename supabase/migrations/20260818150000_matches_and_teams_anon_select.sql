-- Enable SELECT permission for unlogged guests (anon) on public.matches and public.teams
drop policy if exists "Mecze są widoczne dla wszystkich" on public.matches;
create policy "Mecze są widoczne dla wszystkich"
  on public.matches for select
  to anon, authenticated
  using (true);

drop policy if exists "Zespoły są widoczne dla wszystkich" on public.teams;
create policy "Zespoły są widoczne dla wszystkich"
  on public.teams for select
  to anon, authenticated
  using (true);
