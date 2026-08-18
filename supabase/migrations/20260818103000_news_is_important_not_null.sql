-- Update existing NULL values to false in the is_important column of the news table
update public.news
  set is_important = false
  where is_important is null;

-- Make is_important NOT NULL
alter table public.news
  alter column is_important set not null;
