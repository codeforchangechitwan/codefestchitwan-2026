import type { Metadata } from "next";
import Image from "next/image";
import { BadgeCheck, ExternalLink, MapPin, Sparkles } from "lucide-react";
import { partnersByCategory, PARTNERS } from "@/lib/partners";
import { EVENT } from "@/lib/event";

export const metadata: Metadata = {
  title: "Partners",
  description:
    "The colleges, companies and organisations supporting Codefest 2026 Chitwan.",
};

const TIER_BADGE_STYLES: Record<string, string> = {
  "National Banking Partner": "border-gold-glow/40 bg-gold-glow/10 text-gold-glow",
  "Venue Partner": "border-gold-glow/40 bg-gold-glow/10 text-gold-glow",
  "International Supporting Partner":
    "border-emerald-glow/40 bg-emerald-glow/10 text-emerald-glow",
  "In Association With": "border-accent/40 bg-accent-soft text-accent",
  "College Partner": "border-navy/40 bg-navy-soft/40 text-navy",
  "Open Source Partner": "border-emerald-glow/40 bg-emerald-glow/10 text-emerald-glow",
  "Internet Partner": "border-brand/40 bg-brand-soft text-brand",
};

export default function PartnersPage() {
  const groups = partnersByCategory();

  return (
    <div className="relative min-h-screen py-10 px-4 max-w-4xl mx-auto">
      {/* Glow */}
      <div className="ambient-glow top-0 left-1/2 -translate-x-1/2 w-[550px] h-[300px] opacity-20" />

      <h1 className="text-3xl font-extrabold tracking-tight">Partners & Sponsors</h1>
      <p className="mt-1 text-xs sm:text-sm text-muted max-w-2xl">
        {PARTNERS.length} organisations make Codefest 2026 Chitwan possible — powering
        venue infrastructure, tech tools, fooding, and prize pools.{" "}
        {EVENT.datesNepali} ({EVENT.datesEnglish}).
      </p>

      <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted">
        <BadgeCheck size={13} className="mt-0.5 shrink-0 text-emerald-glow" aria-hidden />
        <span>
          Marked names and tiers are quoted from Code for Change&rsquo;s official
          partner announcements. The rest were transcribed from the poster and are
          still being confirmed.
        </span>
      </p>

      {/* Categorized Partner Tiers */}
      <div className="mt-8 space-y-8">
        {groups.map(([category, partners]) => {
          const badgeStyle =
            TIER_BADGE_STYLES[category] || "border-glass bg-surface/50 text-muted";

          return (
            <section key={category}>
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${badgeStyle}`}
                >
                  <Sparkles size={12} />
                  {category}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {partners.map((partner) => (
                  <div
                    key={partner.name}
                    className="glass-card p-4 border-glass hover-rise transition-all duration-300"
                  >
                    <div className="flex items-start gap-1.5">
                      {partner.url ? (
                        <a
                          href={partner.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-bold text-foreground hover:text-brand inline-flex items-center gap-1.5"
                        >
                          {partner.name}
                          <ExternalLink size={12} className="text-muted" />
                        </a>
                      ) : (
                        <span className="text-sm font-bold text-foreground">
                          {partner.name}
                        </span>
                      )}

                      {partner.announced && (
                        <BadgeCheck
                          size={13}
                          className="mt-0.5 shrink-0 text-emerald-glow"
                          aria-label="Confirmed in the official announcement"
                        />
                      )}
                    </div>

                    {partner.location && (
                      <p className="mt-1.5 flex items-start gap-1 text-[11px] leading-snug text-muted">
                        <MapPin size={11} className="mt-0.5 shrink-0" aria-hidden />
                        {partner.location}
                      </p>
                    )}

                    {partner.note && (
                      <p className="mt-1 text-[11px] italic leading-snug text-muted">
                        {partner.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Official Poster Section */}
      <div className="mt-12 glass-card p-4 border-glass">
        <h2 className="text-sm font-bold text-foreground mb-3">Official Event Poster Roster</h2>
        <div className="overflow-hidden rounded-xl">
          <Image
            src="/brand/chitwan-poster.jpg"
            alt="Codefest 2026 Chitwan Poster"
            width={1280}
            height={1280}
            className="w-full h-auto object-cover"
          />
        </div>
      </div>
    </div>
  );
}

