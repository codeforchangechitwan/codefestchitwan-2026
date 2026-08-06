import type { Metadata } from "next";
import Image from "next/image";
import { partnersByCategory, PARTNERS } from "@/lib/partners";

export const metadata: Metadata = {
  title: "Partners",
  description:
    "The colleges, companies and organisations supporting Codefest 2026 Chitwan.",
};

export default function PartnersPage() {
  const groups = partnersByCategory();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Partners</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {PARTNERS.length} organisations make Codefest 2026 Chitwan possible — from the
        venue and the colleges to the teams keeping everyone fed, connected and
        online for three days.
      </p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border">
        <Image
          src="/brand/chitwan-poster.jpg"
          alt="Codefest 2026 Chitwan hackathon poster listing all event partners"
          width={1280}
          height={1280}
          className="h-auto w-full"
        />
      </div>

      <div className="mt-8 grid gap-6">
        {groups.map(([category, partners]) => (
          <section key={category}>
            <h2 className="text-xs font-bold uppercase tracking-wide text-brand">
              {category}
            </h2>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {partners.map((partner) => (
                <li
                  key={partner.name}
                  className="rounded-xl border border-border bg-surface px-4 py-3"
                >
                  {partner.url ? (
                    <a
                      href={partner.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium hover:text-brand"
                    >
                      {partner.name}
                    </a>
                  ) : (
                    <span className="text-sm font-medium">{partner.name}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-8 rounded-xl border border-border bg-surface-muted px-4 py-3 text-xs leading-relaxed text-muted">
        Partner list transcribed from the event poster. If a name or tier is wrong,
        update <code className="font-mono">src/lib/partners.ts</code> — a few entries
        are flagged in that file for the team to confirm.
      </p>
    </div>
  );
}
