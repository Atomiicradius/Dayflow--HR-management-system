-- Dayflow HRMS — initial schema
-- Run this once in the Supabase SQL Editor (or via `supabase db push` once the CLI is linked).
-- Safe to re-run: guards with "if not exists" / drop-before-create where sensible.

-- ============================================================
-- 1. PROFILES  (one row per auth.users row)
-- ============================================================
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  employee_id text unique not null,
  full_name text not null,
  email text not null,
  role text check (role in ('employee', 'admin')) not null default 'employee',
  department text default 'General',
  designation text default 'Associate',
  manager text,
  phone text,
  address text,
  avatar_url text,
  date_of_joining date not null default current_date,
  created_at timestamptz not null default timezone('utc', now())
);

-- ============================================================
-- 2. ATTENDANCE
-- ============================================================
create table if not exists attendance (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  date date not null,
  check_in time,
  check_out time,
  total_hours numeric(4, 2) default 0,
  status text check (status in ('present', 'absent', 'half_day', 'leave')) not null default 'present',
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, date)
);

-- ============================================================
-- 3. LEAVES (Time Off)
-- ============================================================
create table if not exists leaves (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  leave_type text check (leave_type in ('paid', 'sick', 'unpaid')) not null,
  start_date date not null,
  end_date date not null,
  remarks text not null,
  status text check (status in ('pending', 'approved', 'rejected')) not null default 'pending',
  admin_comment text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint leaves_date_order check (end_date >= start_date)
);

-- ============================================================
-- 4. PAYROLL
-- ============================================================
create table if not exists payroll (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade unique not null,
  base_salary numeric(10, 2) not null default 0,
  allowances numeric(10, 2) not null default 0,
  deductions numeric(10, 2) not null default 0,
  net_salary numeric(10, 2) generated always as (base_salary + allowances - deductions) stored,
  updated_at timestamptz not null default timezone('utc', now())
);

-- ============================================================
-- Helper: is the current JWT an admin? (used by every RLS policy below)
-- security definer + fixed search_path so RLS itself can call it safely.
-- ============================================================
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table profiles enable row level security;
alter table attendance enable row level security;
alter table leaves enable row level security;
alter table payroll enable row level security;

-- PROFILES: everyone can read their own row; admins can read/update every row;
-- employees can update only their own row (field-level restriction is enforced
-- in the API/Server Action layer, not here — Postgres RLS is row-level only).
drop policy if exists "profiles_select_own_or_admin" on profiles;
create policy "profiles_select_own_or_admin"
  on profiles for select
  using (id = auth.uid() or is_admin());

drop policy if exists "profiles_update_own_or_admin" on profiles;
create policy "profiles_update_own_or_admin"
  on profiles for update
  using (id = auth.uid() or is_admin());

drop policy if exists "profiles_insert_admin_only" on profiles;
create policy "profiles_insert_admin_only"
  on profiles for insert
  with check (id = auth.uid() or is_admin());

-- ATTENDANCE: employees see/manage only their own rows; admins see/manage all.
drop policy if exists "attendance_select_own_or_admin" on attendance;
create policy "attendance_select_own_or_admin"
  on attendance for select
  using (user_id = auth.uid() or is_admin());

drop policy if exists "attendance_write_own_or_admin" on attendance;
create policy "attendance_write_own_or_admin"
  on attendance for insert
  with check (user_id = auth.uid() or is_admin());

drop policy if exists "attendance_update_own_or_admin" on attendance;
create policy "attendance_update_own_or_admin"
  on attendance for update
  using (user_id = auth.uid() or is_admin());

-- LEAVES: employees see/create only their own requests; only admins update
-- (approve/reject) any request.
drop policy if exists "leaves_select_own_or_admin" on leaves;
create policy "leaves_select_own_or_admin"
  on leaves for select
  using (user_id = auth.uid() or is_admin());

drop policy if exists "leaves_insert_own" on leaves;
create policy "leaves_insert_own"
  on leaves for insert
  with check (user_id = auth.uid());

drop policy if exists "leaves_update_admin_only" on leaves;
create policy "leaves_update_admin_only"
  on leaves for update
  using (is_admin());

-- PAYROLL: employees can read only their own row (read-only for them);
-- only admins can insert/update salary structures.
drop policy if exists "payroll_select_own_or_admin" on payroll;
create policy "payroll_select_own_or_admin"
  on payroll for select
  using (user_id = auth.uid() or is_admin());

drop policy if exists "payroll_write_admin_only" on payroll;
create policy "payroll_write_admin_only"
  on payroll for insert
  with check (is_admin());

drop policy if exists "payroll_update_admin_only" on payroll;
create policy "payroll_update_admin_only"
  on payroll for update
  using (is_admin());

-- ============================================================
-- Auto-create a profile row whenever a new auth user signs up.
-- Registration always defaults to role = 'employee' — role can only be
-- escalated afterwards by an existing admin (see scripts/seed-admin.md).
-- ============================================================
-- Login ID format from the design spec, e.g. "OIJODO20220001":
--   OI   → company initials (hardcoded here; parameterize if you go multi-tenant)
--   JODO → first two letters of first name + first two letters of last name
--   2022 → year of joining
--   0001 → serial number of joining, per year
create or replace function public.generate_employee_id(p_full_name text, p_join_year int)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_first text;
  v_last text;
  v_initials text;
  v_serial int;
begin
  v_first := split_part(trim(p_full_name), ' ', 1);
  v_last := nullif(split_part(trim(p_full_name), ' ', 2), '');
  v_initials := upper(left(coalesce(v_first, 'XX'), 2)) || upper(left(coalesce(v_last, v_first, 'XX'), 2));

  select count(*) + 1 into v_serial
  from profiles
  where employee_id like 'OI' || v_initials || p_join_year::text || '%';

  return 'OI' || v_initials || p_join_year::text || lpad(v_serial::text, 4, '0');
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text;
  v_join_year int;
begin
  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', new.email);
  v_join_year := extract(year from now())::int;

  insert into public.profiles (id, employee_id, full_name, email, role, date_of_joining)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'employee_id',
      public.generate_employee_id(v_full_name, v_join_year)
    ),
    v_full_name,
    new.email,
    'employee',
    current_date
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Storage bucket for avatars & documents (Person B)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('employee-files', 'employee-files', false)
on conflict (id) do nothing;

drop policy if exists "employee_files_read_own_or_admin" on storage.objects;
create policy "employee_files_read_own_or_admin"
  on storage.objects for select
  using (
    bucket_id = 'employee-files'
    and (owner = auth.uid() or is_admin())
  );

drop policy if exists "employee_files_write_own_or_admin" on storage.objects;
create policy "employee_files_write_own_or_admin"
  on storage.objects for insert
  with check (
    bucket_id = 'employee-files'
    and (owner = auth.uid() or is_admin())
  );
