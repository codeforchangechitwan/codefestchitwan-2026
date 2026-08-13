/*
 * Builds the Codefest Chitwan 2026 handbook: every feature of the site, and
 * what each role actually does with it.
 *
 *   node scripts/make-handbook-pdf.mjs
 *   node scripts/make-handbook-pdf.mjs --out=docs/handbook.pdf
 *
 * Reads nothing from the database and contains no credentials, so the result
 * is safe to hand round, print, and pin to the wall at the registration desk.
 *
 * Content is written here rather than generated from the routes: a handbook
 * has to say what a thing is FOR, and a route table cannot. When a feature
 * changes, this file changes with it.
 */

import { writeFileSync } from "node:fs";
import QRCode from "file:///home/mac/codefestchitwan-2026/node_modules/qrcode/lib/index.js";
import { Canvas, buildPdf, textWidth } from "./lib/pdf.mjs";

const args = process.argv.slice(2);
const outPath =
  args.find((a) => a.startsWith("--out="))?.slice("--out=".length) ??
  "codefest-2026-handbook.pdf";

const SITE = "https://codefestchitwan-2026.vercel.app";

// A4, in points.
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 52;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BOTTOM = 62;

const INK = "#1c1712";
const MUTED = "#6b6259";
const BRAND = "#8b4513";
const ACCENT = "#f2705b";
const NAVY = "#001b3a";
const RULE = "#d9d2c9";
const WASH = "#f6f2ed";

/** Splits a string into lines that fit `width` at the given font and size. */
function wrap(text, font, size, width) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (textWidth(candidate, font, size) <= width) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = word;
  }
  if (line) lines.push(line);
  return lines.length > 0 ? lines : [""];
}

/**
 * A flowing document over the Canvas primitives, which are absolute-positioned.
 * Everything below tracks a cursor and breaks pages on its own.
 */
class Doc {
  constructor() {
    this.pages = [];
    this.page = null;
    this.y = 0;
    this.newPage();
  }

  newPage() {
    this.page = new Canvas(PAGE_W, PAGE_H);
    this.page.fill("#ffffff").rect(0, 0, PAGE_W, PAGE_H);
    this.pages.push(this.page);
    this.y = PAGE_H - MARGIN;
  }

  /** Reserve `height`; start a new page if it will not fit. */
  need(height) {
    if (this.y - height < BOTTOM) this.newPage();
  }

  space(h) {
    this.y -= h;
  }

  h1(text) {
    this.need(64);
    this.space(10);
    // The rule sits above the heading, so the gap below it has to clear the
    // cap height of 19pt Helvetica-Bold (~14pt) or the two collide.
    this.page.fill(BRAND).rect(MARGIN, this.y - 4, 34, 3);
    this.space(28);
    this.page.fill(INK).text(text, "F2", 19, MARGIN, this.y);
    this.space(18);
  }

  h2(text) {
    this.need(38);
    this.space(14);
    this.page.fill(NAVY).text(text, "F2", 12.5, MARGIN, this.y);
    this.space(13);
  }

  h3(text) {
    this.need(28);
    this.space(9);
    this.page.fill(BRAND).text(text, "F2", 10, MARGIN, this.y);
    this.space(11);
  }

  para(text, { colour = INK, size = 9.4, gap = 6 } = {}) {
    const lines = wrap(text, "F1", size, CONTENT_W);
    for (const line of lines) {
      this.need(size + 3);
      this.page.fill(colour).text(line, "F1", size, MARGIN, this.y);
      this.space(size + 3.4);
    }
    this.space(gap);
  }

  bullet(text, { indent = 0 } = {}) {
    const size = 9.2;
    const x = MARGIN + 10 + indent;
    const width = CONTENT_W - 10 - indent;
    const lines = wrap(text, "F1", size, width);

    lines.forEach((line, index) => {
      this.need(size + 3);
      if (index === 0) {
        this.page.fill(ACCENT).rect(MARGIN + 1.5 + indent, this.y + 2.6, 3, 3);
      }
      this.page.fill(INK).text(line, "F1", size, x, this.y);
      this.space(size + 3.2);
    });
    this.space(2);
  }

