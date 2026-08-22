import type { AttendanceStatus, Profile } from "@/types/database.types";

export interface EmployeeDirectoryCardData extends Profile {
  workStatus: AttendanceStatus;
}
