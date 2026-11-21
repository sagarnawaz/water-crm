"use client";

import { useState } from "react";
import { addDelivery, deleteDelivery, updateDelivery } from "@/app/(app)/delivery-actions";
import { addPayment } from "@/app/(app)/payment-actions";
import { btnPrimary, input } from "@/components/screen";
import { calcRow, Choice, DeleteButton, noteInfo, noteWarn, Sheet } from "@/components/sheet";
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
  billing_type: "monthly" | "daily";
};

type Paid = "none" | "full" | "part";

/**
 * Add or correct one entry: full bottles delivered and empties collected.
 * Empties follow the bottle count (the usual swap) until the owner changes them.
 * Daily customers can record what they paid on the spot (saved as cash to rider).
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
  /** Bottles already saved for this customer on a date (for the "separate delivery" note). */
  sameDayQty: (date: string) => number;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [id] = useState(() => entry?.id ?? newId()); // fixed per sheet, so a double tap saves once
  const [payId] = useState(newId);
  const [date, setDate] = useState(entry?.date ?? initialDate);
  const [qty, setQty] = useState(entry?.qty ?? customer.default_qty ?? 1);
  const [empties, setEmpties] = useState(entry?.empties_returned ?? qty);
  const [linked, setLinked] = useState(!entry);
  const [paid, setPaid] = useState<Paid>("none");
  const [part, setPart] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const rate = entry?.rate ?? customer.rate;
  const total = qty * rate;
  const heldBefore = customer.bottles_at_home - (entry ? entry.qty - entry.empties_returned : 0);
  const after = heldBefore + qty - empties;
  const sameDay = entry ? 0 : sameDayQty(date);
  const askPaid = !entry && customer.billing_type === "daily" && qty > 0;

  const changeQty = (n: number) => {
    const q = Math.max(0, Math.min(MAX_QTY, n));
    setQty(q);
    if (linked) setEmpties(q);
  };

  async function finish(res: { error?: string }, message: string) {
    setBusy(false);
    if (res.error) return setError(res.error);
    onSaved(message);
    onClose();
  }

  async function save() {
    setError("");
    let payAmount = 0;
    if (askPaid && paid === "full") payAmount = total;
    if (askPaid && paid === "part") {
      payAmount = Number(part.replace(/,/g, ""));
      if (!Number.isInteger(payAmount) || payAmount < 1) return setError('Enter how much they paid, or choose "Not paid".');
      if (payAmount >= total) return setError(`That is the full amount (${rs(total)}). Choose "Paid full" instead.`);
    }
    setBusy(true);
    if (entry) return finish(await updateDelivery(id, { date, qty, empties }), "Entry updated. Balance recalculated.");

    const res = await addDelivery(id, customer.id, { date, qty, empties });
    if (res.error || !payAmount) {
      return finish(res, qty ? `Saved ${bottles(qty)}, ${empties} empties back` : `Saved pickup of ${empties} empties`);
    }
    const pay = await addPayment(payId, customer.id, { date, amount: payAmount, method: "cash_rider", forMonth: null, note: null });
    if (pay.error) {
      onSaved(`Bottles saved, but the payment was not: ${pay.error} Add it with the Payment button.`);
      return onClose();
    }
    finish({}, `Saved ${bottles(qty)} and ${rs(payAmount)} payment`);
  }

  return (
    <Sheet title={entry ? "Edit entry" : "Add bottles"} sub={`${customerLabel(customer)} · ${customer.area}`} onClose={onClose}>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Date
        <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} className={input} />
      </label>
      {sameDay > 0 && <p className={noteInfo}>{bottles(sameDay)} already saved on {fmtDate(date)}. This will be saved as a separate delivery.</p>}
      {date && isOldDate(date, today) && <p className={noteWarn}>This date is more than 60 days ago. Check it is correct.</p>}

      <Stepper label="Full bottles delivered" value={qty} onChange={changeQty} big />
      <Stepper
        label="Empty bottles collected"
        value={empties}
        onChange={(n) => {
          setEmpties(Math.max(0, Math.min(MAX_QTY, n)));
          setLinked(false);
        }}
      />

      <div className={calcRow}>
        <span className="text-sm text-muted">{qty} × {rs(rate)}</span>
        <b className="text-xl">{rs(total)}</b>
      </div>
      <div className={calcRow}>
        <span className="text-sm text-muted">Bottles at their home after this</span>
        <b className="text-xl">{after}</b>
      </div>
      {after < 0 && <p className={noteWarn}>That is more empties than this customer has. Check the count.</p>}
      {entry && entry.rate !== customer.rate && entry.qty > 0 && (
        <p className="text-sm text-muted">This entry keeps its original price of {rs(entry.rate)}. The current price is {rs(customer.rate)}.</p>
      )}

      {askPaid && (
        <>
          <Choice<Paid> label="Paid now?" value={paid} onChange={setPaid} options={[["none", "Not paid"], ["full", "Paid full"], ["part", "Paid some"]]} />
          {paid === "part" && (
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              Amount paid (Rs)
              <input inputMode="numeric" value={part} onChange={(e) => setPart(e.target.value)} className={input} />
            </label>
          )}
          {paid !== "none" && <p className="text-sm text-muted">Saved as cash collected by rider.</p>}
        </>
      )}

      {error && <p role="alert" className="text-sm font-semibold text-due">{error}</p>}
      <button onClick={save} disabled={busy || qty + empties === 0 || (!entry && !customer.active)} className={btnPrimary}>
        {busy ? "Saving…" : entry ? "Save changes" : qty ? "Save" : "Save empties pickup"}
      </button>
      {entry && (
        <DeleteButton
          label="Delete this entry"
          busy={busy}
          onConfirm={async () => {
            setBusy(true);
            finish(await deleteDelivery(id), "Entry deleted. It stays in the change history.");
          }}
        />
      )}
    </Sheet>
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
