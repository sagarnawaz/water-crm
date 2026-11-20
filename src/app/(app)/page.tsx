import Link from "next/link";
import { iconBtn, Screen } from "@/components/screen";
import { addDays, fmtDay, isISODate, todayPK } from "@/lib/dates";
import type { Delivery } from "@/lib/deliveries";
import { createClient } from "@/lib/supabase/server";
import { listCustomers } from "./customers/data";
import { TodayList } from "./today-list";

const arrow = (d: string) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="size-5.5" aria-hidden>
    <path d={d} />
  </svg>
);

export default async function TodayPage(props: PageProps<"/">) {
  const today = todayPK();
  const asked = (await props.searchParams).date;
  const day = isISODate(asked) && asked <= today ? asked : today;
  const isToday = day === today;

  const supabase = await createClient();
  const [customers, { data: deliveries, error }] = await Promise.all([
    listCustomers(supabase),
    supabase
      .from("deliveries")
      .select("id, customer_id, date, qty, empties_returned, rate, amount")
      .eq("date", day)
      .is("deleted_at", null)
      .order("created_at"),
  ]);
  if (error) throw error;

  const next = addDays(day, 1);
  return (
    <Screen
      title={isToday ? "Today" : "Past day"}
      sub={fmtDay(day)}
      action={
        <div className="flex gap-2">
          <Link href={`/?date=${addDays(day, -1)}`} aria-label="Previous day" className={iconBtn}>{arrow("m15 5-7 7 7 7")}</Link>
          {isToday ? (
            <span aria-disabled className={`${iconBtn} opacity-35`}>{arrow("m9 5 7 7-7 7")}</span>
          ) : (
            <Link href={next === today ? "/" : `/?date=${next}`} aria-label="Next day" className={iconBtn}>{arrow("m9 5 7 7-7 7")}</Link>
          )}
        </div>
      }
    >
      {!isToday && (
        <p className="rounded-xl bg-warn-soft px-3.5 py-2.5 text-sm text-warn">
          You are entering bottles for <b>{fmtDay(day)}</b>, not today. <Link href="/" className="font-semibold underline">Go to today</Link>
        </p>
      )}
      <TodayList
        key={day}
        day={day}
        today={today}
        customers={customers.filter((c) => c.active)}
        deliveries={(deliveries ?? []) as Delivery[]}
      />
    </Screen>
  );
}
