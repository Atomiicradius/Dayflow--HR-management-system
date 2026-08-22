export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

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

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          employee_id: string;
          full_name: string;
          email: string;
          role?: Role;
          department?: string | null;
          designation?: string | null;
          manager?: string | null;
          phone?: string | null;
          address?: string | null;
          avatar_url?: string | null;
          date_of_joining?: string;
          created_at?: string;
        };
        Update: Partial<Profile>;
        Relationships: [];
      };
      attendance: {
        Row: Attendance;
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          check_in?: string | null;
          check_out?: string | null;
          total_hours?: number;
          status?: AttendanceStatus;
          created_at?: string;
        };
        Update: Partial<Attendance>;
        Relationships: [];
      };
      leaves: {
        Row: Leave;
        Insert: {
          id?: string;
          user_id: string;
          leave_type: LeaveType;
          start_date: string;
          end_date: string;
          remarks: string;
          status?: LeaveStatus;
          admin_comment?: string | null;
          created_at?: string;
        };
        Update: Partial<Leave>;
        Relationships: [];
      };
      payroll: {
        Row: Payroll;
        Insert: {
          id?: string;
          user_id: string;
          base_salary?: number;
          allowances?: number;
          deductions?: number;
          updated_at?: string;
        };
        Update: Partial<Payroll>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      generate_employee_id: {
        Args: { p_full_name: string; p_join_year: number };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