  /** Route or command on the left, what it is on the right. */
  kv(key, value) {
    const size = 9;
    const keyW = 152;
    const lines = wrap(value, "F1", size, CONTENT_W - keyW - 8);

    this.need(Math.max(lines.length, 1) * (size + 3.2) + 3);
    this.page.fill(BRAND).text(key, "F3", 8.4, MARGIN, this.y);

    lines.forEach((line, index) => {
      if (index > 0) this.need(size + 3);
      this.page.fill(INK).text(line, "F1", size, MARGIN + keyW, this.y);
      this.space(size + 3.2);
    });
    this.space(2.5);
  }

  /** A boxed note for the things that bite people on the day. */
  callout(title, body) {
    const size = 9;
    const lines = wrap(body, "F1", size, CONTENT_W - 28);
    const height = 26 + lines.length * (size + 3.2);

    this.need(height + 10);
    this.space(6);

    const top = this.y + 10;
    this.page.fill(WASH).rect(MARGIN, top - height, CONTENT_W, height);
    this.page.fill(ACCENT).rect(MARGIN, top - height, 3, height);

    this.space(4);
    this.page.fill(BRAND).text(title, "F2", 9.2, MARGIN + 14, this.y);
    this.space(14);

    for (const line of lines) {
      this.page.fill(INK).text(line, "F1", size, MARGIN + 14, this.y);
      this.space(size + 3.2);
    }
    this.space(10);
  }

  rule() {
    this.need(12);
    this.space(4);
    this.page.fill(RULE).rule(MARGIN, this.y, CONTENT_W, 0.7);
    this.space(10);
  }
}

// ---------------------------------------------------------------------------
// Cover
// ---------------------------------------------------------------------------

const doc = new Doc();
const cover = doc.page;

cover.fill(NAVY).rect(0, PAGE_H - 250, PAGE_W, 250);
cover.fill(ACCENT).rect(0, PAGE_H - 254, PAGE_W, 4);

cover.fill("#ffffff").text("CODEFEST 2026", "F2", 30, MARGIN, PAGE_H - 118);
cover.fill(ACCENT).text("CHITWAN", "F2", 30, MARGIN + textWidth("CODEFEST 2026 ", "F2", 30), PAGE_H - 118);
cover
  .fill("#cfd6e0")
  .text("Site handbook - every feature, and who uses it", "F1", 11.5, MARGIN, PAGE_H - 142)
  .text("Forbes College, Bharatpur-2, Kshetrapur, Chitwan", "F1", 9.5, MARGIN, PAGE_H - 176)
  .text("2083 Shrawan 29, 30, 31  (14-16 August 2026)", "F1", 9.5, MARGIN, PAGE_H - 191)
  .text("Code for Change - Let code lead the change", "F1", 9.5, MARGIN, PAGE_H - 206);

// The site's own address, scannable off the printed page.
const coverQr = QRCode.create(SITE, { errorCorrectionLevel: "M" });
cover.fill("#ffffff").rect(PAGE_W - MARGIN - 96, PAGE_H - 214, 88, 88);
cover.qr(coverQr.modules, PAGE_W - MARGIN - 92, PAGE_H - 210, 80, NAVY);

doc.y = PAGE_H - 300;

doc.para(
  "This handbook covers the whole site: what every page does, and what each " +
    "kind of person is expected to do with it. Find your role in the contents " +
    "and read that section - nobody needs all of it.",
  { size: 10 },
);

