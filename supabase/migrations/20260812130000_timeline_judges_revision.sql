-- Timeline revision from CodeFest2026_Hackathon_Timeline_Judges.docx (judges' copy).
--
-- Two corrections to the seed in 20260806092000_seed_schedule.sql:
--
-- 1. Cafeteria building letter.
--    The seed's own header comment says "Building B — Fooding and refreshment",
--    but every meal row was written "Cafeteria — Building C", which is where the
--    main hall is. The judges' timeline puts all eight meals in Building B and
--    seats the judges in "Main Hall, Building C", so the rows were wrong and the
--    header was right. Fixed here rather than in the seed, which has already run.
--
-- 2. Sunday is re-cut around the judging.
--    Presentations now open at 9:20 rather than 9:00, leaving 9:00–9:20 for the
--    judges to arrive, be briefed and be seated. Presentations close at 2:45 to
--    give deliberation a real 15-minute slot instead of the old 10-minute buffer,
--    and the closing ceremony moves to a flat 3:00–5:00.
--
-- Times are Asia/Kathmandu (UTC+05:45).

-- 1 ---------------------------------------------------------------------------

update public.schedule_events
set zone = 'Cafeteria — Building B'
where zone = 'Cafeteria — Building C';

-- 2 ---------------------------------------------------------------------------
-- Re-cut rather than patched row by row, so re-running lands on the same state.

delete from public.schedule_events where day = date '2026-08-16';

insert into public.schedule_events
  (day, day_label, time_label, title, zone, starts_at, ends_at, sort_order)
values
  (date '2026-08-16', 'Sunday, 16 August', 'Until 9:00 AM', 'Coffee, Final Coding & PPT Preparation', 'Allocated Room',
   null, timestamptz '2026-08-16 09:00+05:45', 10),
  (date '2026-08-16', 'Sunday, 16 August', '9:00–9:20 AM', 'Judges'' Arrival, Briefing & Seating', 'Main Hall',
   timestamptz '2026-08-16 09:00+05:45', timestamptz '2026-08-16 09:20+05:45', 20),
  (date '2026-08-16', 'Sunday, 16 August', '9:20–10:30 AM', 'Presentations Begin', 'Main Hall',
   timestamptz '2026-08-16 09:20+05:45', timestamptz '2026-08-16 10:30+05:45', 30),
  (date '2026-08-16', 'Sunday, 16 August', '10:30–11:30 AM', 'Lunch', 'Cafeteria — Building B',
   timestamptz '2026-08-16 10:30+05:45', timestamptz '2026-08-16 11:30+05:45', 40),
  (date '2026-08-16', 'Sunday, 16 August', '11:30 AM–2:45 PM', 'Presentations Continue', 'Main Hall',
   timestamptz '2026-08-16 11:30+05:45', timestamptz '2026-08-16 14:45+05:45', 50),
  (date '2026-08-16', 'Sunday, 16 August', '2:45–3:00 PM', 'Judges'' Deliberation & Buffer Time', 'Main Hall',
   timestamptz '2026-08-16 14:45+05:45', timestamptz '2026-08-16 15:00+05:45', 60),
  (date '2026-08-16', 'Sunday, 16 August', '3:00–5:00 PM', 'Closing Ceremony & Award Distribution', 'Main Hall',
   timestamptz '2026-08-16 15:00+05:45', timestamptz '2026-08-16 17:00+05:45', 70);

-- Descriptions for the slots that changed shape, so the reason is visible in
-- the app rather than only in the judges' document.

update public.schedule_events
set description = 'Judges arrive at the reserved table at the front of the Main Hall, Building C. Evaluation sheets and scoring criteria are handed out at this briefing.'
where day = date '2026-08-16' and title = 'Judges'' Arrival, Briefing & Seating';

update public.schedule_events
set description = 'Teams present to the judging panel in the Main Hall. Be seated before your slot — the running order is published in the app.'
where day = date '2026-08-16' and title = 'Presentations Begin';

update public.schedule_events
set description = 'Judges score and deliberate. Teams wait in the Main Hall; results are announced at the closing ceremony.'
where day = date '2026-08-16' and title = 'Judges'' Deliberation & Buffer Time';

-- The registration-desk description names Building A, which is unchanged, but
-- it is re-stated here because the delete above does not touch Friday and the
-- seed's update ran before this file existed.
update public.schedule_events
set description = 'Collect your identity card and room allocation at the Registration Desk in Building A. Wi-Fi is CodeFest2026; the password is shared at the desk.'
where title = 'Registration Starts';
