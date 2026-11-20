import Link from "next/link";
import { iconBtn, Screen } from "@/components/screen";
import { rs } from "@/lib/customers";
import { createClient } from "@/lib/supabase/server";
import { CustomerList } from "./customer-list";
import { listCustomers } from "./data";

const plus = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="size-5.5" aria-hidden>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export default async function CustomersPage() {
  const customers = await listCustomers(await createClient());
  const active = customers.filter((c) => c.active);
  const due = active.reduce((s, c) => s + Math.max(0, c.balance), 0);

  return (
    <Screen
      title="Customers"
      sub={`${active.length} active · ${rs(due)} to collect`}
      action={<Link href="/customers/new" aria-label="Add customer" className={iconBtn}>{plus}</Link>}
    >
      <CustomerList customers={customers} />
    </Screen>
  );
}
