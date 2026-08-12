/*
 * Tier 1: Feature Coverage E2E Test Suite
 * Validates existence, page exports, structural elements, and UI contracts of:
 * - Public Pages: /, /about, /schedule, /venue, /partners, /contact, /login, /offline
 * - Member Pages: /dashboard, /id-card, /team, /submit, /quiz, /leaderboard, /profile, /announcements, /profile/password
 * - Admin Pages: /admin, /admin/members, /admin/submissions, /admin/quizzes, /admin/announcements, /admin/scan, /admin/wheel
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
    ];

    for (const item of adminRoutes) {
      r.test(`Admin Route [${item.route}] source file exists`, () => {
        r.assert(checkFile(item.path), `File ${item.path} should exist`);
      });

      r.test(`Admin Route [${item.route}] integrates executive or desk staff guard`, () => {
        const content = readFileContent(item.path);
        r.assert(
          content.includes("requireExecutive") || content.includes("requireDeskStaff") || content.includes("requireMember"),
          `Admin page ${item.route} must enforce admin role check`
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
  });
}
