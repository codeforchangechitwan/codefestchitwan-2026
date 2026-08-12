# E2E Test Infrastructure & Coverage Architecture
**Project:** Codefest Chitwan 2026 — Hackathon Platform  
**Methodology:** Dual Track Quality Assurance Framework  
**Runner Specification:** Node.js ESM Automated Test Harness (`scripts/run-e2e-tests.mjs`)

---

## 1. Test Architecture Overview

The End-to-End (E2E) Test Infrastructure for `codefestchitwan-2026` provides comprehensive, self-contained verification across the entire web application ecosystem. Operating under the Dual Track methodology, the test architecture validates page route integrity, styling contracts, responsive design viewports, auth guard behavior, cross-feature state persistence, and complete real-world user journeys.

### Key Architectural Layers:
- **Runner Core (`scripts/run-e2e-tests.mjs`)**: Lightweight, high-performance ESM test runner supporting asynchronous test suite execution, assertion tracking, execution timing, and formatted ANSI summary reports.
- **Modular Test Suites (`tests/e2e/*.test.mjs`)**: Four isolated test modules targeting distinct coverage tiers.
- **Route & Render Emulator**: Analyzes React Server Components (RSC), Next.js App Router route conventions, page exports, DOM element trees, and CSS utility contracts.
- **Auth & Session Guard Simulator**: Validates Supabase SSR session handling, role-based security boundaries (`requireMember`, `requireExecutive`, `requireDeskStaff`), and redirect fallbacks.

---

## 2. Standard Test Runner Commands

To execute the complete E2E test suite across all 4 tiers:

```bash
# Standard npm script (configured in package.json)
npm run test:e2e

# Direct Node.js execution
node scripts/run-e2e-tests.mjs
```

---

## 3. The 4-Tier Test Coverage Plan

```
+-----------------------------------------------------------------------+
|                       TIER 4: REAL-WORLD SCENARIOS                     |
|  - Full Participant Journey (Login -> Dashboard -> ID Card -> Quiz)  |
|  - Full Admin & Desk Staff Journey (Admin -> Scan -> Member Mgmt)     |
+-----------------------------------------------------------------------+
|                    TIER 3: CROSS-FEATURE COMBINATIONS                  |
|  - Nav consistency (Header <-> BottomNav <-> Footer across viewports)  |
|  - Theme sync & pre-paint script (MutationObserver + localStorage)     |
|  - Interactive form state transitions & field validations              |
+-----------------------------------------------------------------------+
|                    TIER 2: BOUNDARY & CORNER CASES                    |
|  - Responsive viewports (375px Mobile, 768px Tablet, 1280px Desktop)  |
|  - Theme attribute modes (data-theme="dark" / data-theme="light")      |
|  - Auth fallbacks (requireMember, requireExecutive, requireDeskStaff) |
|  - Adversarial inputs & edge case parameter handling                   |
+-----------------------------------------------------------------------+
|                      TIER 1: FEATURE COVERAGE                          |
|  - 8 Public Routes (/, /about, /schedule, /venue, /partners, etc.)    |
|  - 9 Member Routes (/dashboard, /id-card, /team, /submit, /quiz, etc.) |
|  - 7 Admin Routes (/admin, /admin/members, /admin/scan, etc.)          |
+-----------------------------------------------------------------------+
```

### Tier 1: Feature Coverage
Validates the structural integrity, page metadata, route components, and UI contracts of all 24 routes across 3 security scopes:
1. **Public Routes**:
   - `/` — Homepage, Hero section, Event countdown, Feature grid, Role blurbs, Partner teaser
   - `/about` — Hackathon overview, Forbes College venue details, Code for Change mission
   - `/schedule` — 3-day event timeline (14–16 Aug), session filters, zone badges
   - `/venue` — Campus layout (Buildings A, B, C), room assignments, map view
   - `/partners` — Partner badges, tier breakdown (Gold, Silver, Tech, Media)
   - `/contact` — Interactive contact form, email links, location info
   - `/login` — Member login card, closed-system notice, error alert handling
   - `/offline` — PWA offline fallback screen
2. **Member Protected Routes**:
   - `/dashboard` — Participant dashboard widgets, quick links, event progress
   - `/id-card` — Digital ID card badge, QR code generation, flip/shine effects
   - `/team` — Team roster, table tent number, room assignment, team code
   - `/submit` — Project submission portal (repo URL, demo URL, video URL, screenshots)
   - `/quiz` — Quiz listing, active timed quiz launcher, instructions
   - `/quiz/[id]` — Interactive quiz attempt runner & score submitter
   - `/leaderboard` — Live quiz score rankings, rank badges, score breakdown
   - `/announcements` — Broadcast announcements list, urgent alert banners
   - `/profile` — User profile detail view, phone/room update, password change trigger
