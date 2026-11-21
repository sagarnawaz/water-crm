"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addressKey, parseCustomer } from "@/lib/customers";

export type CustomerFormState = { error?: string; existingId?: string } | undefined;

export async function saveCustomer(_prev: CustomerFormState, form: FormData): Promise<CustomerFormState> {
  const id = String(form.get("id") ?? "") || null;
  const parsed = parseCustomer(form, !id);
  if ("error" in parsed) return { error: parsed.error };
  const data = parsed.data;

  const supabase = await createClient();
  const res = id
    ? await supabase.from("customers").update(data).eq("id", id).select("id").single()
    : await supabase.from("customers").insert(data).select("id").single();

  if (res.error) {
    // 23505 = the unique address index: another active customer has this house + floor + area.
    if (res.error.code === "23505") {
      const { data: same } = await supabase
        .from("customers")
        .select("id, house_no, floor, area")
        .eq("active", true)
        .ilike("area", escapeLike(data.area));
      const key = addressKey(data.house_no, data.floor, data.area);
      const existing = same?.find((c) => c.id !== id && addressKey(c.house_no, c.floor, c.area) === key);
      return { error: "This house, floor and area is already a customer.", existingId: existing?.id };
    }
    return { error: "Could not save. Check your internet and try again." };
  }

  redirect(`/customers/${res.data.id}`);
}

// ilike with no wildcards is a case-insensitive "equals"; escape the user's own % and _.
const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => "\\" + c);
