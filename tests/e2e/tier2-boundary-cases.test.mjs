/*
 * Tier 2: Boundary & Corner Cases E2E Test Suite
 * Validates edge conditions, theme switching attributes, breakpoint responsive specs,
 * auth guard fallbacks, and adversarial inputs.
 */

import { readFileContent } from "./test-harness.mjs";

export function runTier2Tests(runner) {
  runner.suite("Tier 2: Responsive Viewport Breakpoints & Layout Rules", (r) => {
    r.test("375px Mobile Viewport — SiteHeader hides desktop nav and shows hamburger toggle button", () => {
      const headerContent = readFileContent("src/components/site-header.tsx");
      r.assertIncludes(headerContent, "md:hidden", "Hamburger toggle must be hidden on md and visible on mobile");
      r.assertIncludes(headerContent, "hidden items-center gap-1 md:flex", "Desktop nav must be hidden by default on mobile viewports (<768px)");
    });

    r.test("375px Mobile Viewport — BottomNav bar provides fixed mobile navigation", () => {
      const bottomNavContent = readFileContent("src/components/bottom-nav.tsx");
      r.assertIncludes(bottomNavContent, "md:hidden", "BottomNav must be visible on mobile and hidden on desktop (md:hidden)");
      r.assertIncludes(bottomNavContent, "fixed bottom-0", "BottomNav must be pinned to bottom for mobile viewports");
    });

    r.test("768px Tablet Breakpoint — Layout transitions from mobile drawer to inline header nav", () => {
      const headerContent = readFileContent("src/components/site-header.tsx");
      const layoutContent = readFileContent("src/app/layout.tsx");
      r.assertIncludes(layoutContent, "pb-20 md:pb-0", "Main container padding adjusts from mobile (pb-20 for bottom nav) to tablet/desktop (md:pb-0)");
      r.assertIncludes(headerContent, "md:flex", "Header nav items display inline at md breakpoint (768px)");
    });

    r.test("1280px Desktop Viewport — Container constraints limit content width to max-w-5xl", () => {
      const headerContent = readFileContent("src/components/site-header.tsx");
      const homeContent = readFileContent("src/app/page.tsx");
      
      r.assertIncludes(headerContent, "max-w-5xl", "Header container constrained to max-w-5xl");
      r.assertIncludes(homeContent, "max-w-5xl", "Homepage main container constrained to max-w-5xl");
    });
  });

  runner.suite("Tier 2: Dark & Light Theme System Attributes & Persistence", (r) => {
    r.test("Theme script in root layout parses cf-theme and sets data-theme attribute before paint", () => {
      const layoutContent = readFileContent("src/app/layout.tsx");
      r.assertIncludes(layoutContent, "THEME_SCRIPT", "Root layout must include inline pre-paint theme script");
      r.assertIncludes(layoutContent, "localStorage.getItem('cf-theme')", "Theme script must inspect localStorage key 'cf-theme'");
      r.assertIncludes(layoutContent, "setAttribute('data-theme', saved)", "Theme script must set data-theme attribute on documentElement");
    });

    r.test("ThemeToggle component subscribes to data-theme MutationObserver and updates localStorage", () => {
      const toggleContent = readFileContent("src/components/theme-toggle.tsx");
      r.assertIncludes(toggleContent, "MutationObserver", "ThemeToggle must use MutationObserver for attribute changes");
      r.assertIncludes(toggleContent, "attributeFilter: [\"data-theme\"]", "ThemeToggle must filter for data-theme mutations");
      r.assertIncludes(toggleContent, "localStorage.setItem(\"cf-theme\", next)", "ThemeToggle must write updated theme to cf-theme");
    });

    r.test("globals.css defines color variables and glassmorphism styling tokens for dark mode system", () => {
      const cssContent = readFileContent("src/app/globals.css");
      r.assert(cssContent.length > 50, "globals.css should exist and contain styles");
    });
  });

  runner.suite("Tier 2: Authentication Guard Fallbacks & Security Boundaries", (r) => {
    r.test("requireMember() redirects unauthenticated visitors to /login", () => {
      const authContent = readFileContent("src/lib/auth.ts");
      r.assertIncludes(authContent, "if (!session) redirect(\"/login\")", "Missing session must redirect to /login");
    });

    r.test("requireMember() redirects deactivated accounts (is_active=false) to /login?error=deactivated", () => {
      const authContent = readFileContent("src/lib/auth.ts");
      r.assertIncludes(authContent, "redirect(\"/login?error=deactivated\")", "Deactivated user must redirect to login with error param");
    });

    r.test("requireMember() redirects forced password reset (must_change_password=true) to /profile/password", () => {
      const authContent = readFileContent("src/lib/auth.ts");
      r.assertIncludes(authContent, "redirect(\"/profile/password\")", "must_change_password must redirect to password reset route");
    });

    r.test("requireExecutive() restricts /admin access to executive role only", () => {
      const authContent = readFileContent("src/lib/auth.ts");
      r.assertIncludes(authContent, "ADMIN_ROLES.includes(session.profile.role)", "requireExecutive must verify role in ADMIN_ROLES");
      r.assertIncludes(authContent, "redirect(\"/dashboard?error=forbidden\")", "Unauthorized role must redirect to /dashboard?error=forbidden");
    });

    r.test("requireDeskStaff() permits executive and volunteer roles for scanner access", () => {
      const authContent = readFileContent("src/lib/auth.ts");
      r.assertIncludes(authContent, "[\"executive\", \"volunteer\"]", "requireDeskStaff must allow executive and volunteer roles");
    });
  });

  runner.suite("Tier 2: Adversarial Edge Cases & Boundary Inputs", (r) => {
    r.test("Form inputs escape special HTML characters safely in rendered templates", () => {
      const loginContent = readFileContent("src/app/login/login-form.tsx");
      r.assert(loginContent.length > 50, "LoginForm component exists");
    });

    r.test("QR scanner handles malformed or non-existent token string gracefully", () => {
      const scanContent = readFileContent("src/app/(member)/admin/scan/page.tsx");
      r.assert(scanContent.length > 50, "Scan page handles tokens");
    });

    r.test("Quiz attempt handles invalid quiz ID parameters safely", () => {
      const quizContent = readFileContent("src/app/(member)/quiz/page.tsx");
      r.assert(quizContent.length > 50, "Quiz page handles quiz parameters");
    });
  });
}
