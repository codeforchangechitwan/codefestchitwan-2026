import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound, LogOut } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/types";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage(props: PageProps<"/profile">) {
  const { profile } = await requireMember();
  const params = await props.searchParams;
  const saved = params.saved === "1";

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Profile</h1>

      {saved && (
        <p className="mt-4 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          Profile updated.
        </p>
      )}

      <dl className="mt-5 grid gap-3 rounded-2xl border border-border bg-surface p-5 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted">Email</dt>
          <dd className="mt-0.5 font-medium break-all">{profile.email}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted">Category</dt>
          <dd className="mt-0.5 font-medium">{ROLE_LABELS[profile.role]}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted">Room</dt>
          <dd className="mt-0.5 font-medium">
            {profile.room ?? "Allocated at the registration desk"}
          </dd>
        </div>
      </dl>

      <p className="mt-3 text-xs leading-relaxed text-muted">
        Your email, category and room are managed by the organising team — ask at the
        Registration Desk if something is wrong.
      </p>

      <section className="mt-6 rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
          Your details
        </h2>
        <div className="mt-3">
          <ProfileForm profile={profile} />
        </div>
      </section>

      <div className="mt-6 grid gap-2">
        <Link
          href="/profile/password"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold transition-colors hover:border-brand/40"
        >
          <KeyRound size={15} aria-hidden />
          Change password
        </Link>

        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-danger/30 px-4 py-3 text-sm font-semibold text-danger transition-colors hover:bg-danger/5"
          >
            <LogOut size={15} aria-hidden />
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
