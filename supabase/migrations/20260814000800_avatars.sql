alter table public.profiles add column if not exists avatar_url text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Read policy
create policy "Publiczny odczyt avatarów"
on storage.objects for select using (bucket_id = 'avatars');

-- Management policy (insert, update, delete) for authenticated users
create policy "Zarządzanie avatarami przez authenticated"
on storage.objects for all to authenticated using (
  bucket_id = 'avatars'
) with check (
  bucket_id = 'avatars'
);
