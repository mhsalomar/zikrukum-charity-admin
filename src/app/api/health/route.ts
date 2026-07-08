import { isCronRequestAuthorized } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isCronRequestAuthorized(request)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  return Response.json({
    ok: true,
    app: "charity-admin",
    timestamp: new Date().toISOString(),
  });
}
