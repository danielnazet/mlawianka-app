-- Create SECURITY DEFINER function to check if current user is coach without RLS recursion
create or replace function public.is_current_user_coach()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'coach'
  );
$$;

grant execute on function public.is_current_user_coach() to authenticated;

-- Replace profiles_select_authenticated with non-recursive policy
drop policy if exists "profiles_select_authenticated" on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;

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
  or (select public.is_current_user_coach())
);