doc.h2("Who you are, and where to go");
doc.kv("Participant", "Sections 1 and 2. Your card, your team, your submission.");
doc.kv("Team leader", "Sections 1, 2 and 3. You own the project submission.");
doc.kv("Volunteer", "Sections 1 and 4. The scanner and the roster.");
doc.kv("Judge", "Sections 1 and 5. The judging panel on Sunday.");
doc.kv("Mentor", "Sections 1 and 6.");
doc.kv("Executive", "All of it. Section 7 is the admin panel; 8 is the runbook.");

doc.callout(
  "Everyone signs in the same way",
  "You were given an email address and a one-time password. The first time you " +
    "sign in, the site makes you choose your own password before it will let you " +
    "anywhere else. Staff should do this BEFORE Friday morning - a volunteer " +
    "cannot open the scanner until it is done, and the desk cannot wait.",
);

// ---------------------------------------------------------------------------
// 1. Everyone
// ---------------------------------------------------------------------------

doc.newPage();
doc.h1("1. Everyone");

doc.h2("Signing in");
doc.para(
  "There is no public sign-up anywhere on the site. Accounts exist only for " +
    "people on the registration list, which is what keeps the event closed. If " +
    "your email is not recognised, an executive has to create the account.",
);
doc.kv("/login", "Email and password. Sends you where you were headed.");
doc.kv("/profile/password", "Forced on first sign-in. Choose your own password.");
doc.kv("/profile", "Name, phone, institution, food preference.");

doc.h2("Your identity card");
doc.para(
  "The card is the QR you present at every desk - arrival, the canteen, the " +
    "exit gate. It is colour-coded by role so the desk can tell categories apart " +
    "at a glance, and it works from your phone screen or from a printed badge.",
);
doc.kv("/id-card", "Your QR, name, role, team and room.");
doc.callout(
  "If your card will not scan",
  "Go to the desk and give your name. Volunteers can look you up on the roster " +
    "and an executive can check you in by hand. Nothing about the day depends on " +
    "the camera working.",
);

doc.h2("The schedule");
doc.para(
  "The full three-day timeline, filterable by day. During the event it opens on " +
    "today. Key Highlights narrows it to the sessions that matter: registration, " +
    "the opening ceremony, the quiz, presentations and the closing ceremony.",
);
doc.kv("/schedule", "All sessions, by day, with zone and building.");
doc.kv("/dashboard", "What is happening now, and what is next.");

doc.h2("Announcements");
doc.para(
  "Organisers post updates here, and can target a single category - a notice " +
    "for judges does not reach every participant. Urgent notices are flagged in " +
    "red and appear on the dashboard.",
);
doc.kv("/announcements", "Everything posted, newest first.");

doc.h2("Install it on your phone");
doc.para(
  "The site is installable. Add it to your home screen and the schedule and your " +
    "card keep working when the venue wifi does not. A prompt appears on its own; " +
    "you can also use your browser's Add to Home Screen.",
);

doc.h2("Public pages");
doc.kv("/about", "What Codefest is, and who runs it.");
doc.kv("/venue", "Buildings A, B and C, and what happens in each.");
doc.kv("/partners", "Every partner, by tier.");
doc.kv("/contact", "Enquiries to the organising team.");

// ---------------------------------------------------------------------------
// 2. Participants
// ---------------------------------------------------------------------------

doc.newPage();
doc.h1("2. Participants");

doc.h2("Your team");
doc.para(
  "Every participant belongs to one team. The roster shows your teammates, your " +
    "room and your table number once the draw has run. You cannot submit a " +
    "project until you are on a team - if the page says you are unassigned, tell " +
    "an executive.",
);
doc.kv("/team", "Teammates, room, table number, submission status.");

doc.h2("Submitting your project");
doc.para(
  "One submission per team, and any team member can edit it. Save early and " +
    "often: the form keeps a draft, and a draft is not a submission. Press submit " +
    "before the deadline.",
);
doc.bullet("Repository link - where the code lives");
doc.bullet("Live demo - if you have one deployed");
doc.bullet("Demo video - a short walkthrough");
doc.bullet("Pitch deck - the slides you will present from");
doc.bullet("Documentation - anything the judges should read");
doc.bullet("Screenshots - up to four links");
doc.kv("/submit", "The form, with the deadline counting down.");

