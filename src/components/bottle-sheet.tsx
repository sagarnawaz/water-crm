"use client";

import { useEffect, useRef, useState } from "react";
import { addDelivery, deleteDelivery, updateDelivery } from "@/app/(app)/delivery-actions";
import { btnPrimary, input } from "@/components/screen";
import { customerLabel, rs } from "@/lib/customers";
import { fmtDate } from "@/lib/dates";
import { bottles, isOldDate, MAX_QTY, newId, type Delivery } from "@/lib/deliveries";

export type SheetCustomer = {
  id: string;
  house_no: string;
  floor: string;
  area: string;
  rate: number;
  bottles_at_home: number;
  default_qty: number | null;
  active: boolean;
};

/**
 * Bottom sheet to add or correct one entry: full bottles delivered and empties collected.
 * Empties follow the bottle count (the usual swap) until the owner changes them.
 */
export function BottleSheet({
  customer,
  entry,
  date: initialDate,
  today,
  sameDayQty,
  onClose,
  onSaved,
}: {
  customer: SheetCustomer;
  entry?: Delivery;
  date: string;
  today: string;
  /** Bottles already saved for this customer on a date (to show the "separate delivery" note). */
  sameDayQty: (date: string) => number;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [id] = useState(() => entry?.id ?? newId()); // fixed per sheet, so a double tap saves once
  const [date, setDate] = useState(entry?.date ?? initialDate);
  const [qty, setQty] = useState(entry?.qty ?? customer.default_qty ?? 1);
  const [empties, setEmpties] = useState(entry?.empties_returned ?? qty);
  const [linked, setLinked] = useState(!entry);
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Open once. No cleanup close(): that fires the dialog's close event, which would count as the owner
  // closing the sheet. Unmounting removes the dialog anyway.
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  const rate = entry?.rate ?? customer.rate;
  const heldBefore = customer.bottles_at_home - (entry ? entry.qty - entry.empties_returned : 0);
  const after = heldBefore + qty - empties;
  const sameDay = entry ? 0 : sameDayQty(date);

  const changeQty = (n: number) => {
    const q = Math.max(0, Math.min(MAX_QTY, n));
    setQty(q);
    if (linked) setEmpties(q);
  };

  async function run(action: () => Promise<{ error?: string }>, message: string) {
    setBusy(true);
    setError("");
    const res = await action();
    setBusy(false);
    if (res.error) return setError(res.error);
    onSaved(message);
    onClose();
  }

  const save = () =>
    run(
      () => (entry ? updateDelivery(id, { date, qty, empties }) : addDelivery(id, customer.id, { date, qty, empties })),
      entry ? "Entry updated. Balance recalculated." : qty ? `Saved ${bottles(qty)}, ${empties} empties back` : `Saved pickup of ${empties} empties`,
    );
  const remove = () => (armed ? run(() => deleteDelivery(id), "Entry deleted. It stays in the change history.") : setArmed(true));

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="sheet-title"
      className="m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-3xl bg-surface p-0 text-ink backdrop:bg-black/50 lg:m-auto lg:max-w-md lg:rounded-3xl"
    >
      <div className="flex flex-col gap-3.5 px-4 pt-2 pb-[calc(18px+env(safe-area-inset-bottom))]">
        <div className="mx-auto h-1.5 w-10 rounded-full bg-line lg:hidden" />
        <div className="flex items-start gap-2.5">
          <div className="min-w-0 flex-1">
            <h2 id="sheet-title" className="font-display text-[17px] font-bold">{entry ? "Edit entry" : "Add bottles"}</h2>
            <p className="truncate text-sm text-muted">{customerLabel(customer)} · {customer.area}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="grid size-11 place-items-center rounded-xl border border-line">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="size-5" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Date
          <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} className={input} />
        </label>
        {sameDay > 0 && (
          <p className="rounded-xl bg-accent-soft px-3.5 py-2.5 text-sm text-accent">
            {bottles(sameDay)} already saved on {fmtDate(date)}. This will be saved as a separate delivery.
          </p>
        )}
        {date && isOldDate(date, today) && (
          <p className="rounded-xl bg-warn-soft px-3.5 py-2.5 text-sm text-warn">This date is more than 60 days ago. Check it is correct.</p>
        )}

        <Stepper label="Full bottles delivered" value={qty} onChange={changeQty} big />
        <Stepper
          label="Empty bottles collected"
          value={empties}
          onChange={(n) => {
            setEmpties(Math.max(0, Math.min(MAX_QTY, n)));
            setLinked(false);
          }}
        />

        <div className="flex items-baseline justify-between rounded-xl bg-sunk px-3.5 py-3 tabular-nums">
          <span className="text-sm text-muted">{qty} × {rs(rate)}</span>
          <b className="text-xl">{rs(qty * rate)}</b>
        </div>
        <div className="flex items-baseline justify-between rounded-xl bg-sunk px-3.5 py-3 tabular-nums">
          <span className="text-sm text-muted">Bottles at their home after this</span>
          <b className="text-xl">{after}</b>
        </div>
        {after < 0 && (
          <p className="rounded-xl bg-warn-soft px-3.5 py-2.5 text-sm text-warn">That is more empties than this customer has. Check the count.</p>
        )}
        {entry && entry.rate !== customer.rate && entry.qty > 0 && (
          <p className="text-sm text-muted">
            This entry keeps its original price of {rs(entry.rate)}. The current price is {rs(customer.rate)}.
          </p>
        )}

        {error && <p role="alert" className="text-sm font-semibold text-due">{error}</p>}
        <button onClick={save} disabled={busy || qty + empties === 0 || (!entry && !customer.active)} className={btnPrimary}>
          {busy ? "Saving…" : entry ? "Save changes" : qty ? "Save" : "Save empties pickup"}
        </button>
        {entry && (
          <button
            onClick={remove}
            disabled={busy}
            className={`min-h-13 rounded-xl border border-due font-semibold ${armed ? "bg-due text-surface" : "text-due"}`}
          >
            {armed ? "Tap again to delete" : "Delete this entry"}
          </button>
        )}
      </div>
    </dialog>
  );
}

function Stepper({ label, value, onChange, big }: { label: string; value: number; onChange: (n: number) => void; big?: boolean }) {
  const btn = `grid place-items-center rounded-full border border-line bg-sunk font-semibold ${big ? "size-18 text-4xl" : "size-14 text-3xl"}`;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold">{label}</span>
      <div className="flex items-center justify-center gap-5">
        <button type="button" onClick={() => onChange(value - 1)} aria-label={`One less: ${label}`} className={btn}>−</button>
        <output aria-live="polite" className={`min-w-20 text-center font-display font-bold tabular-nums ${big ? "text-6xl" : "text-[40px]"}`}>
          {value}
        </output>
        <button type="button" onClick={() => onChange(value + 1)} aria-label={`One more: ${label}`} className={btn}>+</button>
      </div>
    </div>
  );
}
