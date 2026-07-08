import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { requireAnyRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSupervisorScope } from "@/lib/supervisor-scope";

import { createSupervisorVisit } from "./actions";
import { SupervisorVisitForm } from "./form";

const supervisorRoles = ["admin", "demo_admin", "supervisor"] as const;

type PageProps = { searchParams: Promise<{ circle?: string; error?: string }> };

export default async function SupervisorVisitNewPage({ searchParams }: PageProps) {
  await requireAnyRole([...supervisorRoles]);
  const params = await searchParams;
  const supabase = await createClient();
  const scope = await getSupervisorScope();

  let circlesQuery = supabase
    .from("halaqat")
    .select("id,name,period,teacher_id,mosques!halaqat_mosque_id_fkey(name),teachers!halaqat_teacher_id_fkey(full_name)")
    .is("archived_at", null)
    .order("name");
  if (!scope.isAdmin && scope.circleIds) circlesQuery = circlesQuery.in("id", scope.circleIds);
  const circlesRes = await circlesQuery;
  const circles = (circlesRes.data ?? []).map((circle) => ({
    id: String(circle.id),
    name: String(circle.name ?? ""),
    teacherId: String(circle.teacher_id ?? ""),
    teacherName: String(readObject(circle.teachers).full_name ?? ""),
    mosqueName: String(readObject(circle.mosques).name ?? ""),
    period: periodLabel(String(circle.period ?? "")),
  }));

  const ids = circles.map((circle) => circle.id);
  const studentsRes = ids.length
    ? await supabase
      .from("student_enrollments")
      .select("halaqa_id,students!student_enrollments_student_id_fkey(id,full_name)")
      .eq("status", "active")
      .is("archived_at", null)
      .in("halaqa_id", ids)
    : { data: [] as Array<Record<string, unknown>> };
  const students = (studentsRes.data ?? [])
    .map((row: Record<string, unknown>) => {
      const student = (row.students as Record<string, unknown> | null) ?? {};
      return {
        id: String(student.id ?? ""),
        name: String(student.full_name ?? ""),
        circleId: String(row.halaqa_id ?? ""),
      };
    })
    .filter((student) => student.id && student.name);

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-[var(--gold)]">الإشراف الميداني</p>
          <h1 className="mt-1 text-2xl font-bold text-[var(--primary-dark)]">تسجيل زيارة إشرافية</h1>
          <p className="mt-2 text-sm font-semibold text-[var(--muted)]">نموذج مرتب لتوثيق زيارة الحلقة وملاحظات المشرف.</p>
        </div>
        <Link href="/supervisor/visits" className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 text-sm font-semibold text-[var(--primary-dark)]">
          <ArrowRight aria-hidden className="size-4" />
          سجل الزيارات
        </Link>
      </div>

      <StatusNotice code={params.error ?? ""} />

      <form action={createSupervisorVisit} noValidate className="app-card rounded-[1.7rem] p-4 sm:p-6">
        <SupervisorVisitForm circles={circles} students={students} initialCircleId={params.circle} />
      </form>
    </section>
  );
}

function StatusNotice({ code }: { code: string }) {
  if (!code) return null;
  const messages: Record<string, string> = {
    required: "اختر الحلقة وتاريخ الزيارة قبل الحفظ.",
    scope: "لا تملك صلاحية تسجيل زيارة لهذه الحلقة.",
    student: "طالب العينة غير مرتبط بهذه الحلقة.",
    save: "تعذر حفظ الزيارة. تحقق من الصلاحيات والبيانات ثم أعد المحاولة.",
  };
  return <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{messages[code] ?? "تعذر تنفيذ العملية."}</p>;
}

function periodLabel(value: string) {
  return { fajr: "الفجر", asr: "العصر", maghrib: "المغرب", isha: "العشاء" }[value] ?? value;
}

function readObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
