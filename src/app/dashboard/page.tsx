import { getCurrentProfile } from "@/lib/get-current-profile";
import { ProfileSummaryCard } from "@/components/profile/ProfileSummaryCard";
import { AttendanceSummaryCard } from "@/components/attendance/AttendanceSummaryCard";
import { LeaveSummaryCard } from "@/components/leaves/LeaveSummaryCard";
import { PayrollSummaryCard } from "@/components/payroll/PayrollSummaryCard";

export default async function DashboardPage() {
  const profile = await getCurrentProfile();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {profile.full_name.split(" ")[0]}
        </h1>
        <p className="text-sm text-muted-foreground">
          Here&apos;s where things stand today.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ProfileSummaryCard profile={profile} />
        <AttendanceSummaryCard profile={profile} />
        <LeaveSummaryCard profile={profile} />
        <PayrollSummaryCard profile={profile} />
      </div>
    </div>
  );
}
