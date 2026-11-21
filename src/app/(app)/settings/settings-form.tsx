"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import { btnPrimary, input } from "@/components/screen";
import { FLOORS, floorText } from "@/lib/customers";
import type { Pricing } from "@/lib/pricing";
import { saveSettings } from "./actions";

export function SettingsForm({ pricing }: { pricing: Pricing }) {
  const [state, action, pending] = useActionState(saveSettings, undefined);

  // Submit without React's automatic form reset, so typed values survive a validation error.
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => action(data));
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3.5">
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Business name
        <input name="name" defaultValue={pricing.name} required className={input} />
      </label>

      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
        <div>
          <h2 className="font-display text-[17px] font-bold">Price per bottle by floor</h2>
          <p className="mt-1 text-sm text-muted">
            A new price applies to new entries only. Past entries keep the price they were saved with. Customers with a
            custom price are not affected.
          </p>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2.5">
          {FLOORS.map((f) => (
            <label key={f} className="flex flex-col gap-1 text-sm font-semibold">
              {floorText(f)}
              <input
                name={`fp_${f}`}
                inputMode="numeric"
                defaultValue={pricing.floors[f] ?? pricing.defaultRate}
                required
                className={input}
              />
            </label>
          ))}
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Other floors
            <input name="default_rate" inputMode="numeric" defaultValue={pricing.defaultRate} required className={input} />
          </label>
        </div>
      </section>

      {state?.error && <p role="alert" className="text-sm font-semibold text-due">{state.error}</p>}
      {state?.saved && <p role="status" className="text-sm font-semibold text-adv">Saved. New prices apply to new entries.</p>}
      <button disabled={pending} className={btnPrimary}>{pending ? "Saving…" : "Save settings"}</button>
    </form>
  );
}
