import { ComingSoon, Screen } from "@/components/screen";
import { createClient } from "@/lib/supabase/server";
import { getPricing } from "@/lib/pricing";
import { signOut } from "../actions";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const pricing = await getPricing(await createClient());

  return (
    <Screen title="Settings" sub={pricing.name}>
      <SettingsForm pricing={pricing} />
      <ComingSoon phase={5} what="Backup: download all customers, bottles and payments as a CSV file." />
      <form action={signOut}>
        <button className="min-h-12 w-full rounded-xl border border-due bg-surface font-semibold text-due">Sign out</button>
      </form>
    </Screen>
  );
}
