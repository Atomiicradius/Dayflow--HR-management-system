"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Clock, LogIn, LogOut, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { checkInAction, checkOutAction } from "@/app/dashboard/attendance/actions";
import type { Attendance } from "@/types/database.types";

function statusLabel(status: Attendance["status"]) {
  switch (status) {
    case "present":
      return "Present";
    case "half_day":
      return "Half Day";
    case "leave":
      return "On Leave";
    case "absent":
      return "Absent";
  }
}

export function CheckInPanel({ today }: { today: Attendance | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const hasCheckedIn = !!today?.check_in;
  const hasCheckedOut = !!today?.check_out;

  function getLocation(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by this browser."));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
      });
    });
  }

  function handleCheckIn() {
    startTransition(async () => {
      let position: GeolocationPosition;
      try {
        position = await getLocation();
      } catch {
        toast.error("Could not read your location. Please allow location access and try again.");
        return;
      }

      const formData = new FormData();
      formData.set("latitude", String(position.coords.latitude));
      formData.set("longitude", String(position.coords.longitude));

      const result = await checkInAction({}, formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Checked in successfully.");
      router.refresh();
    });
  }

  function handleCheckOut() {
    startTransition(async () => {
      const result = await checkOutAction();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Checked out successfully.");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today&apos;s Attendance</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
              {today ? (
                <>
                  <CheckCircle2 className="size-3.5 text-success" />
                  {statusLabel(today.status)}
                </>
              ) : (
                <>
                  <Clock className="size-3.5 text-muted-foreground" />
                  Not checked in
                </>
              )}
            </p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Check-in</p>
            <p className="mt-1 font-mono text-sm font-semibold text-foreground">
              {today?.check_in ?? "—"}
            </p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Check-out</p>
            <p className="mt-1 font-mono text-sm font-semibold text-foreground">
              {today?.check_out ?? "—"}
              {today?.total_hours ? ` (${today.total_hours}h)` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!hasCheckedIn && (
            <Button onClick={handleCheckIn} disabled={isPending}>
              <LogIn className="size-4" />
              Check In
            </Button>
          )}
          {hasCheckedIn && !hasCheckedOut && (
            <Button onClick={handleCheckOut} disabled={isPending} variant="secondary">
              <LogOut className="size-4" />
              Check Out
            </Button>
          )}
          {hasCheckedOut && (
            <p className="text-sm text-muted-foreground">You&apos;re done for today.</p>
          )}
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3" />
            Requires location access within office premises
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
