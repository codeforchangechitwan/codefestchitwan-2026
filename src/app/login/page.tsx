import type { Metadata } from "next";
import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import { LoginForm } from "./login-form";

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
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <div className="flex flex-col items-center text-center">
        <Image
          src="/brand/cfc-logo.png"
          alt="Code for Change"
          width={208}
          height={104}
          className="h-12 w-auto"
          priority
        />
        <h1 className="mt-5 text-2xl font-bold tracking-tight">Member login</h1>
        <p className="mt-2 text-sm text-muted">
          Codefest Chitwan 2026 is a closed system. Only people registered with the
          organising team have an account.
        </p>
      </div>

      {error === "deactivated" && (
        <p
          role="alert"
          className="mt-6 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          This account has been deactivated. Please speak to the registration desk.
        </p>
      )}

      <div className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <LoginForm next={next} />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface-muted p-4">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck size={16} className="text-brand" aria-hidden />
          Don&rsquo;t have a password?
        </p>
        <p className="mt-2 text-sm text-muted">
          Accounts are created by the Codefest team from the registration list. If you
          registered and haven&rsquo;t received your password, check your spam folder,
          then email{" "}
          <a
            href="mailto:execution@codefestnepal.com"
            className="font-medium text-brand underline underline-offset-2"
          >
            execution@codefestnepal.com
          </a>{" "}
          or visit the Registration Desk in Building A.
        </p>
      </div>
    </div>
  );
}
