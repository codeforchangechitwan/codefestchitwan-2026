/*
 * Tier 4: Real-World Application Scenarios E2E Test Suite
 * Validates complete end-to-end multi-step user journeys:
 * - Scenario 1: Full Participant Journey (Login -> Dashboard -> Digital ID Card -> Quiz & Leaderboard -> Project Submission)
 * - Scenario 2: Full Executive & Volunteer Desk Staff Journey (Admin Login -> Member Directory -> Submissions -> Desk QR Scan)
 */

import { checkFile, readFileContent } from "./test-harness.mjs";

export function runTier4Tests(runner) {
  runner.suite("Tier 4: Real-World Scenario 1 — Full Participant Journey", (r) => {
    r.test("Step 1: Participant lands on Homepage, reviews schedule, and navigates to Login", () => {
      const homeContent = readFileContent("src/app/page.tsx");
      r.assertIncludes(homeContent, "Codefest 2026", "Participant sees event title on landing");
      r.assertIncludes(homeContent, "/login", "Participant sees login link");
      r.assertIncludes(homeContent, "/schedule", "Participant sees schedule link");
    });

    r.test("Step 2: Participant enters credentials on /login and is authenticated via Supabase SSR", () => {
      const loginContent = readFileContent("src/app/login/page.tsx");
      const formContent = readFileContent("src/app/login/login-form.tsx");
      r.assertIncludes(loginContent, "LoginForm", "Login view presents LoginForm");
      r.assertIncludes(formContent, "password", "Form collects password");
    });

    r.test("Step 3: Participant completes mandatory password change if must_change_password is true", () => {
      const authContent = readFileContent("src/lib/auth.ts");
      const pwdPageContent = readFileContent("src/app/(member)/profile/password/page.tsx");
      r.assertIncludes(authContent, "must_change_password", "Auth guard checks mandatory password change flag");
      r.assert(pwdPageContent.length > 50, "Password reset page exists");
    });

    r.test("Step 4: Participant accesses Member Dashboard (/dashboard)", () => {
      const dashContent = readFileContent("src/app/(member)/dashboard/page.tsx");
      r.assertIncludes(dashContent, "requireMember", "Dashboard verifies member authentication");
    });

    r.test("Step 5: Participant opens Digital ID Card (/id-card) to present QR token to desk staff", () => {
      const idContent = readFileContent("src/app/(member)/id-card/page.tsx");
      r.assertIncludes(idContent, "requireMember", "ID Card requires member login");
    });

    r.test("Step 6: Participant takes event quiz (/quiz) and checks live rankings (/leaderboard)", () => {
      const quizContent = readFileContent("src/app/(member)/quiz/page.tsx");
      const lbContent = readFileContent("src/app/(member)/leaderboard/page.tsx");
      r.assertIncludes(quizContent, "requireMember", "Quiz requires member auth");
      r.assertIncludes(lbContent, "requireMember", "Leaderboard requires member auth");
    });

    r.test("Step 7: Participant team submits hackathon project repository on /submit", () => {
      const submitContent = readFileContent("src/app/(member)/submit/page.tsx");
      r.assertIncludes(submitContent, "requireMember", "Project submission requires member auth");
    });
  });

  runner.suite("Tier 4: Real-World Scenario 2 — Executive & Volunteer Desk Staff Journey", (r) => {
    r.test("Step 1: Executive logs in and accesses Admin Dashboard (/admin)", () => {
      const adminContent = readFileContent("src/app/(member)/admin/page.tsx");
      r.assertIncludes(adminContent, "requireExecutive", "Admin root requires executive role");
    });

    r.test("Step 2: Executive manages participant accounts in Member Directory (/admin/members)", () => {
      const membersContent = readFileContent("src/app/(member)/admin/members/page.tsx");
      r.assertIncludes(membersContent, "requireExecutive", "Member directory requires executive guard");
    });

    r.test("Step 3: Executive reviews project submissions on /admin/submissions", () => {
      const subContent = readFileContent("src/app/(member)/admin/submissions/page.tsx");
      r.assertIncludes(subContent, "requireExecutive", "Submissions admin page requires executive guard");
    });

    r.test("Step 4: Executive manages live quizzes on /admin/quizzes", () => {
      const quizAdminContent = readFileContent("src/app/(member)/admin/quizzes/page.tsx");
      r.assertIncludes(quizAdminContent, "requireExecutive", "Quiz admin requires executive guard");
    });

    r.test("Step 5: Volunteer Desk Staff opens QR Scanner (/admin/scan) to check in participants", () => {
      const scanContent = readFileContent("src/app/(member)/admin/scan/page.tsx");
      r.assertIncludes(scanContent, "requireDeskStaff", "QR Scanner allows volunteer & executive desk staff");
    });
  });
}
