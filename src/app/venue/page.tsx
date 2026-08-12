import type { Metadata } from "next";
import { Armchair, Bus, Car, MapPin, Navigation, Plane, Wifi } from "lucide-react";
import { BUILDINGS, EVENT } from "@/lib/event";

export const metadata: Metadata = {
  title: "Venue",
  description:
    "Forbes College Chitwan, Bharatpur-2, Kshetrapur — venue map and buildings for Codefest 2026.",
};

const MAPS_QUERY = encodeURIComponent(
  "Forbes College Chitwan, Bharatpur-2, Kshetrapur, Nepal"
);

export default function VenuePage() {
  return (
    <div className="relative min-h-screen py-10 px-4 max-w-4xl mx-auto">
      {/* Background Glow */}
      <div className="ambient-glow top-0 left-10 w-[400px] h-[300px] opacity-20" />

      <h1 className="text-3xl font-extrabold tracking-tight">Venue & Map</h1>
      <p className="mt-1 text-xs sm:text-sm text-muted">
        Forbes College, Bharatpur-2, Kshetrapur, Chitwan
      </p>

      {/* Main Location Card */}
      <div className="glass-card mt-6 p-6 border-glass flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-brand-soft border border-brand/30 flex items-center justify-center text-brand shrink-0">
            <MapPin size={20} />
          </div>
          <div>
            <h2 className="font-bold text-base text-foreground">{EVENT.venue}</h2>
            <p className="text-xs text-muted mt-0.5">{EVENT.address}</p>
          </div>
        </div>

        <a
          href={`https://www.google.com/maps/search/?api=1&query=${MAPS_QUERY}`}
          target="_blank"
          rel="noreferrer"
          className="btn-primary-glass inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold shrink-0"
        >
          <Navigation size={14} />
          Open In Google Maps
        </a>
      </div>

      {/* Interactive Map Diagram Placeholder */}
      <section className="mt-8">
        <h2 className="text-lg font-bold mb-3">Campus Layout Diagram</h2>
        <div className="glass-card p-6 border-glass bg-surface/50 text-center">
          <div className="relative w-full h-64 rounded-xl bg-surface-muted/60 border border-glass flex items-center justify-center overflow-hidden">
            {/*
              Schematic, not to scale. Colours come from the theme tokens rather
              than literals so the diagram follows the light/dark toggle; the
              blocks are labelled, not clickable, so they carry no cursor
              affordance and the whole figure is exposed as one image.
            */}
            <svg
              className="w-full h-full p-4"
              viewBox="0 0 600 300"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-label="Schematic campus layout: Building A holds the registration desk, Building B fooding and refreshment, Building C the main hall and coding rooms, around a central courtyard."
            >
              <rect x="20" y="20" width="560" height="260" rx="12" fill="var(--background)" stroke="var(--border)" strokeWidth="2" />
              {/* Building A — registration desk */}
              <g>
                <rect x="50" y="50" width="140" height="90" rx="8" fill="var(--surface)" stroke="var(--brand)" strokeWidth="2" />
                <text x="120" y="90" fill="var(--foreground)" fontSize="14" fontWeight="bold" textAnchor="middle">Building A</text>
                <text x="120" y="110" fill="var(--muted)" fontSize="10" textAnchor="middle">Registration Desk</text>
              </g>
              {/* Building B — fooding and refreshment */}
              <g>
                <rect x="230" y="50" width="140" height="90" rx="8" fill="var(--surface)" stroke="var(--emerald-glow)" strokeWidth="2" />
                <text x="300" y="90" fill="var(--foreground)" fontSize="14" fontWeight="bold" textAnchor="middle">Building B</text>
                <text x="300" y="110" fill="var(--muted)" fontSize="10" textAnchor="middle">Fooding &amp; Refreshment</text>
              </g>
              {/* Building C — main hall and coding rooms */}
              <g>
                <rect x="410" y="50" width="140" height="200" rx="8" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2" />
                <text x="480" y="140" fill="var(--foreground)" fontSize="14" fontWeight="bold" textAnchor="middle">Building C</text>
                <text x="480" y="160" fill="var(--muted)" fontSize="10" textAnchor="middle">Main Hall &amp; Coding</text>
              </g>
              {/* Courtyard */}
              <rect x="50" y="160" width="320" height="90" rx="8" fill="var(--surface-muted)" stroke="var(--border)" strokeDasharray="4 4" />
              <text x="210" y="210" fill="var(--muted)" fontSize="11" textAnchor="middle">Central Courtyard / Assembly Zone</text>
            </svg>
          </div>
          <p className="text-xs text-muted mt-3">
            Schematic zone map — not to scale. Building details are listed below.
          </p>
        </div>
      </section>

      {/* Buildings Detail List */}
      <section className="mt-8">
        <h2 className="text-lg font-bold mb-4">Building Breakdown</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {BUILDINGS.map((b) => (
            <div key={b.id} className="glass-card p-5 border-glass flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="h-9 w-9 rounded-lg bg-brand text-white font-black flex items-center justify-center text-sm shadow-md">
                    {b.id}
                  </span>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">{b.name}</h3>
                    <p className="text-xs text-brand font-medium">{b.purpose}</p>
                  </div>
                </div>
                <p className="text-xs text-muted leading-relaxed">{b.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* On-site essentials */}
      <section className="mt-8">
        <h2 className="text-lg font-bold mb-4">On The Day</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="glass-card p-4 border-glass">
            <Wifi size={20} className="text-brand mb-2" />
            <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">Wi-Fi</h3>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Connect to{" "}
              <span className="font-mono font-semibold text-foreground">{EVENT.wifiSsid}</span>. The
              password is handed out at the Registration Desk in Building A — it is not published
              here.
            </p>
          </div>
          <div className="glass-card p-4 border-glass">
            <Armchair size={20} className="text-brand mb-2" />
            <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">
              Judges&rsquo; Seating
            </h3>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Reserved table at the front of the Main Hall, Building C, with signage in place.
              Judges are asked to arrive by 9:00 AM on Sunday for the briefing.
            </p>
          </div>
        </div>
      </section>

      {/* Travel Directions Grid */}
      <section className="mt-8">
        <h2 className="text-lg font-bold mb-4">Travel & Directions</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="glass-card p-4 border-glass">
            <Bus size={20} className="text-brand mb-2" />
            <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">Local Bus / Micro</h3>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Get off at Kshetrapur Chowk or Narayangarh Bus Park. Forbes College is a 3-minute auto ride.
            </p>
          </div>
          <div className="glass-card p-4 border-glass">
            <Car size={20} className="text-brand mb-2" />
            <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">Auto / Driving</h3>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Parking is available inside the campus grounds for participant vehicles.
            </p>
          </div>
          <div className="glass-card p-4 border-glass">
            <Plane size={20} className="text-brand mb-2" />
            <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">Flight Arrival</h3>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Bharatpur Airport (BHR) is ~15 minutes away by taxi to Forbes College campus.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

