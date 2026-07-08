import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ClipboardCheck } from "lucide-react";

import { requireAnyRole } from "@/lib/auth";
import { achievementMatchLabels, labelFrom, observedSessionTypeLabels, teacherStatusLabels, visitStatusLabels, yesNoLabels } from "@/lib/supervisor-labels";
import { createClient } from "@/lib/supabase/server";
import { getSupervisorScope } from "@/lib/supervisor-scope";

const supervisorRoles = ["admin", "demo_admin", "supervisor", "executive_director"] as const;
type Row = Record<string, unknown>;

export default async function SupervisorVisitDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAnyRole([...supervisorRoles]);
  const { id } = await params;
  const supabase = await createClient();
  const scope = await getSupervisorScope();
  let query = supabase
    .from("supervisor_visits")
    .select("*,halaqat:circle_id(name,period,mosques!halaqat_mosque_id_fkey(name)),teachers:teacher_id(full_name),students:sample_student_id(full_name),supervisors:supervisor_id(full_name)")
    .eq("id", id);
  if (!scope.isAdmin && scope.circleIds) query = query.in("circle_id", scope.circleIds);
  const { data, error } = await query.maybeSingle();
  if (error || !data) notFound();
  const visit = data as Row;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/supervisor/visits" className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 text-sm font-semibold text-[var(--primary-dark)]">
          <ArrowRight aria-hidden className="size-4" />
          سجل الزيارات
        </Link>
      </div>

      <section className="dashboard-hero luxury-pattern rounded-[1.8rem] p-6 text-white shadow-2xl shadow-[#053828]/15">
        <div className="flex items-start gap-4">
          <span className="grid size-14 place-items-center rounded-2xl border border-[var(--gold)]/45 bg-white/12 text-[var(--gold-soft)]">
            <ClipboardCheck aria-hidden className="size-7" />
          </span>
          <div>
            <p className="text-sm font-semibold text-[var(--gold-soft)]">تفاصيل زيارة إشرافية</p>
            <h1 className="mt-2 text-3xl font-bold">{text(objectValue(visit.halaqat).name) || "زيارة إشرافية"}</h1>
            <p className="mt-2 text-sm text-[#d9eee5]">{formatDate(text(visit.visit_date))} · {labelFrom(visitStatusLabels, visit.status)}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <InfoCard title="بيانات الزيارة" items={[
          ["الحلقة", text(objectValue(visit.halaqat).name)],
          ["المسجد", text(objectValue(objectValue(visit.halaqat).mosques).name)],
          ["المعلم", text(objectValue(visit.teachers).full_name)],
          ["المشرف", text(objectValue(visit.supervisors).full_name)],
          ["حالة المعلم", labelFrom(teacherStatusLabels, visit.teacher_status)],
        ]} />
        <InfoCard title="الحضور والحصة" items={[
          ["نوع الحصة", labelFrom(observedSessionTypeLabels, visit.observed_session_type)],
          ["درس تجويد", labelFrom(yesNoLabels, visit.tajweed_lesson_given ? "yes" : "no")],
          ["الحضور", text(visit.present_count) || "0"],
          ["الغياب", text(visit.absent_count) || "0"],
          ["التأخر", text(visit.late_count) || "0"],
          ["المعتذرون", text(visit.excused_count) || "0"],
        ]} />
        <InfoCard title="طالب العينة والتقييم" items={[
          ["طالب العينة", text(objectValue(visit.students).full_name)],
          ["مطابقة الإنجاز", labelFrom(achievementMatchLabels, visit.achievement_match_status)],
          ["جودة التسميع", text(visit.recitation_quality_score) || "0"],
          ["انضباط الحلقة", text(visit.circle_discipline_score) || "0"],
          ["تفاعل الطلاب", text(visit.student_engagement_score) || "0"],
          ["تنظيم المعلم", text(visit.teacher_organization_score) || "0"],
        ]} />
      </div>

      <section className="app-card rounded-[1.5rem] p-5">
        <h2 className="text-lg font-bold text-[var(--primary-dark)]">الملاحظات والتوصية</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <TextBlock title="ملاحظات المشرف" value={text(visit.notes)} />
          <TextBlock title="التوصية" value={text(visit.recommendation)} />
        </div>
      </section>
    </section>
  );
}

function InfoCard({ title, items }: { title: string; items: Array<[string, string]> }) {
  return (
    <article className="app-card rounded-[1.5rem] p-5">
      <h2 className="text-lg font-bold text-[var(--primary-dark)]">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-3 border-b border-[var(--line)] pb-2 last:border-0">
            <span className="text-xs font-bold text-[var(--muted)]">{label}</span>
            <span className="text-sm font-semibold text-[var(--text)]">{value || "غير محدد"}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function TextBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-4">
      <p className="text-xs font-semibold text-[var(--gold)]">{title}</p>
      <p className="mt-2 min-h-16 text-sm font-semibold leading-7 text-[var(--text)]">{value || "لا توجد"}</p>
    </div>
  );
}

function objectValue(value: unknown): Row {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Row) : {};
}

function text(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function formatDate(value: string) {
  if (!value) return "غير محدد";
  return new Intl.DateTimeFormat("ar-SA").format(new Date(value));
}
