import type { Metadata } from "next";
import Link from "next/link";
import { Shuffle } from "lucide-react";
import { requireExecutive } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { DrawMode } from "./actions";
import { Wheel } from "./wheel";

export const metadata: Metadata = { title: "The draw" };

type TeamRow = {
  id: string;
  code: string;
  name: string;
  table_number: string | null;
  pitch_order: number | null;
};

export default async function WheelPage(props: PageProps<"/admin/wheel">) {
  await requireExecutive();
  const params = await props.searchParams;

  // Mode in the URL so each ceremony is a bookmark the projector opens, rather
  // than a toggle someone can fat-finger mid-draw.
  const mode: DrawMode = params.mode === "tables" ? "tables" : "pitch";

  const supabase = await createClient();
  const { data } = await supabase
    .from("teams")
    .select("id, code, name, table_number, pitch_order")
    .order("code");

  const teams = (data ?? []) as TeamRow[];

  const isDrawn = (team: TeamRow) =>
    mode === "pitch" ? team.pitch_order !== null : team.table_number !== null;

  const undrawn = teams
    .filter((team) => !isDrawn(team))
    .map(({ id, code, name }) => ({ id, code, name }));

  const alreadyDrawn = teams
    .filter(isDrawn)
    .map((team) => ({
      id: team.id,
      code: team.code,
      name: team.name,
      slot:
        mode === "pitch"
          ? (team.pitch_order ?? 0)
          : Number.parseInt((team.table_number ?? "0").replace(/\D/g, ""), 10) || 0,
    }));

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8">
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
        <Shuffle size={22} className="text-brand" aria-hidden />
        {mode === "pitch" ? "Pitch order draw" : "Table draw"}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {mode === "pitch"
          ? "Draws the running order for Sunday's presentations. Each spin assigns the next slot."
          : "Assigns table numbers for Friday. Teams that already have a table are skipped."}
      </p>

      <nav className="mt-3 flex gap-2 text-sm">
        <Link
          href="/admin/wheel?mode=tables"
          className={`rounded-xl px-3 py-2 font-semibold ${
            mode === "tables"
              ? "bg-brand text-white"
              : "border border-border bg-surface text-muted hover:border-brand/40"
          }`}
        >
          Tables
        </Link>
        <Link
          href="/admin/wheel?mode=pitch"
          className={`rounded-xl px-3 py-2 font-semibold ${
            mode === "pitch"
              ? "bg-brand text-white"
              : "border border-border bg-surface text-muted hover:border-brand/40"
          }`}
        >
          Pitch order
        </Link>
      </nav>

      {teams.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
          No teams imported yet — run{" "}
          <code className="font-mono text-xs">scripts/import-teams.mjs</code> first.
        </p>
      ) : (
        <div className="mt-6">
          <Wheel mode={mode} undrawn={undrawn} alreadyDrawn={alreadyDrawn} />
        </div>
      )}
    </div>
  );
}
