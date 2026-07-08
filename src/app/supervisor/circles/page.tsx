import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";

import { requireAnyRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSupervisorScope } from "@/lib/supervisor-scope";

const supervisorRoles = ["admin", "demo_admin", "supervisor"] as const;
type Row = Record<string, unknown>;

export default async function SupervisorCirclesPage() {
  await requireAnyRole([...supervisorRoles]);
  const supabase = await createClient();
  const scope = await getSupervisorScope();
  let query = supabase
    .from("halaqat")
    .select("id,name,period,status,mosques!halaqat_mosque_id_fkey(name),teachers!halaqat_teacher_id_fkey(full_name),student_enrollments!student_enrollments_halaqa_id_fkey(id,status,archived_at),supervisor_visits!supervisor_visits_circle_id_fkey(id,visit_date)")
    .is("archived_at", null)
    .order("name");
  if (!scope.isAdmin && scope.circleIds) query = query.in("id", scope.circleIds);
  const { data, error } = await query;
  const circles = ((data ?? []) as Row[]).map((circle) => {
    const enrollments = Array.isArray(circle.student_enrollments) ? circle.student_enrollments : [];
    const visits = Array.isArray(circle.supervisor_visits) ? circle.supervisor_visits : [];
    return {
      id: text(circle.id),
      name: text(circle.name),
      period: periodLabel(text(circle.period)),
      mosque: text(objectValue(circle.mosques).name),
      teacher: text(objectValue(circle.teachers).full_name),
      studentCount: enrollments.filter((item) => {
        const row = objectValue(item);
        return row.status === "active" && !row.archived_at;
      }).length,
      lastVisit: visits.map((item) => text(objectValue(item).visit_date)).filter(Boolean).sort().at(-1) ?? "",
    };
  });

  return (
    <section className="space-y-5">
      <div className="dashboard-hero luxury-pattern rounded-[1.8rem] p-6 text-white">
        <p className="text-sm font-semibold text-[var(--gold-soft)]">نطاق الإشراف</p>
        <h1 className="mt-1 text-3xl font-bold">الحلقات</h1>
        <p className="mt-3 text-sm leading-7 text-[#d9eee5]">الحلقات المرتبطة بالمشرف مع المعلم والمسجد وعدد الطلاب وآخر زيارة.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {error ? (
          <div className="app-card rounded-[1.5rem] p-6 text-sm font-bold text-red-700">تعذر تحميل الحلقات.</div>
        ) : circles.length === 0 ? (
          <div className="app-card rounded-[1.5rem] p-8 text-center md:col-span-2 xl:col-span-3">
            <BookOpen aria-hidden className="mx-auto size-10 text-[var(--gold)]" />
            <p className="mt-3 font-semibold text-[var(--primary-dark)]">لا توجد حلقات مرتبطة</p>
            <p className="mt-2 text-sm font-semibold text-[var(--muted)]">تواصل مع الإدارة لربط المشرف بحلقاته.</p>
          </div>
        ) : (
          circles.map((circle) => (
            <article key={circle.id} className="app-card rounded-[1.5rem] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-[var(--primary-dark)]">{circle.name}</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[var(--muted)]">{circle.mosque || "مسجد غير محدد"} · {circle.period}</p>
                </div>
                <span className="grid size-11 place-items-center rounded-2xl bg-[#fff8e6] text-[var(--gold)]">
                  <BookOpen aria-hidden className="size-5" />
                </span>
              </div>
              <div className="mt-4 grid gap-2 text-sm font-bold text-[var(--muted)]">
                <p>المعلم: <span className="text-[var(--text)]">{circle.teacher || "غير محدد"}</span></p>
                <p>عدد الطلاب: <span className="text-[var(--text)]">{circle.studentCount}</span></p>
                <p>آخر زيارة: <span className="text-[var(--text)]">{circle.lastVisit ? formatDate(circle.lastVisit) : "لا توجد"}</span></p>
              </div>
              <Link href={`/supervisor/visits/new?circle=${circle.id}`} className="gold-button mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-white">
                <Plus aria-hidden className="size-4" />
                تسجيل زيارة
              </Link>
            </article>
          ))
        )}
      </section>
    </section>
  );
}

function objectValue(value: unknown): Row {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Row) : {};
}

function text(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function periodLabel(value: string) {
  return { fajr: "الفجر", asr: "العصر", maghrib: "المغرب", isha: "العشاء" }[value] ?? value;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-SA").format(new Date(value));
}
