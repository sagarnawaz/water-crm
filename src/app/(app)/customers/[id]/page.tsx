import Link from "next/link";
import { notFound } from "next/navigation";
import { iconBtn, Screen } from "@/components/screen";
import { customerLabel, floorText, rs, type Customer } from "@/lib/customers";
import { createClient } from "@/lib/supabase/server";
import { todayPK } from "@/lib/dates";
import type { Entry } from "@/lib/ledger";
import type { Payment } from "@/lib/payments";
import { CustomerLedger } from "./ledger";

const editIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5.5" aria-hidden>
    <path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />
  </svg>
);

export default async function CustomerPage(props: PageProps<"/customers/[id]">) {
  const { id } = await props.params;
  const month = (await props.searchParams).month;
  const supabase = await createClient();
  const today = todayPK();
  // ponytail: loads the customer's whole history (about 30 rows a month). Load one month at a time
  // if a customer ever has years of daily entries and the page gets slow.
  const [{ data }, { data: entries }, { data: payments }] = await Promise.all([
    supabase.from("customer_list").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("deliveries")
      .select("id, customer_id, date, qty, empties_returned, rate, amount, created_at")
      .eq("customer_id", id)
      .is("deleted_at", null),
    supabase
      .from("payments")
      .select("id, customer_id, date, amount, method, for_month, note, created_at")
      .eq("customer_id", id)
      .is("deleted_at", null),
  ]);
  if (!data) notFound();
  const c: Customer = data;
  const b = c.balance;

  return (
    <Screen
      title={customerLabel(c)}
      sub={[c.area, c.name].filter(Boolean).join(" · ")}
      back="/customers"
      action={<Link href={`/customers/${id}/edit`} aria-label="Edit customer" className={iconBtn}>{editIcon}</Link>}
    >
      {!c.active && (
        <p className="rounded-xl bg-warn-soft px-3.5 py-2.5 text-sm text-warn">
          This customer is inactive. Edit the customer to turn them back on before adding bottles.
        </p>
      )}

      <section className="flex flex-col gap-1 rounded-2xl border border-line bg-surface p-4">
        <span className="text-xs font-semibold tracking-wider text-muted uppercase">
          {b > 0 ? "Balance due" : b < 0 ? "Advance paid" : "Balance"}
        </span>
        <span className={`font-display text-4xl font-bold tabular-nums ${b > 0 ? "text-due" : b < 0 ? "text-adv" : ""}`}>{rs(b)}</span>
        <div className="mt-1.5 flex flex-wrap gap-x-3.5 gap-y-1 text-sm text-muted">
          <span><b className="text-ink">{c.bottles_at_home}</b> bottles at their home</span>
          <span>
            {rs(c.rate)} per bottle ({c.custom_rate ? "custom price" : `${floorText(c.floor)} price`})
          </span>
          <span>{c.billing_type === "monthly" ? "Pays monthly" : "Pays daily"}</span>
          <span>{c.default_qty ? `Usual ${c.default_qty}/day` : "On request"}</span>
          {c.phone && <span className="tabular-nums select-all">{c.phone}</span>}
        </div>
      </section>

      <CustomerLedger
        key={typeof month === "string" ? month : "current"}
        customer={c}
        entries={(entries ?? []) as Entry[]}
        payments={(payments ?? []) as Payment[]}
        today={today}
        initialMonth={typeof month === "string" ? month : today.slice(0, 7)}
      />
    </Screen>
  );
}
