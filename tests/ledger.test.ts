// The money test (docs/BUSINESS_RULES.md#money-test-fixture-must-pass-before-every-release).
import { test } from "node:test";
import assert from "node:assert/strict";
import { activeMonths, balance, bill, bottlesAtHome, oldestUnpaid, statement, type Entry } from "../src/lib/ledger.ts";
import { checkPayment, type Payment } from "../src/lib/payments.ts";

const OPENING = 600;
const OPENING_BOTTLES = 2;
let n = 0;
const e = (date: string, qty: number, empties: number, rate: number, extra: Partial<Entry> = {}): Entry => ({
  id: `e${++n}`, customer_id: "c", date, qty, empties_returned: empties, rate, amount: qty * rate,
  created_at: `${date}T0${n % 10}:00:00Z`, ...extra,
});
const p = (date: string, amount: number, for_month: string | null, extra: Partial<Payment> = {}): Payment => ({
  id: `p${++n}`, customer_id: "c", date, amount, method: "cash_owner", for_month, note: null, created_at: `${date}T09:00:00Z`, ...extra,
});

const entries = [
  e("2026-10-05", 2, 2, 110),
  e("2026-10-20", 3, 2, 110),
  e("2026-10-25", 5, 0, 110, { deleted_at: "2026-10-26T10:00:00Z" }), // deleted: must not count
  e("2026-11-12", 2, 2, 120), // price went up to 120 on 11 Nov
  e("2026-11-12", 1, 0, 120), // second delivery the same day
  e("2026-11-15", 0, 2, 120), // empties pickup only
];
const payments = [
  p("2026-11-02", 400, "2026-10-01"), // part of October's bill, paid in November
  p("2026-11-18", 1500, "2026-11-01"), // more than November's bill → advance
  p("2026-11-19", 999, "2026-11-01", { deleted_at: "2026-11-19T12:00:00Z" }),
];

test("October statement", () => {
  const s = statement(OPENING, entries, payments, "2026-10");
  assert.deepEqual(
    { opening: s.opening, bottles: s.bottles, empties: s.empties, billed: s.billed, paid: s.paid, closing: s.closing },
    { opening: 600, bottles: 5, empties: 4, billed: 550, paid: 0, closing: 1150 },
  );
  assert.deepEqual(s.lines.map((l) => l.running), [820, 1150]);
});

test("November statement: two entries on one day, empties pickup, payments, advance", () => {
  const s = statement(OPENING, entries, payments, "2026-11");
  assert.deepEqual(
    { opening: s.opening, bottles: s.bottles, empties: s.empties, billed: s.billed, paid: s.paid, closing: s.closing },
    { opening: 1150, bottles: 3, empties: 4, billed: 360, paid: 1900, closing: -390 },
  );
  // 2 Nov −400 → 750; 12 Nov +240 → 990, +120 → 1110; 15 Nov +0; 18 Nov −1500 → −390
  assert.deepEqual(s.lines.map((l) => [l.date, l.kind, l.amount, l.running]), [
    ["2026-11-02", "payment", -400, 750],
    ["2026-11-12", "delivery", 240, 990],
    ["2026-11-12", "delivery", 120, 1110],
    ["2026-11-15", "delivery", 0, 1110],
    ["2026-11-18", "payment", -1500, -390],
  ]);
});

test("overall balance and bottles at home", () => {
  assert.equal(balance(OPENING, entries, payments), -390);
  assert.equal(balance(OPENING, entries, payments, "2026-10-31"), 1150);
  // 2 + (2+3+2+1+0) − (2+2+2+0+2)
  assert.equal(bottlesAtHome(OPENING_BOTTLES, entries), 2);
});

test("monthly bill status uses the payment's month, not its date", () => {
  assert.deepEqual(bill(entries, payments, "2026-10"), { amount: 550, paidFor: 400, left: 150 });
  assert.deepEqual(bill(entries, payments, "2026-11"), { amount: 360, paidFor: 1500, left: -1140 });
  assert.equal(oldestUnpaid(entries, payments, "2026-11"), "2026-10");
  const paidOff = [...payments, p("2026-11-20", 150, "2026-10-01")];
  assert.equal(oldestUnpaid(entries, paidOff, "2026-11"), "2026-11", "nothing left anywhere → current month");
  assert.deepEqual(activeMonths(entries, payments, "2026-11"), ["2026-11", "2026-10"]);
});

test("same-day order: bottles before payments, then by entry time", () => {
  const sameDay = [p("2026-12-01", 100, null, { created_at: "2026-12-01T08:00:00Z" })];
  const ds = [e("2026-12-01", 1, 1, 120, { created_at: "2026-12-01T10:00:00Z" })];
  const s = statement(0, ds, sameDay, "2026-12");
  assert.deepEqual(s.lines.map((l) => l.kind), ["delivery", "payment"]);
});

test("payment rules", () => {
  const ok = { date: "2026-11-20", amount: 500, method: "online", forMonth: "2026-11", note: " JazzCash 4471 " };
  const r = checkPayment(ok, "2026-11-20", "monthly");
  assert.deepEqual(r, { data: { date: "2026-11-20", amount: 500, method: "online", for_month: "2026-11-01", note: "JazzCash 4471" } });
  assert.deepEqual(checkPayment({ ...ok, forMonth: "2026-11" }, "2026-11-20", "daily"), {
    data: { date: "2026-11-20", amount: 500, method: "online", for_month: null, note: "JazzCash 4471" },
  });
  const err = (o: object, billing: "monthly" | "daily" = "monthly") => {
    const x = checkPayment({ ...ok, ...o }, "2026-11-20", billing);
    return "error" in x ? x.error : null;
  };
  assert.match(err({ amount: 0 })!, /more than 0/);
  assert.match(err({ amount: 12.5 })!, /whole rupees/);
  assert.match(err({ amount: 1_000_001 })!, /10,00,000/);
  assert.match(err({ method: "cheque" })!, /how it was paid/);
  assert.match(err({ date: "2026-11-21" })!, /future/);
  assert.match(err({ forMonth: null })!, /which month/);
  assert.equal(err({ forMonth: "2026-12" }), null, "advance for next month is allowed");
  assert.match(err({ forMonth: "2027-01" })!, /too far/);
});
