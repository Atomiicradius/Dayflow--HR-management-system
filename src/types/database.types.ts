// Hand-written to match supabase/migrations/0001_init.sql.
// Once the real Supabase project is up, regenerate the authoritative version with:
//   npx supabase gen types typescript --project-id <ref> > src/types/database.types.ts
// and replace this file — keep the shape identical so nothing downstream breaks.

export type Role = "employee" | "admin";
export type AttendanceStatus = "present" | "absent" | "half_day" | "leave";
export type LeaveType = "paid" | "sick" | "unpaid";
export type LeaveStatus = "pending" | "approved" | "rejected";

export interface Profile {
  id: string;
  employee_id: string;
  full_name: string;
  email: string;
  role: Role;
  department: string | null;
  designation: string | null;
  manager: string | null;
  phone: string | null;
  address: string | null;
  avatar_url: string | null;
  date_of_joining: string;
  created_at: string;
}

export interface Attendance {
  id: string;
  user_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  total_hours: number;
  status: AttendanceStatus;
  created_at: string;
  check_in_lat: number | null;
  check_in_lng: number | null;
  is_manual_override: boolean;
  tag: string | null;
}

export interface OfficeLocation {
  id: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  created_at: string;
  updated_at: string;
}

export interface Leave {
  id: string;
  user_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  remarks: string;
  status: LeaveStatus;
  admin_comment: string | null;
  created_at: string;
}

export interface Payroll {
  id: string;
  user_id: string;
  base_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & Pick<Profile, "id" | "employee_id" | "full_name" | "email">;
        Update: Partial<Profile>;
        Relationships: [];
      };
      attendance: {
        Row: Attendance;
        Insert: Partial<Attendance> & Pick<Attendance, "user_id" | "date">;
        Update: Partial<Attendance>;
        Relationships: [];
      };
      office_location: {
        Row: OfficeLocation;
        Insert: Partial<OfficeLocation> & Pick<OfficeLocation, "latitude" | "longitude" | "radius_meters">;
        Update: Partial<OfficeLocation>;
        Relationships: [];
      };
      leaves: {
        Row: Leave;
        Insert: Partial<Leave> &
          Pick<Leave, "user_id" | "leave_type" | "start_date" | "end_date" | "remarks">;
        Update: Partial<Leave>;
        Relationships: [];
      };
      payroll: {
        Row: Payroll;
        Insert: Partial<Payroll> & Pick<Payroll, "user_id">;
        Update: Partial<Payroll>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
