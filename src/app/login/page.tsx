import type { Metadata } from "next";
import Image from "next/image";
import { ShieldCheck, Lock } from "lucide-react";
import { LoginForm } from "./login-form";
import { ROLES, ROLE_SHORT } from "@/lib/types";

export const metadata: Metadata = {
  title: "Member login",
  description:
    "Sign in with the email registered with Codefest Chitwan 2026 and the password mailed to you.",
};

export default async function LoginPage(props: PageProps<"/login">) {
  const params = await props.searchParams;
  const rawNext = params.next;
  const next = typeof rawNext === "string" ? rawNext : "/dashboard";
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <div className="relative min-h-[80vh] flex flex-col items-center justify-center px-4 py-12">
      {/* Backdrop Glow */}
      <div className="ambient-glow top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[350px] opacity-25 animate-pulse-glow" />

      <div className="w-full max-w-md">
        {/* Header Logo */}
        <div className="flex flex-col items-center text-center mb-6">
          <Image
            src="/brand/cfc-logo.png"
            alt="Code for Change"
            width={208}
            height={104}
            className="h-12 w-auto mb-4"
            priority
          />
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
            <Lock size={22} className="text-brand" />
            Member Login
          </h1>
          <p className="mt-1.5 text-xs text-muted">
            Codefest Chitwan 2026 closed portal sign-in.
          </p>
        </div>

        {error === "deactivated" && (
          <p
            role="alert"
            className="mb-6 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-xs text-danger font-semibold text-center"
          >
            This account has been deactivated. Please speak to the registration desk in Building A.
          </p>
        )}

        {/* Centered Obsidian Glass Card */}
        <div className="glass-card p-6 sm:p-8 border-glass bg-surface-glass backdrop-blur-2xl shadow-2xl">
          {/* Role Badges Preview */}
          <div className="mb-6 pb-4 border-b border-border/50">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2">
              Accessible System Roles
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ROLES.map((r) => (
                <span
                  key={r}
                  className="rounded-md border border-glass bg-surface/50 px-2 py-0.5 text-[10px] font-extrabold text-brand"
                >
                  {ROLE_SHORT[r]}
                </span>
              ))}
            </div>
          </div>

          <LoginForm next={next} />
        </div>

        {/* Password Assistance Box */}
        <div className="glass-card mt-6 p-4 border-glass bg-surface/40">
          <p className="flex items-center gap-2 text-xs font-bold text-foreground">
            <ShieldCheck size={16} className="text-brand shrink-0" />
            Need Login Assistance?
          </p>
          <p className="mt-1.5 text-xs text-muted leading-relaxed">
            Passwords were sent to all registered email addresses. If unreceived, check your spam filter or visit the Building A desk.
          </p>
        </div>
      </div>
    </div>
  );
}

