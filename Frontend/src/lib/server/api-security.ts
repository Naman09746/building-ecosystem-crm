import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { ZodError } from "zod";
import { reportError } from "@/lib/observability/reporter";

// ====================================================================
// ENTERPRISE API SECURITY & RESPONSE STANDARDIZATION ENGINE
// ====================================================================

export interface ApiAuthContext {
  userId: string;
  orgId: string;
  role: "owner" | "manager" | "salesperson";
  email: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: any;
  };
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    requestId: string;
    timestamp: string;
    page?: number;
    limit?: number;
    total?: number;
  };
}

// In-Memory Token Bucket Rate Limiter (Fallback & Fast Cache)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  limit: number = 60,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetMs: windowMs };
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0, resetMs: record.resetTime - now };
  }

  record.count += 1;
  return { allowed: true, remaining: limit - record.count, resetMs: record.resetTime - now };
}

// In-Memory Idempotency Lock
const idempotencyKeyMap = new Map<string, { response: any; expiresAt: number }>();

export function checkIdempotency(key: string): any | null {
  const record = idempotencyKeyMap.get(key);
  if (!record) return null;
  if (Date.now() > record.expiresAt) {
    idempotencyKeyMap.delete(key);
    return null;
  }
  return record.response;
}

export function saveIdempotency(key: string, response: any, ttlSeconds: number = 86400): void {
  idempotencyKeyMap.set(key, {
    response,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

// Standardized Secure Error Responder
export function apiError(
  message: string,
  statusCode: number = 400,
  code: string = "BAD_REQUEST",
  details?: any
): NextResponse<ApiErrorResponse> {
  const requestId = `req_${crypto.randomBytes(6).toString("hex")}`;

  // Report server errors to the observability pipeline with correlation ID.
  if (statusCode >= 500) {
    reportError("api", new Error(message), { requestId, code, status: statusCode });
  }

  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message: statusCode >= 500 ? "An unexpected server error occurred. Please try again later." : message,
        requestId,
        details: statusCode >= 500 ? undefined : details,
      },
    },
    {
      status: statusCode,
      headers: {
        "X-Request-Id": requestId,
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}

// Standardized Success Responder
export function apiSuccess<T>(
  data: T,
  statusCode: number = 200,
  meta?: Omit<ApiSuccessResponse<T>["meta"], "requestId" | "timestamp">
): NextResponse<ApiSuccessResponse<T>> {
  const requestId = `req_${crypto.randomBytes(6).toString("hex")}`;
  
  return NextResponse.json(
    {
      success: true,
      data,
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        ...meta,
      },
    },
    {
      status: statusCode,
      headers: {
        "X-Request-Id": requestId,
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}

// Timing-safe string comparison for secrets/verify tokens.
// Hashes both sides first so length differences don't leak via early exit.
export function timingSafeCompare(a: string, b: string): boolean {
  const hashA = crypto.createHash("sha256").update(a, "utf8").digest();
  const hashB = crypto.createHash("sha256").update(b, "utf8").digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

// HMAC-SHA256 Signature Verification for Webhooks (Meta, WhatsApp)
export function verifyHmacSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader || !secret) return false;

  try {
    const signature = signatureHeader.startsWith("sha256=")
      ? signatureHeader.slice(7)
      : signatureHeader;

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody, "utf8")
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
  } catch (err) {
    return false;
  }
}

// Handle Zod / Schema Validation Errors
export function handleValidationError(err: unknown): NextResponse<ApiErrorResponse> {
  if (err instanceof ZodError) {
    const formatted = err.issues.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    }));
    return apiError("Validation failed for input payload", 422, "VALIDATION_ERROR", formatted);
  }
  return apiError(
    err instanceof Error ? err.message : "Malformed request",
    400,
    "INVALID_REQUEST"
  );
}
