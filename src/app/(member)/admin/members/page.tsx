import type { Metadata } from "next";
import Link from "next/link";
import { Download, QrCode, Users } from "lucide-react";
import { requireExecutive } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ROLES, ROLE_LABELS, type Profile } from "@/lib/types";
import { CreateMemberForm } from "./create-member-form";
import { MemberRow } from "./member-row";

export const metadata: Metadata = { title: "Members" };

/** Enough to scroll on a phone without the page weighing several megabytes. */
const PAGE_SIZE = 50;

export default async function MembersPage(props: PageProps<"/admin/members">) {
  await requireExecutive();
  const params = await props.searchParams;

  const roleFilter = typeof params.role === "string" ? params.role : null;
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const rawPage = Number.parseInt(
    typeof params.page === "string" ? params.page : "",
    10,
  );
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const supabase = await createClient();

  // `count: "exact"` rather than a bare limit: the list used to stop at 300
  // rows with nothing on screen saying so, which reads as "that member has no
  // account" at exactly the moment someone is standing at the desk insisting
  // they do.
  let request = supabase
    .from("profiles")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (roleFilter && (ROLES as readonly string[]).includes(roleFilter)) {
    request = request.eq("role", roleFilter);
  }
  if (query) {
    const escaped = query.replace(/[(),*]/g, " ").trim();
    if (escaped) {
      request = request.or(
        `full_name.ilike.%${escaped}%,email.ilike.%${escaped}%,participant_code.ilike.%${escaped}%`,
      );
    }
  }

  const { data, count } = await request;
  const members = (data ?? []) as Profile[];
  const total = count ?? members.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  /** Page links keep the current filters. */
  function pageHref(next: number) {
    const search = new URLSearchParams();
    if (query) search.set("q", query);
    if (roleFilter) search.set("role", roleFilter);
    if (next > 1) search.set("page", String(next));
    const suffix = search.toString();
    return suffix ? `/admin/members?${suffix}` : "/admin/members";
  }

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
          placeholder="Search name, email or ID"
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

      <div className="mt-2 flex flex-wrap items-center gap-3">
        {(query || roleFilter) && (
          <Link href="/admin/members" className="text-xs text-muted underline">
            Clear filters
          </Link>
        )}
        <a
          href={`/api/admin/badges${roleFilter ? `?role=${roleFilter}` : ""}`}
          className="ml-auto inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium transition-colors hover:border-brand/40"
        >
          <QrCode size={15} aria-hidden />
          Badge QRs
        </a>
        <a
          href="/api/admin/members"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium transition-colors hover:border-brand/40"
        >
          <Download size={15} aria-hidden />
          Export CSV
        </a>
      </div>

      {/* List ------------------------------------------------------------ */}
      <p className="mt-6 text-sm text-muted">
        {total} {total === 1 ? "member" : "members"}
        {totalPages > 1 && ` · page ${page} of ${totalPages}`}
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

      {totalPages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link
              href={pageHref(page - 1)}
              className="rounded-xl border border-border bg-surface px-4 py-2 font-medium transition-colors hover:border-brand/40"
            >
              Previous
            </Link>
          ) : (
            <span />
          )}
          {page < totalPages ? (
            <Link
              href={pageHref(page + 1)}
              className="rounded-xl border border-border bg-surface px-4 py-2 font-medium transition-colors hover:border-brand/40"
            >
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
