-- Seed: Codefest Hackathon Event Timeline, 14–16 August 2026.
-- Transcribed from Hackathon_Event_Timeline_14-16_August.docx.
--
-- Venue notes:
--   Building A — Registration desk (rooms are allocated to participants here)
--   Building B — Fooding and refreshment
--   Building C — Main hall and coding rooms
--
-- Times are Asia/Kathmandu (UTC+05:45).

delete from public.schedule_events
where day in (date '2026-08-14', date '2026-08-15', date '2026-08-16');

insert into public.schedule_events
  (day, day_label, time_label, title, zone, starts_at, ends_at, sort_order)
values
  -- Friday, 14 August ------------------------------------------------------
  (date '2026-08-14', 'Friday, 14 August', '7:00 AM', 'Registration Starts', 'Registration desk',
   timestamptz '2026-08-14 07:00+05:45', null, 10),
  (date '2026-08-14', 'Friday, 14 August', '8:00–8:20 AM', 'Settling In', 'Allocated Room',
   timestamptz '2026-08-14 08:00+05:45', timestamptz '2026-08-14 08:20+05:45', 20),
  (date '2026-08-14', 'Friday, 14 August', '8:20–9:20 AM', 'Opening Ceremony', 'Main Hall',
   timestamptz '2026-08-14 08:20+05:45', timestamptz '2026-08-14 09:20+05:45', 30),
  (date '2026-08-14', 'Friday, 14 August', '9:20–10:00 AM', 'Orientation', 'Main Hall',
   timestamptz '2026-08-14 09:20+05:45', timestamptz '2026-08-14 10:00+05:45', 40),
  (date '2026-08-14', 'Friday, 14 August', '10:30–11:00 AM', 'Lunch', 'Cafeteria — Building C',
   timestamptz '2026-08-14 10:30+05:45', timestamptz '2026-08-14 11:00+05:45', 50),
  (date '2026-08-14', 'Friday, 14 August', '11:00 AM–6:00 PM', 'Coding Session', 'Allocated Room',
   timestamptz '2026-08-14 11:00+05:45', timestamptz '2026-08-14 18:00+05:45', 60),
  (date '2026-08-14', 'Friday, 14 August', '6:00–7:30 PM', 'Dinner / Refreshment', 'Cafeteria — Building C',
   timestamptz '2026-08-14 18:00+05:45', timestamptz '2026-08-14 19:30+05:45', 70),
  (date '2026-08-14', 'Friday, 14 August', '7:30–8:30 PM', 'Mentor Online Session', 'Allocated Room',
   timestamptz '2026-08-14 19:30+05:45', timestamptz '2026-08-14 20:30+05:45', 80),
  (date '2026-08-14', 'Friday, 14 August', '8:30 PM–7:00 AM', 'Night Coding', 'Allocated Room',
   timestamptz '2026-08-14 20:30+05:45', timestamptz '2026-08-15 07:00+05:45', 90),

  -- Saturday, 15 August ----------------------------------------------------
  (date '2026-08-15', 'Saturday, 15 August', '7:00–8:00 AM', 'Breakfast', 'Cafeteria — Building C',
   timestamptz '2026-08-15 07:00+05:45', timestamptz '2026-08-15 08:00+05:45', 10),
  (date '2026-08-15', 'Saturday, 15 August', '8:00–11:00 AM', 'Coding Session', 'Allocated Room',
   timestamptz '2026-08-15 08:00+05:45', timestamptz '2026-08-15 11:00+05:45', 20),
  (date '2026-08-15', 'Saturday, 15 August', '11:00 AM–12:00 PM', 'Lunch', 'Cafeteria — Building C',
   timestamptz '2026-08-15 11:00+05:45', timestamptz '2026-08-15 12:00+05:45', 30),
  (date '2026-08-15', 'Saturday, 15 August', '12:00–1:00 PM', 'Mentor Online Session', 'Allocated Room',
   timestamptz '2026-08-15 12:00+05:45', timestamptz '2026-08-15 13:00+05:45', 40),
  (date '2026-08-15', 'Saturday, 15 August', '1:00–3:00 PM', 'Coding Session', 'Allocated Room',
   timestamptz '2026-08-15 13:00+05:45', timestamptz '2026-08-15 15:00+05:45', 50),
  (date '2026-08-15', 'Saturday, 15 August', '3:00–4:00 PM', 'Snacks & Refreshments', 'Cafeteria — Building C',
   timestamptz '2026-08-15 15:00+05:45', timestamptz '2026-08-15 16:00+05:45', 60),
  (date '2026-08-15', 'Saturday, 15 August', '4:00–6:00 PM', 'Coding Session', 'Allocated Room',
   timestamptz '2026-08-15 16:00+05:45', timestamptz '2026-08-15 18:00+05:45', 70),
  (date '2026-08-15', 'Saturday, 15 August', '6:00–7:00 PM', 'Dinner', 'Cafeteria — Building C',
   timestamptz '2026-08-15 18:00+05:45', timestamptz '2026-08-15 19:00+05:45', 80),
  (date '2026-08-15', 'Saturday, 15 August', '7:00–7:40 PM', 'Quiz & Refreshments', 'Allocated Room',
   timestamptz '2026-08-15 19:00+05:45', timestamptz '2026-08-15 19:40+05:45', 90),
  (date '2026-08-15', 'Saturday, 15 August', '7:40 PM onwards', 'Coding Night', 'Allocated Room',
   timestamptz '2026-08-15 19:40+05:45', null, 100),

  -- Sunday, 16 August ------------------------------------------------------
  (date '2026-08-16', 'Sunday, 16 August', 'Until 9:00 AM', 'Coffee-Coding & PPT Preparation', 'Allocated Room',
   null, timestamptz '2026-08-16 09:00+05:45', 10),
  (date '2026-08-16', 'Sunday, 16 August', '9:00–10:30 AM', 'Presentations', 'Main Hall',
   timestamptz '2026-08-16 09:00+05:45', timestamptz '2026-08-16 10:30+05:45', 20),
  (date '2026-08-16', 'Sunday, 16 August', '10:30–11:30 AM', 'Lunch', 'Cafeteria — Building C',
   timestamptz '2026-08-16 10:30+05:45', timestamptz '2026-08-16 11:30+05:45', 30),
  (date '2026-08-16', 'Sunday, 16 August', '11:30 AM–3:00 PM', 'Presentations Continue', 'Main Hall',
   timestamptz '2026-08-16 11:30+05:45', timestamptz '2026-08-16 15:00+05:45', 40),
  (date '2026-08-16', 'Sunday, 16 August', '3:00–3:10 PM', 'Buffer Time', null,
   timestamptz '2026-08-16 15:00+05:45', timestamptz '2026-08-16 15:10+05:45', 50),
  (date '2026-08-16', 'Sunday, 16 August', '3:10–5:00 PM', 'Closing Ceremony', 'Main Hall',
   timestamptz '2026-08-16 15:10+05:45', timestamptz '2026-08-16 17:00+05:45', 60);

-- Add a description to the slots people ask about most.
update public.schedule_events
set description = 'Collect your identity card and room allocation at the Registration Desk in Building A. Have your QR ready in the app.'
where title = 'Registration Starts';

update public.schedule_events
set description = 'Head to the Quiz section in the app when this slot opens. Scores feed the live leaderboard.'
where title = 'Quiz & Refreshments';
