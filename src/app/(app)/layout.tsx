import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";
import { Nav } from "./nav";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: business } = await supabase.from("businesses").select("name").maybeSingle();

  // Logged in, but no business row visible: the account was created without a membership.
  if (!business) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 px-4">
        <h1 className="font-display text-2xl font-bold">Account not set up</h1>
        <p className="text-muted">Your login works, but it is not linked to a business yet. Contact Paani Register support.</p>
        <form action={signOut}>
          <button className="min-h-12 w-full rounded-xl border border-line bg-surface font-semibold">Sign out</button>
        </form>
      </main>
    );
  }

  return (
    <>
      <Nav />
      <div className="pb-24 lg:ml-56 lg:pb-10">{children}</div>
    </>
  );
}
