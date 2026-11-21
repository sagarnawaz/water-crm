// The customer register: balance, monthly statement and monthly bill status.
// Formulas: docs/BUSINESS_RULES.md#calculations. Pure functions, covered by tests/ledger.test.ts.
import type { Delivery } from "./deliveries.ts";
import type { Payment } from "./payments.ts";

export type Entry = Delivery & { created_at?: string; deleted_at?: string | null };

export type Line =
  | { kind: "delivery"; date: string; amount: number; running: number; entry: Entry }
  | { kind: "payment"; date: string; amount: number; running: number; payment: Payment };

export type Statement = {
  month: string; // "YYYY-MM"
  opening: number;
  bottles: number;
  empties: number;
  billed: number;
  paid: number; // money received during the month
  closing: number;
  lines: Line[];
};

const live = <T extends { deleted_at?: string | null }>(rows: T[]) => rows.filter((r) => !r.deleted_at);
const inMonth = (date: string, ym: string) => date.startsWith(ym);

/** Balance at the end of a day (or overall). Positive = customer owes, negative = advance. */
export function balance(opening: number, entries: Entry[], payments: Payment[], upTo = "9999-12-31") {
  let b = opening;
  for (const e of live(entries)) if (e.date <= upTo) b += e.qty * e.rate;
  for (const p of live(payments)) if (p.date <= upTo) b -= p.amount;
  return b;
}

export function bottlesAtHome(openingBottles: number, entries: Entry[]) {
  return live(entries).reduce((h, e) => h + e.qty - e.empties_returned, openingBottles);
}

/** One month of the register with a running balance. Order: date, bottles before payments, then entry time. */
export function statement(opening: number, entries: Entry[], payments: Payment[], ym: string): Statement {
  const start = balance(opening, entries, payments, ym + "-00"); // everything before the 1st
  const lines: Line[] = [
    ...live(entries)
      .filter((e) => inMonth(e.date, ym))
      .map((entry) => ({ kind: "delivery" as const, date: entry.date, amount: entry.qty * entry.rate, running: 0, entry })),
    ...live(payments)
      .filter((p) => inMonth(p.date, ym))
      .map((payment) => ({ kind: "payment" as const, date: payment.date, amount: -payment.amount, running: 0, payment })),
  ].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      (a.kind === b.kind ? 0 : a.kind === "delivery" ? -1 : 1) ||
      created(a).localeCompare(created(b)),
  );

  let run = start;
  for (const l of lines) l.running = run += l.amount;

  const ds = lines.flatMap((l) => (l.kind === "delivery" ? [l.entry] : []));
  const billed = ds.reduce((s, e) => s + e.qty * e.rate, 0);
  const paid = lines.reduce((s, l) => s + (l.kind === "payment" ? -l.amount : 0), 0);
  return {
    month: ym,
    opening: start,
    bottles: ds.reduce((s, e) => s + e.qty, 0),
    empties: ds.reduce((s, e) => s + e.empties_returned, 0),
    billed,
    paid,
    closing: start + billed - paid,
    lines,
  };
}

const created = (l: Line) => (l.kind === "delivery" ? l.entry.created_at : l.payment.created_at) ?? "";

/**
 * Monthly customers: the bill for month ym is the bottles dated in that month; payments marked
 * "for" that month count against it, whenever they were made. left > 0 unpaid, 0 paid, < 0 extra.
 */
export function bill(entries: Entry[], payments: Payment[], ym: string, exceptPaymentId?: string) {
  const amount = live(entries).filter((e) => inMonth(e.date, ym)).reduce((s, e) => s + e.qty * e.rate, 0);
  const paidFor = live(payments)
    .filter((p) => p.id !== exceptPaymentId && p.for_month?.startsWith(ym))
    .reduce((s, p) => s + p.amount, 0);
  return { amount, paidFor, left: amount - paidFor };
}

/** Months to show: every month with any activity, plus the current one, newest first. */
export function activeMonths(entries: Entry[], payments: Payment[], currentYm: string) {
  const set = new Set([currentYm]);
  for (const e of live(entries)) set.add(e.date.slice(0, 7));
  for (const p of live(payments)) {
    set.add(p.date.slice(0, 7));
    if (p.for_month) set.add(p.for_month.slice(0, 7));
  }
  return [...set].sort().reverse();
}

/** The month a new payment most likely pays: the oldest bill with money left, else the current month. */
export function oldestUnpaid(entries: Entry[], payments: Payment[], currentYm: string, exceptPaymentId?: string) {
  const months = activeMonths(entries, payments, currentYm).filter((m) => m <= currentYm).reverse();
  return months.find((m) => bill(entries, payments, m, exceptPaymentId).left > 0) ?? currentYm;
}
