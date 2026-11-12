-- ─────────────────────────────────────────────────────────────
-- Admin password reset
-- Run this once in the Supabase SQL Editor.
--
-- Lets an Admin set a new password for a member of THEIR OWN company, and lets a
-- Super Admin do it for anyone. The browser only holds the public "anon" key, so
-- the password change has to happen inside the database. The function checks the
-- caller's role before changing anything.
--
-- "Forgot password" by email needs no SQL, but in the Supabase dashboard go to
-- Authentication → URL Configuration and add your site URL, plus
--   https://mrmanager.am2pmsupport.in/reset-password
-- to "Redirect URLs".
-- ─────────────────────────────────────────────────────────────

create extension if not exists pgcrypto with schema extensions;

create or replace function public.admin_reset_user_password(
  target_user_id uuid,
  new_password   text
)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  caller_id       uuid := auth.uid();
  caller_role     text;
  caller_company  uuid;
  target_role     text;
  target_company  uuid;
begin
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  if new_password is null or length(new_password) < 6 then
    raise exception 'Password must be at least 6 characters';
  end if;

  select role, company_id into caller_role, caller_company
    from public.profiles where id = caller_id;

  select role, company_id into target_role, target_company
    from public.profiles where id = target_user_id;

  if not exists (select 1 from auth.users where id = target_user_id) then
    raise exception 'User not found';
  end if;

  if caller_role = 'superadmin' then
    null; -- may reset anyone
  elsif caller_role = 'admin' then
    if target_role = 'superadmin' then
      raise exception 'You cannot reset a Super Admin password';
    end if;
    if caller_company is null or target_company is distinct from caller_company then
      raise exception 'You can only reset passwords for members of your own company';
    end if;
  else
    raise exception 'Only admins can reset passwords';
  end if;

  update auth.users
     set encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')),
         updated_at         = now()
   where id = target_user_id;

  -- Sign the user out everywhere so the old password / sessions stop working.
  begin
    delete from auth.sessions where user_id = target_user_id;
  exception when undefined_table then
    null;
  end;
end;
$$;

revoke all on function public.admin_reset_user_password(uuid, text) from public, anon;
grant execute on function public.admin_reset_user_password(uuid, text) to authenticated;

