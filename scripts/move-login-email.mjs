/**
 * Moves an existing account to a different login address.
 *
 * Needed because import-registrations.mjs matches people by email. When a team
 * re-submits the registration form with a corrected address for someone who
 * already has an account, the importer cannot tell that it is the same person:
 * it sees an address it has never met and creates a second account, leaving the
 * first one orphaned with a live password and a live check-in QR.
 *
 * So corrections are applied here first, before the import runs, and the
 * importer then matches on the new address.
 *
 * The old address is recorded in profiles.notes as "Previously <old>", which is
 * the convention normalise-identities.mjs writes and import-registrations.mjs
 * reads (it indexes existing users by that note as well as by their current
 * address). That is what keeps a later re-run from creating a duplicate if the
 * spreadsheet still carries the old address.
 *
 * What this does NOT change: the password and the QR token. A slip already
 * printed still works to log in and to check in — but the address printed on it
 * is now wrong, so reprint the slips for anyone moved here.
 *
 * Usage:
 *   node scripts/move-login-email.mjs --move old@x.com=new@y.com [--move ...] [--commit]
 */

import { serviceClient } from "./lib/supabase.mjs";

const commit = process.argv.includes("--commit");

const moves = process.argv
  .map((arg, i) => (arg === "--move" ? process.argv[i + 1] : null))
  .filter(Boolean)
  .map((pair) => {
    const [from, to] = pair.split("=").map((s) => s?.trim().toLowerCase());
    if (!from || !to) {
      console.error(`--move needs old@example.com=new@example.com, got "${pair}"`);
      process.exit(1);
    }
    return { from, to };
  });

if (moves.length === 0) {
  console.error("Nothing to do: pass at least one --move old@x=new@y");
  process.exit(1);
}

async function findUserByEmail(supabase, email) {
  for (let page = 1; page <= 30; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw new Error(error.message);
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function main() {
  const supabase = serviceClient();

  console.log(`\nMoving logins${commit ? "" : "  (DRY RUN)"}`);
  console.log("================================================================");

  const planned = [];

  for (const { from, to } of moves) {
    const user = await findUserByEmail(supabase, from);
    if (!user) {
      const already = await findUserByEmail(supabase, to);
      console.log(
        already
          ? `  skip  ${from} -> ${to}  (already moved)`
          : `  MISS  ${from} -> ${to}  (no account with the old address)`,
      );
      continue;
    }

    const clash = await findUserByEmail(supabase, to);
    if (clash) {
      console.log(`  STOP  ${from} -> ${to}  (${to} is already somebody's login)`);
      continue;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, notes")
      .eq("id", user.id)
      .single();

    console.log(`  move  ${profile?.full_name ?? user.id}: ${from} -> ${to}`);
    planned.push({ user, from, to, notes: profile?.notes ?? null });
  }

  if (!commit) {
    console.log("\nNothing was written. Re-run with --commit.");
    return;
  }

  for (const { user, from, to, notes } of planned) {
    const { error: authError } = await supabase.auth.admin.updateUserById(
      user.id,
      { email: to, email_confirm: true },
    );
    if (authError) throw new Error(`${from}: ${authError.message}`);

    const note = `Previously ${from}`;
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ email: to, notes: notes?.includes(note) ? notes : note })
      .eq("id", user.id);
    if (profileError) throw new Error(`${from}: ${profileError.message}`);
  }

  console.log(
    `\nMoved ${planned.length} ${planned.length === 1 ? "login" : "logins"}. Reprint their credential slips — the address on the printed copy is now wrong.`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
