import type { Metadata } from "next";
import { QrCode } from "lucide-react";
import { requireDeskStaff } from "@/lib/auth";
import { isMeal, isStation, isScanDirection, mealAtHour } from "@/lib/types";
import { Scanner } from "./scanner";

export const metadata: Metadata = { title: "Scan identity cards" };

export default async function ScanPage(props: PageProps<"/admin/scan">) {
  await requireDeskStaff();
  const params = await props.searchParams;

  // An executive can message each volunteer a pre-configured link, e.g.
  // /admin/scan?station=canteen&direction=out — their phone is then set up
  // without a briefing. Falls back to the operator's saved posting, which the
  // client restores from localStorage.
  const station = isStation(params.station) ? params.station : "registration";
  const direction = isScanDirection(params.direction) ? params.direction : "in";

  /*
   * The sitting defaults to whatever the Kathmandu clock says, so a canteen
   * volunteer who opens the scanner at breakfast is already on breakfast.
   * ?meal=lunch overrides it for a pre-configured link.
   */
  const kathmanduHour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hour12: false,
      timeZone: "Asia/Kathmandu",
    }).format(new Date()),
  );
  const meal = isMeal(params.meal) ? params.meal : mealAtHour(kathmanduHour);

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
        <QrCode size={22} className="text-brand" aria-hidden />
        Scan &amp; record
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Set your station and direction once, then point the camera at a member&rsquo;s
        identity card. Every scan is logged the moment it resolves — nothing to
        confirm, nothing to tap twice.
      </p>

      <div className="mt-6">
        <Scanner
          initialStation={station}
          initialDirection={direction}
          initialMeal={meal}
        />
      </div>
    </div>
  );
}
