-- Add target_team_ids integer array column to public.announcements table
alter table public.announcements
  add column if not exists target_team_ids integer[];

-- Populate target_team_ids from team_id for existing rows
update public.announcements
  set target_team_ids = array[team_id]
  where (target_team_ids is null or array_length(target_team_ids, 1) is null)
    and team_id is not null;
