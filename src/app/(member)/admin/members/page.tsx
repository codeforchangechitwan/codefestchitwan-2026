import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";
import { requireExecutive } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ROLES, ROLE_LABELS, type Profile } from "@/lib/types";
import { CreateMemberForm } from "./create-member-form";
import { MemberRow } from "./member-row";

export const metadata: Metadata = { title: "Members" };

export default async function MembersPage(props: PageProps<"/admin/members">) {
  await requireExecutive();
  const params = await props.searchParams;

  const roleFilter = typeof params.role === "string" ? params.role : null;
  const query = typeof params.q === "string" ? params.q.trim() : "";

  const supabase = await createClient();
  let request = supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);

  if (roleFilter && (ROLES as readonly string[]).includes(roleFilter)) {
    request = request.eq("role", roleFilter);
  }
  if (query) {
    request = request.or(`full_name.ilike.%${query}%,email.ilike.%${query}%`);
  }

  const { data } = await request;
  const members = (data ?? []) as Profile[];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
        <Users size={22} className="text-brand" aria-hidden />
        Members
      </h1>

      {/* Create ---------------------------------------------------------- */}
      <section id="create" className="mt-6 rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-semibold">Add a member</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Creates the account and emails a one-time password. They&rsquo;ll be asked to
          set their own password on first sign-in.
        </p>
        <div className="mt-4">
          <CreateMemberForm />
        </div>
      </section>

      {/* Filters --------------------------------------------------------- */}
      <form method="get" className="mt-8 flex flex-wrap gap-2">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search name or email"
          className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-brand"
        />
        <select
          name="role"
          defaultValue={roleFilter ?? ""}
          className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand"
        >
          <option value="">All categories</option>
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong"
        >
          Filter
        </button>
      </form>

      {(query || roleFilter) && (
        <Link
          href="/admin/members"
          className="mt-2 inline-block text-xs text-muted underline"
        >
          Clear filters
        </Link>
      )}

      {/* List ------------------------------------------------------------ */}
      <p className="mt-6 text-sm text-muted">
        {members.length} {members.length === 1 ? "member" : "members"}
      </p>

      <ul className="mt-3 grid gap-2">
        {members.map((member) => (
          <MemberRow key={member.id} member={member} />
        ))}
      </ul>

      {members.length === 0 && (
        <p className="mt-3 rounded-2xl border border-border bg-surface px-4 py-10 text-center text-sm text-muted">
          No members match.
        </p>
      )}
    </div>
  );
}
