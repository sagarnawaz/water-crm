import { ComingSoon, Screen } from "@/components/screen";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../actions";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: business } = await supabase.from("businesses").select("name").maybeSingle();

  return (
    <Screen title="Settings" sub={business?.name}>
      <ComingSoon phase={2} what="Price per bottle for each floor." />
      <form action={signOut}>
        <button className="min-h-12 w-full rounded-xl border border-due bg-surface font-semibold text-due">Sign out</button>
      </form>
    </Screen>
  );
}
