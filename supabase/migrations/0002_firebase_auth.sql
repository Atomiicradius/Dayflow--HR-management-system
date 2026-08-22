-- Dayflow HRMS — Migration to Firebase Auth (Supabase as Pure Data Store)

-- 1. Drop auth.users trigger
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- 2. Update profiles table and foreign keys to support text Firebase UIDs (~28 chars)
alter table attendance drop constraint if exists attendance_user_id_fkey;
alter table leaves drop constraint if exists leaves_user_id_fkey;
alter table payroll drop constraint if exists payroll_user_id_fkey;

alter table profiles drop constraint if exists profiles_pkey cascade;
alter table profiles alter column id type text using id::text;
alter table profiles add primary key (id);

alter table attendance alter column user_id type text using user_id::text;
alter table attendance add constraint attendance_user_id_fkey foreign key (user_id) references profiles(id) on delete cascade;

alter table leaves alter column user_id type text using user_id::text;
alter table leaves add constraint leaves_user_id_fkey foreign key (user_id) references profiles(id) on delete cascade;

alter table payroll alter column user_id type text using user_id::text;
alter table payroll add constraint payroll_user_id_fkey foreign key (user_id) references profiles(id) on delete cascade;

-- 3. Disable RLS across tables (authorization handled server-side via service-role key)
alter table profiles disable row level security;
alter table attendance disable row level security;
alter table leaves disable row level security;
alter table payroll disable row level security;

-- 4. Clean up legacy policies and functions
drop policy if exists "profiles_select_own_or_admin" on profiles;
drop policy if exists "profiles_update_own_or_admin" on profiles;
drop policy if exists "profiles_insert_admin_only" on profiles;

drop policy if exists "attendance_select_own_or_admin" on attendance;
drop policy if exists "attendance_write_own_or_admin" on attendance;
drop policy if exists "attendance_update_own_or_admin" on attendance;

drop policy if exists "leaves_select_own_or_admin" on leaves;
drop policy if exists "leaves_insert_own" on leaves;
drop policy if exists "leaves_update_admin_only" on leaves;

drop policy if exists "payroll_select_own_or_admin" on payroll;
drop policy if exists "payroll_write_admin_only" on payroll;
drop policy if exists "payroll_update_admin_only" on payroll;

drop policy if exists "employee_files_read_own_or_admin" on storage.objects;
drop policy if exists "employee_files_write_own_or_admin" on storage.objects;

drop function if exists is_admin();
