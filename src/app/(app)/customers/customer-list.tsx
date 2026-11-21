"use client";

import Link from "next/link";
import { useState } from "react";
import { btnPrimary } from "@/components/screen";
import { customerLabel, floorText, rs, type Customer } from "@/lib/customers";

const FILTERS = [
  ["all", "All"],
  ["due", "Has dues"],
  ["monthly", "Monthly"],
  ["daily", "Daily"],
  ["inactive", "Inactive"],
] as const;
type Filter = (typeof FILTERS)[number][0];

/** Every word typed must appear in house, floor, area, name or phone ("12-b 2nd" finds 12-B, 2nd floor). */
const matches = (c: Customer, q: string) => {
  const hay = [c.house_no, c.floor, floorText(c.floor), c.area, c.name, c.phone].join(" ").toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
};

export function Balance({ value }: { value: number }) {
  if (value > 0) return <span className="text-due">{rs(value)} due</span>;
  if (value < 0) return <span className="text-adv">{rs(value)} advance</span>;
  return <span className="text-muted">Clear</span>;
}

export function CustomerList({ customers }: { customers: Customer[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const rows = customers.filter(
    (c) =>
      (filter === "inactive" ? !c.active : c.active) &&
      (filter !== "due" || c.balance > 0) &&
      (filter !== "monthly" || c.billing_type === "monthly") &&
      (filter !== "daily" || c.billing_type === "daily") &&
      (!q || matches(c, q)),
  );

  if (customers.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-8 text-center">
        <p className="font-semibold">No customers yet</p>
        <p className="text-muted">Add your customers from the paper register: house no, floor and area are enough to start.</p>
        <Link href="/customers/new" className={btnPrimary}>Add first customer</Link>
      </div>
    );
  }

  return (
    <>
      <div className="relative">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="House no, floor, area, name, phone"
          aria-label="Search customers"
          autoComplete="off"
          className="min-h-13 w-full rounded-xl border border-line bg-surface pr-3.5 pl-11 text-[17px] placeholder:text-muted"
        />
      </div>

      <div role="group" aria-label="Filter" className="flex gap-2 overflow-x-auto pb-0.5">
        {FILTERS.map(([key, text]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            aria-pressed={filter === key}
            className="min-h-10 flex-none rounded-full border border-line bg-surface px-3.5 text-sm font-semibold text-muted aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-bg"
          >
            {text}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-px overflow-hidden rounded-2xl border border-line bg-line">
        {rows.length === 0 && (
          <p className="bg-surface px-4 py-6 text-center text-muted">No customers found. Check the house number or add a new customer.</p>
        )}
        {rows.map((c) => (
          <Link key={c.id} href={`/customers/${c.id}`} className="flex min-h-17 items-center gap-2.5 bg-surface px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-[17px] font-semibold">
                {customerLabel(c)}
                {c.billing_type === "daily" && (
                  <span className="ml-1.5 rounded-md bg-accent-soft px-1.5 py-0.5 align-[2px] text-[11px] font-bold text-accent">DAILY</span>
                )}
              </p>
              <p className="truncate text-[13px] text-muted">
                {c.area}
                {c.name && ` · ${c.name}`} · {rs(c.rate)}/btl · {c.bottles_at_home} bottles at home
              </p>
            </div>
            <span className="text-right font-semibold whitespace-nowrap tabular-nums">
              <Balance value={c.balance} />
            </span>
          </Link>
        ))}
      </div>

      <Link href="/customers/new" className={btnPrimary}>Add customer</Link>
    </>
  );
}
