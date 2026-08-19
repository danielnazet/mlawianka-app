-- Make email column NULLABLE in public.profiles so child profiles (without an email) can be created by parents
alter table public.profiles alter column email drop not null;
