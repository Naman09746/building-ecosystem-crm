import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { mapCanonicalRole } from "@repo/core/lib/server/rbac";

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
  "/billing",
  "/agent-live",
];

// Auth-flow routes — redirect already-authenticated users to the app
const AUTH_FLOW_PREFIXES = ["/login", "/onboarding", "/choose-plan", "/setup-org", "/invite"];

const MANAGER_PAGE_PREFIXES = ["/users", "/regions", "/reports", "/settings"];
const OWNER_ONLY_PREFIXES = ["/billing"];

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
    const isDemoSession = request.cookies.has("ecosystemrealty_demo_session");

    if (!user && !isDemoSession && isProtected(pathname)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(redirectUrl);
    }

    if (user && (pathname === "/login" || pathname.startsWith("/invite"))) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, org:org_id(setup_completed_at, team_size, primary_region, plan, billing_cycle)")
        .eq("user_id", user.id)
        .maybeSingle();

      const orgData = Array.isArray(profile?.org) ? profile?.org[0] : profile?.org;
      const hasSetupFields = Boolean(orgData?.team_size && orgData?.primary_region);
      const hasPlan = Boolean(orgData?.plan && orgData?.billing_cycle);
      const hasCompletedSetup = Boolean(orgData?.setup_completed_at);

      const redirectUrl = request.nextUrl.clone();
      if (!hasSetupFields) {
        redirectUrl.pathname = "/setup-org";
      } else if (!hasPlan) {
        redirectUrl.pathname = "/choose-plan";
      } else if (!hasCompletedSetup) {
        redirectUrl.pathname = "/onboarding";
      } else {
        redirectUrl.pathname = "/dashboard";
      }
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }

    if (user && isProtected(pathname)) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, org:org_id(setup_completed_at, team_size, primary_region, plan, billing_cycle)")
        .eq("user_id", user.id)
        .maybeSingle();

      const role = mapCanonicalRole(profile?.role);
      const orgData = Array.isArray(profile?.org) ? profile?.org[0] : profile?.org;
      const hasSetupFields = Boolean(orgData?.team_size && orgData?.primary_region);
      const hasPlan = Boolean(orgData?.plan && orgData?.billing_cycle);
      const hasCompletedSetup = Boolean(orgData?.setup_completed_at);

      if (!hasSetupFields && pathname !== "/setup-org") {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/setup-org";
        redirectUrl.search = "";
        return NextResponse.redirect(redirectUrl);
      }

      if (hasSetupFields && !hasPlan && pathname !== "/choose-plan") {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/choose-plan";
        redirectUrl.search = "";
        return NextResponse.redirect(redirectUrl);
      }

      if (hasSetupFields && hasPlan && !hasCompletedSetup && pathname !== "/onboarding") {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/onboarding";
        redirectUrl.search = "";
        return NextResponse.redirect(redirectUrl);
      }

      if (MANAGER_PAGE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
        if (!(role === "owner" || role === "manager")) {
          const redirectUrl = request.nextUrl.clone();
          redirectUrl.pathname = "/dashboard";
          redirectUrl.search = "";
          return NextResponse.redirect(redirectUrl);
        }
      }

      if (OWNER_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
        if (role !== "owner") {
          const redirectUrl = request.nextUrl.clone();
          redirectUrl.pathname = "/dashboard";
          redirectUrl.search = "";
          return NextResponse.redirect(redirectUrl);
        }
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
