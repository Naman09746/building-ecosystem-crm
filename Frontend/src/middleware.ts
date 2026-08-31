import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Routes that require an authenticated session
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/leads",
  "/pipeline",
  "/tasks",
  "/projects",
  "/people",
  "/activities",
  "/reports",
  "/users",
  "/regions",
  "/settings",
  "/agent-live",
];

// Auth-flow routes — redirect already-authenticated users to the app
const AUTH_FLOW_PREFIXES = ["/login", "/onboarding", "/choose-plan", "/setup-org"];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isAuthFlow(pathname: string): boolean {
  return AUTH_FLOW_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Without env config we cannot verify sessions server-side; let pages render
  // (they show a configuration notice) and never guess at auth state.
  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes("your-project-id")) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    const { data: { user } } = await supabase.auth.getUser();
    const pathname = request.nextUrl.pathname;

    if (!user && isProtected(pathname)) {
      const hasAuthCookie = request.cookies.getAll().some((c) => c.name.includes("sb-") || c.name.includes("auth"));
      if (!hasAuthCookie) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/login";
        redirectUrl.searchParams.set("next", pathname);
        return NextResponse.redirect(redirectUrl);
      }
    }

    if (user && pathname === "/login") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/dashboard";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }
  } catch (e) {
    return response;
  }

  return response;
}

export const config = {
  matcher: [
    // Page routes only — API routes enforce their own auth (webhooks are HMAC-public)
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
