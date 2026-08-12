"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Save, Users } from "lucide-react";
import type { Team } from "@/lib/types";
import { createTeam, updateTeam, type TeamResult } from "./actions";

const FIELD =
  "rounded-xl border border-border bg-surface px-4 py-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/25";

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-strong disabled:opacity-60"
    >
      {pending ? (
        <>
          <Loader2 size={16} className="animate-spin" aria-hidden />
          Saving…
        </>
      ) : (
        <>
          {editing ? <Save size={16} aria-hidden /> : <Users size={16} aria-hidden />}
          {editing ? "Save changes" : "Add team"}
        </>
      )}
    </button>
  );
}

/**
 * Creates a team, or edits one when `team` is given.
 *
 * The same field set either way, because the import script and the desk both
 * produce teams and a row typed here should be indistinguishable from a row
 * that arrived in the spreadsheet.
 */
export function TeamForm({ team }: { team?: Team }) {
  const [state, formAction] = useActionState<TeamResult | null, FormData>(
    team ? updateTeam : createTeam,
    null,
  );

  return (
    <form action={formAction} className="grid gap-4">
      {team && <input type="hidden" name="team_id" value={team.id} />}

      <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
        <div className="grid gap-1.5">
          <label htmlFor="code" className="text-sm font-medium">
            Code
          </label>
          <input
            id="code"
            name="code"
            required
            defaultValue={team?.code}
            placeholder="T01"
            autoCapitalize="characters"
            spellCheck={false}
            className={`${FIELD} font-mono uppercase`}
          />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="name" className="text-sm font-medium">
            Team name
          </label>
          <input
            id="name"
            name="name"
            required
            defaultValue={team?.name}
            className={FIELD}
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="institution" className="text-sm font-medium">
          Institution <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          id="institution"
          name="institution"
          defaultValue={team?.institution ?? ""}
          className={FIELD}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <label htmlFor="track" className="text-sm font-medium">
            Track
          </label>
          <input
            id="track"
            name="track"
            defaultValue={team?.track ?? ""}
            className={FIELD}
          />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="room" className="text-sm font-medium">
            Room
          </label>
          <input
            id="room"
            name="room"
            defaultValue={team?.room ?? ""}
            className={FIELD}
          />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="table_number" className="text-sm font-medium">
            Table
          </label>
          <input
            id="table_number"
            name="table_number"
            defaultValue={team?.table_number ?? ""}
            className={FIELD}
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="notes" className="text-sm font-medium">
          Notes <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          defaultValue={team?.notes ?? ""}
          className={FIELD}
        />
      </div>

      {state && (
        <p
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm ${
            state.ok
              ? "border-success/30 bg-success/10 text-success"
              : "border-danger/30 bg-danger/10 text-danger"
          }`}
        >
          {state.message}
        </p>
      )}

      <SubmitButton editing={Boolean(team)} />
    </form>
  );
}
