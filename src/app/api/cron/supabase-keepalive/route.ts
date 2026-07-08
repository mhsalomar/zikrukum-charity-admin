import { isCronRequestAuthorized } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isCronRequestAuthorized(request)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return Response.json(
      { ok: false, error: "Missing Supabase environment variables" },
      { status: 500 },
    );
  }

  const healthResponse = await fetch(`${supabaseUrl}/auth/v1/health`, {
    headers: {
      apikey: supabaseAnonKey,
    },
    cache: "no-store",
  });

  if (!healthResponse.ok) {
    return Response.json(
      {
        ok: false,
        error: "Supabase health check failed",
        status: healthResponse.status,
      },
      { status: 502 },
    );
  }

  return Response.json({
    ok: true,
    checkedAt: new Date().toISOString(),
    target: "supabase-auth-health",
  });
}
