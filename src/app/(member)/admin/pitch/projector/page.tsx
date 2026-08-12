import type { Metadata } from "next";
import { requireDeskStaff } from "@/lib/auth";
import { ProjectorView } from "./projector-view";

export const metadata: Metadata = { title: "Projector" };

/**
 * Desk staff rather than executive-only: on the day this is opened on whatever
 * laptop is wired to the projector, and locking it to the one account driving
 * the timer is a needless single point of failure.
 */
export default async function ProjectorPage() {
  await requireDeskStaff();
  return <ProjectorView />;
}
