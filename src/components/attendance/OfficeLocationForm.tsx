"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Crosshair, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveOfficeLocationAction } from "@/app/dashboard/attendance/actions";
import type { OfficeLocation } from "@/types/database.types";

export function OfficeLocationForm({ current }: { current: OfficeLocation | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isLocating, setIsLocating] = useState(false);
  const [latitude, setLatitude] = useState(current?.latitude?.toString() ?? "");
  const [longitude, setLongitude] = useState(current?.longitude?.toString() ?? "");
  const [radius, setRadius] = useState(current?.radius_meters?.toString() ?? "100");

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by this browser.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toString());
        setLongitude(position.coords.longitude.toString());
        setIsLocating(false);
      },
      () => {
        toast.error("Could not read your location.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const formData = new FormData();
    formData.set("latitude", latitude);
    formData.set("longitude", longitude);
    formData.set("radius_meters", radius);

    startTransition(async () => {
      const result = await saveOfficeLocationAction({}, formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Office geofence updated.");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Office Geofence</CardTitle>
        <CardDescription>Employees must check in from within this radius.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="radius_meters">Radius (meters)</Label>
              <Input
                id="radius_meters"
                type="number"
                step="any"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Save
            </Button>
            <Button type="button" variant="outline" onClick={useCurrentLocation} disabled={isLocating}>
              {isLocating ? <Loader2 className="size-4 animate-spin" /> : <Crosshair className="size-4" />}
              Use my current location
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
