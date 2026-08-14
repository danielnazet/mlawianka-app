alter table public.teams
  add column if not exists is_active boolean not null default true,
  add column if not exists created_at timestamptz not null default now();

create or replace view public.registration_teams
with (security_barrier = true)
as
select
  id,
  name
from public.teams
where is_active = true;

grant select on public.registration_teams to anon, authenticated;
