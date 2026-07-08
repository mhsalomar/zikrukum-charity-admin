import Link from "next/link";
import { FileText } from "lucide-react";

import { PageHero, SectionCard } from "@/components/dashboard-ui";
import { requireAnyRole } from "@/lib/auth";
import { executiveRoles } from "@/lib/module-access";
import { createClient } from "@/lib/supabase/server";

export async function ParentStudentReportIndex({ basePath }: { basePath: string }) {
  await requireAnyRole([...executiveRoles]);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select("id,full_name,status,student_enrollments!student_enrollments_student_id_fkey(halaqat!student_enrollments_halaqa_id_fkey(name,teachers!halaqat_teacher_id_fkey(full_name),mosques!halaqat_mosque_id_fkey(name)))")
    .is("archived_at", null)
    .limit(100);

  return (
    <div className="space-y-5">
      <PageHero eyebrow="تقرير مؤقت" title="تقرير ولي الأمر" description="تقرير جاهز للطباعة ويرسل يدويًا لولي الأمر، ولا توجد بوابة ولي أمر في هذه المرحلة." />
      <SectionCard title="طباعة تقارير حلقة كاملة" icon={FileText}>
        <div className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-[var(--primary-dark)]">تقرير ولي الأمر المجمع</p>
            <p className="mt-1 text-sm font-bold leading-7 text-[var(--muted)]">
              اختر الحلقة والفترة لطباعة تقارير طلاب الحلقة دفعة واحدة دون إنشاء بوابة ولي أمر.
            </p>
          </div>
          <Link href={`${basePath}/batch`} className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[var(--primary)] px-5 text-sm font-semibold text-white">
            فتح التقرير المجمع
          </Link>
        </div>
      </SectionCard>
      <SectionCard title="اختيار الطالب" icon={FileText}>
        {error ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">تعذر تحميل الطلاب.</p>
        ) : !data?.length ? (
          <p className="rounded-2xl border border-dashed border-[var(--line)] bg-[#fffdf8] p-6 text-center text-sm font-bold text-[var(--muted)]">لا توجد بيانات طلاب متاحة.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {data.map((student) => (
              <Link key={student.id} href={`${basePath}/print?studentId=${student.id}`} className="rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-4 transition hover:border-[var(--gold)]">
                <p className="font-semibold text-[var(--primary-dark)]">{student.full_name}</p>
                <p className="mt-1 text-xs font-bold text-[var(--muted)]">طباعة تقرير ولي الأمر</p>
              </Link>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
