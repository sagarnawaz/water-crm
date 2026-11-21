import { btn, Screen } from "@/components/screen";
import { createClient } from "@/lib/supabase/server";
import { getPricing } from "@/lib/pricing";
import { signOut } from "../actions";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const pricing = await getPricing(await createClient());

  return (
    <Screen title="Settings" sub={pricing.name}>
      <SettingsForm pricing={pricing} />
      <section className="flex flex-col gap-2.5 rounded-2xl border border-line bg-surface p-4">
        <h2 className="font-display text-[17px] font-bold">Backup</h2>
        <p className="text-sm text-muted">
          Download your records as spreadsheet files that open in Excel or Google Sheets. Do this once a month and keep the files safe.
        </p>
        <a href="/export?type=customers" download className={btn}>Download customers (CSV)</a>
        <a href="/export?type=register" download className={btn}>Download all bottles and payments (CSV)</a>
      </section>
      <form action={signOut}>
        <button className="min-h-12 w-full rounded-xl border border-due bg-surface font-semibold text-due">Sign out</button>
      </form>
    </Screen>
  );
}
