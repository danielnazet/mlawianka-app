-- Drop foreign key constraint on public.profiles(id) referencing auth.users(id)
-- so child profiles (who do not have auth.users logins) can be stored in public.profiles.
alter table public.profiles drop constraint if exists profiles_id_fkey;
