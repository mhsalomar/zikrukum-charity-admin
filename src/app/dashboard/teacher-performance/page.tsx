import { Activity, BookOpen, ClipboardCheck, UserRound } from "lucide-react";

import { PageHero, SectionCard } from "@/components/dashboard-ui";
import { HorizontalBarChart, KpiCard } from "@/components/report-charts";
import { requireAnyRole } from "@/lib/auth";
import { executiveRoles } from "@/lib/module-access";
import { createClient } from "@/lib/supabase/server";

export default async function TeacherPerformancePage() {
  await requireAnyRole([...executiveRoles]);
  const report = await getTeacherPerformance();

  return (
    <div className="space-y-5">
      <PageHero
        eyebrow="متابعة تطويرية"
        title="لوحة أداء المعلمين"
        description="المؤشرات مساعدة للإدارة ولا تغني عن التقييم المباشر أو الزيارة الميدانية."
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="المعلمون" value={report.teachersCount} icon={UserRound} />
        <KpiCard label="جلسات مسجلة" value={report.sessionsCount} icon={ClipboardCheck} tone="gold" />
        <KpiCard label="منجزات الطلاب" value={report.progressCount} icon={BookOpen} tone="sage" />
        <KpiCard label="زيارات إشرافية" value={report.visitsCount} icon={Activity} />
      </section>
      <section className="grid gap-4 xl:grid-cols-2">
        <HorizontalBarChart title="إدخالات المعلمين" data={report.entriesByTeacher} />
        <HorizontalBarChart title="زيارات المشرفين المرتبطة" data={report.visitsByTeacher} />
      </section>
      <SectionCard title="ملاحظات مهمة">
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold leading-7 text-amber-800">
          هذه اللوحة تعرض ما تم إدخاله فعليًا في النظام فقط. المعلم الذي لا تظهر له بيانات قد يكون لم يبدأ التسجيل بعد أو يحتاج ربطًا صحيحًا بالحلقات.
        </p>
      </SectionCard>
    </div>
  );
}

async function getTeacherPerformance() {
  const supabase = await createClient();
  const [teachers, sessions, progress, visits] = await Promise.all([
    supabase.from("teachers").select("id,full_name").eq("is_test_account", false).is("archived_at", null).limit(500),
    supabase.from("teacher_session_entries").select("teacher_id").is("archived_at", null).limit(2000),
    supabase.from("student_progress_records").select("teacher_id").is("archived_at", null).limit(2000),
    supabase.from("supervisor_visits").select("teacher_id").limit(2000),
  ]);

  const teacherNames = new Map((teachers.data ?? []).map((row) => [String(row.id), String(row.full_name ?? "غير محدد")]));
  return {
    teachersCount: teachers.data?.length ?? 0,
    sessionsCount: sessions.data?.length ?? 0,
    progressCount: progress.data?.length ?? 0,
    visitsCount: visits.data?.length ?? 0,
    entriesByTeacher: aggregate([...(sessions.data ?? []), ...(progress.data ?? [])], "teacher_id", teacherNames),
    visitsByTeacher: aggregate(visits.data ?? [], "teacher_id", teacherNames),
  };
}

function aggregate(rows: Array<Record<string, unknown>>, key: string, names: Map<string, string>) {
  const map = new Map<string, number>();
  for (const row of rows) {
    const id = String(row[key] ?? "");
    const label = names.get(id) ?? "غير محدد";
    map.set(label, (map.get(label) ?? 0) + 1);
  }
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 10);
}
