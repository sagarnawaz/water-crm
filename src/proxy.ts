import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Refreshes the Supabase session on every request and keeps logged-out visitors on /login.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list, headers) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const loggedIn = !!data?.claims;
  const onLogin = request.nextUrl.pathname === "/login";

  if (loggedIn === onLogin) {
    const redirect = NextResponse.redirect(new URL(onLogin ? "/" : "/login", request.url));
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }
  return response;
}

export const config = {
  // Public files: static assets, icons, manifest, the service worker and the offline page.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|offline.html|.*\\.(?:svg|png|jpg|ico|webmanifest)$).*)"],
};
