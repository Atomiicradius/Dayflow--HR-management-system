import Link from "next/link";

// Throwaway layout for the unauthenticated review preview — mirrors Person
// A's real dashboard shell just closely enough to judge the components in
// context. Not part of Person B's deliverable.
export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh grid-cols-1 md:grid-cols-[16rem_1fr]">
      <aside className="hidden border-r border-border bg-card md:flex md:flex-col">
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <span className="text-base font-semibold tracking-tight">Dayflow</span>
          <span className="rounded-md bg-warning/20 px-1.5 py-0.5 text-[10px] font-medium text-warning">
            PREVIEW
          </span>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          <Link
            href="/preview-b"
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            My Profile
          </Link>
          <Link
            href="/preview-b/employees"
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            Employees
          </Link>
        </nav>
      </aside>
      <div className="flex flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border bg-background px-4 md:px-6">
          <span className="text-sm font-semibold md:hidden">Dayflow (Preview)</span>
          <div className="text-sm text-muted-foreground">
            Unauthenticated mock-data preview — not part of the real app flow.
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
