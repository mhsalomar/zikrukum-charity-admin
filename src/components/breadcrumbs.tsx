"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { usePathname } from "next/navigation";

const labels: Record<string, string> = {
  teacher: "بوابة المعلم",
  executive: "بوابة المدير التنفيذي",
  dashboard: "لوحة التحكم",
  users: "المستخدمون",
  centers: "المراكز",
  mosques: "المساجد",
  halaqat: "الحلقات",
  teachers: "المعلمون",
  supervisors: "المشرفون",
  students: "الطلاب",
  import: "استيراد البيانات",
  programs: "البرامج",
  competitions: "المسابقات",
  "summer-courses": "الدورات الصيفية",
  overview: "نظرة عامة",
  payroll: "مسير الرواتب",
  expenses: "المصروفات",
  revenues: "الإيرادات",
  "budget-items": "بنود الصرف",
  donors: "المانحون",
  donations: "التبرعات",
  pledges: "التعهدات",
  receipts: "الإيصالات",
  certificates: "الشهادات",
  "donor-reports": "تقارير المانحين",
  finance: "المالية والرواتب",
  hr: "الموارد البشرية",
  employees: "الموظفون",
  contracts: "العقود",
  leaves: "الإجازات",
  assets: "العهد",
  evaluations: "التقييمات",
  letters: "الصادر والخطابات",
  meetings: "الاجتماعات",
  board: "مجلس الإدارة",
  members: "الأعضاء",
  decisions: "القرارات",
  governance: "الحوكمة",
  policies: "السياسات واللوائح",
  disclosures: "الإفصاحات",
  compliance: "مؤشرات الامتثال",
  media: "الإعلام والتدوين",
  posts: "المواد الإعلامية",
  coverage: "التغطيات",
  categories: "التصنيفات",
  notifications: "الإشعارات",
  supervisor: "المشرف",
  visits: "الزيارات",
  circles: "الحلقات",
  new: "إضافة جديد",
  print: "طباعة",
  volunteers: "المتطوعون",
  "volunteer-opportunities": "الفرص التطوعية",
  "volunteer-hours": "ساعات التطوع",
  "ministry-reports": "تقارير الوزارة",
  "teacher-performance": "أداء المعلمين",
  exams: "الاختبارات والتسميع",
  progress: "متابعة الحفظ",
  "launch-readiness": "جاهزية التشغيل",
  "parent-student-report": "تقرير ولي الأمر",
  batch: "تقرير مجمع",
  reports: "التقارير",
  "student-progress": "إنجاز الطلاب",
  settings: "الإعدادات",
  sessions: "تسجيل الجلسات",
  attendance: "تقارير الحضور",
    operations: "مركز التشغيل",
  tasks: "المهام",
  distributions: "توزيعات المهام",
  "select-role": "أوضاع التجربة",
  "daily-monitor": "المتابعة اليومية",
  "teacher-preview": "تجربة بوابة المعلم",
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length <= 1) {
    return null;
  }

  return (
    <nav className="mb-4 flex flex-wrap items-center gap-2 text-xs font-bold text-[var(--muted)]" aria-label="مسار الصفحة">
      {segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join("/")}`;
        const current = index === segments.length - 1;
        const label = labels[segment] ?? (/^[0-9a-f-]{20,}$/i.test(segment) ? "تفاصيل" : segment);

        return (
          <span key={href} className="inline-flex items-center gap-2">
            {index > 0 ? <ChevronLeft aria-hidden="true" className="size-3.5 text-[var(--gold)]" /> : null}
            {current ? (
              <span className="text-[var(--primary-dark)]">{label}</span>
            ) : (
              <Link href={href} className="transition hover:text-[var(--primary-dark)]">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
