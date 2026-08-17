create or replace function public.confirm_user_email(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Tylko administrator może wywołać automatyczne potwierdzenie e-maila
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Brak uprawnień. Tylko administrator może automatycznie aktywować konta.';
  end if;

  update auth.users
  set email_confirmed_at = coalesce(email_confirmed_at, timezone('utc'::text, now()))
  where id = p_user_id;
end;
$$;

grant execute on function public.confirm_user_email(uuid) to authenticated;
