"use client";

import Link from "next/link";
import { startTransition, useActionState, useState, type FormEvent } from "react";
import { btnPrimary, input } from "@/components/screen";
import { addressKey, FLOORS, floorText, rs, type Customer } from "@/lib/customers";
import { floorPrice, type Pricing } from "@/lib/pricing";
import { saveCustomer } from "./actions";

type Existing = { id: string; key: string; label: string };

const label = "flex flex-col gap-1.5 text-sm font-semibold";
const hint = "text-sm text-muted";

export function CustomerForm({
  customer,
  pricing,
  areas,
  existing,
}: {
  customer?: Customer;
  pricing: Pricing;
  areas: string[];
  existing: Existing[];
}) {
  const [state, action, pending] = useActionState(saveCustomer, undefined);
  const isNew = !customer;
  const knownFloor = !customer || FLOORS.includes(customer.floor);

  const [house, setHouse] = useState(customer?.house_no ?? "");
  const [floorChoice, setFloorChoice] = useState(knownFloor ? (customer?.floor ?? "") : "__other");
  const [floorOther, setFloorOther] = useState(knownFloor ? "" : customer!.floor);
  const [area, setArea] = useState(customer?.area ?? "");
  const [customRate, setCustomRate] = useState(customer?.custom_rate?.toString() ?? "");
  const [active, setActive] = useState(customer?.active ?? true);

  const floor = floorChoice === "__other" ? floorOther.trim() : floorChoice;
  const dup =
    active && house.trim() && floor && area.trim()
      ? existing.find((e) => e.id !== customer?.id && e.key === addressKey(house, floor, area))
      : undefined;
  const custom = /^\d+$/.test(customRate) && Number(customRate) > 0;
  const price = custom ? Number(customRate) : floor ? floorPrice(pricing, floor) : null;
  const existingId = dup?.id ?? state?.existingId;

  // Submit without React's automatic form reset, so typed values survive a validation error.
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => action(data));
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3.5">
      {customer && <input type="hidden" name="id" value={customer.id} />}

      <div className="grid grid-cols-2 gap-3">
        <label className={label}>
          House / Flat no *
          <input name="house_no" value={house} onChange={(e) => setHouse(e.target.value)} placeholder="e.g. 12-B" autoComplete="off" required className={input} />
        </label>
        <label className={label}>
          Floor *
          <select name="floor" value={floorChoice} onChange={(e) => setFloorChoice(e.target.value)} required className={input}>
            <option value="">Choose</option>
            {FLOORS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
            <option value="__other">Other…</option>
          </select>
        </label>
      </div>
      {floorChoice === "__other" && (
        <label className={label}>
          Floor name
          <input name="floor_other" value={floorOther} onChange={(e) => setFloorOther(e.target.value)} placeholder="e.g. Mezzanine" required className={input} />
        </label>
      )}
      <label className={label}>
        Area / Street *
        <input name="area" value={area} onChange={(e) => setArea(e.target.value)} list="areas" placeholder="e.g. Gulshan St 4" autoComplete="off" required className={input} />
        <datalist id="areas">
          {areas.map((a) => (
            <option key={a} value={a} />
          ))}
        </datalist>
      </label>

      <div className="flex items-baseline justify-between rounded-xl bg-sunk px-3.5 py-3">
        <span className={hint}>
          {custom ? "Custom price per bottle" : floor ? `${FLOORS.includes(floor) ? floorText(floor) : "Other floor"} price per bottle` : "Choose a floor to see the price"}
        </span>
        {price !== null && <b className="text-lg tabular-nums">{rs(price)}</b>}
      </div>

      {existingId && (
        <p className="rounded-xl bg-warn-soft px-3.5 py-2.5 text-sm text-warn">
          {dup ? `${dup.label} is already a customer.` : state?.error}{" "}
          <Link href={`/customers/${existingId}`} className="font-semibold underline">Open existing</Link>
        </p>
      )}

      <details open={!isNew} className="rounded-2xl border border-line bg-surface">
        <summary className="flex min-h-13 cursor-pointer items-center px-3.5 font-semibold">More details (optional)</summary>
        <div className="flex flex-col gap-3.5 px-3.5 pb-3.5">
          <label className={label}>
            Customer name
            <input name="name" defaultValue={customer?.name ?? ""} autoComplete="off" className={input} />
          </label>
          <label className={label}>
            Phone
            <input name="phone" type="tel" inputMode="tel" defaultValue={customer?.phone ?? ""} placeholder="03xx-xxxxxxx" className={input} />
          </label>
          <fieldset className={label}>
            <legend className="mb-1.5">How do they pay?</legend>
            <Segmented
              name="billing_type"
              defaultValue={customer?.billing_type ?? "monthly"}
              options={[["monthly", "Monthly bill"], ["daily", "Pay per delivery"]]}
            />
          </fieldset>
          <div className="grid grid-cols-2 gap-3">
            <label className={label}>
              Custom price (Rs)
              <input name="custom_rate" inputMode="numeric" value={customRate} onChange={(e) => setCustomRate(e.target.value)} placeholder="Floor price" className={input} />
            </label>
            <label className={label}>
              Usual bottles/day
              <input name="default_qty" inputMode="numeric" defaultValue={customer?.default_qty ?? ""} placeholder="On request" className={input} />
            </label>
          </div>
          <p className={hint}>
            Leave the custom price empty to use the floor price from Settings.
            {!isNew && " A new price applies to new entries only."}
          </p>
          {isNew && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <label className={label}>
                  Old balance (Rs)
                  <input name="opening_balance" type="number" step="1" defaultValue="0" className={input} />
                </label>
                <label className={label}>
                  Bottles at home now
                  <input name="opening_bottles" inputMode="numeric" defaultValue="0" className={input} />
                </label>
              </div>
              <p className={hint}>
                Copy these from your paper register: what they already owe, and how many of your bottles they have. Use a
                minus sign for an advance, like -500.
              </p>
            </>
          )}
          {!isNew && (
            <fieldset className={label}>
              <legend className="mb-1.5">Status</legend>
              <Segmented
                name="active"
                defaultValue={active ? "true" : "false"}
                onChange={(v) => setActive(v === "true")}
                options={[["true", "Active"], ["false", "Inactive"]]}
              />
            </fieldset>
          )}
        </div>
      </details>

      {state?.error && !state.existingId && <p role="alert" className="text-sm font-semibold text-due">{state.error}</p>}
      <button disabled={pending || !!dup} className={btnPrimary}>
        {pending ? "Saving…" : isNew ? "Save customer" : "Save changes"}
      </button>
    </form>
  );
}

function Segmented({
  name,
  defaultValue,
  options,
  onChange,
}: {
  name: string;
  defaultValue: string;
  options: [string, string][];
  onChange?: (v: string) => void;
}) {
  return (
    <div className="grid auto-cols-fr grid-flow-col gap-1.5 rounded-xl bg-sunk p-1">
      {options.map(([value, text]) => (
        <label key={value} className="cursor-pointer">
          <input
            type="radio"
            name={name}
            value={value}
            defaultChecked={value === defaultValue}
            onChange={() => onChange?.(value)}
            className="peer sr-only"
          />
          <span className="flex min-h-11 items-center justify-center rounded-lg text-sm font-semibold text-muted peer-checked:bg-surface peer-checked:text-ink peer-checked:shadow-sm peer-focus-visible:outline-3 peer-focus-visible:outline-accent">
            {text}
          </span>
        </label>
      ))}
    </div>
  );
}
