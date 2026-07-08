import { redirect } from "next/navigation";
import { Bell, BookOpen, ClipboardPenLine, Home, ListChecks, ListTodo, NotebookTabs } from "lucide-react";

import { PortalLayoutShell, type PortalNavItem } from "@/components/portal-layout-shell";
import { getCurrentUserRoles, requireAuth } from "@/lib/auth";
import { getUserNotifications } from "@/lib/notifications";

export default async function SupervisorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();
  const roles = await getCurrentUserRoles(user);
  const canEnter =
    roles.includes("supervisor") ||
    roles.includes("admin") ||
    roles.includes("demo_admin");

  if (!canEnter) {
    if (roles.includes("teacher")) redirect("/teacher/dashboard");
    if (roles.includes("executive_director")) redirect("/executive/dashboard");
    redirect("/auth/role-redirect");
  }

  const { notifications } = await getUserNotifications(user.id, false, 8);
  const navItems: PortalNavItem[] = [
    { href: "/supervisor/dashboard", icon: Home, label: "الرئيسية" },
    { href: "/supervisor/tasks", icon: ListTodo, label: "مهامي" },
    { href: "/supervisor/circles", icon: BookOpen, label: "الحلقات" },
    { href: "/supervisor/visits", icon: ClipboardPenLine, label: "الزيارات" },
    { href: "/supervisor/requests", icon: ListChecks, label: "طلبات المعلمين" },
    { href: "/supervisor/reports", icon: NotebookTabs, label: "التقارير" },
    { href: "/supervisor/notifications", icon: Bell, label: "الإشعارات" },
  ];

  return (
    <PortalLayoutShell
      title="منصة جمعية ذكركم"
      subtitle="بوابة المشرف"
      homeHref="/supervisor/dashboard"
      icon={NotebookTabs}
      navItems={navItems}
      mobileItems={navItems.filter((item) => item.href !== "/supervisor/notifications")}
      notifications={notifications}
      notificationsHref="/supervisor/notifications"
    >
      {children}
    </PortalLayoutShell>
  );
}
