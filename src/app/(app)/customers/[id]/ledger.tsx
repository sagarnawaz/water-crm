"use client";

import { useState } from "react";
import { BottleSheet } from "@/components/bottle-sheet";
import { PaymentSheet } from "@/components/payment-sheet";
import { btn, btnPrimary } from "@/components/screen";
import { Toast, useToast } from "@/components/toast";
import { rs, type Customer } from "@/lib/customers";
import { fmtDate, fmtMonth } from "@/lib/dates";
import { bottles } from "@/lib/deliveries";
import { activeMonths, bill, statement, type Entry, type Line } from "@/lib/ledger";
import { METHODS, type Payment } from "@/lib/payments";

type Open = { kind: "bottle"; entry?: Entry } | { kind: "payment"; payment?: Payment } | null;

const N = (n: number) => n.toLocaleString("en-IN");
const tone = (n: number) => (n > 0 ? "text-due" : n < 0 ? "text-adv" : "");

/** The customer's register, month by month, like the paper one. Tap any line to correct it. */
export function CustomerLedger({
  customer,
  entries,
  payments,
  today,
  initialMonth,
}: {
  customer: Customer;
  entries: Entry[];
  payments: Payment[];
  today: string;
  initialMonth: string;
}) {
  const current = today.slice(0, 7);
  const months = activeMonths(entries, payments, current);
  const [month, setMonth] = useState(months.includes(initialMonth) ? initialMonth : current);
  const [open, setOpen] = useState<Open>(null);
  const { toast, show } = useToast();

  const s = statement(customer.opening_balance, entries, payments, month);
  const b = bill(entries, payments, month);
  const qtyOn = (d: string) => entries.filter((e) => e.date === d).reduce((sum, e) => sum + e.qty, 0);

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5">
        <button onClick={() => setOpen({ kind: "bottle" })} disabled={!customer.active} className={`${btnPrimary} min-h-14 text-[17px]`}>
          Bottles
        </button>
        <button onClick={() => setOpen({ kind: "payment" })} className={`${btn} min-h-14 text-[17px]`}>
          Payment
        </button>
      </div>

      <div role="group" aria-label="Month" className="flex gap-2 overflow-x-auto pb-0.5">
        {months.map((m) => (
          <button
            key={m}
            onClick={() => setMonth(m)}
            aria-pressed={m === month}
            className="min-h-10 flex-none rounded-full border border-line bg-surface px-3.5 text-sm font-semibold text-muted aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-bg"
          >
            {fmtMonth(m)}
          </button>
        ))}
      </div>

      {customer.billing_type === "monthly" && (b.amount > 0 || b.paidFor > 0) && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-3.5 py-3">
          <div>
            <p className="text-xs font-bold tracking-wider text-muted uppercase">{fmtMonth(month)} bill</p>
            <p className="text-sm text-muted tabular-nums">Bill {rs(b.amount)} · Paid {rs(b.paidFor)}</p>
          </div>
          <b className={`text-right tabular-nums ${b.left > 0 ? "text-due" : "text-adv"}`}>
            {b.left > 0 ? `${rs(b.left)} left` : b.left < 0 ? `${rs(b.left)} extra` : "Paid ✓"}
          </b>
        </div>
      )}

      <div className="grid grid-cols-4 gap-px overflow-hidden rounded-2xl border border-line bg-line">
        <Cell label="Bottles" value={String(s.bottles)} sub={`${s.empties} back`} />
        <Cell label="Billed" value={N(s.billed)} />
        <Cell label="Paid" value={N(s.paid)} className="text-adv" />
        <Cell label="Closing" value={N(s.closing)} className={tone(s.closing)} />
      </div>

      <section aria-label={`Register for ${fmtMonth(month)}`} className="overflow-hidden rounded-2xl border border-line bg-surface">
        <Row head date="Date" what="Entry" amount="Rs" running="Balance" />
        <Row fixed date={fmtDate(month + "-01")} what="Brought forward" running={N(s.opening)} />
        {s.lines.length === 0 && <p className="border-t border-line px-4 py-6 text-center text-muted">No entries this month.</p>}
        {s.lines.map((l) => (
          <LineRow key={l.kind === "delivery" ? l.entry.id : l.payment.id} line={l} onOpen={setOpen} />
        ))}
        <Row fixed date="" what="Closing balance" running={N(s.closing)} runningClass={tone(s.closing)} />
      </section>
      <p className="text-sm text-muted">Tap any line to correct it. Positive balance = customer owes you. Negative = advance.</p>

      {open?.kind === "bottle" && (
        <BottleSheet
          customer={customer}
          entry={open.entry}
          date={today}
          today={today}
          sameDayQty={qtyOn}
          onClose={() => setOpen(null)}
          onSaved={(m) => show(m)}
        />
      )}
      {open?.kind === "payment" && (
        <PaymentSheet
          customer={customer}
          payment={open.payment}
          entries={entries}
          payments={payments}
          today={today}
          onClose={() => setOpen(null)}
          onSaved={(m) => show(m)}
        />
      )}
      <Toast toast={toast} />
    </>
  );
}

