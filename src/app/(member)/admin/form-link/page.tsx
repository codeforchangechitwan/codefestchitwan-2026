import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requireExecutive } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormLinkSettings } from "@/lib/form-link";
import { FormLinkForm } from "./form-link-form";

export const metadata: Metadata = { title: "Form button" };

/**
 * The one screen that owns the public "go and fill the Google Form" button.
 *
 * Reading event_settings directly rather than through public_form_link(): the
 * RPC hides a switched-off row on purpose, and this page has to edit exactly
 * that row.
 */
export default async function FormLinkPage() {
  await requireExecutive();

  const supabase = await createClient();
  const { data } = await supabase
    .from("event_settings")
    .select("form_url, form_label, form_note, form_enabled")
    .eq("id", true)
    .single();

  const settings: FormLinkSettings = {
    url: data?.form_url ?? "",
    label: data?.form_label ?? "Register on the Google Form",
    note: data?.form_note ?? "",
    enabled: data?.form_enabled ?? false,
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <Link href="/admin" className="text-xs font-semibold text-brand hover:underline">
        ← Admin
      </Link>

      <h1 className="mt-3 flex items-center gap-2 text-2xl font-bold tracking-tight">
        <ExternalLink size={22} className="text-brand" aria-hidden />
        Form button
      </h1>
      <p className="mt-2 text-sm text-muted">
        One button, pointed wherever you like — the registration form before the
        event, the feedback form after it. It shows on the public homepage and on
        every member&rsquo;s dashboard, and changes here take effect immediately,
        with no deploy.
      </p>

      <FormLinkForm settings={settings} />
    </div>
  );
}
