import type { Metadata } from "next";
import { Building2, MapPin, Navigation } from "lucide-react";
import { BUILDINGS, EVENT } from "@/lib/event";

export const metadata: Metadata = {
  title: "Venue",
  description:
    "Forbes College Chitwan, Bharatpur-2, Kshetrapur — venue map and buildings for Codefest 2026.",
};

const MAPS_QUERY = encodeURIComponent(
  "Forbes College Chitwan, Bharatpur-2, Kshetrapur, Nepal",
);

export default function VenuePage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Venue</h1>

      <div className="mt-4 rounded-2xl border border-border bg-surface p-5">
        <p className="flex items-start gap-2">
          <MapPin size={18} className="mt-0.5 shrink-0 text-brand" aria-hidden />
          <span>
            <span className="block font-semibold">{EVENT.venue}</span>
            <span className="block text-sm text-muted">{EVENT.address}</span>
          </span>
        </p>

        <a
          href={`https://www.google.com/maps/search/?api=1&query=${MAPS_QUERY}`}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong"
        >
          <Navigation size={15} aria-hidden />
          Open in Maps
        </a>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-bold">Buildings</h2>
        <p className="mt-1 text-sm text-muted">
          The schedule refers to these by name — check which building your session is
          in before you set off.
        </p>

        <ul className="mt-4 grid gap-3">
          {BUILDINGS.map((building) => (
            <li
              key={building.id}
              className="rounded-2xl border border-border bg-surface p-4"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand text-lg font-bold text-white">
                  {building.id}
                </span>
                <div>
                  <p className="font-semibold">{building.name}</p>
                  <p className="text-sm text-brand">{building.purpose}</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {building.detail}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 rounded-2xl border border-border bg-surface-muted p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Building2 size={18} className="text-brand" aria-hidden />
          Arriving on Friday
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          The registration desk in Building A opens at 7:00 AM on Friday, 14 August.
          Bring your identity card QR — open it in the app before you arrive, since it
          keeps working even if the venue wifi is busy. You&rsquo;ll be given your room
          allocation at the desk, and the opening ceremony starts at 8:20 AM in the
          Main Hall.
        </p>
      </section>
    </div>
  );
}
