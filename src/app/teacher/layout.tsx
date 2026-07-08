import { redirect } from "next/navigation";
import { Bell, BookOpen, ClipboardPenLine, Home, ListTodo, ShieldCheck } from "lucide-react";

import { clearTeacherPreviewAction } from "@/app/dashboard/teacher-preview/actions";
import { PortalLayoutShell, type PortalNavItem } from "@/components/portal-layout-shell";
import { getCurrentUserProfile, getCurrentUserRoles, requireAuth } from "@/lib/auth";
import { getUserNotifications } from "@/lib/notifications";
import { requireTeacherPortal } from "@/lib/teacher-portal";

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();
  const [roles, profile, teacherContext] = await Promise.all([
    getCurrentUserRoles(user),
    getCurrentUserProfile(user),
    requireTeacherPortal(),
  ]);

  if (!roles.includes("teacher") && !roles.includes("admin") && !roles.includes("demo_admin")) {
    redirect("/dashboard");
  }
  const { notifications } = await getUserNotifications(user.id, false, 8);
  const navItems: PortalNavItem[] = [
    { href: "/teacher/dashboard", icon: Home, label: "لوحة المعلم" },
    { href: "/teacher/exams", icon: ClipboardPenLine, label: "اختبارات الطلاب" },
    { href: "/teacher/tasks", icon: ListTodo, label: "مهامي" },
    { href: "/teacher/notifications", icon: Bell, label: "الإشعارات" },
  ];

  return (
    <PortalLayoutShell
      title="منصة جمعية ذكركم"
      subtitle="بوابة المعلم"
      homeHref="/teacher/dashboard"
      icon={BookOpen}
      navItems={navItems}
      mobileItems={navItems}
      notifications={notifications}
      notificationsHref="/teacher/notifications"
      showBreadcrumbs={false}
      contentMode="free"
      userName={profile?.full_name ?? user.email}
      userRole="معلم"
    >
      {teacherContext.preview.active ? (
        <section className="mb-4 flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="size-5" />
              وضع تجربة بوابة المعلم: {teacherContext.preview.teacherName}
            </p>
            <p className="mt-1 text-xs font-bold leading-6">
              أنت تعمل باسم {teacherContext.preview.actorName}. لن تُنسب العمليات للمعلم الحقيقي.
            </p>
          </div>
          <form action={clearTeacherPreviewAction}>
            <button className="min-h-10 rounded-xl border border-amber-400 bg-white px-4 text-xs font-semibold">
              إنهاء وضع التجربة
            </button>
          </form>
        </section>
      ) : null}
      {children}
    </PortalLayoutShell>
  );
}