3. **Admin Protected Routes**:
   - `/admin` — Executive dashboard overview, quick stats, system actions
   - `/admin/members` — Member directory table, role filter, check-in status
   - `/admin/submissions` — Project submissions evaluator table, status toggle
   - `/admin/quizzes` — Quiz management interface, publish/unpublish levers
   - `/admin/announcements` — Broadcast announcement creator & audience targeting
   - `/admin/scan` — QR Code desk scanner interface (Registration, Canteen, Exit)
   - `/admin/wheel` — Interactive lucky draw wheel component for event closing

---

### Tier 2: Boundary & Corner Cases
Ensures system stability under extreme screen dimensions, storage states, security restrictions, and invalid inputs:
1. **Responsive Viewport Breakpoints**:
   - `375px` (Mobile Small): Verifies hidden desktop navbar, visible BottomNav bar, stacked hero cards, tap-friendly 44px+ touch targets.
   - `768px` (Tablet): Verifies desktop header nav transition, 2-column grid scaling, collapsible drawer behavior.
   - `1280px` (Desktop Large): Verifies full navigation bar, multi-column glass grid layouts, container max-width constraints (`max-w-5xl`).
2. **Theme System & Persistence Boundaries**:
   - Default `data-theme="dark"` attribute on `<html>`.
   - Toggle transition to `data-theme="light"`.
   - LocalStorage key `cf-theme` read/write capability.
   - Zero-flash pre-paint inline script (`THEME_SCRIPT`) execution safety.
3. **Authentication & Authorization Fallback Guards**:
   - Unauthenticated visitor accessing `/dashboard` -> Redirected to `/login`.
   - Deactivated member (`is_active = false`) -> Redirected to `/login?error=deactivated`.
   - Mandatory password reset (`must_change_password = true`) -> Redirected to `/profile/password`.
   - Participant accessing `/admin` -> Redirected to `/dashboard?error=forbidden`.
   - Regular participant accessing `/admin/scan` -> Redirected to `/dashboard?error=forbidden` (Desk staff: `executive` and `volunteer` allowed).
4. **Adversarial & Boundary Inputs**:
   - Malformed/XSS parameters in search inputs or token routes (`/verify/<script>alert(1)</script>`).
   - Non-existent quiz ID parameters (`/quiz/invalid-uuid-999`).
   - Empty form submissions, missing optional fields (repo URL vs demo URL).

---

### Tier 3: Cross-Feature Combinations
Tests multi-component interactions and client-state synchronization:
1. **Navigation Flow Consistency**:
   - Cross-checks nav targets between `SiteHeader` links, `BottomNav` mobile bar, and `SiteFooter` directory links.
   - Verifies active state indicator (`bg-brand-soft text-brand`) synchronization when transitioning routes.
2. **Theme Switching Synchronization**:
   - Synchronizes `ThemeToggle` button state with `document.documentElement` `data-theme` attribute using `MutationObserver`.
   - Verifies system color scheme fallback (`(prefers-color-scheme: dark)`).
3. **Form Submission & Interactive State Transitions**:
   - Login form input error state handling and query parameter propagation (`?next=/submit`).
   - Contact form message validation and reset.
   - Dynamic array field modifications (adding/removing screenshot URLs in project submission).

---

### Tier 4: Real-World Application Scenarios
Simulates end-to-end multi-step user workflows matching actual event operations:
1. **Scenario 1: Complete Participant Journey**:
   - Visitor lands on Homepage `/` -> Explores Schedule `/schedule` -> Clicks Member Login `/login`.
   - Authenticates as participant -> Redirected to `/dashboard`.
   - Navigates to `/id-card` -> Displays digital identity QR token.
   - Enters Quiz `/quiz` -> Completes timed attempt -> Checks rankings on `/leaderboard`.
   - Joins Team Portal `/team` -> Submits final project repository on `/submit`.
2. **Scenario 2: Executive & Volunteer Desk Staff Journey**:
   - Executive logs in -> Enters Admin Panel `/admin`.
   - Reviews member registration list on `/admin/members`.
   - Volunteer logs in -> Opens QR Scanner `/admin/scan`.
   - Simulates check-in scan for participant QR token at `registration` station -> Verification recorded.
   - Executive publishes urgent announcement -> Appears on participant `/announcements`.

---

## 4. Verification & Reporting

All test runs generate structured output confirming:
- Total suites executed
- Total assertions evaluated
- 0 failed assertions required for M4 gate clearance
- Execution runtime metrics
