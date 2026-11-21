import type { NextRequest } from "next/server";
import { toCSV } from "@/lib/csv";
import { isISODate, todayPK } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

// CSV downloads. Logged-in owners only (proxy + RLS), and only their own business's rows.
//   /export?type=customers          all customers with balance and bottles at home
//   /export?type=register           every bottle entry and payment (full backup)
//   /export?type=month&month=YYYY-MM the monthly summary per customer

type Supabase = Awaited<ReturnType<typeof createClient>>;
type Page<T> = PromiseLike<{ data: T[] | null; error: unknown }>;

/** The API returns at most 1000 rows per request, so read in pages. */
async function all<T>(page: (from: number, to: number) => Page<T>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await page(from, from + 999);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < 1000) return out;
  }
}

type C = {
  id: string; house_no: string; floor: string; area: string; name: string | null; phone: string | null;
  billing_type: string; rate: number; custom_rate: number | null; default_qty: number | null;
  opening_balance: number; opening_bottles: number; active: boolean; balance: number; bottles_at_home: number;
};

const customers = (s: Supabase) =>
  all<C>((a, b) => s.from("customer_list").select("*").order("area").order("house_no").order("floor").order("id").range(a, b));

async function customersCSV(s: Supabase) {
  return toCSV([
    ["house_no", "floor", "area", "name", "phone", "pays", "price_now", "custom_price", "usual_per_day", "old_balance", "old_bottles", "active", "balance", "bottles_at_home"],
    ...(await customers(s)).map((c) => [
      c.house_no, c.floor, c.area, c.name, c.phone, c.billing_type, c.rate, c.custom_rate, c.default_qty,
      c.opening_balance, c.opening_bottles, c.active ? "yes" : "no", c.balance, c.bottles_at_home,
    ]),
  ]);
}

async function registerCSV(s: Supabase) {
  const [cs, ds, ps] = await Promise.all([
    customers(s),
    all<{ customer_id: string; date: string; qty: number; empties_returned: number; rate: number; amount: number; note: string | null; created_at: string }>(
      (a, b) => s.from("deliveries").select("customer_id, date, qty, empties_returned, rate, amount, note, created_at").is("deleted_at", null).order("date").order("created_at").order("id").range(a, b),
    ),
    all<{ customer_id: string; date: string; amount: number; method: string; for_month: string | null; note: string | null; created_at: string }>(
      (a, b) => s.from("payments").select("customer_id, date, amount, method, for_month, note, created_at").is("deleted_at", null).order("date").order("created_at").order("id").range(a, b),
    ),
  ]);
  const byId = new Map(cs.map((c) => [c.id, c]));
  const rows = [
    ...ds.map((d) => ({ d: d.date, t: d.created_at, k: 0, c: byId.get(d.customer_id), r: ["bottles", d.qty, d.empties_returned, d.rate, d.amount, null, null, d.note] })),
    ...ps.map((p) => ({ d: p.date, t: p.created_at, k: 1, c: byId.get(p.customer_id), r: ["payment", null, null, null, -p.amount, p.method, p.for_month?.slice(0, 7) ?? null, p.note] })),
  ].sort((x, y) => x.d.localeCompare(y.d) || x.k - y.k || x.t.localeCompare(y.t));

  return toCSV([
    ["date", "house_no", "floor", "area", "type", "bottles", "empties_back", "price", "amount", "method", "for_month", "note"],
    ...rows.map((x) => [x.d, x.c?.house_no, x.c?.floor, x.c?.area, ...(x.r as (string | number | null)[])]),
  ]);
}

async function monthCSV(s: Supabase, ym: string) {
  const [cs, { data, error }] = await Promise.all([customers(s), s.rpc("month_summary", { p_month: ym + "-01" })]);
  if (error) throw error;
  const byId = new Map(cs.map((c) => [c.id, c]));
  type Row = { customer_id: string; opening: number; bottles: number; empties: number; billed: number; paid: number; closing: number };
  return toCSV([
    ["month", "house_no", "floor", "area", "name", "brought_forward", "bottles", "empties_back", "billed", "paid", "closing"],
    ...(data as Row[])
      .filter((r) => r.bottles || r.empties || r.billed || r.paid || r.opening || r.closing)
      .map((r) => ({ r, c: byId.get(r.customer_id) }))
      .sort((x, y) => `${x.c?.area}|${x.c?.house_no}|${x.c?.floor}`.localeCompare(`${y.c?.area}|${y.c?.house_no}|${y.c?.floor}`))
      .map(({ r, c }) => [ym, c?.house_no, c?.floor, c?.area, c?.name, r.opening, r.bottles, r.empties, r.billed, r.paid, r.closing]),
  ]);
}

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type");
  const month = request.nextUrl.searchParams.get("month") ?? "";
  const s = await createClient();

  let csv: string;
  let name: string;
  if (type === "customers") [csv, name] = [await customersCSV(s), `customers-${todayPK()}`];
  else if (type === "register") [csv, name] = [await registerCSV(s), `register-${todayPK()}`];
  else if (type === "month" && isISODate(month + "-01")) [csv, name] = [await monthCSV(s, month), `summary-${month}`];
  else return new Response("Unknown export", { status: 400 });

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="paani-register-${name}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
