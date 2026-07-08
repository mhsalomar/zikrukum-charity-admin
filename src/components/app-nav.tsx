"use client";

import Link from "next/link";
import {
  BookOpen,
  Activity,
  CalendarCheck,
  Bell,
  ClipboardPenLine,
  Building2,
  BriefcaseBusiness,
  ChartColumn,
  FileText,
  Gauge,
  GraduationCap,
  HandHeart,
  Home,
  MessagesSquare,
  ListTodo,
  Newspaper,
  Scale,
  Settings,
  ShieldCheck,
  Trophy,
  UserRound,
  UserRoundSearch,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { usePathname } from "next/navigation";

import { hasAnyRole, hasRole, type AppRole } from "@/lib/roles";

const navItems = [
  { href: "/dashboard", label: "لوحة التحكم", icon: Home, group: "الرئيسية", roles: ["admin", "demo_admin", "executive_director", "executive_manager", "halaqat_manager", "programs_manager", "finance_viewer", "hr"] },
  { href: "/dashboard/operations", label: "مركز التشغيل", icon: Activity, group: "الرئيسية", roles: ["admin", "demo_admin", "executive_director", "executive_manager"] },
  { href: "/dashboard/tasks", label: "المهام", icon: ListTodo, group: "الرئيسية", roles: ["admin", "demo_admin", "hr"] },
  { href: "/dashboard/launch-readiness", label: "جاهزية التشغيل", icon: Gauge, group: "الرئيسية", roles: ["admin", "demo_admin", "executive_director", "executive_manager"] },
  { href: "/select-role", label: "أوضاع التجربة", icon: Users, group: "النظام", role: "demo_admin" },
  { href: "/dashboard/teacher-preview", label: "تجربة بوابة المعلم", icon: UserRoundSearch, group: "النظام", roles: ["admin", "demo_admin"] },
  { href: "/executive/dashboard", label: "بوابة المدير التنفيذي", icon: ChartColumn, group: "الرئيسية", roles: ["admin", "demo_admin", "executive_director", "executive_manager"] },
  { href: "/dashboard/programs", label: "البرامج والمسابقات", icon: Trophy, group: "البرامج والمسابقات", roles: ["admin", "demo_admin", "executive_director", "executive_manager", "programs_manager", "halaqat_manager"] },
  { href: "/dashboard/mosques", label: "المساجد", icon: Building2, group: "الحلقات والطلاب", roles: ["admin", "demo_admin", "executive_director", "executive_manager", "halaqat_manager"] },
  { href: "/dashboard/halaqat", label: "الحلقات", icon: BookOpen, group: "الحلقات والطلاب", roles: ["admin", "demo_admin", "executive_director", "executive_manager", "halaqat_manager"] },
  { href: "/dashboard/students", label: "الطلاب", icon: GraduationCap, group: "الحلقات والطلاب", roles: ["admin", "demo_admin", "executive_director", "executive_manager", "halaqat_manager"] },
  { href: "/dashboard/student-requests", label: "طلبات الطلاب", icon: ClipboardPenLine, group: "الحلقات والطلاب", roles: ["admin", "demo_admin", "executive_director", "executive_manager", "halaqat_manager"] },
  { href: "/dashboard/students/at-risk", label: "إنذار التسرب", icon: ShieldCheck, group: "الحلقات والطلاب", roles: ["admin", "demo_admin", "executive_director", "executive_manager", "halaqat_manager"] },
  { href: "/dashboard/teachers", label: "المعلمون", icon: UserRound, group: "المعلمون والمشرفون", roles: ["admin", "demo_admin", "executive_director", "executive_manager", "halaqat_manager"] },
  { href: "/dashboard/attendance", label: "تقارير الحضور", icon: CalendarCheck, group: "الحلقات والطلاب", roles: ["admin", "demo_admin", "executive_director", "executive_manager", "halaqat_manager"] },
  { href: "/dashboard/daily-monitor", label: "المتابعة اليومية", icon: Activity, group: "الحلقات والطلاب", roles: ["admin", "demo_admin", "executive_director", "executive_manager", "halaqat_manager"] },
  { href: "/dashboard/nooraniya", label: "دورة النورانية", icon: BookOpen, group: "الحلقات والطلاب", roles: ["admin", "demo_admin", "executive_director", "executive_manager", "halaqat_manager"] },
  { href: "/dashboard/supervisors", label: "المشرفون", icon: ShieldCheck, group: "المعلمون والمشرفون", roles: ["admin", "demo_admin", "executive_director", "executive_manager", "halaqat_manager"] },
  { href: "/supervisor/dashboard", label: "بوابة المشرف", icon: ShieldCheck, group: "الإشراف", roles: ["admin", "demo_admin", "supervisor"] },
  { href: "/supervisor/circles", label: "الحلقات", icon: BookOpen, group: "الإشراف", roles: ["admin", "demo_admin", "supervisor"] },
  { href: "/supervisor/visits", label: "الزيارات", icon: ClipboardPenLine, group: "الإشراف", roles: ["admin", "demo_admin", "supervisor"] },
  { href: "/supervisor/requests", label: "طلبات المعلمين", icon: ClipboardPenLine, group: "الإشراف", roles: ["admin", "demo_admin", "supervisor"] },
  { href: "/supervisor/reports", label: "تقارير الإشراف", icon: ChartColumn, group: "الإشراف", roles: ["admin", "demo_admin", "supervisor"] },
  { href: "/supervisor/notifications", label: "إشعارات المشرف", icon: Bell, group: "الإشراف", roles: ["admin", "demo_admin", "supervisor"] },
  { href: "/dashboard/finance", label: "المالية والرواتب", icon: Wallet, group: "المالية والرواتب", roles: ["admin", "executive_director", "executive_manager", "finance_viewer"] },
  { href: "/hr/dashboard", label: "بوابة شؤون الموظفين", icon: BriefcaseBusiness, group: "الموارد البشرية", roles: ["admin", "demo_admin", "executive_director", "executive_manager", "hr"] },
  { href: "/dashboard/hr", label: "الموارد البشرية", icon: BriefcaseBusiness, group: "الموارد البشرية", roles: ["admin", "demo_admin", "executive_director", "executive_manager", "hr"] },
  { href: "/dashboard/hr/letters", label: "الصادر والخطابات", icon: ClipboardPenLine, group: "الموارد البشرية", roles: ["admin", "demo_admin", "executive_director", "executive_manager", "hr"] },
  { href: "/dashboard/meetings", label: "اجتماعات الإدارة", icon: MessagesSquare, group: "الاجتماعات", roles: ["admin", "demo_admin"] },
  { href: "/dashboard/board", label: "مجلس الإدارة", icon: ShieldCheck, group: "مجلس الإدارة", roles: ["admin", "demo_admin"] },
  { href: "/dashboard/board/members", label: "أعضاء مجلس الإدارة", icon: Users, group: "مجلس الإدارة", roles: ["admin", "demo_admin"] },
  { href: "/dashboard/governance", label: "الحوكمة", icon: Scale, group: "الحوكمة", roles: ["admin", "demo_admin", "executive_director", "executive_manager"] },
  { href: "/dashboard/media", label: "الإعلام والتدوين", icon: Newspaper, group: "الإعلام والتدوين", roles: ["admin", "demo_admin", "executive_director", "executive_manager"] },
  { href: "/media/dashboard", label: "بوابة الإعلامي", icon: Newspaper, group: "الإعلام والتدوين", roles: ["admin", "demo_admin", "media_officer"] },
  { href: "/dashboard/certificates", label: "الشهادات", icon: Trophy, group: "وحدات التشغيل", roles: ["admin", "demo_admin", "executive_director", "executive_manager"] },
  { href: "/dashboard/donors", label: "المانحون", icon: HandHeart, group: "وحدات التشغيل", roles: ["admin", "demo_admin", "executive_director", "executive_manager"] },
  { href: "/dashboard/donations", label: "التبرعات", icon: Wallet, group: "وحدات التشغيل", roles: ["admin", "demo_admin", "executive_director", "executive_manager"] },
  { href: "/dashboard/volunteers", label: "المتطوعون", icon: HandHeart, group: "وحدات التشغيل", roles: ["admin", "demo_admin", "executive_director", "executive_manager"] },
  { href: "/dashboard/ministry-reports", label: "تقارير الوزارة", icon: FileText, group: "وحدات التشغيل", roles: ["admin", "demo_admin", "executive_director", "executive_manager"] },
  { href: "/dashboard/teacher-performance", label: "أداء المعلمين", icon: ChartColumn, group: "وحدات التشغيل", roles: ["admin", "demo_admin", "executive_director", "executive_manager"] },
  { href: "/dashboard/exams", label: "الاختبارات والتسميع", icon: ClipboardPenLine, group: "وحدات التشغيل", roles: ["admin", "demo_admin", "executive_director", "executive_manager"] },
  { href: "/dashboard/reports", label: "التقارير", icon: ChartColumn, group: "التقارير", roles: ["admin", "demo_admin", "executive_director", "executive_manager"] },
  { href: "/dashboard/notifications", label: "الإشعارات", icon: Bell, group: "الإعدادات", roles: ["admin", "demo_admin", "executive_director", "executive_manager", "supervisor"] },
  { href: "/dashboard/users", label: "المستخدمون والصلاحيات", icon: Users, group: "الإعدادات", role: "admin" },
  { href: "/dashboard/settings/invitations", label: "الدعوات", icon: Users, group: "الإعدادات", role: "admin" },
  { href: "/dashboard/settings", label: "الإعدادات العامة", icon: Settings, group: "الإعدادات", roles: ["admin", "demo_admin"] },
] satisfies Array<{
  href: string;
  label: string;
  icon: LucideIcon;
  group: string;
  role?: AppRole;
  roles?: AppRole[];
}>;

export function AppNav({
  roles,
  onNavigate,
}: {
  roles: AppRole[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const visibleNavItems = navItems.filter(
    (item) =>
      !(roles.includes("demo_admin") && item.href.startsWith("/dashboard/finance")) &&
      (!item.role || hasRole(roles, item.role)) &&
      (!item.roles || hasAnyRole(roles, item.roles)),
  );

  return (
    <nav className="mt-2 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pb-2 lg:mt-6 lg:pb-3">
      {visibleNavItems.map((item, index) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/dashboard"
            ? pathname === item.href
            : pathname.startsWith(item.href);
        const showGroup =
          index === 0 || visibleNavItems[index - 1]?.group !== item.group;

        return (
          <div key={item.href} className="contents lg:block">
            {showGroup ? (
              <p className="hidden px-4 pb-2 pt-5 text-xs font-bold tracking-wide text-[#8b9892] lg:block">
                {item.group}
              </p>
            ) : null}
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={isActive ? "page" : undefined}
              className={`group relative flex items-center gap-3 rounded-[var(--radius-sm)] border px-4 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/55 lg:min-w-0 lg:px-3.5 ${
                isActive
                  ? "border-[#d9c89e] bg-[var(--primary-soft)] text-[var(--primary-dark)] shadow-sm before:absolute before:inset-y-2 before:right-0 before:w-1 before:rounded-full before:bg-[var(--gold)]"
                  : "border-transparent text-[#3d4944] hover:border-[var(--border)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary-dark)]"
              }`}
            >
              <span
                className={`grid size-9 shrink-0 place-items-center rounded-xl border ${
                  isActive
                    ? "border-[#c9dfd5] bg-white text-[var(--primary)]"
                  : "border-[var(--border)] bg-white text-[var(--gold)] group-hover:border-[var(--gold)]/60"
                }`}
              >
                <Icon aria-hidden="true" className="size-5" strokeWidth={2.1} />
              </span>
              <span>{item.label}</span>
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
