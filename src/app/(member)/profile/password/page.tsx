import type { Metadata } from "next";
import { KeyRound } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "Change password" };

export default async function PasswordPage() {
  const { profile } = await requireMember({ allowPasswordChange: true });
  const forced = profile.must_change_password;

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <KeyRound size={22} aria-hidden />
        </span>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">
          {forced ? "Set your own password" : "Change password"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {forced
            ? "You're signed in with the password we mailed you. Replace it with one only you know before continuing."
            : "Pick a new password for your Codefest account."}
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <PasswordForm forced={forced} />
      </div>
    </div>
  );
}
