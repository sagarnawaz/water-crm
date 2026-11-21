"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Action = { label: string; run: () => void };
type ToastData = { message: string; actions: Action[]; key: number } | null;

/** One message at a time, bottom of the screen; stays longer when it has buttons. */
export function useToast() {
  const [toast, setToast] = useState<ToastData>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback((message: string, actions: Action[] = []) => {
    clearTimeout(timer.current);
    setToast({ message, actions, key: Date.now() });
    timer.current = setTimeout(() => setToast(null), actions.length ? 6000 : 2800);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);

  const wrapped: ToastData = toast && {
    ...toast,
    actions: toast.actions.map((a) => ({
      label: a.label,
      run: () => {
        setToast(null);
        a.run();
      },
    })),
  };
  return { toast: wrapped, show };
}

export function Toast({ toast }: { toast: ToastData }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 flex justify-center px-4 lg:bottom-6 lg:left-56"
    >
      {toast && (
        <div key={toast.key} className="pointer-events-auto flex w-full max-w-lg flex-wrap items-center gap-2 rounded-2xl bg-ink py-2.5 pr-2.5 pl-3.5 text-[15px] text-bg shadow-lg">
          <span className="min-w-36 flex-1">{toast.message}</span>
          {toast.actions.map((a) => (
            <button key={a.label} onClick={a.run} className="min-h-10 rounded-xl bg-bg px-3 text-sm font-bold text-ink">
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
