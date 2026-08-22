import Link from "next/link";
import { ArrowRight, Pencil } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Profile } from "@/types/database.types";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ProfileSummaryCard({ profile }: { profile: Profile }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>My Profile</CardTitle>
        <Link
          href="/dashboard/profile"
          className="text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Edit profile"
        >
          <Pencil className="size-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Avatar className="size-11">
            <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.full_name} />
            <AvatarFallback>{initials(profile.full_name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{profile.full_name}</p>
            <p className="truncate font-mono text-xs text-muted-foreground">{profile.employee_id}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">{profile.designation ?? "Associate"}</Badge>
          <Badge variant="outline">{profile.department ?? "General"}</Badge>
        </div>

        <Link
          href="/dashboard/profile"
          className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          View full profile <ArrowRight className="size-3" />
        </Link>
      </CardContent>
    </Card>
  );
}
