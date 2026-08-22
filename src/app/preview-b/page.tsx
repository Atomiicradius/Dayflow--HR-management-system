import { Building2, Calendar, Mail, UserRound } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import { ResumePolishCard } from "@/components/profile/ResumePolishCard";
import { mockProfile } from "./mock-data";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ProfilePreviewPage() {
  const profile = mockProfile;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Profile</h1>
        <p className="text-sm text-muted-foreground">
          Your employment details and personal contact info.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="size-14">
              <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.full_name} />
              <AvatarFallback className="text-base">{initials(profile.full_name)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-base font-semibold text-foreground">{profile.full_name}</p>
                <Badge variant={profile.role === "admin" ? "default" : "secondary"} className="capitalize">
                  {profile.role}
                </Badge>
              </div>
              <p className="font-mono text-xs text-muted-foreground">{profile.employee_id}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Mail className="size-3.5" />
            {profile.email}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employment Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-3">
            <Building2 className="size-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Department</p>
              <p className="text-sm font-medium text-foreground">{profile.department ?? "General"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <UserRound className="size-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Designation</p>
              <p className="text-sm font-medium text-foreground">{profile.designation ?? "Associate"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <UserRound className="size-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Manager</p>
              <p className="text-sm font-medium text-foreground">{profile.manager ?? "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="size-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Date of Joining</p>
              <p className="font-mono text-sm font-medium text-foreground">
                {formatDate(profile.date_of_joining)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <ProfileEditForm profile={profile} />

      <ResumePolishCard />
    </div>
  );
}
