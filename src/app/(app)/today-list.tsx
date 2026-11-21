"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { BottleSheet } from "@/components/bottle-sheet";
import { Toast, useToast } from "@/components/toast";
import { customerLabel, floorText, rs, type Customer } from "@/lib/customers";
import { bottles, MAX_QTY, newId, type Delivery } from "@/lib/deliveries";
import { addDelivery, deleteDelivery } from "./delivery-actions";
import { addPayment } from "./payment-actions";

type Tab = "pending" | "done" | "all";
type Sheet = { customer: Customer; entry?: Delivery } | null;

const matches = (c: Customer, q: string) => {
  const hay = [c.house_no, c.floor, floorText(c.floor), c.area, c.name, c.phone].join(" ").toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
};

// ponytail: "No delivery" marks live in this phone's browser only (they bill nothing, so nothing is lost
// if they disappear). Store them in the database if the owner wants them on every device.
const skipKey = (day: string) => `paani:skip:${day}`;
const SKIP_EVENT = "paani-skip";
const subscribeSkips = (cb: () => void) => {
  window.addEventListener("storage", cb);
  window.addEventListener(SKIP_EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(SKIP_EVENT, cb);
  };
};
const readSkips = (day: string) => {
  try {
    return localStorage.getItem(skipKey(day)) ?? "[]";
  } catch {
    return "[]";
  }
};
const parseSkips = (raw: string): string[] => {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

export function TodayList({
  day,
  today,
  customers,
  deliveries,
  collected,
}: {
  day: string;
  today: string;
  customers: Customer[];
  deliveries: Delivery[];
  collected: number;
}) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<Tab>("pending");
  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const [pending, setPending] = useState<Delivery[]>([]); // saved on this phone, waiting for the server refresh
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [sheet, setSheet] = useState<Sheet>(null);
  const { toast, show } = useToast();

  const skipsRaw = useSyncExternalStore(subscribeSkips, () => readSkips(day), () => "[]");
  const skips = useMemo(() => parseSkips(skipsRaw), [skipsRaw]);
  const saveSkips = (next: string[]) => {
    try {
      localStorage.setItem(skipKey(day), JSON.stringify(next));
    } catch {}
    window.dispatchEvent(new Event(SKIP_EVENT));
  };

  const known = new Set(deliveries.map((d) => d.id));
  const all = [...deliveries, ...pending.filter((p) => !known.has(p.id))].filter((d) => !removed.has(d.id));
  const byCustomer = new Map<string, Delivery[]>();
  for (const d of all) byCustomer.set(d.customer_id, [...(byCustomer.get(d.customer_id) ?? []), d]);

  const isDone = (c: Customer) => byCustomer.has(c.id) || skips.includes(c.id);
  const done = customers.filter(isDone);
  const todo = customers.filter((c) => !isDone(c));
  const rows = (tab === "pending" ? todo : tab === "done" ? done : customers).filter((c) => !q || matches(c, q));

  const totalQty = all.reduce((s, d) => s + d.qty, 0);
  const totalEmpties = all.reduce((s, d) => s + d.empties_returned, 0);
  const totalAmount = all.reduce((s, d) => s + d.amount, 0);

  const qtyFor = (c: Customer) => drafts[c.id] ?? c.default_qty ?? 0;
  const setDraft = (c: Customer, n: number) => setDrafts({ ...drafts, [c.id]: Math.max(0, Math.min(MAX_QTY, n)) });

  async function confirm(c: Customer) {
    const qty = qtyFor(c);
    if (qty < 1) return;
    const entry: Delivery = { id: newId(), customer_id: c.id, date: day, qty, empties_returned: qty, rate: c.rate, amount: qty * c.rate };
    setPending((p) => [...p, entry]);
    const rest = { ...drafts };
    delete rest[c.id];
    setDrafts(rest);

    const res = await addDelivery(entry.id, c.id, { date: day, qty, empties: qty });
    if (res.error) {
      setPending((p) => p.filter((x) => x.id !== entry.id));
      return show(res.error);
    }
    const actions = [
      { label: "Change", run: () => setSheet({ customer: c, entry }) },
      { label: "Undo", run: () => undo(entry) },
    ];
    // Daily customers usually pay on the spot: one tap records it as cash to rider.
    if (c.billing_type === "daily") actions.unshift({ label: `Paid ${rs(entry.amount)}`, run: () => payNow(c, entry) });
    show(`Saved ${bottles(qty)}, ${qty} empties back · ${customerLabel(c)}`, actions);
  }

  async function payNow(c: Customer, entry: Delivery) {
    const res = await addPayment(newId(), c.id, { date: day, amount: entry.amount, method: "cash_rider", forMonth: null, note: null });
    show(res.error ?? `Payment ${rs(entry.amount)} saved · Cash to rider`);
  }

  async function undo(entry: Delivery) {
    setRemoved((r) => new Set(r).add(entry.id));
    const res = await deleteDelivery(entry.id);
    if (res.error) {
      setRemoved((r) => {
        const n = new Set(r);
        n.delete(entry.id);
        return n;
      });
      show(res.error);
    }
  }

  if (customers.length === 0) {
    return (
      <p className="rounded-2xl border border-line bg-surface px-4 py-8 text-center text-muted">
        No active customers yet. Add customers first, then enter their bottles here.
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-line bg-line">
        <Stat value={String(totalQty)} label={`delivered · ${totalEmpties} empties back`} />
        <Stat value={rs(collected)} label={`collected of ${rs(totalAmount)}`} />
        <Stat value={String(todo.length)} label="not entered yet" />
      </div>

      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search house, floor, area…"
        aria-label="Search customers"
        autoComplete="off"
        className="min-h-13 w-full rounded-xl border border-line bg-surface px-3.5 text-[17px] placeholder:text-muted"
      />

      <div role="group" aria-label="Show" className="flex gap-2 overflow-x-auto pb-0.5">
        {([["pending", "To enter", todo.length], ["done", "Done", done.length], ["all", "All", customers.length]] as const).map(
          ([key, text, n]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              aria-pressed={tab === key}
              className="min-h-10 flex-none rounded-full border border-line bg-surface px-3.5 text-sm font-semibold text-muted aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-bg"
            >
              {text} ({n})
            </button>
          ),
        )}
      </div>

      <div className="flex flex-col gap-px overflow-hidden rounded-2xl border border-line bg-line">
        {rows.length === 0 && (
          <p className="bg-surface px-4 py-6 text-center text-muted">
            {q ? "No customer matches that search." : tab === "pending" ? "All entered for this day. Well done." : "Nothing here yet."}
          </p>
        )}
        {rows.map((c) => {
          const entries = byCustomer.get(c.id);
          const who = (
            <>
              <span className="block text-[17px] font-semibold">
                {customerLabel(c)}
                {c.billing_type === "daily" && (
                  <span className="ml-1.5 rounded-md bg-accent-soft px-1.5 py-0.5 align-[2px] text-[11px] font-bold text-accent">DAILY</span>
                )}
              </span>
              <span className="block truncate text-[13px] text-muted">{c.area}{c.name && ` · ${c.name}`}</span>
            </>
          );

          if (entries) {
            const q2 = entries.reduce((s, d) => s + d.qty, 0);
            const e2 = entries.reduce((s, d) => s + d.empties_returned, 0);
            const a2 = entries.reduce((s, d) => s + d.amount, 0);
            return (
              <div key={c.id} className="flex min-h-17 items-center gap-2.5 bg-surface px-3 py-2.5">
                <Check />
                {entries.length === 1 ? (
                  <button onClick={() => setSheet({ customer: c, entry: entries[0] })} className="min-w-0 flex-1 text-left">
                    {who}
                    <span className="block text-[13px] text-muted tabular-nums">{q2} btl · {e2} empties · {rs(a2)}</span>
                  </button>
                ) : (
                  <Link href={`/customers/${c.id}`} className="min-w-0 flex-1">
                    {who}
                    <span className="block text-[13px] text-muted tabular-nums">
                      {q2} btl · {e2} empties · {rs(a2)} · {entries.length} entries
                    </span>
                  </Link>
                )}
                <button onClick={() => setSheet({ customer: c })} aria-label={`Add another delivery for ${customerLabel(c)}`} className="grid size-11 flex-none place-items-center rounded-xl border border-line text-2xl">+</button>
              </div>
            );
          }

          if (skips.includes(c.id)) {
            return (
              <div key={c.id} className="flex min-h-17 items-center gap-2.5 bg-surface px-3 py-2.5">
                <span className="grid size-8.5 flex-none place-items-center rounded-full bg-sunk text-muted">–</span>
                <div className="min-w-0 flex-1">{who}</div>
                <span className="text-right text-[13px] text-muted">
                  No delivery
                  <button onClick={() => saveSkips(skips.filter((id) => id !== c.id))} className="block font-semibold underline">Undo</button>
                </span>
              </div>
            );
          }

          const qty = qtyFor(c);
          const suggested = !(c.id in drafts);
          return (
            <div key={c.id} className="flex min-h-17 items-center gap-2 bg-surface px-3 py-2.5">
              <div className="min-w-0 flex-1">
                {who}
                <span className="block text-[13px] text-muted">
                  {c.default_qty ? `Usual ${c.default_qty}` : "On request"} · {rs(c.rate)} ·{" "}
                  <button onClick={() => saveSkips([...skips, c.id])} className="font-semibold underline underline-offset-2">No delivery</button>
                </span>
              </div>
              <div className="flex flex-none items-center overflow-hidden rounded-xl border border-line">
                <button onClick={() => setDraft(c, qty - 1)} aria-label="One less" className="h-11.5 w-10 bg-sunk text-2xl font-semibold">−</button>
                <output className={`w-8.5 text-center text-[19px] font-bold tabular-nums ${suggested ? "text-muted" : ""}`}>{qty}</output>
                <button onClick={() => setDraft(c, qty + 1)} aria-label="One more" className="h-11.5 w-10 bg-sunk text-2xl font-semibold">+</button>
              </div>
              <button
                onClick={() => confirm(c)}
                disabled={qty < 1}
                aria-label={`Save ${bottles(qty)} for ${customerLabel(c)}`}
                className="grid size-12 flex-none place-items-center rounded-xl bg-accent text-accent-ink disabled:bg-sunk disabled:text-muted"
              >
                <CheckMark />
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-sm text-muted">
        Grey numbers are each customer&apos;s usual quantity. Nothing is billed until you tap ✓. Tapping ✓ also counts the
        same number of empties collected; tap a saved row to change it, or + to add a second delivery on the same day.
      </p>

      {sheet && (
        <BottleSheet
          customer={sheet.customer}
          entry={sheet.entry}
          date={day}
          today={today}
          sameDayQty={(d) => (d === day ? (byCustomer.get(sheet.customer.id) ?? []).reduce((s, x) => s + x.qty, 0) : 0)}
          onClose={() => setSheet(null)}
          onSaved={(m) => show(m)}
        />
      )}
      <Toast toast={toast} />
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0 bg-surface px-3 py-2.5">
      <b className="block truncate font-display text-xl tabular-nums">{value}</b>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

const CheckMark = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="size-6" aria-hidden>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);
const Check = () => (
  <span className="grid size-8.5 flex-none place-items-center rounded-full bg-adv/15 text-adv"><CheckMark /></span>
);
