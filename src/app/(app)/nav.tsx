"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CustomersIcon, DropIcon, SettingsIcon, SummaryIcon, TodayIcon } from "@/components/icons";

const TABS = [
  { href: "/", label: "Today", Icon: TodayIcon },
  { href: "/customers", label: "Customers", Icon: CustomersIcon },
  { href: "/summary", label: "Summary", Icon: SummaryIcon },
  { href: "/settings", label: "Settings", Icon: SettingsIcon },
];

// Bottom tabs on phones, sidebar from 1024px.
export function Nav() {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-4 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:inset-y-0 lg:right-auto lg:w-56 lg:auto-rows-min lg:grid-cols-1 lg:gap-1 lg:border-t-0 lg:border-r lg:p-3"
    >
      <div className="hidden items-center gap-2.5 px-2 pt-1 pb-5 font-display text-lg font-bold lg:flex">
        <span className="grid size-9 place-items-center rounded-lg bg-accent text-accent-ink">
          <DropIcon className="size-5" />
        </span>
        Paani Register
      </div>
      {TABS.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={active(href) ? "page" : undefined}
          className="flex min-h-15 flex-col items-center justify-center gap-0.5 text-xs font-semibold text-muted aria-[current=page]:text-accent lg:min-h-12 lg:flex-row lg:justify-start lg:gap-3 lg:rounded-lg lg:px-3 lg:text-[15px] lg:aria-[current=page]:bg-accent-soft"
        >
          <Icon className="size-6" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
