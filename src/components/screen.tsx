import Link from "next/link";
import type { ReactNode } from "react";

/** Sticky screen header + content column used by every tab. */
export function Screen({
  title,
  sub,
  back,
  action,
  children,
}: {
  title: string;
  sub?: string | null;
  back?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <header className="sticky top-0 z-5 border-b border-line bg-surface pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex min-h-14 max-w-3xl items-center gap-2.5 px-4 py-2">
          {back && (
            <Link href={back} aria-label="Back" className={iconBtn}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="size-5.5" aria-hidden>
                <path d="m15 5-7 7 7 7" />
              </svg>
            </Link>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-[22px] font-bold">{title}</h1>
            {sub && <p className="truncate text-sm text-muted">{sub}</p>}
          </div>
          {action}
        </div>
      </header>
      <main className="mx-auto flex max-w-3xl flex-col gap-3.5 px-4 py-4">{children}</main>
    </>
  );
}

export const iconBtn = "grid size-11 flex-none place-items-center rounded-xl border border-line bg-surface";
export const btn = "inline-flex min-h-13 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 font-semibold";
export const btnPrimary = "inline-flex min-h-13 items-center justify-center gap-2 rounded-xl bg-accent px-4 font-semibold text-accent-ink disabled:opacity-50";
export const input = "min-h-13 w-full rounded-xl border border-line bg-surface px-3.5 text-[17px] text-ink placeholder:text-muted disabled:opacity-60";

/** Placeholder for screens built in later phases. */
export function ComingSoon({ phase, what }: { phase: number; what: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 text-muted">
      <p className="font-semibold text-ink">Coming in Phase {phase}</p>
      <p className="mt-1">{what}</p>
    </div>
  );
}
