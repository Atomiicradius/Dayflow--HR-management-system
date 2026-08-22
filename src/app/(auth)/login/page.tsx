"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Eye, EyeOff, Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";
import { loginAction } from "../actions";

export default function LoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = (data: LoginInput) => {
    setServerError(null);
    const formData = new FormData();
    formData.set("loginIdentifier", data.loginIdentifier);
    formData.set("password", data.password);

    startTransition(async () => {
      const result = await loginAction({}, formData);
      if (result.error) {
        setServerError(result.error);
        toast.error(result.error);
        return;
      }

      toast.success("Welcome back!");
      router.replace("/dashboard");
      router.refresh();
    });
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm shadow-md border-border">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Building2 className="size-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Sign in to Dayflow</CardTitle>
          <CardDescription>Enter your Login ID or registered Email address.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="loginIdentifier">Login ID / Email</Label>
              <Input
                id="loginIdentifier"
                placeholder="e.g. OIJODO20220001 or name@company.com"
                autoComplete="username"
                {...register("loginIdentifier")}
              />
              {errors.loginIdentifier && (
                <p className="text-xs text-destructive">{errors.loginIdentifier.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="pr-10"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            {serverError && <p className="text-sm text-destructive">{serverError}</p>}

            <Button
              type="submit"
              disabled={isPending}
              className="mt-2 bg-primary hover:opacity-90 text-primary-foreground font-medium shadow-sm transition-all"
            >
              {isPending ? "Signing in…" : "SIGN IN"}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Don&apos;t have an Account?{" "}
            <Link
              href="/signup"
              className="font-semibold text-primary hover:opacity-80 underline underline-offset-4"
            >
              Sign Up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
