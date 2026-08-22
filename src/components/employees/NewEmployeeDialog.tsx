"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Copy, Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createEmployeeAction } from "@/app/dashboard/employees/actions";

const INITIAL_FORM = {
  fullName: "",
  email: "",
  department: "General",
  designation: "Associate",
  manager: "",
  phone: "",
};

interface CreatedAccount {
  employeeId?: string;
  tempPassword: string;
}

export function NewEmployeeDialog({ onCreated }: { onCreated: (employeeId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [created, setCreated] = useState<CreatedAccount | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateField(key: keyof typeof INITIAL_FORM, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.fullName.trim() || !form.email.trim()) {
      toast.error("Full name and email are required.");
      return;
    }

    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => formData.set(key, value));

    startTransition(async () => {
      const result = await createEmployeeAction({}, formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.success && result.tempPassword) {
        setCreated({ employeeId: result.employeeId, tempPassword: result.tempPassword });
        if (result.employeeId) onCreated(result.employeeId);
      }
    });
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setForm(INITIAL_FORM);
      setCreated(null);
    }
  }

  function copyPassword() {
    if (!created) return;
    navigator.clipboard.writeText(created.tempPassword);
    toast.success("Temporary password copied.");
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          New Employee
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>Employee created</DialogTitle>
              <DialogDescription>
                Share this temporary password with them directly — it won&apos;t be shown again.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              {created.employeeId && (
                <div>
                  <p className="text-xs text-muted-foreground">Employee ID</p>
                  <p className="font-mono text-sm font-medium text-foreground">{created.employeeId}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Temporary Password</p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 rounded-md border border-border bg-muted px-3 py-2 font-mono text-sm">
                    {created.tempPassword}
                  </code>
                  <Button type="button" size="icon" variant="outline" onClick={copyPassword}>
                    <Copy className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>
                <Check className="size-4" />
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add Employee</DialogTitle>
              <DialogDescription>
                Creates their account and profile with an auto-generated temporary password.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={form.fullName}
                  onChange={(e) => updateField("fullName", e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={form.department}
                    onChange={(e) => updateField("department", e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="designation">Designation</Label>
                  <Input
                    id="designation"
                    value={form.designation}
                    onChange={(e) => updateField("designation", e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="manager">Manager</Label>
                  <Input
                    id="manager"
                    value={form.manager}
                    onChange={(e) => updateField("manager", e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="size-4 animate-spin" />}
                  Create Employee
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
