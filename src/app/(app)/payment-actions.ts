"use server";

import { revalidatePath } from "next/cache";
import { todayPK } from "@/lib/dates";
import { isUUID } from "@/lib/deliveries";
import { checkPayment, type PaymentInput } from "@/lib/payments";
import { createClient } from "@/lib/supabase/server";
import type { Result } from "./delivery-actions";

const failed: Result = { error: "Could not save. Check your internet and try again." };
const broken: Result = { error: "Something went wrong. Reload the page." };

async function billingOf(supabase: Awaited<ReturnType<typeof createClient>>, customerId: string) {
  const { data } = await supabase.from("customers").select("billing_type").eq("id", customerId).maybeSingle();
  return data?.billing_type as "monthly" | "daily" | undefined;
}

/** New payment. The id comes from the phone, so pressing Save twice can't record it twice. */
export async function addPayment(id: string, customerId: string, input: PaymentInput): Promise<Result> {
  if (!isUUID(id) || !isUUID(customerId)) return broken;
  const supabase = await createClient();
  const billing = await billingOf(supabase, customerId);
  if (!billing) return broken;
  const checked = checkPayment(input, todayPK(), billing);
  if ("error" in checked) return checked;

  const { error } = await supabase.from("payments").insert({ id, customer_id: customerId, ...checked.data });
  if (error && error.code !== "23505") return failed; // 23505: already saved by an earlier tap

  revalidatePath("/", "layout");
  return {};
}

export async function updatePayment(id: string, input: PaymentInput): Promise<Result> {
  if (!isUUID(id)) return broken;
  const supabase = await createClient();
  const { data: row } = await supabase.from("payments").select("customer_id").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!row) return { error: "This payment was already deleted." };
  const billing = await billingOf(supabase, row.customer_id);
  if (!billing) return broken;
  const checked = checkPayment(input, todayPK(), billing);
  if ("error" in checked) return checked;

  const { error } = await supabase.from("payments").update(checked.data).eq("id", id).is("deleted_at", null);
  if (error) return failed;

  revalidatePath("/", "layout");
  return {};
}

/** Soft delete: kept in the database and the audit log, but no longer counts. */
export async function deletePayment(id: string): Promise<Result> {
  if (!isUUID(id)) return broken;
  const supabase = await createClient();
  const { error } = await supabase
    .from("payments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);
  if (error) return failed;

  revalidatePath("/", "layout");
  return {};
}
