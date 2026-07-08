import { redirect } from "next/navigation";

import { getCurrentUserRoles, requireAuth } from "@/lib/auth";
import { taskPortalPath } from "@/lib/internal-tasks";

export default async function TasksRoleRedirectPage() {
  const user = await requireAuth();
  redirect(taskPortalPath(await getCurrentUserRoles(user)));
}
