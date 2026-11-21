"use server";

import { revalidatePath } from "next/cache";
import { todayPK } from "@/lib/dates";
import { checkEntry, isUUID, type EntryInput } from "@/lib/deliveries";
import { createClient } from "@/lib/supabase/server";

export type Result = { error?: string };

const failed = (message?: string): Result =>
  message?.includes("inactive")
    ? { error: "This customer is inactive. Turn them back on before adding bottles." }
    : { error: "Could not save. Check your internet and try again." };

/** New entry. The id comes from the phone, so pressing Save twice can't create two entries. */
export async function addDelivery(id: string, customerId: string, input: EntryInput): Promise<Result> {
  if (!isUUID(id) || !isUUID(customerId)) return { error: "Something went wrong. Reload the page." };
  const checked = checkEntry(input, todayPK());
  if ("error" in checked) return checked;

  const supabase = await createClient();
  // The price is copied onto the entry by the database (deliveries_fill_rate trigger).
  const { error } = await supabase.from("deliveries").insert({ id, customer_id: customerId, ...checked.data });
  if (error && error.code !== "23505") return failed(error.message); // 23505: already saved by an earlier tap

  revalidatePath("/", "layout");
  return {};
}

/** Correct an entry. Its saved price never changes. */
export async function updateDelivery(id: string, input: EntryInput): Promise<Result> {
  if (!isUUID(id)) return { error: "Something went wrong. Reload the page." };
  const checked = checkEntry(input, todayPK());
  if ("error" in checked) return checked;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deliveries")
    .update(checked.data)
    .eq("id", id)
    .is("deleted_at", null)
    .select("id");
  if (error) return failed(error.message);
  if (!data.length) return { error: "This entry was already deleted." };

  revalidatePath("/", "layout");
  return {};
}

/** Soft delete: the row stays in the database and the audit log, but no longer counts. */
export async function deleteDelivery(id: string): Promise<Result> {
  if (!isUUID(id)) return { error: "Something went wrong. Reload the page." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("deliveries")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);
  if (error) return failed(error.message);

  revalidatePath("/", "layout");
  return {};
}
