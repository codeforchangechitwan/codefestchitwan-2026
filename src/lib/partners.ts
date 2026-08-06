/*
 * Partners, transcribed from the Codefest 2026 Chitwan poster.
 *
 * NOTE FOR THE ORGANISING TEAM: a few names were read from small logos on the
 * poster artwork and are marked `verify: true`. Please confirm the spelling
 * (and add website URLs) before the site goes public.
 */

export type Partner = {
  name: string;
  category: string;
  url?: string;
  /** Name read off a low-resolution logo — confirm before publishing. */
  verify?: boolean;
};

export const PARTNERS: Partner[] = [
  { name: "Forbes College", category: "Venue Partner" },
  { name: "Techspire College", category: "In Association With" },
  { name: "Prudential College", category: "In Association With", verify: true },
  { name: "Texas College", category: "In Association With" },
  { name: "St. Lawrence College", category: "College Partner" },
  { name: "PCPS College", category: "AI College Partner" },
  { name: "A2 Growth", category: "Creative Partner", verify: true },
  { name: "Global IME Bank", category: "Banking Partner" },
  { name: "Samriddhi College", category: "Academic Partner", verify: true },
  { name: "Shikshalaya College", category: "Academic Partner" },
  { name: "inDrive", category: "Mobility Partner" },
  { name: "Lincoln Arts College", category: "Supporting Partner", verify: true },
  { name: "Samveda", category: "Music Partner", verify: true },
  { name: "MongoDB", category: "Technology Partner" },
  { name: "openSUSE", category: "Open Source Partner" },
  { name: "Vianet", category: "Internet Partner" },
  { name: "Dreams College", category: "Supporting Partner" },
  { name: "Sungava College", category: "Supporting Partner" },
  { name: "TechAxis", category: "IT Training & Placement Partner" },
  { name: "Roboaarambh", category: "Robotics Partner" },
  { name: "GuardSix", category: "Security Innovation Partner" },
  { name: "Aethvra", category: "Talent Management Partner" },
  { name: "Big Bell Ice Cream", category: "Ice Cream Partner" },
  { name: "Kathmandu Cake Shop", category: "Bakery Partner", verify: true },
  { name: "PA Sports", category: "Sports Partner", verify: true },
  { name: "QFX Cinemas", category: "Multiplex Partner" },
  { name: "Lords Hotels & Resorts", category: "Hospitality Partner" },
  { name: "Loopix", category: "Content Creation Partner" },
  { name: "SparrowSMS", category: "SMS Partner" },
  { name: "Alok's Graphic Design Shop", category: "Design Partner" },
];

/** Ordered so the headline tiers appear first on the partners page. */
const CATEGORY_ORDER = [
  "Venue Partner",
  "In Association With",
  "College Partner",
  "AI College Partner",
  "Academic Partner",
  "Banking Partner",
  "Technology Partner",
  "Open Source Partner",
  "Internet Partner",
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
  "Ice Cream Partner",
  "Bakery Partner",
  "Sports Partner",
  "SMS Partner",
  "Supporting Partner",
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
