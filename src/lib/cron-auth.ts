import { timingSafeEqual } from "crypto";

export function isCronRequestAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const authHeader = request.headers.get("authorization") ?? "";
  const querySecret = new URL(request.url).searchParams.get("secret") ?? "";
  const expected = `Bearer ${cronSecret}`;

  return safeEqual(authHeader, expected) || safeEqual(querySecret, cronSecret);
}

function safeEqual(left: string, right: string) {
  if (!left || left.length !== right.length) return false;
  return timingSafeEqual(Buffer.from(left), Buffer.from(right));
}
