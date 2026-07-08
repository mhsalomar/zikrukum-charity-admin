import Link from "next/link";
import { BookOpen, CalendarCheck2, ClipboardPenLine, Gauge, ListChecks, Star, Users } from "lucide-react";

import { FollowupAlertsPanel } from "@/components/followup-alerts-panel";
import { KpiCard } from "@/components/report-charts";
import { MyTasksSummary } from "@/components/my-tasks-summary";

import { requireAnyRole } from "@/lib/auth";
import { getFollowupAlertsData } from "@/lib/launch-readiness";
import { labelFrom, observedSessionTypeLabels, visitStatusLabels } from "@/lib/supervisor-labels";
import { createClient } from "@/lib/supabase/server";
import { getSupervisorScope } from "@/lib/supervisor-scope";

const supervisorRoles = ["admin", "demo_admin", "supervisor"] as const;

type Related = Record<string, unknown>;

export default async function DashboardSupervisorPage() {
  await requireAnyRole([...supervisorRoles]);
  const supabase = await createClient();
  const scope = await getSupervisorScope();

  let circlesQuery = supabase
    .from("halaqat")
    .select("id,name,period,mosques!halaqat_mosque_id_fkey(name),teachers!halaqat_teacher_id_fkey(full_name),student_enrollments!student_enrollments_halaqa_id_fkey(id,status,archived_at)")
    .is("archived_at", null)
    .order("name")
    .limit(500);
  let visitsQuery = supabase
    .from("supervisor_visits")
    .select("id,visit_date,circle_id,observed_session_type,recitation_quality_score,circle_discipline_score,status,halaqat:circle_id(name),teachers:teacher_id(full_name)")
    .order("visit_date", { ascending: false })
    .limit(8);

  if (!scope.isAdmin && scope.circleIds) {
    circlesQuery = circlesQuery.in("id", scope.circleIds ?? []);
    visitsQuery = visitsQuery.in("circle_id", scope.circleIds ?? []);
  }

  const [circlesResult, visitsResult, readiness] = await Promise.all([
    circlesQuery,
    visitsQuery,
    getFollowupAlertsData({ circleIds: scope.circleIds, supervisorMode: true }),
  ]);
  const circles = ((circlesResult.data ?? []) as Related[]).map((circle) => {
    const enrollments = Array.isArray(circle.student_enrollments) ? circle.student_enrollments : [];
    const activeStudents = enrollments.filter((item) => {
      const row = objectValue(item);
      return row.status === "active" && !row.archived_at;
    });
    return {
      id: text(circle.id),
      name: text(circle.name),
      period: periodLabel(text(circle.period)),
      mosque: text(objectValue(circle.mosques).name) || "غير محدد",
      teacher: text(objectValue(circle.teachers).full_name) || "غير محدد",
      studentCount: activeStudents.length,
    };
  });
  const visits = (visitsResult.data ?? []) as Related[];
  const visitedCircleIds = new Set(visits.map((visit) => text(visit.circle_id)).filter(Boolean));
  const month = new Date().toISOString().slice(0, 7);
  const monthVisits = visits.filter((visit) => text(visit.visit_date).startsWith(month));
  const followUpVisits = visits.filter((visit) => text(visit.status) === "needs_followup");
  const visitTrend = buildVisitTrend(visits);

  return (
    <section className="space-y-6">
      <div className="dashboard-hero luxury-pattern rounded-[1.8rem] p-6 text-white shadow-2xl shadow-[#053828]/15">
        <p className="text-sm font-semibold text-[var(--gold-soft)]">الإشراف الميداني — {new Intl.DateTimeFormat("ar-SA-u-ca-islamic", { day: "numeric", month: "long", year: "numeric" }).format(new Date())}</p>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold">لوحة المشرف</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#d9eee5]">
              الحلقات والزيارات ومؤشرات الجودة.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionLink href="/supervisor/visits/new" label="تسجيل زيارة" primary />
            <ActionLink href="/supervisor/visits" label="سجل الزيارات" />
            <ActionLink href="/supervisor/requests" label="طلبات المعلمين" />
            <ActionLink href="/supervisor/circles" label="الحلقات" />
            <ActionLink href="/supervisor/reports" label="التقارير" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard label="الحلقات المتاحة للإشراف" value={circles.length} icon={BookOpen} tone="emerald" trend={visitTrend} />
        <KpiCard label="زيارات هذا الشهر" value={monthVisits.length} icon={CalendarCheck2} tone="gold" trend={visitTrend} />
        <KpiCard label="حلقات لم تُزر" value={Math.max(0, circles.length - visitedCircleIds.size)} icon={ListChecks} tone={Math.max(0, circles.length - visitedCircleIds.size) > 0 ? "warning" : "sage"} trend={visitTrend} />
        <KpiCard label="تحتاج متابعة" value={followUpVisits.length} icon={ClipboardPenLine} tone={followUpVisits.length > 0 ? "warning" : "emerald"} trend={visitTrend} />
        <KpiCard label="جودة التسميع" value={average(visits, "recitation_quality_score")} icon={Star} tone="gold" trend={visitTrend} />
        <KpiCard label="مستوى الانضباط" value={average(visits, "circle_discipline_score")} icon={Gauge} tone="sage" trend={visitTrend} />
      </div>

      <FollowupAlertsPanel
        title="تنبيهات الحلقات التابعة لك"
        description="تظهر هنا الملاحظات داخل نطاق الإشراف والحلقات فقط."
        items={readiness.followups}
        limit={6}
        emptyText="لا توجد تنبيهات متابعة ضمن نطاقك حاليًا."
      />

      <MyTasksSummary />

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.9fr]">
        <section className="app-card overflow-hidden rounded-[1.6rem]">
          <div className="flex items-center justify-between border-b border-[var(--line)] p-5">
            <div>
              <p className="text-xs font-semibold text-[var(--gold)]">الحلقات</p>
              <h2 className="mt-1 text-xl font-bold text-[var(--primary-dark)]">الحلقات المتاحة للإشراف</h2>
            </div>
            <Users aria-hidden className="size-6 text-[var(--gold)]" />
          </div>
          {circles.length === 0 ? (
            <EmptyState title="لا توجد حلقات مرتبطة" />
          ) : (
            <div className="divide-y divide-[var(--line)]">
              {circles.slice(0, 8).map((circle) => (
                <article key={circle.id} className="grid gap-3 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div>
                    <p className="text-base font-semibold text-[var(--primary-dark)]">{circle.name}</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-[var(--muted)]">
                      {circle.teacher} · {circle.mosque} · {circle.period} · {circle.studentCount} طالب
                    </p>
                  </div>
                  <Link href={`/supervisor/visits/new?circle=${circle.id}`} className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[var(--gold)]/50 bg-[#fff8e6] px-4 text-sm font-semibold text-[#765514]">
                    تسجيل زيارة
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="app-card overflow-hidden rounded-[1.6rem]">
          <div className="border-b border-[var(--line)] p-5">
            <p className="text-xs font-semibold text-[var(--gold)]">آخر النشاط</p>
            <h2 className="mt-1 text-xl font-bold text-[var(--primary-dark)]">آخر الزيارات</h2>
          </div>
          {visits.length === 0 ? (
            <EmptyState title="لا توجد زيارات إشرافية" />
          ) : (
            <div className="divide-y divide-[var(--line)]">
              {visits.map((visit) => (
                <Link key={text(visit.id)} href={`/supervisor/visits/${visit.id}`} className="block p-5 transition hover:bg-[#fffaf0]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--primary-dark)]">{text(objectValue(visit.halaqat).name) || "حلقة غير محددة"}</p>
                      <p className="mt-1 text-xs font-bold text-[var(--muted)]">
                        {formatDate(text(visit.visit_date))} · {labelFrom(observedSessionTypeLabels, visit.observed_session_type)}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#e8f5ee] px-3 py-1 text-xs font-semibold text-[var(--primary-dark)]">
                      {labelFrom(visitStatusLabels, visit.status)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

function ActionLink({ href, label, primary = false }: { href: string; label: string; primary?: boolean }) {
  return (
    <Link href={href} className={`${primary ? "gold-button text-white" : "border border-white/20 bg-white/10 text-white"} inline-flex min-h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold`}>
      {label}
    </Link>
  );
}

function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="p-8 text-center">
      <p className="text-base font-semibold text-[var(--primary-dark)]">{title}</p>
      {description ? <p className="mt-2 text-sm font-semibold text-[var(--muted)]">{description}</p> : null}
    </div>
  );
}

function objectValue(value: unknown): Related {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Related) : {};
}

function text(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function average(rows: Related[], key: string) {
  const values = rows.map((row) => Number(row[key])).filter((value) => Number.isFinite(value) && value > 0);
  if (!values.length) return "0";
  return (values.reduce((total, value) => total + value, 0) / values.length).toFixed(1);
}

function buildVisitTrend(visits: Related[]) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return { key: date.toISOString().slice(0, 10), value: 0 };
  });
  const byKey = new Map(days.map((day) => [day.key, day]));
  for (const visit of visits) {
    const day = byKey.get(text(visit.visit_date).slice(0, 10));
    if (day) day.value += 1;
  }
  const values = days.map((day) => day.value);
  return values.some((value) => value > 0) ? values : undefined;
}

function periodLabel(value: string) {
  return { fajr: "الفجر", asr: "العصر", maghrib: "المغرب", isha: "العشاء" }[value] ?? value;
}

function formatDate(value: string) {
  if (!value) return "غير محدد";
  return new Intl.DateTimeFormat("ar-SA").format(new Date(value));
}
