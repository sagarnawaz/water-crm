"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { FLOORS, parseFloorPrices } from "@/lib/customers";

export type SettingsState = { error?: string; saved?: boolean } | undefined;

export async function saveSettings(_prev: SettingsState, form: FormData): Promise<SettingsState> {
  const name = String(form.get("name") ?? "").trim();
  if (!name) return { error: "Business name is required." };
  const parsed = parseFloorPrices(form);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const { data: biz, error: be } = await supabase
    .from("businesses")
    .update({ name, default_rate: parsed.other })
    .not("id", "is", null) // RLS limits this to the owner's own business
    .select("id")
    .single();
  if (be) return { error: "Could not save. Check your internet and try again." };

  const { data: current } = await supabase.from("floor_prices").select("floor, price");
  const old = Object.fromEntries((current ?? []).map((r) => [r.floor, r.price]));
  const changed = FLOORS.filter((f) => old[f] !== parsed.prices[f]);
  if (changed.length) {
    const { error: fe } = await supabase
      .from("floor_prices")
      .upsert(changed.map((floor) => ({ business_id: biz.id, floor, price: parsed.prices[floor] })));
    if (fe) return { error: "Could not save the floor prices. Try again." };
  }

  revalidatePath("/", "layout");
  return { saved: true };
}
