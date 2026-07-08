import { redirect } from "next/navigation";
import { Bell, Home, ListTodo, Newspaper, PenLine, Tags } from "lucide-react";

import { PortalLayoutShell, type PortalNavItem } from "@/components/portal-layout-shell";
import { getCurrentUserRoles, requireAuth } from "@/lib/auth";
import { getUserNotifications } from "@/lib/notifications";

export default async function MediaLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth();
  const roles = await getCurrentUserRoles(user);
  const canEnter =
    roles.includes("media_officer") ||
    roles.includes("admin") ||
    roles.includes("demo_admin") ||
    roles.includes("executive_director") ||
    roles.includes("executive_manager");

  if (!canEnter) {
    if (roles.includes("teacher")) redirect("/teacher/dashboard");
    if (roles.includes("supervisor")) redirect("/supervisor/dashboard");
    redirect("/auth/role-redirect");
  }

  const { notifications } = await getUserNotifications(user.id, false, 8);
  const navItems: PortalNavItem[] = [
    { href: "/media/dashboard", icon: Home, label: "الرئيسية" },
    { href: "/media/tasks", icon: ListTodo, label: "مهامي" },
    { href: "/media/posts", icon: PenLine, label: "المواد الإعلامية" },
    { href: "/media/coverage", icon: Tags, label: "التغطيات" },
    { href: "/media/notifications", icon: Bell, label: "الإشعارات" },
  ];

  return (
    <PortalLayoutShell
      title="منصة جمعية ذكركم"
      subtitle="بوابة الإعلامي"
      homeHref="/media/dashboard"
      icon={Newspaper}
      navItems={navItems}
      mobileItems={navItems.filter((item) => item.href !== "/media/notifications")}
      notifications={notifications}
      notificationsHref="/media/notifications"
    >
      {children}
    </PortalLayoutShell>
  );
}
