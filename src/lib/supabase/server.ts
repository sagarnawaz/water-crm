import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/** Supabase client acting as the logged-in owner. Create one per request; RLS limits it to their business. */
export async function createClient() {
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {
            // Server Components can't set cookies; src/proxy.ts refreshes the session instead.
          }
        },
      },
    },
  );
}
