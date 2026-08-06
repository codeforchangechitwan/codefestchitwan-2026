import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";

/**
 * Next.js 16 renamed Middleware to Proxy. This runs before every matched
 * request to refresh the Supabase session cookie and to bounce signed-out
 * visitors away from member/admin routes.
 *
 * This is only an optimistic gate — every protected page re-checks the user
 * and role server-side, and RLS is the real boundary.
 */

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/id-card",
  "/quiz",
  "/leaderboard",
  "/announcements",
  "/profile",
  "/verify",
  "/admin",
];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Without env vars configured, behave like a plain pass-through so the
  // public pages still render.
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Do not remove: this refreshes the auth token and writes it onto `response`.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected && !user) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (pathname === "/login" && user) {
    const dashboard = request.nextUrl.clone();
    dashboard.pathname = "/dashboard";
    dashboard.search = "";
    return NextResponse.redirect(dashboard);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets, image optimisation output, and the
     * PWA files that must stay cacheable.
     */
    "/((?!_next/static|_next/image|favicon.ico|icons/|brand/|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
