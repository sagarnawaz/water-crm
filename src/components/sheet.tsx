"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Bottom sheet on phones, centred dialog on desktop. Native <dialog>: focus trap and Esc for free. */
export function Sheet({ title, sub, onClose, children }: { title: string; sub: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  // Open once. No cleanup close(): that fires the dialog's close event, which would count as the owner
  // closing the sheet (React runs effects twice in development). Unmounting removes the dialog anyway.
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

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
            <h2 id="sheet-title" className="font-display text-[17px] font-bold">{title}</h2>
            <p className="truncate text-sm text-muted">{sub}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="grid size-11 place-items-center rounded-xl border border-line">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="size-5" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

export const note = "rounded-xl px-3.5 py-2.5 text-sm";
export const noteInfo = `${note} bg-accent-soft text-accent`;
export const noteWarn = `${note} bg-warn-soft text-warn`;
export const calcRow = "flex items-baseline justify-between rounded-xl bg-sunk px-3.5 py-3 tabular-nums";

/** Delete button that needs a second tap. */
export function DeleteButton({ label, busy, onConfirm }: { label: string; busy: boolean; onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  return (
    <button
      onClick={() => (armed ? onConfirm() : setArmed(true))}
      disabled={busy}
      className={`min-h-13 rounded-xl border border-due font-semibold ${armed ? "bg-due text-surface" : "text-due"}`}
    >
      {armed ? "Tap again to delete" : label}
    </button>
  );
}

/** Row of equal buttons where exactly one is chosen. */
export function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
  vertical,
}: {
  label: string;
  value: T;
  options: [T, ReactNode][];
  onChange: (v: T) => void;
  vertical?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold">{label}</span>
      <div className={`grid gap-1.5 rounded-xl bg-sunk p-1 ${vertical ? "" : "auto-cols-fr grid-flow-col"}`}>
        {options.map(([v, text]) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={value === v}
            onClick={() => onChange(v)}
            className="min-h-11 rounded-lg px-1.5 text-sm font-semibold text-muted aria-checked:bg-surface aria-checked:text-ink aria-checked:shadow-sm"
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
