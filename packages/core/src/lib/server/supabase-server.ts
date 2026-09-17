import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { MANAGER_ROLES as CORE_MANAGER_ROLES, OWNER_ROLES as CORE_OWNER_ROLES, mapCanonicalRole } from "./rbac";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const isLiveSupabaseAvailable = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes("your-project-id") &&
  !supabaseUrl.includes("mock-tenant") &&
  supabaseUrl.startsWith("http")
);

export interface ApiAuthContext {
  userId: string;
  orgId: string;
  role: string;
  email: string;
  fullName: string;
  plan: string | null;
}

// Widened to `ReadonlyArray<string>` so route guards can call
// `MANAGER_ROLES.includes(auth.role)` where `auth.role` is a plain string.
export const MANAGER_ROLES: ReadonlyArray<string> = [...CORE_MANAGER_ROLES];
export const OWNER_ROLES: ReadonlyArray<string> = [...CORE_OWNER_ROLES];

function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL!.includes("your-project-id")
  );
}

// Verify the caller's session from cookie or Bearer header and load their
// tenant profile. Returns null when unauthenticated OR when Supabase is not
// configured — callers must fail closed.
export async function getApiAuthContext(): Promise<ApiAuthContext | null> {
  if (!hasSupabaseEnv()) return null;

  let user: { id: string; email?: string | null } | null = null;
  // The client that successfully resolved the user — reused for the profile
  // query so it carries the same credentials (cookie session OR bearer JWT).
  let authedClient: SupabaseClient | null = null;

  // 1. Cookie-based session (browser app)
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Read-only context inside route handlers; refresh is handled by middleware.
        },
      },
    });
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      user = { id: data.user.id, email: data.user.email };
      authedClient = supabase as unknown as SupabaseClient;
    }
  } catch {
    // fall through to bearer check
  }

  // 2. Authorization: Bearer <token> (API clients / mobile)
  if (!authedClient) {
    try {
      const reqHeaders = await headers();
      const authHeader = reqHeaders.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.slice(7);
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } },
          auth: { persistSession: false },
        });
        const { data } = await supabase.auth.getUser(token);
        if (data.user) {
          user = { id: data.user.id, email: data.user.email };
          authedClient = supabase;
        }
      }
    } catch {
      return null;
    }
  }

  if (!user || !authedClient) return null;

  // Load tenant profile with the SAME credentials that authenticated the user —
  // no profile means no tenant membership: deny.
  try {
    const { data: profile } = await authedClient
      .from("profiles")
      .select("org_id, role, full_name, org:org_id(plan)")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile?.org_id) return null;

    // PostgREST may type the embedded relation as array or object
    const orgEmbed = profile.org as { plan?: string } | { plan?: string }[] | null;
    const orgPlan = Array.isArray(orgEmbed) ? orgEmbed[0]?.plan : orgEmbed?.plan;

    return {
      userId: user.id,
      orgId: profile.org_id,
      role: mapCanonicalRole(profile.role),
      email: user.email ?? "",
      fullName: profile.full_name,
      plan: orgPlan ?? null,
    };
  } catch {
    return null;
  }
}

// Standard authenticated Server Client (carries request JWT / tenant context).
// Prefers the Authorization header; falls back to the cookie session so
// browser-originated requests are never silently degraded to anon.
export async function getAuthenticatedServerClient(): Promise<SupabaseClient | null> {
  if (!isLiveSupabaseAvailable) {
    return null;
  }

  const reqHeaders = await headers();
  const authHeader = reqHeaders.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
  }

  // Cookie-session fallback (browser app)
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // Read-only inside route handlers; refresh handled by middleware.
      },
    },
  }) as unknown as SupabaseClient;
}

// Elevated Service Role Client (Bypasses RLS only for system webhooks / background workers)
// NEVER expose this client's output directly to users without tenant filtering.
export function getServiceRoleClient(): SupabaseClient | null {
  if (!isLiveSupabaseAvailable || !supabaseServiceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
