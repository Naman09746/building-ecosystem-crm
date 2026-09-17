/**
 * EcosystemRealty Structured Production Logger
 * Privacy-safe, structured observability abstraction that prevents secret/PII leaks.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  requestId?: string;
  route?: string;
  userId?: string;
  orgId?: string;
  latencyMs?: number;
  statusCode?: number;
  errorCode?: string;
  [key: string]: unknown;
}

const REDACTED_KEYS = new Set([
  "password",
  "secret",
  "token",
  "access_token",
  "refresh_token",
  "apikey",
  "api_key",
  "authorization",
  "cookie",
  "card",
  "credit_card",
  "cvv",
  "cvc",
  "ssn",
  "signature",
  "x-hub-signature-256",
  "stripe-signature",
  "x-razorpay-signature",
]);

/**
 * Recursively sanitizes data objects to redact sensitive keys and values
 */
export function sanitizeLogData<T>(data: T, depth = 0): T {
  if (depth > 4 || data === null || data === undefined) return data;
  if (typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogData(item, depth + 1)) as unknown as T;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (REDACTED_KEYS.has(lowerKey) || Array.from(REDACTED_KEYS).some((k) => lowerKey.includes(k))) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeLogData(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

export class Logger {
  private formatLog(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    const cleanContext = context ? sanitizeLogData(context) : {};

    return JSON.stringify({
      timestamp,
      level,
      message,
      service: "ecosystemrealty-backend",
      ...cleanContext,
    });
  }

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV !== "production") {
      console.debug(this.formatLog("debug", message, context));
    }
  }

  info(message: string, context?: LogContext) {
    console.info(this.formatLog("info", message, context));
  }

  warn(message: string, context?: LogContext) {
    console.warn(this.formatLog("warn", message, context));
  }

  error(message: string, err?: unknown, context?: LogContext) {
    const errorDetails: Record<string, unknown> = {};
    if (err instanceof Error) {
      errorDetails.errorName = err.name;
      errorDetails.errorMessage = err.message;
      if (process.env.NODE_ENV !== "production") {
        errorDetails.stack = err.stack;
      }
    } else if (typeof err === "string") {
      errorDetails.errorMessage = err;
    } else if (err && typeof err === "object") {
      Object.assign(errorDetails, sanitizeLogData(err));
    }

    console.error(this.formatLog("error", message, { ...context, ...errorDetails }));
  }
}

export const logger = new Logger();
