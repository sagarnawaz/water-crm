// Bottle entry rules. See docs/BUSINESS_RULES.md#bottle-entries.
import { addDays, isISODate } from "./dates.ts";

export type Delivery = {
  id: string;
  customer_id: string;
  date: string;
  qty: number;
  empties_returned: number;
  rate: number;
  amount: number;
};

export const MAX_QTY = 100;
export const OLD_DAYS = 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUUID = (s: unknown): s is string => typeof s === "string" && UUID.test(s);

export type EntryInput = { date: unknown; qty: unknown; empties: unknown };

/** Checks one entry. `today` is passed in so the rule is testable. */
export function checkEntry(
  input: EntryInput,
  today: string,
): { data: { date: string; qty: number; empties_returned: number } } | { error: string } {
  const { date, qty, empties } = input;
  if (!isISODate(date)) return { error: "Choose a valid date." };
  if (date > today) return { error: "The date can't be in the future." };
  const whole = (n: unknown) => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= MAX_QTY;
  if (!whole(qty) || !whole(empties)) return { error: `Bottles and empties must be whole numbers from 0 to ${MAX_QTY}.` };
  if ((qty as number) + (empties as number) === 0) return { error: "Enter bottles delivered or empties collected." };
  return { data: { date, qty: qty as number, empties_returned: empties as number } };
}

export const isOldDate = (date: string, today: string) => date < addDays(today, -OLD_DAYS);

/** Random UUID v4 that also works on plain-http pages (crypto.randomUUID needs https). */
export function newId(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export const bottles = (n: number) => `${n} bottle${n === 1 ? "" : "s"}`;
