import { redirect } from "next/navigation";

// Landing spot for /dashboard/admin — middleware already guarantees only an
// admin reaches here. Send them to the employee directory (Person B) by
// default; swap the target once that route exists if you want a different
// admin home.
export default function AdminIndexPage() {
  redirect("/dashboard/employees");
}
