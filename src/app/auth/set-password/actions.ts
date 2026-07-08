"use server";

import { ensureUserProfileAndRole } from "@/lib/invited-user-sync";
import { createClient } from "@/lib/supabase/server";

export async function finalizeAccountSetup(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email?.trim().toLowerCase();
  if (!user || !email) {
    return { success: false, error: "تعذر التحقق من الحساب" };
  }

  const sync = await ensureUserProfileAndRole(user);
  return sync.success
    ? { success: true }
    : { success: false, error: sync.error };
}
