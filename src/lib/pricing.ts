import type { SupabaseClient } from "@supabase/supabase-js";

export type Pricing = { name: string; defaultRate: number; floors: Record<string, number> };

/** Business name, "other floors" price and the per-floor price list of the logged-in owner's business. */
export async function getPricing(supabase: SupabaseClient): Promise<Pricing> {
  const [{ data: b, error: be }, { data: fp, error: fe }] = await Promise.all([
    supabase.from("businesses").select("name, default_rate").single(),
    supabase.from("floor_prices").select("floor, price"),
  ]);
  if (be || fe) throw be ?? fe;
  return {
    name: b.name,
    defaultRate: b.default_rate,
    floors: Object.fromEntries((fp ?? []).map((r) => [r.floor, r.price])),
  };
}

export const floorPrice = (p: Pricing, floor: string) => p.floors[floor] ?? p.defaultRate;
