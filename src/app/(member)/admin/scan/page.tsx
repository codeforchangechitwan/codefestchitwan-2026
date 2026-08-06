import type { Metadata } from "next";
import { QrCode } from "lucide-react";
import { requireDeskStaff } from "@/lib/auth";
import { Scanner } from "./scanner";

export const metadata: Metadata = { title: "Scan identity cards" };

export default async function ScanPage() {
  await requireDeskStaff();

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
        <QrCode size={22} className="text-brand" aria-hidden />
        Scan &amp; check in
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Point the camera at a member&rsquo;s identity card QR. Their details appear
        instantly and you can check them in with one tap.
      </p>

      <div className="mt-6">
        <Scanner />
      </div>
    </div>
  );
}
