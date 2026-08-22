import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/get-current-profile";

export default async function AdminIndexPage() {
  const profile = await getCurrentProfile();
  if (profile.role !== "admin") {
    redirect("/dashboard");
  }
  redirect("/dashboard/employees");
}
