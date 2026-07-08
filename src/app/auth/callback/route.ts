import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");

  if ((type === "invite" || type === "recovery") && !code) {
    return NextResponse.redirect(`${origin}/auth/set-password`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (type === "invite" || type === "recovery") {
        return NextResponse.redirect(`${origin}/auth/set-password`);
      }
      return NextResponse.redirect(`${origin}/auth/role-redirect`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