doc.callout(
  "The deadline is enforced by the database",
  "When the window closes, writes are refused - not merely hidden. Nothing is " +
    "gained by keeping the form open in a tab. Organisers can extend the window " +
    "if the wifi fails, and that takes effect immediately.",
);

doc.h2("Quiz and games");
doc.para(
  "The quiz opens during its slot on Saturday evening and is timed from the " +
    "moment you start. One attempt each. Scores and the time you took both feed " +
    "the leaderboard, so speed breaks ties.",
);
doc.kv("/quiz", "Whatever is currently published.");
doc.kv("/leaderboard", "Live ranking.");

doc.h2("Pitching on Sunday");
doc.para(
  "The running order is drawn by the organisers and published in the app. The " +
    "pitch page shows the order and the live stage clock, so you can see how far " +
    "the room has got without standing at the front.",
);
doc.kv("/pitch", "Running order and the live clock.");

// ---------------------------------------------------------------------------
// 3. Team leaders
// ---------------------------------------------------------------------------

doc.h1("3. Team leaders");
doc.para(
  "A team leader is a participant with one extra responsibility: the submission " +
    "is yours to get in. Everything in section 2 applies to you as well.",
);
doc.bullet("Check every teammate appears on /team. A missing member is a desk fix, not a form fix.");
doc.bullet("Put something in the submission form on Friday, even if it is only a repository link.");
doc.bullet("Confirm the status reads Submitted, not Draft, before the deadline.");
doc.bullet("Know your table number and pitch position before Sunday morning.");

// ---------------------------------------------------------------------------
// 4. Volunteers
// ---------------------------------------------------------------------------

doc.newPage();
doc.h1("4. Volunteers");

doc.para(
  "Volunteers run the desks. You have the scanner and the roster, and nothing " +
    "else - you cannot see health information, card tokens or anybody's password.",
);

doc.h2("The scanner");
doc.kv("/admin/scan", "Camera scanner. Set your posting once.");
doc.para(
  "Choose your station and direction once when you start; the choice is " +
    "remembered on that phone, through a reload or a relaunch. Then point the " +
    "camera at cards. Every scan is logged the moment it resolves - there is " +
    "nothing to confirm and nothing to tap twice.",
);

doc.h3("Stations");
doc.kv("Registration", "Arrival. The first scan of the event stamps check-in.");
doc.kv("Canteen", "Meals. Pick which sitting you are serving.");
doc.kv("Exit", "Leaving the building. Use direction Out.");
doc.kv("Swag desk", "Kit and merchandise handout.");

doc.h3("Meals");
doc.para(
  "At the canteen the scanner shows a Sitting row: breakfast, lunch, snacks, " +
    "dinner. It defaults to whichever the clock suggests, so at breakfast time " +
    "you are already on breakfast. If somebody has already had that sitting " +
    "today, the result card says so in amber.",
);

doc.callout(
  "Nothing is ever refused",
  "A second helping, a suspended card, an unexpected direction - all of them are " +
    "recorded and flagged, never blocked. The software's job is to tell you what " +
    "it knows; the decision is yours. You should never have to argue with a " +
    "screen while a queue waits.",
);

doc.h2("The roster");
doc.kv("/admin/roster", "Search anybody by name, email or team.");
doc.para(
  "Use this when a card will not scan or somebody is not sure they are " +
    "registered. It shows role, team, room, contact and whether they have " +
    "checked in. Card tokens and medical notes are deliberately not shown.",
);

