import { NextRequest, NextResponse } from "next/server";
import { apiError, checkRateLimit } from "./api-security";
import {
  getApiAuthContext,
  getAuthenticatedServerClient,
  isLiveSupabaseAvailable,
  type ApiAuthContext,
} from "./supabase-server";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface WithAuthOptions {
  requiredRoles?: ReadonlyArray<string> | string[];
  requireDb?: boolean;
  rateLimit?: {
    limit?: number;
    windowMs?: number;
    keyPrefix?: string;
  };
}

export interface AuthenticatedHandlerContext {
  auth: ApiAuthContext;
  supabase: SupabaseClient;
  params?: any;
}

export type AuthenticatedRouteHandler = (
  req: NextRequest,
  ctx: AuthenticatedHandlerContext
) => Promise<NextResponse> | NextResponse;

/**
 * Standardized withAuth middleware wrapper for Next.js Route Handlers.
 * Enforces:
 * 1. Authentication via Supabase session cookie / JWT.
 * 2. RBAC role validation against requiredRoles.
 * 3. Rate-limiting with token bucket.
 * 4. Healthy Supabase authenticated client injection.
 */
export function withAuth(
  handler: AuthenticatedRouteHandler,
  options: WithAuthOptions = {}
) {
  return async (req: NextRequest, routeContext: any) => {
    const auth = await getApiAuthContext();
    if (!auth) {
      return apiError("Authentication required", 401, "UNAUTHORIZED");
    }

    if (options.requiredRoles && options.requiredRoles.length > 0) {
      if (!options.requiredRoles.includes(auth.role)) {
        return apiError(
          `Action requires one of the following roles: ${options.requiredRoles.join(", ")}`,
          403,
          "FORBIDDEN"
        );
      }
    }

    if (options.rateLimit) {
      const prefix = options.rateLimit.keyPrefix || req.nextUrl.pathname;
      const rateKey = `${prefix}_${auth.userId}`;
      const rateCheck = checkRateLimit(
        rateKey,
        options.rateLimit.limit ?? 60,
        options.rateLimit.windowMs ?? 60000
      );
      if (!rateCheck.allowed) {
        return apiError("Rate limit exceeded", 429, "RATE_LIMIT_EXCEEDED");
      }
    }

    const supabase = await getAuthenticatedServerClient();
    if (options.requireDb !== false && (!supabase || !isLiveSupabaseAvailable)) {
      return apiError("Database service is unavailable", 503, "SERVICE_UNAVAILABLE");
    }

    let resolvedParams: any = undefined;
    if (routeContext?.params) {
      resolvedParams = typeof (routeContext.params as any).then === "function"
        ? await routeContext.params
        : routeContext.params;
    }

    return handler(req, { auth, supabase: supabase as SupabaseClient, params: resolvedParams });
  };
}
