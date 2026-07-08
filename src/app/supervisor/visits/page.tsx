import Link from "next/link";
import { Plus, Search } from "lucide-react";

import { requireAnyRole } from "@/lib/auth";
import { labelFrom, observedSessionTypeLabels, teacherStatusLabels, visitStatusLabels } from "@/lib/supervisor-labels";
import { createClient } from "@/lib/supabase/server";
import { getSupervisorScope } from "@/lib/supervisor-scope";

const supervisorRoles = ["admin", "demo_admin", "supervisor", "executive_director"] as const;

type PageProps = {
  searchParams: Promise<{
    from?: string;
    to?: string;
    circle?: string;
    type?: string;
    status?: string;
    followup?: string;
    tajweed?: string;
  }>;
};

type Row = Record<string, unknown>;

export default async function SupervisorVisitsPage({ searchParams }: PageProps) {
  await requireAnyRole([...supervisorRoles]);
  const filters = await searchParams;
  const supabase = await createClient();
  const scope = await getSupervisorScope();

  let visitsQuery = supabase
    .from("supervisor_visits")
    .select("id,visit_date,teacher_status,present_count,tajweed_lesson_given,observed_session_type,achievement_match_status,recitation_quality_score,circle_discipline_score,status,halaqat:circle_id(id,name),teachers:teacher_id(full_name),students:sample_student_id(full_name),supervisors:supervisor_id(full_name)")
    .order("visit_date", { ascending: false })
    .limit(100);
  let circlesQuery = supabase.from("halaqat").select("id,name").is("archived_at", null).order("name");

  if (!scope.isAdmin && scope.circleIds) {
    visitsQuery = visitsQuery.in("circle_id", scope.circleIds);
    circlesQuery = circlesQuery.in("id", scope.circleIds);
  }
  if (filters.from) visitsQuery = visitsQuery.gte("visit_date", filters.from);
  if (filters.to) visitsQuery = visitsQuery.lte("visit_date", filters.to);
  if (filters.circle) visitsQuery = visitsQuery.eq("circle_id", filters.circle);
  if (filters.type) visitsQuery = visitsQuery.eq("observed_session_type", filters.type);
  if (filters.status) visitsQuery = visitsQuery.eq("status", filters.status);
  if (filters.followup === "yes") visitsQuery = visitsQuery.eq("status", "needs_followup");
  if (filters.tajweed === "yes") visitsQuery = visitsQuery.eq("tajweed_lesson_given", true);
  if (filters.tajweed === "no") visitsQuery = visitsQuery.eq("tajweed_lesson_given", false);

  const [visitsResult, circlesResult] = await Promise.all([visitsQuery, circlesQuery]);
  const visits = (visitsResult.data ?? []) as Row[];
  const circles = (circlesResult.data ?? []) as Row[];

  return (
    <section className="space-y-5">
      <div className="dashboard-hero luxury-pattern rounded-[1.8rem] p-6 text-white shadow-2xl shadow-[#053828]/15">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--gold-soft)]">سجل الإشراف</p>
            <h1 className="mt-1 text-3xl font-bold">سجل الزيارات</h1>
            <p className="mt-3 text-sm leading-7 text-[#d9eee5]">عرض زيارات المشرف، حالاتها، والتقييمات الأساسية للحلقات.</p>
          </div>
          <Link href="/supervisor/visits/new" className="gold-button inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white">
            <Plus aria-hidden className="size-5" />
            تسجيل زيارة جديدة
          </Link>
        </div>
      </div>

      <form className="app-card grid gap-3 rounded-[1.4rem] p-4 md:grid-cols-3 xl:grid-cols-6">
        <FilterInput name="from" label="من تاريخ" type="date" defaultValue={filters.from} />
        <FilterInput name="to" label="إلى تاريخ" type="date" defaultValue={filters.to} />
        <FilterSelect name="circle" label="الحلقة" value={filters.circle} options={circles.map((circle) => ({ value: text(circle.id), label: text(circle.name) }))} placeholder="كل الحلقات" />
        <FilterSelect name="type" label="نوع الحصة" value={filters.type} options={toOptions(observedSessionTypeLabels)} placeholder="كل الأنواع" />
        <FilterSelect name="status" label="الحالة" value={filters.status} options={toOptions(visitStatusLabels).filter((item) => item.value !== "open")} placeholder="كل الحالات" />
        <FilterSelect name="tajweed" label="درس تجويد" value={filters.tajweed} options={[{ value: "yes", label: "نعم" }, { value: "no", label: "لا" }]} placeholder="الكل" />
        <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--gold)]/50 bg-[#fff8e6] px-4 text-sm font-semibold text-[#765514] xl:col-span-6">
          <Search aria-hidden className="size-5" />
          تطبيق التصفية
        </button>
      </form>

      <section className="app-card overflow-hidden rounded-[1.6rem]">
        {visitsResult.error ? (
          <EmptyState title="تعذر تحميل سجل الزيارات" />
        ) : visits.length === 0 ? (
          <EmptyState title="لا توجد زيارات إشرافية مسجلة بعد" actionHref="/supervisor/visits/new" />
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="formal-table w-full min-w-[980px] text-right text-sm">
                <thead>
                  <tr>
                    {["التاريخ", "الحلقة", "المعلم", "طالب العينة", "حالة المعلم", "نوع الحصة", "الحضور", "جودة التسميع", "الانضباط", "الحالة", "الإجراءات"].map((heading) => (
                      <th key={heading} className="px-4 py-4">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visits.map((visit) => <VisitRow key={text(visit.id)} visit={visit} />)}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 p-4 lg:hidden">
              {visits.map((visit) => <VisitCard key={text(visit.id)} visit={visit} />)}
            </div>
          </>
        )}
      </section>
    </section>
  );
}

function VisitRow({ visit }: { visit: Row }) {
  return (
    <tr className="transition">
      <td className="px-4 py-4 font-bold text-[var(--text)]">{formatDate(text(visit.visit_date))}</td>
      <td className="px-4 py-4">{text(objectValue(visit.halaqat).name) || "غير محدد"}</td>
      <td className="px-4 py-4">{text(objectValue(visit.teachers).full_name) || "غير محدد"}</td>
      <td className="px-4 py-4">{text(objectValue(visit.students).full_name) || "غير محدد"}</td>
      <td className="px-4 py-4">{labelFrom(teacherStatusLabels, visit.teacher_status)}</td>
      <td className="px-4 py-4">{labelFrom(observedSessionTypeLabels, visit.observed_session_type)}</td>
      <td className="px-4 py-4">{text(visit.present_count) || "0"}</td>
      <td className="px-4 py-4">{text(visit.recitation_quality_score) || "0"}</td>
      <td className="px-4 py-4">{text(visit.circle_discipline_score) || "0"}</td>
      <td className="px-4 py-4"><StatusBadge value={text(visit.status)} /></td>
      <td className="px-4 py-4"><DetailsLink id={text(visit.id)} /></td>
    </tr>
  );
}

function VisitCard({ visit }: { visit: Row }) {
  return (
    <article className="resource-mobile-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-[var(--primary-dark)]">{text(objectValue(visit.halaqat).name) || "زيارة إشرافية"}</p>
          <p className="mt-1 text-xs font-bold text-[var(--muted)]">{formatDate(text(visit.visit_date))}</p>
        </div>
        <StatusBadge value={text(visit.status)} />
      </div>
      <div className="mt-4 grid gap-2 text-sm font-bold text-[var(--muted)]">
        <p>المعلم: {text(objectValue(visit.teachers).full_name) || "غير محدد"}</p>
        <p>طالب العينة: {text(objectValue(visit.students).full_name) || "غير محدد"}</p>
        <p>نوع الحصة: {labelFrom(observedSessionTypeLabels, visit.observed_session_type)}</p>
        <p>جودة التسميع: {text(visit.recitation_quality_score) || "0"} · الانضباط: {text(visit.circle_discipline_score) || "0"}</p>
      </div>
      <div className="mt-4"><DetailsLink id={text(visit.id)} /></div>
    </article>
  );
}

function StatusBadge({ value }: { value: string }) {
  return <span className="inline-flex rounded-full bg-[#e8f5ee] px-3 py-1 text-xs font-semibold text-[var(--primary-dark)]">{labelFrom(visitStatusLabels, value)}</span>;
}

function DetailsLink({ id }: { id: string }) {
  return <Link href={`/supervisor/visits/${id}`} className="inline-flex min-h-10 items-center rounded-xl border border-[var(--line)] bg-[#fffdf8] px-3 text-xs font-semibold text-[var(--primary-dark)]">التفاصيل</Link>;
}

function EmptyState({ title, description, actionHref }: { title: string; description?: string; actionHref?: string }) {
  return (
    <div className="p-8 text-center">
      <p className="text-base font-semibold text-[var(--primary-dark)]">{title}</p>
      {description ? <p className="mt-2 text-sm font-semibold text-[var(--muted)]">{description}</p> : null}
      {actionHref ? <Link href={actionHref} className="gold-button mt-5 inline-flex rounded-2xl px-5 py-3 text-sm font-semibold text-white">تسجيل زيارة جديدة</Link> : null}
    </div>
  );
}

function FilterInput({ label, name, type, defaultValue }: { label: string; name: string; type: string; defaultValue?: string }) {
  return (
    <label className="block text-sm font-bold text-[var(--text)]">
      {label}
      <input name={name} type={type} defaultValue={defaultValue ?? ""} className="mt-2 h-12 w-full rounded-2xl border border-[var(--line)] bg-white px-4 text-sm font-semibold outline-none focus:border-[var(--gold)]" />
    </label>
  );
}

function FilterSelect({ label, name, value, options, placeholder }: { label: string; name: string; value?: string; options: Array<{ value: string; label: string }>; placeholder: string }) {
  return (
    <label className="block text-sm font-bold text-[var(--text)]">
      {label}
      <select name={name} defaultValue={value ?? ""} className="mt-2 h-12 w-full rounded-2xl border border-[var(--line)] bg-white px-4 text-sm font-semibold outline-none focus:border-[var(--gold)]">
        <option value="">{placeholder}</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function objectValue(value: unknown): Row {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Row) : {};
}

function text(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function toOptions(map: Record<string, string>) {
  return Object.entries(map).map(([value, label]) => ({ value, label }));
}

function formatDate(value: string) {
  if (!value) return "غير محدد";
  return new Intl.DateTimeFormat("ar-SA").format(new Date(value));
}
