import { getCurrentUserRoles, requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function getSupervisorScope() {
  const supabase = await createClient();
  const user = await requireAuth();
  const roles = await getCurrentUserRoles(user);
  const isAdmin =
    roles.includes("admin") ||
    roles.includes("demo_admin") ||
    roles.includes("executive_director") ||
    roles.includes("executive_manager") ||
    roles.includes("halaqat_manager");
  const isDemo = roles.includes("demo_admin") || user.email === "qa@example.com";

  if (isAdmin) return { user, roles, isAdmin, isDemo, circleIds: null as string[] | null, supervisorId: null as string | null };

  const supervisor = await supabase.from("supervisors").select("id").eq("email", user.email).maybeSingle();
  const supervisorId = supervisor.data?.id ?? null;

  if (!supervisorId) return { user, roles, isAdmin, isDemo, circleIds: [], supervisorId: null };

  // المشرفون في الجمعية قد يزورون أي حلقة، لكن الصلاحية تبقى داخل بوابة الإشراف فقط.
  return { user, roles, isAdmin, isDemo, circleIds: null as string[] | null, supervisorId };
}
