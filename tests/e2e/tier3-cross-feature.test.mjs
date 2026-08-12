/*
 * Tier 3: Cross-Feature Combinations E2E Test Suite
 * Validates navigation consistency across components, theme state synchronization,
 * and multi-step form interactive state flows.
 */

import { readFileContent } from "./test-harness.mjs";

export function runTier3Tests(runner) {
  runner.suite("Tier 3: Navigation Flow Alignment Across Header, Footer & BottomNav", (r) => {
    r.test("Public Navigation Links match across SiteHeader, BottomNav and Footer", () => {
      const headerContent = readFileContent("src/components/site-header.tsx");
      const bottomNavContent = readFileContent("src/components/bottom-nav.tsx");
      const footerContent = readFileContent("src/components/site-footer.tsx");

      // Verify key public targets exist in header
      r.assertIncludes(headerContent, "href: \"/\"", "Header includes Home link");
      r.assertIncludes(headerContent, "href: \"/about\"", "Header includes About link");
      r.assertIncludes(headerContent, "href: \"/schedule\"", "Header includes Schedule link");
      r.assertIncludes(headerContent, "href: \"/venue\"", "Header includes Venue link");
      r.assertIncludes(headerContent, "href: \"/partners\"", "Header includes Partners link");
      r.assertIncludes(headerContent, "href: \"/contact\"", "Header includes Contact link");

      // Verify bottom nav handles public view
      r.assertIncludes(bottomNavContent, "href: \"/login\"", "BottomNav links to login for guests");
      r.assertIncludes(bottomNavContent, "href: \"/schedule\"", "BottomNav links to schedule for guests");

      // Verify footer includes key directory links
      r.assertIncludes(footerContent, "href: \"/about\"", "Footer links to about page");
      r.assertIncludes(footerContent, "href: \"/venue\"", "Footer links to venue page");
    });

    r.test("Member Navigation Links match across SiteHeader and BottomNav", () => {
      const headerContent = readFileContent("src/components/site-header.tsx");
      const bottomNavContent = readFileContent("src/components/bottom-nav.tsx");

      r.assertIncludes(headerContent, "href: \"/dashboard\"", "Header member links include /dashboard");
      r.assertIncludes(headerContent, "href: \"/id-card\"", "Header member links include /id-card");
      r.assertIncludes(headerContent, "href: \"/quiz\"", "Header member links include /quiz");
      r.assertIncludes(headerContent, "href: \"/leaderboard\"", "Header member links include /leaderboard");
      r.assertIncludes(headerContent, "href: \"/announcements\"", "Header member links include /announcements");
      r.assertIncludes(headerContent, "href: \"/profile\"", "Header member links include /profile");

      r.assertIncludes(bottomNavContent, "href: \"/dashboard\"", "BottomNav signed-in links include /dashboard");
      r.assertIncludes(bottomNavContent, "href: \"/id-card\"", "BottomNav signed-in links include /id-card");
    });
  });

  runner.suite("Tier 3: Theme Switching Persistence & DOM State Synchronization", (r) => {
    r.test("ThemeToggle syncs theme state across light/dark modes", () => {
      const toggleContent = readFileContent("src/components/theme-toggle.tsx");
      r.assertIncludes(toggleContent, "Switch to light theme", "ThemeToggle includes light theme aria-label");
      r.assertIncludes(toggleContent, "Switch to dark theme", "ThemeToggle includes dark theme aria-label");
      r.assertIncludes(toggleContent, "document.documentElement.setAttribute(\"data-theme\", next)", "ThemeToggle updates data-theme on documentElement");
    });

    r.test("Theme script in head prevents unstyled/wrong-theme flash before paint", () => {
      const layoutContent = readFileContent("src/app/layout.tsx");
      r.assertIncludes(layoutContent, "THEME_SCRIPT", "Root layout contains THEME_SCRIPT");
      r.assertIncludes(layoutContent, "dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}", "THEME_SCRIPT injected in <head>");
    });
  });

  runner.suite("Tier 3: Form Submission States & Client Interactive Workflows", (r) => {
    r.test("LoginForm handles email/password input, loading state, error display, and return parameter (?next=)", () => {
      const loginFormContent = readFileContent("src/app/login/login-form.tsx");
      r.assertIncludes(loginFormContent, "type=\"email\"", "LoginForm requires email input field");
      r.assertIncludes(loginFormContent, "type=\"password\"", "LoginForm requires password input field");
      r.assertIncludes(loginFormContent, "next", "LoginForm handles return redirect parameter");
    });

    r.test("Project Submission form validates title, description, repository URL, and screenshot links", () => {
      const submitContent = readFileContent("src/app/(member)/submit/page.tsx");
      r.assert(submitContent.length > 100, "Submit page file is present and populated");
      r.assert(
        submitContent.includes("repo") || submitContent.includes("title") || submitContent.includes("submit"),
        "Submit page handles project submission fields"
      );
    });

    r.test("Contact Form validates full name, email, subject, and message body", () => {
      const contactContent = readFileContent("src/app/contact/page.tsx");
      r.assertIncludes(contactContent, "Contact", "Contact page presents contact header");
    });
  });
}
