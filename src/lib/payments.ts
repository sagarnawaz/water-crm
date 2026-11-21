// Payment rules. See docs/BUSINESS_RULES.md#payments.
import { isISODate } from "./dates.ts";

export const METHODS = {
  cash_rider: "Cash to rider",
  cash_owner: "Cash to owner",
  online: "Online to owner",
} as const;
export type Method = keyof typeof METHODS;

export type Payment = {
  id: string;
  customer_id: string;
  date: string;
  amount: number;
  method: Method;
  for_month: string | null; // "YYYY-MM-01" for monthly customers
  note: string | null;
  created_at?: string;
  deleted_at?: string | null;
};

export const MAX_AMOUNT = 1_000_000;
export const BIG_AMOUNT = 50_000; // needs a second tap

export type PaymentInput = { date: unknown; amount: unknown; method: unknown; forMonth: unknown; note: unknown };

/**
 * Checks one payment. Monthly customers must say which month's bill it pays ("YYYY-MM");
 * daily customers never have a month.
 */
export function checkPayment(
  input: PaymentInput,
  today: string,
  billing: "monthly" | "daily",
): { data: Omit<Payment, "id" | "customer_id"> } | { error: string } {
  const { date, amount, method, forMonth, note } = input;
  if (!Number.isInteger(amount) || (amount as number) < 1) return { error: "Enter the amount in whole rupees, more than 0." };
  if ((amount as number) > MAX_AMOUNT) return { error: "That is more than Rs 10,00,000. Check the amount." };
  if (typeof method !== "string" || !(method in METHODS)) return { error: "Choose how it was paid." };
  if (!isISODate(date)) return { error: "Choose a valid date." };
  if (date > today) return { error: "The date can't be in the future." };
  if (note != null && (typeof note !== "string" || note.length > 200)) return { error: "Note is too long." };

  let for_month: string | null = null;
  if (billing === "monthly") {
    if (typeof forMonth !== "string" || !isISODate(forMonth + "-01")) return { error: "Choose which month's bill this pays." };
    if (forMonth > nextMonth(today)) return { error: "That month is too far ahead." };
    for_month = forMonth + "-01";
  }
  const n = typeof note === "string" ? note.trim() : "";
  return { data: { date, amount: amount as number, method: method as Method, for_month, note: n || null } };
}

/** "2026-11-20" → "2026-12" (advance for next month is allowed). */
export const nextMonth = (day: string) => {
  const [y, m] = day.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
};
