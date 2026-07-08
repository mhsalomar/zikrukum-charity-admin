import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { getCurrentUserRoles, requireAuth } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();
  const roles = await getCurrentUserRoles(user);

  if (!user) {
    redirect("/login");
  }

  const isAdminLike = roles.includes("admin") || roles.includes("demo_admin");

  if (!isAdminLike) {
    if (roles.includes("teacher")) {
      redirect("/teacher/dashboard");
    }

    if (roles.includes("supervisor")) {
      redirect("/supervisor/dashboard");
    }

    if (roles.includes("executive_director") || roles.includes("executive_manager")) {
      redirect("/executive/dashboard");
    }
  }

  const canEnterDashboard = roles.some((role) =>
    [
      "admin",
      "demo_admin",
      "halaqat_manager",
      "programs_manager",
      "hr",
      "finance_viewer",
    ].includes(role),
  );

  if (!canEnterDashboard) {
    redirect("/auth/role-redirect");
  }

  return <AppShell roles={roles} userId={user.id}>{children}</AppShell>;
}