function Cell({ label, value, sub, className = "" }: { label: string; value: string; sub?: string; className?: string }) {
  return (
    <div className="min-w-0 bg-surface px-2.5 py-2">
      <span className="block text-[11px] font-semibold tracking-wider text-muted uppercase">{label}</span>
      <b className={`block truncate text-[15px] tabular-nums ${className}`}>{value}</b>
      {sub && <span className="block text-xs text-muted">{sub}</span>}
    </div>
  );
}

const grid = "grid grid-cols-[50px_1fr_70px_76px] items-center gap-1.5 px-3";

function Row(p: { head?: boolean; fixed?: boolean; date: string; what: string; amount?: string; running: string; runningClass?: string }) {
  if (p.head) {
    return (
      <div className={`${grid} min-h-8.5 bg-sunk text-[11px] font-bold tracking-wider text-muted uppercase`}>
        <span>{p.date}</span><span>{p.what}</span><span className="text-right">{p.amount}</span><span className="text-right">{p.running}</span>
      </div>
    );
  }
  return (
    <div className={`${grid} min-h-12 border-t border-line bg-sunk font-semibold`}>
      <span className="text-[13px] text-muted tabular-nums">{p.date}</span>
      <span className="text-sm">{p.what}</span>
      <span />
      <span className={`text-right text-sm tabular-nums ${p.runningClass ?? ""}`}>{p.running}</span>
    </div>
  );
}

function LineRow({ line, onOpen }: { line: Line; onOpen: (o: Open) => void }) {
  const isPay = line.kind === "payment";
  const what = isPay ? "Payment" : line.entry.qty ? bottles(line.entry.qty) : "Empties pickup";
  const sub = isPay
    ? [line.payment.for_month && `For ${fmtMonth(line.payment.for_month)}`, METHODS[line.payment.method], line.payment.note].filter(Boolean).join(" · ")
    : line.entry.qty
      ? `× ${rs(line.entry.rate)} · ${line.entry.empties_returned} empties back`
      : `${line.entry.empties_returned} empties collected`;
  return (
    <button
      onClick={() => onOpen(isPay ? { kind: "payment", payment: line.payment } : { kind: "bottle", entry: line.entry })}
      className={`${grid} min-h-14 w-full border-t border-line text-left`}
    >
      <span className="text-[13px] text-muted tabular-nums">{fmtDate(line.date)}</span>
      <span className="min-w-0 text-sm">
        {what}
        <small className="block truncate text-xs text-muted">{sub}</small>
      </span>
      <span className={`text-right text-sm tabular-nums ${isPay ? "text-adv" : ""}`}>
        {line.amount === 0 ? "–" : isPay ? `−${N(-line.amount)}` : `+${N(line.amount)}`}
      </span>
      <span className={`text-right text-sm font-bold tabular-nums ${tone(line.running)}`}>{N(line.running)}</span>
    </button>
  );
}
