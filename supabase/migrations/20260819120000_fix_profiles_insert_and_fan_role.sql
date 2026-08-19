-- 1. Grant INSERT on profiles to authenticated users (so parents can add child profiles)
grant insert, select, update on public.profiles to authenticated;

-- 2. Allow 'fan' role in profiles check constraint
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('player', 'parent', 'coach', 'admin', 'fan'));

-- 3. Add RLS policies for profiles INSERT, UPDATE, SELECT
drop policy if exists "profiles_insert_authenticated" on public.profiles;
create policy "profiles_insert_authenticated"
on public.profiles
for insert
to authenticated
with check (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (
  (select auth.uid()) = id or (select public.is_current_user_admin())
)
with check (
  (select auth.uid()) = id or (select public.is_current_user_admin())
);

-- 4. Grant insert, select on parent_children for linking parents with children
grant insert, select, update, delete on public.parent_children to authenticated;

drop policy if exists "parent_children_manage" on public.parent_children;
create policy "parent_children_manage"
on public.parent_children
for all
to authenticated
using (
  auth.uid() = parent_id or auth.uid() = child_id or (select public.is_current_user_admin())
)
with check (
  auth.uid() = parent_id or (select public.is_current_user_admin())
);
