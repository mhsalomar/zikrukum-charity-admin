import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const rateLimits = new Map<string, { count: number; resetAt: number }>();

const publicAuthPaths = new Set([
  "/login",
  "/set-password",
  "/auth/callback",
  "/auth/set-password",
  "/auth/account-linking-required",
]);

export async function proxy(request: NextRequest) {
  if (isSystemHealthPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  if (!isSameOriginMutation(request)) {
    return NextResponse.json(
      { error: "تم رفض الطلب لحماية الجلسة. أعد تحميل الصفحة وحاول مرة أخرى." },
      { status: 403 },
    );
  }

  if (isSensitiveRequest(request) && (await isRateLimited(request))) {
    return NextResponse.json(
      { error: "محاولات كثيرة خلال وقت قصير. انتظر دقيقة ثم حاول مرة أخرى." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  if (publicAuthPaths.has(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  return updateSession(request);
}

function isSystemHealthPath(pathname: string) {
  return pathname === "/api/health" || pathname.startsWith("/api/cron/");
}

function isSameOriginMutation(request: NextRequest) {
  if (SAFE_METHODS.has(request.method)) return true;

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return false;

  const origin = request.headers.get("origin");
  if (!origin) {
    return fetchSite === "same-origin" || fetchSite === "same-site";
  }

  const expectedHost =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");

  try {
    return new URL(origin).host === expectedHost;
  } catch {
    return false;
  }
}

function isSensitiveRequest(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  return (
    !SAFE_METHODS.has(request.method) &&
    (pathname.startsWith("/auth") ||
      pathname === "/login" ||
      pathname === "/set-password" ||
      pathname.startsWith("/dashboard/settings/invitations"))
  );
}

async function isRateLimited(request: NextRequest) {
  const distributed = await consumeDistributedRateLimit(request);
  if (distributed !== null) return distributed;

  return isLocallyRateLimited(request);
}

async function consumeDistributedRateLimit(request: NextRequest) {
  try {
    const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const rawKey = `${forwardedFor || "unknown"}:${request.nextUrl.pathname}`;
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(rawKey),
    );
    const keyHash = Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");

    const response = await fetch(
      `${getSupabaseUrl()}/rest/v1/rpc/consume_security_rate_limit`,
      {
        method: "POST",
        headers: {
          apikey: getSupabaseAnonKey(),
          Authorization: `Bearer ${getSupabaseAnonKey()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          p_key_hash: keyHash,
          p_limit: 30,
          p_window_seconds: 60,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(2_000),
      },
    );

    if (!response.ok) return null;
    return (await response.json()) === false;
  } catch {
    return null;
  }
}

function isLocallyRateLimited(request: NextRequest) {
  const now = Date.now();
  if (rateLimits.size > 10_000) {
    for (const [key, value] of rateLimits) {
      if (value.resetAt <= now) rateLimits.delete(key);
    }
  }

  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const key = `${forwardedFor || "unknown"}:${request.nextUrl.pathname}`;
  const current = rateLimits.get(key);

  if (!current || current.resetAt <= now) {
    rateLimits.set(key, { count: 1, resetAt: now + 60_000 });
    return false;
  }

  current.count += 1;
  return current.count > 30;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