doc.h2("A pre-set link for your posting");
doc.para(
  "An executive can send you a link that arrives already configured, so your " +
    "phone is set up without a briefing.",
);
doc.kv("?station=canteen&meal=lunch", "Opens on the canteen, serving lunch.");
doc.kv("?station=exit&direction=out", "Opens on the exit gate, scanning people out.");

// ---------------------------------------------------------------------------
// 5. Judges
// ---------------------------------------------------------------------------

doc.newPage();
doc.h1("5. Judges");

doc.para(
  "Scoring is on paper this year. The site gives you the entry list to work " +
    "from - every submitted project, in pitch order, with its links.",
);
doc.kv("/judge", "The entry list, once judging opens.");

doc.bullet("Arrive by 9:00 AM on Sunday for the briefing and seating in the Main Hall.");
doc.bullet("Evaluation sheets and scoring criteria are handed out at that briefing.");
doc.bullet("Reserved seating and refreshments are at the judges' table at the front.");
doc.bullet("Each entry lists repository, live demo, demo video, pitch deck, documentation and screenshots.");

doc.callout(
  "The list is empty until judging opens",
  "An executive opens judging at the Sunday briefing, once submissions have " +
    "closed. Before that the page says so rather than showing half-finished work. " +
    "If it is still closed when you are seated, ask an executive - it is one " +
    "switch on their panel.",
);

// ---------------------------------------------------------------------------
// 6. Mentors
// ---------------------------------------------------------------------------

doc.h1("6. Mentors");
doc.para(
  "Mentors have an account, a card and the full schedule. Two mentor sessions " +
    "are on the timeline - Friday evening and Saturday midday - and they run " +
    "online, from the teams' allocated rooms.",
);
doc.bullet("Use /schedule to see when your sessions fall.");
doc.bullet("Your card works at the canteen and the doors like anybody else's.");
doc.bullet("Mentors deliberately do not see submissions: coaching happens during the build, and unfinished work stays with its team.");

// ---------------------------------------------------------------------------
// 7. Executives
// ---------------------------------------------------------------------------

doc.newPage();
doc.h1("7. Executives");

doc.para(
  "Executives can reach everything. /admin is the index; every panel below hangs " +
    "off it.",
);

doc.h2("People");
doc.kv("/admin/members", "Everyone. Search, filter by category, paginate.");
doc.bullet("Create an account and mail a one-time password");
doc.bullet("Resend a password when somebody is locked out");
doc.bullet("Issue a new QR when a card leaks - the old one stops working immediately");
doc.bullet("Suspend or restore access without deleting anything");
doc.bullet("Change somebody's category");

doc.h2("Teams");
doc.kv("/admin/teams", "Every team, member counts, empty-team warnings.");
doc.kv("/admin/teams/<id>", "Edit a team; add and remove members.");
doc.para(
  "Renaming a team updates it everywhere at once - cards, the pitch order, the " +
    "submission record. Deleting a team leaves its members in place as unassigned; " +
    "a team with a submission cannot be deleted at all.",
);

doc.h2("Attendance");
doc.kv("/admin/attendance", "Every scan, filterable by day, station, sitting and name.");
doc.bullet("Per-station and per-sitting totals - servings, and how many people they fed");
doc.bullet("Manual check-in for a lost card, recording exactly the scan the camera would");
doc.bullet("CSV export of the whole log");

doc.h2("Submissions and judging");
doc.kv("/admin/submissions", "Who has submitted, who is still a draft, who is missing.");
doc.bullet("Move the deadline, or close the window immediately");
doc.bullet("Open judging - until you do, judges see nothing at all");
doc.bullet("CSV export of every team and its submission");

doc.h2("The event");
doc.kv("/admin/announcements", "Post a notice; target one category or everyone.");
doc.kv("/admin/quizzes", "Publish or hide a quiz. Publish it at its slot, not before.");
doc.kv("/admin/wheel", "Draw table numbers, and Sunday's pitch order.");
doc.kv("/admin/pitch", "Stage clock and running order.");
doc.kv("/admin/pitch/projector", "Full-screen clock for the hall projector.");

