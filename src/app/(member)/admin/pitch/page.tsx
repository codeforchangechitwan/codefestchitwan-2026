import type { Metadata } from "next";
import Link from "next/link";
import { Timer } from "lucide-react";
import { requireExecutive } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PitchControls } from "./pitch-controls";

export const metadata: Metadata = { title: "Pitch timer" };

type BoardRow = {
  id: string;
  code: string;
  name: string;
  pitch_order: number | null;
};

export default async function AdminPitchPage() {
  await requireExecutive();

  const supabase = await createClient();
  const { data } = await supabase
    .from("teams")
    .select("id, code, name, pitch_order")
    .not("pitch_order", "is", null)
    .order("pitch_order");

  const board = ((data ?? []) as BoardRow[]).map((team) => ({
    id: team.id,
    code: team.code,
    name: team.name,
    pitchOrder: team.pitch_order ?? 0,
  }));

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8">
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
        <Timer size={22} className="text-brand" aria-hidden />
        Pitch timer
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Drives the clock in the hall and on every participant&rsquo;s phone. The
        countdown is computed from the database clock, so this device&rsquo;s own
        time doesn&rsquo;t matter.
      </p>

      {board.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
          No pitch order drawn yet — run{" "}
          <Link
            href="/admin/wheel?mode=pitch"
            className="font-medium text-brand hover:underline"
          >
            the draw
          </Link>{" "}
          first.
        </p>
      ) : (
        <div className="mt-6">
          <PitchControls board={board} />
        </div>
      )}
    </div>
  );
}
