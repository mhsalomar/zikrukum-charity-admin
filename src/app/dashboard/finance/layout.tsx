import { redirect } from "next/navigation";

import { getCurrentUserRoles, requireAuth } from "@/lib/auth";
import { isQaAccount } from "@/lib/teacher-preview";

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth();
  const roles = await getCurrentUserRoles(user);
  if (isQaAccount(user.email) || roles.includes("demo_admin")) redirect("/select-role");
  if (!roles.some((role) => ["admin", "executive_director", "executive_manager", "finance_viewer"].includes(role))) {
    redirect("/auth/role-redirect");
  }
  return children;
}
