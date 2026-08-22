-- supabase/migrations/0003_attendance_geofence_fields.sql
-- Additive migration for Attendance Geofencing and manual overrides

-- Alter public.attendance table to add new columns
alter table public.attendance add column if not exists check_in_lat double precision;
alter table public.attendance add column if not exists check_in_lng double precision;
alter table public.attendance add column if not exists is_manual_override boolean not null default false;
alter table public.attendance add column if not exists tag text;

-- Create global office configuration table
create table if not exists public.office_location (
  id uuid default gen_random_uuid() primary key,
  latitude double precision not null,
  longitude double precision not null,
  radius_meters double precision not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Enable Row Level Security (RLS) on office_location
alter table public.office_location enable row level security;

-- Everyone needs to read the office location coordinates to compute distance before check-in
drop policy if exists "office_location_select_all" on public.office_location;
create policy "office_location_select_all" on public.office_location for select using (true);

-- Only admins can create/update/delete the office geofence config
drop policy if exists "office_location_write_admin_only" on public.office_location;
create policy "office_location_write_admin_only" on public.office_location for all using (is_admin()) with check (is_admin());
