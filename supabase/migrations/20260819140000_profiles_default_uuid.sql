-- Set default gen_random_uuid() for profiles.id column so insert without id works automatically
alter table public.profiles alter column id set default gen_random_uuid();
