import { redirect } from "next/navigation";

import { getCurrentUserRoles, requireAuth } from "@/lib/auth";
import { ensureUserProfileAndRole } from "@/lib/invited-user-sync";

export default async function RoleRedirectPage() {
  const user = await requireAuth();
  const sync = await ensureUserProfileAndRole(user);
  if (!sync.success) {
    redirect(`/auth/account-linking-required?message=${encodeURIComponent(sync.error)}`);
  }

  const roles = await getCurrentUserRoles(user);

  if (roles.includes("demo_admin")) {
    redirect("/select-role");
  }

  if (roles.includes("executive_director")) {
    redirect("/executive/dashboard");
  }

  if (roles.includes("hr")) {
    redirect("/hr/dashboard");
  }

  if (
    roles.includes("admin") ||
    roles.includes("executive_manager") ||
    roles.includes("halaqat_manager") ||
    roles.includes("programs_manager") ||
    roles.includes("finance_viewer")
  ) {
    redirect("/dashboard");
  }

  if (roles.includes("supervisor")) {
    redirect("/supervisor/dashboard");
  }

  if (roles.includes("media_officer")) {
    redirect("/media/dashboard");
  }

  if (roles.includes("teacher")) {
    redirect("/teacher/dashboard");
  }

  redirect("/login");
}
