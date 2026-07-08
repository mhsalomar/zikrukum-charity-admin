import Link from "next/link";
import { ClipboardPenLine, Star } from "lucide-react";

import { requireAnyRole } from "@/lib/auth";
import { executiveRoles } from "@/lib/module-access";
import { labelFrom, observedSessionTypeLabels, visitStatusLabels } from "@/lib/supervisor-labels";
import { createClient } from "@/lib/supabase/server";

export default async function ExecutiveSupervisionPage() {
  await requireAnyRole([...executiveRoles]);
  const summary = await getSupervisionSummary();

  return (
    <section className="space-y-5">
      <section className="dashboard-hero luxury-pattern rounded-[1.8rem] p-6 text-white">
        <p className="text-sm font-semibold text-[var(--gold-soft)]">الإشراف الميداني</p>
        <h1 className="mt-2 text-3xl font-bold">ملخص زيارات المشرفين</h1>
        <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-[#d9eee5]">
          متابعة تنفيذ الزيارات وجودة التسميع والانضباط دون الدخول في صلاحيات المشرف التشغيلية.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="إجمالي الزيارات" value={summary.total} />
        <Metric label="تحتاج متابعة" value={summary.needsFollowUp} warning />
        <Metric label="متوسط جودة التسميع" value={summary.avgRecitation} />
        <Metric label="متوسط الانضباط" value={summary.avgDiscipline} />
      </section>

      <section className="app-card overflow-hidden rounded-[1.6rem]">
        <div className="border-b border-[var(--line)] p-5">
          <p className="text-sm font-semibold text-[var(--gold)]">آخر الزيارات</p>
          <h2 className="mt-1 text-xl font-bold text-[var(--primary-dark)]">سجل مختصر للإدارة التنفيذية</h2>
        </div>
        {summary.recent.length === 0 ? (
          <div className="p-8 text-center">
            <ClipboardPenLine aria-hidden className="mx-auto size-10 text-[var(--gold)]" />
            <p className="mt-3 text-base font-semibold text-[var(--primary-dark)]">لا توجد زيارات إشرافية مسجلة بعد</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {summary.recent.map((visit) => (
              <Link key={visit.id} href={`/supervisor/visits/${visit.id}`} className="grid gap-2 p-5 transition hover:bg-[#fffaf0] lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <p className="font-semibold text-[var(--primary-dark)]">{visit.circle}</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
                    {visit.date} · {visit.supervisor} · {visit.teacher} · {visit.type}
                  </p>
                </div>
                <span className="inline-flex w-fit rounded-full bg-[#e8f5ee] px-3 py-1 text-xs font-semibold text-[var(--primary-dark)]">
                  {visit.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

async function getSupervisionSummary() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("supervisor_visits")
    .select("id,visit_date,observed_session_type,recitation_quality_score,circle_discipline_score,status,halaqat:circle_id(name),teachers:teacher_id(full_name),supervisors:supervisor_id(full_name)")
    .order("visit_date", { ascending: false })
    .limit(20);
  const visits = (data ?? []) as Array<Record<string, unknown>>;
  return {
    total: visits.length,
    needsFollowUp: visits.filter((visit) => String(visit.status ?? "") === "needs_followup").length,
    avgRecitation: average(visits, "recitation_quality_score"),
    avgDiscipline: average(visits, "circle_discipline_score"),
    recent: visits.slice(0, 8).map((visit) => ({
      id: String(visit.id),
      date: formatDate(String(visit.visit_date ?? "")),
      supervisor: String(readObject(visit.supervisors).full_name ?? "غير محدد"),
      circle: String(readObject(visit.halaqat).name ?? "غير محدد"),
      teacher: String(readObject(visit.teachers).full_name ?? "غير محدد"),
      type: labelFrom(observedSessionTypeLabels, visit.observed_session_type),
      status: labelFrom(visitStatusLabels, visit.status),
    })),
  };
}

function Metric({ label, value, warning = false }: { label: string; value: string | number; warning?: boolean }) {
  return (
    <article className={`app-card rounded-[1.5rem] border-r-4 p-5 ${warning ? "border-amber-400" : "border-[var(--gold)]"}`}>
      <Star aria-hidden className="size-5 text-[var(--gold)]" />
      <p className="mt-3 text-xs font-bold text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-3xl font-bold text-[var(--primary-dark)]">{value}</p>
    </article>
  );
}

function average(rows: Array<Record<string, unknown>>, key: string) {
  const values = rows.map((row) => Number(row[key])).filter((value) => Number.isFinite(value) && value > 0);
  if (!values.length) return "0";
  return (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1);
}

function readObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function formatDate(value: string) {
  if (!value) return "غير محدد";
  return new Intl.DateTimeFormat("ar-SA").format(new Date(value));
}
