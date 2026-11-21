"use client";

import { useState, type ReactNode } from "react";
import { addPayment, deletePayment, updatePayment } from "@/app/(app)/payment-actions";
import { btnPrimary, input } from "@/components/screen";
import { calcRow, Choice, DeleteButton, Sheet } from "@/components/sheet";
import { customerLabel, rs } from "@/lib/customers";
import { fmtMonth } from "@/lib/dates";
import { newId } from "@/lib/deliveries";
import { activeMonths, bill, oldestUnpaid, type Entry } from "@/lib/ledger";
import { BIG_AMOUNT, METHODS, nextMonth, type Method, type Payment } from "@/lib/payments";

export type PayCustomer = { id: string; house_no: string; floor: string; area: string; billing_type: "monthly" | "daily"; balance: number };

const shortMonth = (ym: string) => fmtMonth(ym).replace(/ \d{4}$/, "");

/** Add or correct a payment. Monthly customers choose which month's bill it pays. */
export function PaymentSheet({
  customer,
  payment,
  entries,
  payments,
  today,
  onClose,
  onSaved,
}: {
  customer: PayCustomer;
  payment?: Payment;
  entries: Entry[];
  payments: Payment[];
  today: string;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const monthly = customer.billing_type === "monthly";
  const current = today.slice(0, 7);
  const [id] = useState(() => payment?.id ?? newId()); // fixed per sheet, so a double tap saves once
  const [amount, setAmount] = useState(payment ? String(payment.amount) : "");
  const [method, setMethod] = useState<Method>(payment?.method ?? (monthly ? "cash_owner" : "cash_rider"));
  const [date, setDate] = useState(payment?.date ?? today);
  const [note, setNote] = useState(payment?.note ?? "");
  const [forMonth, setForMonth] = useState(payment?.for_month?.slice(0, 7) ?? oldestUnpaid(entries, payments, current, payment?.id));
  const [bigOk, setBigOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const before = customer.balance + (payment?.amount ?? 0);
  const value = Number(amount.replace(/[,\s]/g, ""));
  const valid = /^\d+$/.test(amount.replace(/[,\s]/g, "")) && value > 0;
  const after = before - (valid ? value : 0);
  const left = (m: string) => bill(entries, payments, m, payment?.id).left;

  // Months to offer: the last 4 with activity, the chosen one, and next month for an advance.
  const months = [...new Set([...activeMonths(entries, payments, current).filter((m) => m <= current).slice(0, 4), forMonth, nextMonth(today)])].sort();
  const monthLeft = monthly ? left(forMonth) : 0;

  async function save() {
    setError("");
    if (!valid) return setError("Enter the amount in whole rupees, more than 0.");
    if (value > BIG_AMOUNT && !bigOk) {
      setBigOk(true);
      return setError(`${rs(value)} is a large amount. Tap the button again to confirm.`);
    }
    setBusy(true);
    const input = { date, amount: value, method, forMonth: monthly ? forMonth : null, note: note || null };
    const res = payment ? await updatePayment(id, input) : await addPayment(id, customer.id, input);
    setBusy(false);
    if (res.error) return setError(res.error);
    onSaved(`Payment ${rs(value)} saved${monthly ? ` for ${fmtMonth(forMonth)}` : ""} · ${METHODS[method]}`);
    onClose();
  }

  const balanceText = (b: number) => (b > 0 ? `${rs(b)} due` : b < 0 ? `${rs(b)} advance` : "Clear");

  return (
    <Sheet title={payment ? "Edit payment" : "Add payment"} sub={`${customerLabel(customer)} · ${customer.area}`} onClose={onClose}>
      <p className="text-sm text-muted">
        Balance before this payment: <b className={before > 0 ? "text-due" : before < 0 ? "text-adv" : ""}>{balanceText(before)}</b>
      </p>

      {monthly && (
        <Choice
          label="Which month's bill?"
          value={forMonth}
          onChange={setForMonth}
          options={months.map((m) => {
            const l = left(m);
            return [m, <span key={m} className="flex flex-col leading-tight">{shortMonth(m)}<small className="font-normal">{l > 0 ? `${rs(l)} left` : m > current ? "Advance" : "Paid"}</small></span>];
          })}
        />
      )}

      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Amount received (Rs)
        <input
          inputMode="numeric"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setBigOk(false);
          }}
          placeholder="0"
          className={`${input} min-h-16 text-center font-display text-[34px] font-bold`}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        {monthly && monthLeft > 0 && (
          <QuickAmount onPick={setAmount} value={monthLeft}>{shortMonth(forMonth)} bill {rs(monthLeft)}</QuickAmount>
        )}
        {before > 0 && before !== monthLeft && <QuickAmount onPick={setAmount} value={before}>Full balance {rs(before)}</QuickAmount>}
      </div>

      <Choice<Method> label="Paid how?" value={method} onChange={setMethod} vertical options={Object.entries(METHODS) as [Method, string][]} />

      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Date
        <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} className={input} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Note (optional)
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="e.g. JazzCash ref 4471" className={input} />
      </label>

      <div className={calcRow}>
        <span className="text-sm text-muted">After this payment</span>
        <b className={`text-xl ${after > 0 ? "text-due" : after < 0 ? "text-adv" : ""}`}>{balanceText(after)}</b>
      </div>

      {error && <p role="alert" className="text-sm font-semibold text-due">{error}</p>}
      <button onClick={save} disabled={busy} className={btnPrimary}>
        {busy ? "Saving…" : bigOk ? `Yes, save ${rs(value)}` : payment ? "Save changes" : "Save payment"}
      </button>
      {payment && (
        <DeleteButton
          label="Delete this payment"
          busy={busy}
          onConfirm={async () => {
            setBusy(true);
            const res = await deletePayment(id);
            setBusy(false);
            if (res.error) return setError(res.error);
            onSaved("Payment deleted. It stays in the change history.");
            onClose();
          }}
        />
      )}
    </Sheet>
  );
}

function QuickAmount({ value, onPick, children }: { value: number; onPick: (v: string) => void; children: ReactNode }) {
  return (
    <button type="button" onClick={() => onPick(String(value))} className="min-h-10 rounded-full border border-line bg-surface px-3.5 text-sm font-semibold">
      {children}
    </button>
  );
}
