# Static source-check suite — summary report
**Project:** Codefest Chitwan 2026 — Hackathon Platform  
**Date:** 2026-08-12  
**Test Runner:** `npm run test:e2e` (`node scripts/run-e2e-tests.mjs`)

---

## ⚠️ What this suite actually does

**These are not end-to-end tests.** Despite the `test:e2e` script name and the
tier titles below, every check in `tests/e2e/` reads project files off disk with
`readFileContent()` and asserts that the text contains an expected substring or
matches a regex. The whole suite finishes in well under a second because:

- no browser, renderer or HTTP server is ever started;
- no page is mounted and no component is rendered;
- no route, auth guard, redirect or database query is executed;
- the "375px / 768px / 1280px viewport" checks assert that Tailwind class
  *strings* such as `md:hidden` appear in the source — not that anything lays
  out correctly at that width;
- the "user journey" tiers assert that route files reference each other, not
  that a participant can complete the journey.

They are useful as cheap regression guards against accidental deletion of a
route, prop or contract string. They are **not** evidence that the application
works, and a green run here should not be read as a release gate. Real
verification still requires `npm run build`, a browser pass over the routes,
and manual checks of the auth and check-in flows.

---

## 1. Summary

Four tiers of source-contract checks are implemented and passing.

- **Test Infrastructure Document**: `TEST_INFRA.md` (Project root)
- **Master Test Runner**: `scripts/run-e2e-tests.mjs`
- **Standard Test Command**: `npm run test:e2e`
- **Test Modules**:
  - `tests/e2e/test-harness.mjs`
  - `tests/e2e/tier1-feature-coverage.test.mjs`
  - `tests/e2e/tier2-boundary-cases.test.mjs`
  - `tests/e2e/tier3-cross-feature.test.mjs`
  - `tests/e2e/tier4-user-scenarios.test.mjs`

---

## 2. Execution summary

Counts below are from an actual run, not estimates. "Checks" are source
assertions, and the coverage they represent is coverage of *contract strings in
the source*, not of application behaviour.

| Tier | Suite target | Checks | Status |
|------|--------------|--------|--------|
| **Tier 1** | Route files exist and export a component; expected contract strings present (24 routes) | 55 | Passing |
| **Tier 2** | Responsive class names, theme-token strings, auth-guard call sites | 15 | Passing |
| **Tier 3** | Nav link lists agree across header/footer/bottom-nav; theme script present; form field names | 7 | Passing |
| **Tier 4** | Journey route files reference one another in the expected order | 12 | Passing |
| **TOTAL** | | **89** (132 assertions) | Passing |

---

## 3. Tier breakdown

Throughout this section, read "verified" / "validated" as **"the expected
string was found in the source file"** — see the warning at the top.

### Tier 1: Feature Coverage (Public, Member & Admin Routes)
- **Public Routes (8/8)**: `/`, `/about`, `/schedule`, `/venue`, `/partners`, `/contact`, `/login`, `/offline` verified for component default exports, metadata, title headers, hero CTA links, countdown timer, closed system notices, and venue details.
- **Member Routes (9/9)**: `/dashboard`, `/id-card`, `/team`, `/submit`, `/quiz`, `/leaderboard`, `/profile`, `/announcements`, `/profile/password` verified for `requireMember()` auth guard integration, QR code display, project repository links, and quiz runner.
- **Admin Routes (7/7)**: `/admin`, `/admin/members`, `/admin/submissions`, `/admin/quizzes`, `/admin/announcements`, `/admin/scan`, `/admin/wheel` verified for `requireExecutive()` and `requireDeskStaff()` security enforcement and desk station selection options.

### Tier 2: Boundary & Corner Cases
- **Responsive Viewports**:
  - `375px` Mobile: `md:hidden` hamburger toggle button, fixed `BottomNav` bar, mobile-optimized padding (`pb-20`).
  - `768px` Tablet: Inline header navigation transition (`md:flex`), hidden mobile bottom bar (`md:hidden`), `pb-0` padding reset.
  - `1280px` Desktop: Full container constraint (`max-w-5xl`), multi-column glass grid layouts.
- **Theme System**: Verified `THEME_SCRIPT` inline head execution, default `data-theme="dark"` attribute, toggle transition to `light`, `MutationObserver` subscription in `ThemeToggle`, and `localStorage` key `cf-theme` persistence.
- **Security Boundaries**: Checked that `src/lib/auth.ts` still contains the
  redirect targets `/login`, `/login?error=deactivated`, `/profile/password` and
  `/dashboard?error=forbidden`. No session is constructed and no redirect is
  exercised — these are **not** security tests.

### Tier 3: Cross-Feature Combinations
- **Navigation Flow Alignment**: Validated link alignment across `SiteHeader`, `BottomNav`, and `SiteFooter`.
- **Theme Synchronization**: Verified zero-flash pre-paint script and client-side toggle reactivity.
- **Form State Workflows**: Verified `LoginForm` query param `next`, project submission field validation (repo, demo, video, screenshots), and contact form reset states.

### Tier 4: Real-World Application Scenarios
- **Participant User Journey**: Validates landing -> login -> password change check -> dashboard -> ID card QR display -> quiz attempt & leaderboard check -> project submission.
- **Admin & Volunteer Staff Journey**: Validates executive login -> admin dashboard metrics -> member directory management -> submission evaluation -> volunteer scanner desk check-in (`/admin/scan`).

---

## 4. How to execute

Run the following command in any terminal with Node.js 24 (see `.nvmrc`):

```bash
npm run test:e2e
```

89 checks and 132 assertions run in well under a second and print a summary.

### What to run alongside it

Because this suite proves nothing about runtime behaviour, releases should also
clear:

```bash
npm run lint
npm run build     # real compile + type check + route generation
npm run dev       # then walk the public routes and the login → dashboard →
                  # ID card → desk scan path in a browser, in both themes
```
