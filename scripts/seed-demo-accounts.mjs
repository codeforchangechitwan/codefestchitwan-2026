/*
 * Creates one demo account per member role so the app can be walked through
 * end to end without going near the real registration list.
 *
 *   DEMO_PASSWORD='pick-one' node scripts/seed-demo-accounts.mjs
 *
 * Needs Node 22+ (supabase-js requires native WebSocket). Idempotent:
 * re-running resets each demo account's password and profile rather than
 * failing on the duplicate email. Reads credentials from .env.local, so it
 * never carries a key or a password of its own.
 *
 * Demo accounts skip the mailed-password step (must_change_password = false)
 * so you can sign in and land straight on the dashboard. Delete them before
 * the event with: node scripts/seed-demo-accounts.mjs --remove
 */

import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(file = ".env.local") {
  let raw;
  try {
    raw = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  } catch {
    return;
  }
  for (const line of raw.split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    const value = match[2].trim().replace(/^["']|["']$/g, "");
    process.env[match[1]] ??= value;
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRole) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — copy .env.example to .env.local and fill them in.",
  );
  process.exit(1);
}

const admin = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/*
 * Same password for every demo login. Never hardcode it: this repository is
 * public, and demo.executive is a real executive on the live project. Set
 * DEMO_PASSWORD in .env.local (or inline) to choose one; otherwise a random
 * password is generated and printed at the end.
 */
const DEMO_PASSWORD =
  process.env.DEMO_PASSWORD || `Demo-${randomBytes(9).toString("base64url")}`;

const DEMO_MEMBERS = [
  {
    email: "demo.executive@codefestnepal.com",
    full_name: "Demo Executive",
    role: "executive",
    institution: "Codefest Chitwan",
    phone: "+977-9800000001",
    room: "Building A — Control Room",
  },
  {
    email: "demo.volunteer@codefestnepal.com",
    full_name: "Demo Volunteer",
    role: "volunteer",
    institution: "Codefest Chitwan",
    phone: "+977-9800000002",
    room: "Building A — Registration Desk",
  },
  {
    email: "demo.mentor@codefestnepal.com",
    full_name: "Demo Mentor",
    role: "mentor",
    institution: "Kathmandu University",
    phone: "+977-9800000003",
    room: "Building B — Mentor Lounge",
  },
  {
    email: "demo.judge@codefestnepal.com",
    full_name: "Demo Judge",
    role: "judge",
    institution: "Nepal Tech Council",
    phone: "+977-9800000004",
    room: "Building B — Judging Room",
  },
  {
    email: "demo.participant@codefestnepal.com",
    full_name: "Demo Participant",
    role: "participant",
    team_name: "Team Demo",
    institution: "Chitwan Engineering Campus",
    phone: "+977-9800000005",
    room: "Building C — Hall 1",
  },
  {
    email: "demo.guest@codefestnepal.com",
    full_name: "Demo Guest",
    role: "other",
    institution: "Invited Guest",
    phone: "+977-9800000006",
    room: "Building A — Reception",
  },
];

/** Auth admin has no get-by-email, so page through the user list once. */
async function findUserByEmail(email) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function remove() {
  for (const member of DEMO_MEMBERS) {
    const existing = await findUserByEmail(member.email);
    if (existing) {
      await admin.auth.admin.deleteUser(existing.id);
      console.log(`deleted  ${member.email}`);
    } else {
      console.log(`missing  ${member.email}`);
    }
    await admin.from("registrations").delete().eq("email", member.email);
  }
}

async function seed() {
  for (const member of DEMO_MEMBERS) {
    const { email, full_name, role, room, ...rest } = member;
    const team_name = rest.team_name ?? null;
    const { institution = null, phone = null } = rest;

    // The pre-approved list is what makes the system closed — a demo member
    // belongs on it like anyone else.
    await admin.from("registrations").upsert(
      {
        email,
        full_name,
        role,
        team_name,
        institution,
        phone,
        notes: "Demo account — safe to delete.",
        provisioned_at: new Date().toISOString(),
      },
      { onConflict: "email" },
    );

    let user = await findUserByEmail(email);

    if (user) {
      const { error } = await admin.auth.admin.updateUserById(user.id, {
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name, role, team_name, institution, phone },
      });
      if (error) throw error;
      console.log(`reset    ${email.padEnd(38)} ${role}`);
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name, role, team_name, institution, phone },
      });
      if (error) throw error;
      user = data.user;
      console.log(`created  ${email.padEnd(38)} ${role}`);
    }

    // The trigger seeded the profile from metadata; pin the rest of it here.
    const { error: profileError } = await admin
      .from("profiles")
      .update({
        full_name,
        role,
        team_name,
        institution,
        phone,
        room,
        is_active: true,
        // Demo accounts skip the forced password change.
        must_change_password: false,
      })
      .eq("id", user.id);

    if (profileError) throw profileError;
  }

  console.log(`\nAll ${DEMO_MEMBERS.length} demo accounts share the password: ${DEMO_PASSWORD}`);
}

const mode = process.argv.includes("--remove") ? remove : seed;

mode().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
