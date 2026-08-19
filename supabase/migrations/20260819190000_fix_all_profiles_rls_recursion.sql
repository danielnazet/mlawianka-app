-- Helper SECURITY DEFINER function to check if authenticated user can view a profile without RLS recursion
create or replace function public.can_select_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select (
      -- 1. Użytkownik widzi swój własny profil
      (select auth.uid()) = target_profile_id
      -- 2. Rodzic widzi profile swoich przypisanych dzieci
      or exists (
        select 1
        from public.parent_children pc
        where pc.parent_id = (select auth.uid())
          and pc.child_id = target_profile_id
      )
      -- 3. Trener i Administrator widzą wszystkie profile
      or exists (
        select 1
        from public.profiles p
        where p.id = (select auth.uid())
          and p.role in ('admin', 'coach')
      )
    )
  ), false);
$$;

revoke all on function public.can_select_profile(uuid) from public;
grant execute on function public.can_select_profile(uuid) to authenticated;

-- Usuń wszystkie stare i powielające się polityki SELECT dla tabeli profiles
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_admin" on public.profiles;
drop policy if exists "profiles_select_authenticated" on public.profiles;

-- Utwórz jedną czystą, nierekurencyjną politykę SELECT
create policy "profiles_select_authenticated"
on public.profiles
for select
to authenticated
using (
  public.can_select_profile(id)
);
