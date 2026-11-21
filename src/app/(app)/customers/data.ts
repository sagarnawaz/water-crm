import type { SupabaseClient } from "@supabase/supabase-js";
import { addressKey, customerLabel, type Customer } from "@/lib/customers";
import { getPricing } from "@/lib/pricing";

export async function listCustomers(supabase: SupabaseClient): Promise<Customer[]> {
  const { data, error } = await supabase.from("customer_list").select("*").order("area").order("house_no").order("floor");
  if (error) throw error;
  return data;
}

/** Everything the add/edit form needs: prices, known areas, and active addresses for the duplicate check. */
export async function customerFormProps(supabase: SupabaseClient) {
  const [pricing, customers] = await Promise.all([getPricing(supabase), listCustomers(supabase)]);
  return {
    pricing,
    areas: [...new Set(customers.map((c) => c.area))].sort(),
    existing: customers
      .filter((c) => c.active)
      .map((c) => ({ id: c.id, key: addressKey(c.house_no, c.floor, c.area), label: `${customerLabel(c)}, ${c.area}` })),
  };
}
