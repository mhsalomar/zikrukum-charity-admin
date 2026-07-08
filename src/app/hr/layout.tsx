import { redirect } from "next/navigation";
import { BriefcaseBusiness, CalendarCheck, ClipboardPenLine, Home, ListTodo, Umbrella, Users, WalletCards } from "lucide-react";

import { PortalLayoutShell, type PortalNavItem } from "@/components/portal-layout-shell";
import { getCurrentUserProfile, getCurrentUserRoles, requireAuth } from "@/lib/auth";
import { getUserNotifications } from "@/lib/notifications";

export default async function HrPortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth();
  const [roles, profile] = await Promise.all([
    getCurrentUserRoles(user),
    getCurrentUserProfile(user),
  ]);

  const canEnter = roles.some((r) =>
    ["admin", "demo_admin", "executive_director", "executive_manager", "hr"].includes(r)
  );
  if (!canEnter) redirect("/auth/role-redirect");

  const { notifications } = await getUserNotifications(user.id, false, 8);

  const navItems: PortalNavItem[] = [
    { href: "/hr/dashboard", icon: Home, label: "الرئيسية" },
    { href: "/hr/employees", icon: Users, label: "الموظفون" },
    { href: "/hr/attendance", icon: CalendarCheck, label: "الحضور والانصراف" },
    { href: "/hr/leaves", icon: Umbrella, label: "الإجازات" },
    { href: "/hr/payroll", icon: WalletCards, label: "الرواتب" },
    { href: "/hr/letters", icon: ClipboardPenLine, label: "الخطابات" },
    { href: "/hr/tasks", icon: ListTodo, label: "المهام" },
  ];

  return (
    <PortalLayoutShell
      title="منصة جمعية ذكركم"
      subtitle="بوابة شؤون الموظفين"
      homeHref="/hr/dashboard"
      icon={BriefcaseBusiness}
      navItems={navItems}
      mobileItems={navItems.slice(0, 4)}
      notifications={notifications}
      notificationsHref="/hr/notifications"
      showBreadcrumbs={false}
      contentMode="free"
      userName={profile?.full_name ?? user.email}
      userRole="شؤون الموظفين"
    >
      {children}
    </PortalLayoutShell>
  );
}
