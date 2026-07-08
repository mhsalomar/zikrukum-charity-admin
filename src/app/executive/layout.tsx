import { redirect } from "next/navigation";
import { BriefcaseBusiness, CalendarDays, ChartColumn, ClipboardPenLine, Home, ListTodo } from "lucide-react";

import { PortalLayoutShell, type PortalNavItem } from "@/components/portal-layout-shell";
import { getCurrentUserRoles, requireAuth } from "@/lib/auth";
import { getUserNotifications } from "@/lib/notifications";

export default async function ExecutiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();
  const roles = await getCurrentUserRoles(user);
  const canEnter =
    roles.includes("executive_director") ||
    roles.includes("executive_manager") ||
    roles.includes("admin") ||
    roles.includes("demo_admin");

  if (!canEnter) {
    if (roles.includes("teacher")) redirect("/teacher/dashboard");
    if (roles.includes("supervisor")) redirect("/supervisor/dashboard");
    redirect("/auth/role-redirect");
  }

  const { notifications } = await getUserNotifications(user.id, false, 8);
  const navItems: PortalNavItem[] = [
    { href: "/executive/dashboard", icon: Home, label: "الرئيسية" },
    { href: "/executive/tasks", icon: ListTodo, label: "المهام" },
    { href: "/executive/hr", icon: BriefcaseBusiness, label: "الموارد البشرية" },
    { href: "/executive/meetings", icon: CalendarDays, label: "الاجتماعات" },
    { href: "/executive/reports", icon: ChartColumn, label: "التقارير" },
    { href: "/executive/letters", icon: ClipboardPenLine, label: "الصادر والخطابات" },
  ];

  return (
    <PortalLayoutShell
      title="منصة جمعية ذكركم"
      subtitle="بوابة المدير التنفيذي"
      homeHref="/executive/dashboard"
      icon={BriefcaseBusiness}
      navItems={navItems}
      mobileItems={navItems.slice(0, 4)}
      notifications={notifications}
      notificationsHref="/executive/notifications"
    >
      {children}
    </PortalLayoutShell>
  );
}
