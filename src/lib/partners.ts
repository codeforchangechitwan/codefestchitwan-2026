/*
 * Partners for Codefest 2026 Chitwan.
 *
 * Two provenances, tracked per entry because they are not equally trustworthy:
 *
 * `announced: true` — taken from Code for Change's official partner
 * announcement slides. Tier wording is quoted from the slide caption; the
 * trading name and address follow the partner's own logo, which is the more
 * authoritative of the two wherever the slide disagreed with itself.
 *
 * `verify: true` — still transcribed from a small logo on the poster artwork.
 * NOTE FOR THE ORGANISING TEAM: confirm the spelling and add a website URL
 * before treating these as final. The announcement slides corrected three
 * earlier readings (see the comments below), so the remaining ones deserve
 * the same suspicion.
 */

export type Partner = {
  name: string;
  /** Tier wording exactly as the organisers announced it. */
  category: string;
  /** Address as printed on the announcement slide. */
  location?: string;
  url?: string;
  /** Confirmed against the official announcement slides. */
  announced?: boolean;
  /** Name read off a low-resolution logo — confirm before publishing. */
  verify?: boolean;
  /** Qualifier where a partner backs one phase rather than the whole event. */
  note?: string;
};

/*
 * Announced partners lead the array: the home page teases the first ten, and
 * the ones with a confirmed tier are the ones worth showing there.
 */
export const PARTNERS: Partner[] = [
  {
    name: "Global IME Bank",
    category: "National Banking Partner",
    announced: true,
  },
  {
    name: "Forbes College",
    category: "Venue Partner",
    location: "Bharatpur-2, Kshetrapur, Chitwan",
    announced: true,
  },
  {
    name: "MongoDB",
    category: "International Supporting Partner",
    note: "Supporting Chitwan's provincial phase",
    announced: true,
  },
  {
    name: "Vianet Communication",
    category: "Internet Partner",
    announced: true,
  },
  {
    name: "Dreams College",
    category: "Supporting Partner",
    location: "Hakim Chowk, Bharatpur, Chitwan",
    announced: true,
  },
  {
    name: "Sungava College",
    category: "Supporting Partner",
    // Logo reads "Khairahani-6, Chitwan"; the slide caption said "Tandi".
    location: "Khairahani-6, Chitwan",
    announced: true,
  },
  {
    // Announced as "Lords CBC Plaza", not the "Lords Hotels & Resorts" chain
    // name this entry used to carry.
    name: "Lords CBC Plaza",
    category: "Hospitality Partner",
    location: "Airport Gate, Bharatpur, Chitwan",
    announced: true,
  },
  {
    name: "QFX Cinemas",
    category: "Multiplex Partner",
    announced: true,
  },
  {
    name: "Loopix",
    category: "Content Creation Partner",
    location: "Hakim Chowk, Bharatpur, Chitwan",
    announced: true,
  },
  {
    // Previously guessed as "PA Sports" off the poster artwork.
    name: "DS Sports",
    category: "Sports Partner",
    location: "Saptagandaki Road, Bharatpur, Chitwan",
    announced: true,
  },
  {
    // Previously guessed as "Kathmandu Cake Shop". The tier is "Cake Partner"
    // rather than "Bakery Partner", and the trading name comes from the logo
    // ("Chitwan Cake House") where the slide caption said "Shop".
    name: "Chitwan Cake House",
    category: "Cake Partner",
    location: "Saptagandaki Road, Bharatpur, Chitwan",
    announced: true,
  },
  {
    // Logo spells the product as two words; the caption ran it together.
    name: "Big Bell Ice Cream",
    category: "Ice Cream Partner",
    location: "Ratnanagar, Chitwan",
    announced: true,
  },

  /* ---------------------------------------------------------------------
   * Poster-only. No announcement slide has been published for these yet.
   * ------------------------------------------------------------------ */
  { name: "Techspire College", category: "In Association With" },
  { name: "Prudential College", category: "In Association With", verify: true },
  { name: "Texas College", category: "In Association With" },
  { name: "St. Lawrence College", category: "College Partner" },
  { name: "PCPS College", category: "AI College Partner" },
  { name: "Samriddhi College", category: "Academic Partner", verify: true },
  { name: "Shikshalaya College", category: "Academic Partner" },
  { name: "Lincoln Arts College", category: "Supporting Partner", verify: true },
  { name: "openSUSE", category: "Open Source Partner" },
  { name: "inDrive", category: "Mobility Partner" },
  { name: "TechAxis", category: "IT Training & Placement Partner" },
  { name: "Roboaarambh", category: "Robotics Partner" },
  { name: "GuardSix", category: "Security Innovation Partner" },
  { name: "Aethvra", category: "Talent Management Partner" },
  { name: "A2 Growth", category: "Creative Partner", verify: true },
  { name: "Alok's Graphic Design Shop", category: "Design Partner" },
  { name: "Samveda", category: "Music Partner", verify: true },
  { name: "SparrowSMS", category: "SMS Partner" },
];

/**
 * Ordered so the announced headline tiers appear first on the partners page.
 * Anything not listed here sorts to the end rather than disappearing.
 */
const CATEGORY_ORDER = [
  "National Banking Partner",
  "Venue Partner",
  "International Supporting Partner",
  "In Association With",
  "College Partner",
  "AI College Partner",
  "Academic Partner",
  "Supporting Partner",
  "Internet Partner",
  "Open Source Partner",
  "Mobility Partner",
  "IT Training & Placement Partner",
  "Robotics Partner",
  "Security Innovation Partner",
  "Talent Management Partner",
  "Creative Partner",
  "Content Creation Partner",
  "Design Partner",
  "Music Partner",
  "Multiplex Partner",
  "Hospitality Partner",
  "Sports Partner",
  "Cake Partner",
  "Ice Cream Partner",
  "SMS Partner",
];

export function partnersByCategory() {
  const groups = new Map<string, Partner[]>();
  for (const partner of PARTNERS) {
    const list = groups.get(partner.category) ?? [];
    list.push(partner);
    groups.set(partner.category, list);
  }

  return [...groups.entries()].sort(([a], [b]) => {
    const ai = CATEGORY_ORDER.indexOf(a);
    const bi = CATEGORY_ORDER.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
}

/** Tiers Code for Change has published an announcement slide for. */
export const ANNOUNCED_PARTNERS = PARTNERS.filter((partner) => partner.announced);

/** How many entries still need the organising team to confirm the name. */
export const UNVERIFIED_COUNT = PARTNERS.filter((p) => p.verify).length;
