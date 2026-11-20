import type { ReactNode } from "react";

/** Sticky screen header + content column used by every tab. */
export function Screen({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-5 border-b border-line bg-surface pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex min-h-14 max-w-3xl flex-col justify-center px-4 py-2">
          <h1 className="font-display text-[22px] font-bold">{title}</h1>
          {sub && <p className="truncate text-sm text-muted">{sub}</p>}
        </div>
      </header>
      <main className="mx-auto flex max-w-3xl flex-col gap-3.5 px-4 py-4">{children}</main>
    </>
  );
}

/** Placeholder for screens built in later phases. */
export function ComingSoon({ phase, what }: { phase: number; what: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 text-muted">
      <p className="font-semibold text-ink">Coming in Phase {phase}</p>
      <p className="mt-1">{what}</p>
    </div>
  );
}
