-- Allow parents to SELECT their linked children's profiles from public.profiles
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_authenticated" on public.profiles;

create policy "profiles_select_authenticated"
on public.profiles
for select
to authenticated
using (
  auth.uid() = id
  or exists (
    select 1
    from public.parent_children pc
    where pc.parent_id = auth.uid()
      and pc.child_id = public.profiles.id
  )
  or (select public.is_current_user_admin())
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'coach'
  )
);
