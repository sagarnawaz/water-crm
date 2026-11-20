"use client";

import { useState } from "react";
import { BottleSheet } from "@/components/bottle-sheet";
import { btnPrimary } from "@/components/screen";
import { Toast, useToast } from "@/components/toast";
import { rs, type Customer } from "@/lib/customers";
import { fmtDate, fmtMonth } from "@/lib/dates";
import { bottles, type Delivery } from "@/lib/deliveries";

/** "Bottles" button plus this month's entries; tap an entry to correct it. */
export function CustomerEntries({ customer, entries, today }: { customer: Customer; entries: Delivery[]; today: string }) {
  const [sheet, setSheet] = useState<{ entry?: Delivery } | null>(null);
  const { toast, show } = useToast();
  const qtyOn = (d: string) => entries.filter((e) => e.date === d).reduce((s, e) => s + e.qty, 0);
  const totalQty = entries.reduce((s, e) => s + e.qty, 0);
  const totalAmount = entries.reduce((s, e) => s + e.amount, 0);

  return (
    <>
      <button onClick={() => setSheet({})} disabled={!customer.active} className={`${btnPrimary} min-h-14 text-[17px]`}>
        Bottles
      </button>

      <section aria-label={`Entries in ${fmtMonth(today)}`} className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="flex items-baseline justify-between bg-sunk px-3.5 py-2.5">
          <h2 className="text-xs font-bold tracking-wider text-muted uppercase">{fmtMonth(today)}</h2>
          <span className="text-sm text-muted tabular-nums">{bottles(totalQty)} · {rs(totalAmount)}</span>
        </div>
        {entries.length === 0 && <p className="px-4 py-6 text-center text-muted">No bottles entered this month yet.</p>}
        {entries.map((e) => (
          <button
            key={e.id}
            onClick={() => setSheet({ entry: e })}
            className="grid min-h-14 w-full grid-cols-[56px_1fr_auto] items-center gap-2 border-t border-line px-3.5 text-left"
          >
            <span className="text-sm text-muted tabular-nums">{fmtDate(e.date)}</span>
            <span className="min-w-0 text-sm">
              {e.qty ? bottles(e.qty) : "Empties pickup"}
              <small className="block truncate text-xs text-muted">
                {e.qty ? `× ${rs(e.rate)} · ` : ""}{e.empties_returned} empties back
              </small>
            </span>
            <span className="text-right text-sm font-semibold tabular-nums">{e.amount ? rs(e.amount) : "–"}</span>
          </button>
        ))}
      </section>

      {sheet && (
        <BottleSheet
          customer={customer}
          entry={sheet.entry}
          date={today}
          today={today}
          sameDayQty={qtyOn}
          onClose={() => setSheet(null)}
          onSaved={(m) => show(m)}
        />
      )}
      <Toast toast={toast} />
    </>
  );
}
