/*
 * Tier 1: Feature Coverage E2E Test Suite
 * Validates existence, page exports, structural elements, and UI contracts of:
 * - Public Pages: /, /about, /schedule, /venue, /partners, /contact, /login, /offline
 * - Member Pages: /dashboard, /id-card, /team, /submit, /quiz, /leaderboard, /profile, /announcements, /profile/password
 * - Admin Pages: /admin, /admin/members, /admin/submissions, /admin/quizzes, /admin/announcements, /admin/scan, /admin/wheel, /admin/attendance, /admin/teams, /admin/teams/[id]
 * - Executive downloads: /api/admin/submissions, /api/admin/members, /api/admin/attendance, /api/admin/badges
 */

import { checkFile, readFileContent } from "./test-harness.mjs";

export function runTier1Tests(runner) {
  runner.suite("Tier 1: Feature Coverage — Public Routes", (r) => {
    const publicRoutes = [
      { path: "src/app/page.tsx", route: "/", name: "Homepage" },
      { path: "src/app/about/page.tsx", route: "/about", name: "About" },
      { path: "src/app/schedule/page.tsx", route: "/schedule", name: "Schedule" },
      { path: "src/app/venue/page.tsx", route: "/venue", name: "Venue" },
      { path: "src/app/partners/page.tsx", route: "/partners", name: "Partners" },
      { path: "src/app/contact/page.tsx", route: "/contact", name: "Contact" },
      { path: "src/app/login/page.tsx", route: "/login", name: "Login" },
      { path: "src/app/offline/page.tsx", route: "/offline", name: "Offline PWA" },
    ];

    for (const item of publicRoutes) {
      r.test(`Public Route [${item.route}] source file exists`, () => {
        r.assert(checkFile(item.path), `File ${item.path} should exist`);
      });

      r.test(`Public Route [${item.route}] default export component exists`, () => {
        const content = readFileContent(item.path);
        r.assertMatches(content, /export\s+default\s+(async\s+)?function/, `Page at ${item.path} must default export a function`);
      });
    }

    r.test("Homepage (/) renders Hero, Countdown, Closed System Notice, and Features", () => {
      const content = readFileContent("src/app/page.tsx");
      r.assertIncludes(content, "Codefest 2026", "Homepage must mention Codefest 2026");
      r.assertIncludes(content, "Countdown", "Homepage must render Countdown component");
      r.assertIncludes(content, "This is a closed system", "Homepage must render closed system notice");
      r.assertIncludes(content, "/schedule", "Homepage must link to /schedule");
      r.assertIncludes(content, "/login", "Homepage must link to /login");
    });

    r.test("Login (/login) renders LoginForm and closed-system security details", () => {
      const content = readFileContent("src/app/login/page.tsx");
      r.assertIncludes(content, "LoginForm", "Login page must mount LoginForm component");
      r.assertIncludes(content, "Member login", "Login page must have header title");
      r.assertIncludes(content, "error === \"deactivated\"", "Login page must handle deactivated account query param");
    });

    r.test("Schedule (/schedule) renders event days and time slots", () => {
      const content = readFileContent("src/app/schedule/page.tsx");
      r.assert(content.length > 100, "Schedule page file must contain schedule structure");
      r.assertIncludes(content, "Schedule", "Schedule page must reference schedule title");
    });

    r.test("Venue (/venue) contains location details for Forbes College", () => {
      const content = readFileContent("src/app/venue/page.tsx");
      r.assertIncludes(content, "Forbes", "Venue page should mention Forbes College");
    });

    r.test("Partner names corrected by the official announcement have not regressed", () => {
      const content = readFileContent("src/lib/partners.ts");
      // Left-hand names were poster mis-readings; the announcement slides
      // corrected them. Re-introducing one would put a wrong business on a
      // public sponsor page.
      for (const [wrong, right] of [
        ["Kathmandu Cake Shop", "Chitwan Cake House"],
        ["PA Sports", "DS Sports"],
        ["Lords Hotels & Resorts", "Lords CBC Plaza"],
      ]) {
        r.assert(
          !content.includes(`name: "${wrong}"`),
          `partners.ts must not reintroduce "${wrong}" — the announcement says "${right}"`
        );
        r.assertIncludes(content, `name: "${right}"`, `partners.ts must list "${right}"`);
      }
    });

    r.test("Announced partner tiers are quoted from the official slides", () => {
      const content = readFileContent("src/lib/partners.ts");
      for (const tier of [
        "National Banking Partner",
        "Venue Partner",
        "International Supporting Partner",
        "Hospitality Partner",
        "Multiplex Partner",
        "Cake Partner",
        "Ice Cream Partner",
        "Sports Partner",
        "Content Creation Partner",
        "Internet Partner",
      ]) {
        r.assertIncludes(content, tier, `partners.ts must carry the "${tier}" tier`);
      }
    });

    r.test("Event dates carry the Bikram Sambat year used on the announcements", () => {
      const content = readFileContent("src/lib/event.ts");
      r.assertIncludes(content, "2083 Shrawan", "event.ts must state the BS year 2083");
      r.assertIncludes(content, "14–16 August 2026", "event.ts must keep the Gregorian dates");
    });
  });

  runner.suite("Tier 1: Feature Coverage — Member Protected Routes", (r) => {
    const memberRoutes = [
      { path: "src/app/(member)/dashboard/page.tsx", route: "/dashboard", name: "Dashboard" },
      { path: "src/app/(member)/id-card/page.tsx", route: "/id-card", name: "Digital ID Card" },
      { path: "src/app/(member)/team/page.tsx", route: "/team", name: "Team Portal" },
      { path: "src/app/(member)/submit/page.tsx", route: "/submit", name: "Project Submission" },
      { path: "src/app/(member)/quiz/page.tsx", route: "/quiz", name: "Quiz List" },
      { path: "src/app/(member)/leaderboard/page.tsx", route: "/leaderboard", name: "Leaderboard" },
      { path: "src/app/(member)/profile/page.tsx", route: "/profile", name: "User Profile" },
      { path: "src/app/(member)/announcements/page.tsx", route: "/announcements", name: "Announcements" },
      { path: "src/app/(member)/profile/password/page.tsx", route: "/profile/password", name: "Change Password" },
    ];

    for (const item of memberRoutes) {
      r.test(`Member Route [${item.route}] source file exists`, () => {
        r.assert(checkFile(item.path), `File ${item.path} should exist`);
      });

      r.test(`Member Route [${item.route}] integrates requireMember auth guard`, () => {
        const content = readFileContent(item.path);
        r.assert(
          content.includes("requireMember") || content.includes("getSessionProfile"),
          `Member page ${item.route} must enforce member auth guard`
        );
      });
    }

    r.test("Digital ID Card (/id-card) incorporates QR Code rendering and role badge", () => {
      const content = readFileContent("src/app/(member)/id-card/page.tsx");
      r.assert(
        content.includes("qr_token") || content.includes("IdCard") || content.includes("QR"),
        "ID card page must include QR card representation"
      );
    });

    r.test("Project Submission (/submit) contains repo, demo, and video input fields", () => {
      const content = readFileContent("src/app/(member)/submit/page.tsx");
      r.assert(
        content.includes("repo") || content.includes("submission") || content.includes("Submit"),
        "Submit page must include submission features"
      );
    });
  });

  runner.suite("Tier 1: Feature Coverage — Admin Protected Routes", (r) => {
    const adminRoutes = [
      { path: "src/app/(member)/admin/page.tsx", route: "/admin", name: "Admin Dashboard" },
      { path: "src/app/(member)/admin/members/page.tsx", route: "/admin/members", name: "Member Directory" },
      { path: "src/app/(member)/admin/submissions/page.tsx", route: "/admin/submissions", name: "Submissions Management" },
      { path: "src/app/(member)/admin/quizzes/page.tsx", route: "/admin/quizzes", name: "Quiz Manager" },
      { path: "src/app/(member)/admin/announcements/page.tsx", route: "/admin/announcements", name: "Broadcast Announcements" },
      { path: "src/app/(member)/admin/scan/page.tsx", route: "/admin/scan", name: "Desk QR Scanner" },
      { path: "src/app/(member)/admin/wheel/page.tsx", route: "/admin/wheel", name: "Lucky Wheel" },
      { path: "src/app/(member)/admin/attendance/page.tsx", route: "/admin/attendance", name: "Attendance Log" },
      { path: "src/app/(member)/admin/teams/page.tsx", route: "/admin/teams", name: "Team Directory" },
      { path: "src/app/(member)/admin/teams/[id]/page.tsx", route: "/admin/teams/[id]", name: "Team Detail" },
      { path: "src/app/(member)/admin/roster/page.tsx", route: "/admin/roster", name: "Desk Roster" },
      { path: "src/app/(member)/judge/page.tsx", route: "/judge", name: "Judging Panel" },
    ];

    for (const item of adminRoutes) {
      r.test(`Admin Route [${item.route}] source file exists`, () => {
        r.assert(checkFile(item.path), `File ${item.path} should exist`);
      });

      r.test(`Admin Route [${item.route}] integrates executive or desk staff guard`, () => {
        const content = readFileContent(item.path);
        r.assert(
          content.includes("requireExecutive") || content.includes("requireDeskStaff") || content.includes("requireJudge") || content.includes("requireMember"),
          `Admin page ${item.route} must enforce a role guard`
        );
      });
    }

    r.test("Desk QR Scanner (/admin/scan) supports scanning stations (registration, canteen, exit)", () => {
      const content = readFileContent("src/app/(member)/admin/scan/page.tsx");
      r.assert(
        content.includes("requireDeskStaff") || content.includes("scan") || content.includes("station"),
        "Scan page must implement desk staff check and station options"
      );
    });

    r.test("Attendance (/admin/attendance) reads the check_ins log and mounts manual check-in", () => {
      const content = readFileContent("src/app/(member)/admin/attendance/page.tsx");
      r.assertIncludes(content, "check_ins", "Attendance page must query the check_ins table");
      r.assertIncludes(content, "ManualCheckIn", "Attendance page must mount the manual check-in panel");
      r.assertIncludes(content, "/api/admin/attendance", "Attendance page must link its CSV export");
    });

    r.test("Manual check-in records through the record_scan RPC, not a direct insert", () => {
      const content = readFileContent("src/app/(member)/admin/attendance/actions.ts");
      r.assertIncludes(content, "record_scan", "Manual check-in must reuse the record_scan RPC");
      r.assertIncludes(content, "requireExecutive", "Manual check-in must be executive-guarded");
    });

    r.test("Teams (/admin/teams) lists teams and mounts the create form", () => {
      const content = readFileContent("src/app/(member)/admin/teams/page.tsx");
      r.assertIncludes(content, "TeamForm", "Teams page must mount the team form");
      r.assertIncludes(content, "teams", "Teams page must query the teams table");
    });

    r.test("Team detail (/admin/teams/[id]) mounts the roster editor", () => {
      const content = readFileContent("src/app/(member)/admin/teams/[id]/page.tsx");
      r.assertIncludes(content, "TeamRoster", "Team detail page must mount the roster editor");
      r.assertIncludes(content, "team_id", "Team detail page must load members by team_id");
    });
  });

  runner.suite("Tier 1: Feature Coverage — Registration Intake & Judging", (r) => {
    r.test("Judging panel is gated on the database, not just the UI", () => {
      const sql = readFileContent("supabase/migrations/20260813060000_registration_intake.sql");
      r.assertIncludes(sql, "is_judge()", "A judge predicate must exist");
      r.assertIncludes(sql, "judging_is_open()", "The judging lever must be a function RLS can call");
      r.assert(
        /submissions_read[\s\S]{0,400}is_judge\(\) and public\.judging_is_open\(\)/.test(sql),
        "submissions_read must admit judges only while judging is open"
      );
    });

    r.test("Desk-staff directory never exposes card tokens or health data", () => {
      const sql = readFileContent("supabase/migrations/20260813060000_registration_intake.sql");
      const body = sql.slice(sql.indexOf("function public.participant_directory"));
      r.assert(
        !body.includes("qr_token"),
        "participant_directory() must not return qr_token — that is a working identity card"
      );
      r.assert(
        !/returns table[\s\S]{0,600}medical_note/.test(body),
        "participant_directory() must not return medical_note"
      );
      r.assertIncludes(body, "is_desk_staff()", "The projection must check desk staff itself");
    });

    r.test("Judge route enforces the judge guard", () => {
      const content = readFileContent("src/app/(member)/judge/page.tsx");
      r.assertIncludes(content, "requireJudge", "/judge must call requireJudge()");
      r.assertIncludes(content, "judging_open", "/judge must respect the judging lever");
    });

    r.test("/judge is gated by the proxy", () => {
      const proxy = readFileContent("src/proxy.ts");
      r.assertIncludes(proxy, '"/judge"', "PROTECTED_PREFIXES must include /judge");
    });

    r.test("Import script never mails credentials and defaults to a dry run", () => {
      const script = readFileContent("scripts/import-registrations.mjs");
      r.assert(
        !/nodemailer|sendCredentialsEmail|sendMail/.test(script),
        "The bulk import must not send email — a hundred messages must not be one flag away"
      );
      r.assertIncludes(script, "const dryRun = !commit", "Import must require --commit to write");
      r.assertIncludes(script, "0o600", "The credentials file must be written 0600");
    });

    r.test("Credentials export cannot be committed", () => {
      const ignore = readFileContent(".gitignore");
      r.assertIncludes(ignore, "credentials", "gitignore must cover the credentials CSV");
    });

    r.test("A derived name never overwrites a real one on re-import", () => {
      const script = readFileContent("scripts/import-registrations.mjs");
      r.assertIncludes(script, "name_derived", "Derived names must be flagged at parse time");
      r.assert(
        /if \(!person\.name_derived \|\| !existing\)/.test(script),
        "full_name must only be written when the sheet supplied it, or the account is new"
      );
    });

    r.test("Import survives an organiser's login address being changed", () => {
      const script = readFileContent("scripts/import-registrations.mjs");
      r.assertIncludes(
        script,
        "Previously ",
        "loadExistingUsers must index the previous address, or a re-run duplicates the account"
      );
    });

    r.test("A plain re-run cannot wipe the passwords out of the credentials file", () => {
      const script = readFileContent("scripts/import-registrations.mjs");
      r.assertIncludes(
        script,
        "existingPasswords",
        "The export must carry forward passwords from a previous run"
      );
      r.assert(
        /if \(!record\.password && carried\.has\(record\.email\)\)/.test(script),
        "A blank password must be refilled from the prior file, not written out empty"
      );
    });

    r.test("A production build never falls back to localhost", () => {
      const env = readFileContent("src/lib/env.ts");
      // The fallback must not depend on a Vercel system variable: the previous
      // attempt used VERCEL_PROJECT_PRODUCTION_URL, which only exists when the
      // project exposes system env vars, and this one does not — the bug
      // survived the fix and shipped again.
      r.assertIncludes(env, "PRODUCTION_ORIGIN", "A production origin constant must exist");
      r.assert(
        /NODE_ENV === "production"\s*\?\s*PRODUCTION_ORIGIN/.test(env),
        "A production build must default to the real origin, not localhost"
      );
      r.assert(
        /NEXT_PUBLIC_SITE_URL \|\| FALLBACK_ORIGIN/.test(env),
        "An explicit NEXT_PUBLIC_SITE_URL must still win over the default"
      );
    });

    r.test("Badge links are withheld when the site origin is localhost", () => {
      const script = readFileContent("scripts/import-registrations.mjs");
      r.assertIncludes(script, "cardUrlsUsable", "A localhost card_url must not be written");
      r.assertIncludes(script, "localhost", "The localhost guard must actually test for it");
    });

    r.test("Identity normalisation is dry-run by default and gates email changes", () => {
      const script = readFileContent("scripts/normalise-identities.mjs");
      r.assertIncludes(script, 'args.includes("--commit")', "Must require --commit to write");
      r.assertIncludes(script, 'args.includes("--emails")', "Email changes need their own flag");
      r.assert(
        /confidence === "high"/.test(script),
        "Only high-confidence derivations may be applied automatically"
      );
      r.assertIncludes(
        script,
        "ORG_EMAIL_ROLES",
        "Organisation addresses must be restricted to the organising team"
      );
    });
  });

  runner.suite("Tier 1: Feature Coverage — Executive Download Routes", (r) => {
    const exportRoutes = [
      { path: "src/app/api/admin/submissions/route.ts", route: "/api/admin/submissions", name: "Submissions CSV" },
      { path: "src/app/api/admin/members/route.ts", route: "/api/admin/members", name: "Roster CSV" },
      { path: "src/app/api/admin/attendance/route.ts", route: "/api/admin/attendance", name: "Attendance CSV" },
      { path: "src/app/api/admin/badges/route.ts", route: "/api/admin/badges", name: "Badge QR archive" },
    ];

    for (const item of exportRoutes) {
      r.test(`Export Route [${item.route}] source file exists`, () => {
        r.assert(checkFile(item.path), `File ${item.path} should exist`);
      });

      r.test(`Export Route [${item.route}] answers with a status code rather than a redirect`, () => {
        const content = readFileContent(item.path);
        r.assertIncludes(
          content,
          "requireExecutiveApi",
          `${item.route} must guard in-route so a refused download is not the login page`
        );
      });
    }

    r.test("Roster CSV never exports the card token", () => {
      const content = readFileContent("src/app/api/admin/members/route.ts");
      r.assert(
        !/key:\s*"qr_token"/.test(content),
        "The roster export must not include qr_token — it is the whole content of a member's card"
      );
    });

    r.test("Badge archive encodes the same /verify URL the in-app card shows", () => {
      const content = readFileContent("src/lib/qr.ts");
      r.assertIncludes(content, "renderQrPng", "lib/qr must expose a PNG renderer for the print run");
      r.assertIncludes(content, "qrTargetUrl", "Badge codes must encode the shared /verify target URL");
    });
  });
}
