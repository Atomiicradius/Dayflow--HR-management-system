-- Dayflow HRMS — additive migration
-- Employee-ID login needs to resolve an employee_id to an email before a
-- session exists, which RLS correctly blocks on a direct table read (no
-- auth.uid() yet). This function does that one lookup only, nothing else,
-- via security definer — same pattern as is_admin()/generate_employee_id()
-- in 0001_init.sql.
create or replace function public.resolve_login_email(p_employee_id text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select email from profiles where employee_id = upper(p_employee_id);
$$;

grant execute on function public.resolve_login_email(text) to anon, authenticated;
