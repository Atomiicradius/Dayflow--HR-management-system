import Link from "next/link";
import { Toaster } from "@/components/ui/sonner";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { UserMenu } from "@/components/dashboard/user-menu";
import { getCurrentProfile } from "@/lib/get-current-profile";
import CursorGlow from "@/components/ui/CursorGlow";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  return (
    <div className="grid min-h-svh grid-cols-1 md:grid-cols-[16rem_1fr] relative">
      <CursorGlow />
      <aside className="hidden border-r border-border bg-card md:flex md:flex-col z-10">
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <span className="text-base font-semibold tracking-tight text-primary">Dayflow</span>
        </div>
        <SidebarNav role={profile.role} />
      </aside>

      <div className="flex flex-col z-10">
        <header className="flex h-14 items-center justify-between border-b border-border bg-background px-4 md:px-6">
          <Link href="/dashboard" className="text-sm font-semibold md:hidden">
            Dayflow
          </Link>
          <div className="hidden text-sm text-muted-foreground md:block">
            {profile.department ?? "General"} · {profile.designation ?? "Associate"}
          </div>
          <UserMenu profile={profile} />
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>

      <Toaster richColors position="top-right" />
    </div>
  );
}