doc.h2("Exports");
doc.kv("/api/admin/members", "Roster CSV, with attendance and per-sitting columns.");
doc.kv("/api/admin/attendance", "The complete scan log as CSV.");
doc.kv("/api/admin/submissions", "Every team and its submission as CSV.");
doc.kv("/api/admin/badges", "Every card QR as PNGs in a zip, foldered by category.");

doc.callout(
  "The badge archive is live credentials",
  "Anyone who can scan a code in that zip can present that person's card. Keep " +
    "it inside the organising team, and reissue a QR from /admin/members if one " +
    "gets out.",
);

// ---------------------------------------------------------------------------
// 8. Runbook
// ---------------------------------------------------------------------------

doc.newPage();
doc.h1("8. Event-day runbook");

doc.h2("Before Friday");
doc.bullet("Every staff member signs in once and sets their password. A volunteer cannot open the scanner until they have, and 07:00 is the wrong time to discover it.");
doc.bullet("Allocate rooms to teams, so the schedule's 'Allocated Room' means something.");
doc.bullet("Run the draw for table numbers.");
doc.bullet("Post a welcome announcement with the wifi password.");
doc.bullet("Print badges, and check one scans with the app before printing the rest.");

doc.h2("Friday - Day 1");
doc.bullet("Desk opens 07:00. Station: Registration, direction In.");
doc.bullet("Watch /admin/attendance for arrivals against the expected roster.");
doc.bullet("Canteen switches to Lunch at 10:30 and Dinner at 18:00.");

doc.h2("Saturday - Day 2");
doc.bullet("Canteen runs four sittings: breakfast, lunch, snacks, dinner.");
doc.bullet("Publish the quiz when its slot opens at 19:00, and hide it afterwards.");
doc.bullet("Check /admin/submissions - chase every team still showing Missing.");

doc.h2("Sunday - Day 3");
doc.bullet("Close submissions at the deadline.");
doc.bullet("Draw the pitch order if it is not already set.");
doc.bullet("Open judging at the 9:00 briefing, once the panel is seated.");
doc.bullet("Run the stage clock from /admin/pitch, with the projector view in the hall.");
doc.bullet("Export all three CSVs before anyone goes home.");

doc.h2("When something goes wrong");
doc.kv("Card will not scan", "Look them up on /admin/roster; check in by hand from /admin/attendance.");
doc.kv("Locked out", "Resend a password from /admin/members.");
doc.kv("Card leaked", "Issue a new QR from /admin/members. The old one dies at once.");
doc.kv("Wifi died", "Extend the submission deadline from /admin/submissions.");
doc.kv("Judges see nothing", "Judging has not been opened. One switch on /admin/submissions.");
doc.kv("Quiz is empty", "It has not been published. /admin/quizzes.");
doc.kv("Database unreachable", "The schedule still renders from a copy inside the app.");

doc.rule();
doc.para(
  "The site is a progressive web app with an offline fallback, but the venue " +
    "wifi is the weak point every year. The desk should not depend on the " +
    "network being good, and none of the scanning flows do.",
  { colour: MUTED, size: 8.6 },
);

// ---------------------------------------------------------------------------
// Page numbers
// ---------------------------------------------------------------------------

doc.pages.forEach((page, index) => {
  if (index === 0) return;
  page
    .fill(RULE)
    .rule(MARGIN, 46, CONTENT_W, 0.6);
  page
    .fill(MUTED)
    .text("Codefest Chitwan 2026 - site handbook", "F1", 7.6, MARGIN, 33)
    .textRight(String(index + 1), "F1", 7.6, PAGE_W - MARGIN, 33);
});

writeFileSync(outPath, buildPdf(doc.pages), "latin1");
console.log(`Wrote ${outPath} - ${doc.pages.length} pages.`);
