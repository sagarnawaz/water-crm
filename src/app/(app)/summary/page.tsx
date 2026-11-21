import Link from "next/link";
import { btn, Screen } from "@/components/screen";
import { customerLabel, rs } from "@/lib/customers";
import { fmtMonth, isISODate, todayPK } from "@/lib/dates";
import { METHODS, type Method } from "@/lib/payments";
import { createClient } from "@/lib/supabase/server";
import { listCustomers } from "../customers/data";

type Row = { customer_id: string; opening: number; bottles: number; empties: number; billed: number; paid: number; closing: number };

const N = (n: number) => n.toLocaleString("en-IN");
const tone = (n: number) => (n > 0 ? "text-due" : n < 0 ? "text-adv" : "");

/** Months from the first entry (at most 24 back) to now, newest first. */
function monthsSince(first: string | null, current: string) {
  const out: string[] = [];
  let [y, m] = current.split("-").map(Number);
  for (let i = 0; i < 24; i++) {
    const ym = `${y}-${String(m).padStart(2, "0")}`;
    out.push(ym);
    if (!first || ym <= first.slice(0, 7)) break;
    if (--m === 0) [y, m] = [y - 1, 12];
  }
  return out;
}

export default async function SummaryPage(props: PageProps<"/summary">) {
  const current = todayPK().slice(0, 7);
  const asked = (await props.searchParams).month;
  const ym = typeof asked === "string" && isISODate(asked + "-01") && asked <= current ? asked : current;

  const supabase = await createClient();
  const [customers, summary, collections, first] = await Promise.all([
    listCustomers(supabase),
    supabase.rpc("month_summary", { p_month: ym + "-01" }),
    supabase.rpc("month_collections", { p_month: ym + "-01" }),
    supabase.rpc("first_activity"),
  ]);
  if (summary.error) throw summary.error;
  if (collections.error) throw collections.error;

  const byId = new Map(customers.map((c) => [c.id, c]));
  const rows = (summary.data as Row[])
    .filter((r) => r.bottles || r.empties || r.billed || r.paid || r.opening || r.closing)
    .map((r) => ({ ...r, c: byId.get(r.customer_id)! }))
    .filter((r) => r.c);
  const T = rows.reduce(
    (t, r) => ({ bottles: t.bottles + r.bottles, empties: t.empties + r.empties, billed: t.billed + r.billed, paid: t.paid + r.paid, closing: t.closing + r.closing }),
    { bottles: 0, empties: 0, billed: 0, paid: 0, closing: 0 },
  );
  const toCollect = rows.reduce((s, r) => s + Math.max(0, r.closing), 0);
  const atHomes = customers.filter((c) => c.active).reduce((s, c) => s + c.bottles_at_home, 0);
  const byMethod = Object.fromEntries((collections.data as { method: Method; amount: number }[]).map((r) => [r.method, r.amount]));
  const maxMethod = Math.max(1, ...Object.values(byMethod));

  return (
    <Screen title="Summary" sub={`${fmtMonth(ym)}${ym === current ? " · up to today" : ""}`}>
      <nav aria-label="Month" className="flex gap-2 overflow-x-auto pb-0.5">
        {monthsSince(first.data, current).map((m) => (
          <Link
            key={m}
            href={m === current ? "/summary" : `/summary?month=${m}`}
            aria-current={m === ym ? "page" : undefined}
            className="flex min-h-10 flex-none items-center rounded-full border border-line bg-surface px-3.5 text-sm font-semibold text-muted aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-bg"
          >
            {fmtMonth(m)}
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-2 gap-2.5">
        <Tile value={N(T.bottles)} label="bottles delivered" />
        <Tile value={N(T.empties)} label="empties collected" />
        <Tile value={rs(T.billed)} label="billed" />
        <Tile value={rs(T.paid)} label="collected" className="text-adv" />
        <Tile value={rs(toCollect)} label={`still to collect at end of ${ym === current ? "today" : "month"}`} className="text-due" />
        <Tile value={N(atHomes)} label="your bottles at customers' homes now" />
      </div>

      <section className="flex flex-col gap-2.5 rounded-2xl border border-line bg-surface p-4">
        <h2 className="font-display text-[17px] font-bold">How you were paid</h2>
        {(Object.keys(METHODS) as Method[]).map((k) => (
          <div key={k} className="grid grid-cols-[112px_1fr_auto] items-center gap-2.5 text-sm">
            <span>{METHODS[k]}</span>
            <span className="h-2.5 rounded-full bg-sunk">
              <span className="block h-full rounded-full bg-accent" style={{ width: `${((byMethod[k] ?? 0) / maxMethod) * 100}%` }} />
            </span>
            <span className="text-right font-semibold tabular-nums">{rs(byMethod[k] ?? 0)}</span>
          </div>
        ))}
      </section>

      <h2 className="font-display text-[17px] font-bold">By customer</h2>
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface px-4 py-6 text-center text-muted">No entries or payments in {fmtMonth(ym)}.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[440px] border-collapse text-sm tabular-nums">
            <thead>
              <tr className="bg-sunk text-[11px] font-bold tracking-wider text-muted uppercase">
                <th className="px-2.5 py-2 text-left">Customer</th>
                <th className="px-2.5 py-2 text-right">Btl</th>
                <th className="px-2.5 py-2 text-right">Billed</th>
                <th className="px-2.5 py-2 text-right">Paid</th>
                <th className="px-2.5 py-2 text-right">Closing</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.customer_id} className="border-t border-line">
                  <td className="px-2.5 py-2.5">
                    <Link href={`/customers/${r.customer_id}?month=${ym}`} className="font-semibold underline-offset-2 hover:underline">
                      {customerLabel(r.c)}
                    </Link>
                    <small className="block text-muted">{r.c.area}</small>
                  </td>
                  <td className="px-2.5 text-right">{r.bottles}</td>
                  <td className="px-2.5 text-right">{N(r.billed)}</td>
                  <td className="px-2.5 text-right">{N(r.paid)}</td>
                  <td className={`px-2.5 text-right font-semibold ${tone(r.closing)}`}>{N(r.closing)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-line bg-sunk font-bold">
                <td className="px-2.5 py-2.5">Total</td>
                <td className="px-2.5 text-right">{T.bottles}</td>
                <td className="px-2.5 text-right">{N(T.billed)}</td>
                <td className="px-2.5 text-right">{N(T.paid)}</td>
                <td className="px-2.5 text-right">{N(T.closing)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <a href={`/export?type=month&month=${ym}`} download className={btn}>Download {fmtMonth(ym)} as CSV</a>
      <p className="text-sm text-muted">Tap a customer to see their statement for the month.</p>
    </Screen>
  );
}

function Tile({ value, label, className = "" }: { value: string; label: string; className?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-3.5 py-3">
      <b className={`block font-display text-2xl tabular-nums ${className}`}>{value}</b>
      <span className="text-[13px] text-muted">{label}</span>
    </div>
  );
}
