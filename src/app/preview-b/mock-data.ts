// Throwaway mock data for local visual review only — NOT part of Person B's
// real deliverable and not meant to be committed. Lets the actual components
// render without a live Supabase project / authenticated session.
import type { Profile } from "@/types/database.types";
import type { EmployeeDirectoryCardData } from "@/components/employees/types";

export const mockProfile: Profile = {
  id: "mock-user-1",
  employee_id: "OIJODO20220001",
  full_name: "Jordan Doe",
  email: "jordan.doe@company.com",
  role: "admin",
  department: "Engineering",
  designation: "Senior Software Engineer",
  manager: "Priya Sharma",
  phone: "+91 98765 43210",
  address: "42 MG Road, Bengaluru, Karnataka",
  avatar_url: null,
  date_of_joining: "2022-03-14",
  created_at: "2022-03-14T00:00:00.000Z",
};

const names: [string, string, string, string][] = [
  ["Priya Sharma", "General Manager", "Leadership", ""],
  ["Jordan Doe", "Senior Software Engineer", "Engineering", "Priya Sharma"],
  ["Aisha Khan", "Software Engineer", "Engineering", "Jordan Doe"],
  ["Marcus Lee", "QA Engineer", "Engineering", "Jordan Doe"],
  ["Sofia Torres", "Product Designer", "Design", "Priya Sharma"],
  ["Ravi Patel", "HR Associate", "Human Resources", "Priya Sharma"],
  ["Ken Watanabe", "Sales Executive", "Sales", "Priya Sharma"],
  ["Elena Petrova", "Software Engineer", "Engineering", "Jordan Doe"],
];

const statuses: EmployeeDirectoryCardData["workStatus"][] = [
  "present",
  "present",
  "leave",
  "absent",
  "present",
  "half_day",
  "present",
  "absent",
];

export const mockEmployees: EmployeeDirectoryCardData[] = names.map(
  ([full_name, designation, department, manager], i) => ({
    id: `mock-user-${i + 1}`,
    employee_id: `OI${full_name.slice(0, 2).toUpperCase()}20220000${i + 1}`,
    full_name,
    email: `${full_name.toLowerCase().replace(/\s+/g, ".")}@company.com`,
    role: i === 0 ? "admin" : "employee",
    department,
    designation,
    manager: manager || null,
    phone: "+91 90000 0000" + i,
    address: null,
    avatar_url: null,
    date_of_joining: "2022-01-01",
    created_at: "2022-01-01T00:00:00.000Z",
    workStatus: statuses[i],
  })
);
