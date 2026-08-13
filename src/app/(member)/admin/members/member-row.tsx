"use client";

import { useState, useTransition } from "react";
import { BadgeCheck, KeyRound, Loader2, RefreshCw, UserX } from "lucide-react";
import { ROLES, ROLE_LABELS, type Profile } from "@/lib/types";
import {
  resendPassword,
  rotateQrToken,
  setMemberActive,
  setMemberRole,
} from "../actions";

export function MemberRow({ member }: { member: Profile }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [password, setPassword] = useState<string | null>(null);

  function run(action: () => Promise<{ ok: boolean; message: string; password?: string }>) {
    startTransition(async () => {
      const result = await action();
      setNotice({ ok: result.ok, message: result.message });
      setPassword(result.password ?? null);
    });
  }

  return (
    <li className="rounded-2xl border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate font-semibold leading-tight">
              {member.full_name}
            </span>
            {member.checked_in_at && (
              <BadgeCheck
                size={14}
                className="shrink-0 text-success"
                aria-label="Checked in"
              />
            )}
            {!member.is_active && (
              <span className="shrink-0 rounded bg-danger/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-danger">
                Suspended
              </span>
            )}
          </span>
          <span className="block truncate text-xs text-muted">
            {member.participant_code && (
              <span className="font-mono text-brand">
                {member.participant_code}
                {" · "}
              </span>
            )}
            {member.email}
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-semibold text-brand">
          {ROLE_LABELS[member.role]}
        </span>
      </button>

      {open && (
        <div className="border-t border-border p-4">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-muted">Team</dt>
              <dd>{member.team_name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-muted">Room</dt>
              <dd>{member.room ?? "—"}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-[11px] uppercase tracking-wide text-muted">
                Institution
              </dt>
              <dd>{member.institution ?? "—"}</dd>
            </div>
          </dl>

          <div className="mt-4 grid gap-1.5">
            <label
              htmlFor={`role-${member.id}`}
              className="text-xs font-medium text-muted"
            >
              Category
            </label>
            <select
              id={`role-${member.id}`}
              defaultValue={member.role}
              disabled={pending}
              onChange={(event) =>
                run(() => setMemberRole(member.id, event.target.value))
              }
              className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand"
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <ActionButton
              onClick={() => run(() => resendPassword(member.id))}
              disabled={pending}
              icon={KeyRound}
              label="Resend password"
            />
            <ActionButton
              onClick={() => run(() => rotateQrToken(member.id))}
              disabled={pending}
              icon={RefreshCw}
              label="New QR"
            />
            <ActionButton
              onClick={() => run(() => setMemberActive(member.id, !member.is_active))}
              disabled={pending}
              icon={UserX}
              label={member.is_active ? "Suspend" : "Restore"}
              danger={member.is_active}
            />
          </div>

          {pending && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted">
              <Loader2 size={12} className="animate-spin" aria-hidden />
              Working…
            </p>
          )}

          {notice && (
            <p
              role="status"
              className={`mt-3 rounded-xl px-3 py-2 text-sm ${
                notice.ok
                  ? "bg-success/10 text-success"
                  : "bg-danger/10 text-danger"
              }`}
            >
              {notice.message}
            </p>
          )}

          {password && (
            <p className="mt-2 rounded-xl bg-surface-muted px-3 py-2 font-mono text-sm font-bold">
              {password}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

function ActionButton({
  onClick,
  disabled,
  icon: Icon,
  label,
  danger,
}: {
  onClick: () => void;
  disabled: boolean;
  icon: typeof KeyRound;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${
        danger
          ? "border-danger/30 text-danger hover:bg-danger/5"
          : "border-border hover:border-brand/40"
      }`}
    >
      <Icon size={13} aria-hidden />
      {label}
    </button>
  );
}
