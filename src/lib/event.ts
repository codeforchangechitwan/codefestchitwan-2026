/** Fixed facts about Codefest 2026 Chitwan, used across the public pages. */

export const EVENT = {
  name: "Codefest 2026 — Chitwan",
  tagline: "Transforming ideas into reality",
  organiser: "Code for Change",
  organiserTagline: "Let code lead the change",
  venue: "Forbes College Chitwan",
  address: "Bharatpur-2, Kshetrapur, Chitwan",
  datesEnglish: "14–16 August 2026",
  datesNepali: "Shrawan 29, 30, 31",
  /** Doors open at the registration desk. */
  startsAt: "2026-08-14T07:00:00+05:45",
  endsAt: "2026-08-16T17:00:00+05:45",
  registrationDeadline: "10 August 2026",
  prizePool: "NPR 3,00,000",
  eligibility:
    "Bachelor's level and +2 students (both running and result-waiting) can participate.",
  scope: "Happening in all 7 provinces",
  email: "execution@codefestnepal.com",
  website: "https://codefestnepal.com",
  facebook: "https://facebook.com/CodefestOfficial",
  instagram: "https://instagram.com/codefest.official",
} as const;

export const BUILDINGS = [
  {
    id: "A",
    name: "Building A",
    purpose: "Registration desk",
    detail:
      "Collect your identity card and room allocation here. Rooms are assigned to participants at the desk.",
  },
  {
    id: "B",
    name: "Building B",
    purpose: "Fooding and refreshment",
    detail: "Meals and refreshments through all three days.",
  },
  {
    id: "C",
    name: "Building C",
    purpose: "Main hall and coding rooms",
    detail:
      "Opening ceremony, orientation, presentations and the closing ceremony take place in the Main Hall. The cafeteria used across the schedule is here.",
  },
] as const;
