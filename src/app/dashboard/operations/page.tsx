import Link from "next/link";
import { ArrowLeft, CheckCircle2, ClipboardList, Plus, ShieldAlert, Sparkles } from "lucide-react";

import { PageHero, SectionCard } from "@/components/dashboard-ui";
import { requireAnyRole } from "@/lib/auth";
import { getOperationsCenterData, type OperationsTask } from "@/lib/operations-center";

const roles = ["admin", "demo_admin", "executive_director", "executive_manager"] as const;

export default async function OperationsCenterPage() {
  await requireAnyRole([...roles]);
  const data = await getOperationsCenterData();
  const topTasks = data.tasks.slice(0, 12);

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="مركز التشغيل اليومي"
        title="ما الذي يحتاج إجراء الآن؟"
        description="النواقص والتنبيهات التشغيلية مع روابط الإصلاح."
        actions={
          <Link href="/dashboard/launch-readiness" className="gold-button inline-flex min-h-12 items-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white">
            جاهزية التشغيل
            <ArrowLeft aria-hidden className="size-4" />
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <Metric label="عالي الأهمية" value={data.criticalCount} tone="danger" />
        <Metric label="متوسط الأهمية" value={data.warningCount} tone="warning" />
        <Metric label="منخفض الأهمية" value={data.stableCount} tone="success" />
      </section>

      <SectionCard
        title="المهام الداخلية"
        description="متابعة مباشرة للمهام المسندة وحالة التنفيذ."
        icon={ClipboardList}
        action={<div className="flex gap-2"><Link href="/dashboard/tasks" className="secondary-button inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold">عرض كل المهام</Link><Link href="/dashboard/tasks" className="primary-button inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold"><Plus className="size-4" />إضافة مهمة</Link></div>}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <TaskMetric label="مهام جديدة" value={data.internalTasks.newCount} />
          <TaskMetric label="مهام متأخرة" value={data.internalTasks.overdueCount} warning />
          <TaskMetric label="أُنجزت اليوم" value={data.internalTasks.completedTodayCount} />
          <TaskMetric label="لم يتم إنجازها" value={data.internalTasks.notCompletedCount} warning />
        </div>
      </SectionCard>

      {data.tasks.length === 0 ? (
        <section className="rounded-[1.6rem] border border-emerald-200 bg-emerald-50 p-6 text-emerald-900">
          <div className="flex items-start gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-white">
              <CheckCircle2 aria-hidden className="size-6" />
            </span>
            <div>
              <h2 className="text-xl font-bold">الوضع مستقر</h2>
              <p className="mt-2 text-sm font-bold leading-7">
                لا توجد ملاحظات تشغيلية حرجة حاليًا. استمر في إدخال بيانات الحضور والمنجزات والزيارات بشكل منتظم.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <SectionCard title="طابور العمل" description="ابدأ بالأحمر، ثم المتوسط، ثم البنود التحسينية." icon={ShieldAlert}>
          <div className="grid gap-3">
            {topTasks.map((task) => (
              <TaskRow key={task.key} task={task} />
            ))}
          </div>
        </SectionCard>
      )}

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="إنجازات سريعة" description="بنود يمكن للإدارة معالجتها غالبًا من صفحة واحدة." icon={Sparkles}>
          {data.quickWins.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-elev)] p-5 text-sm font-bold text-[var(--muted)]">
              لا توجد إنجازات سريعة معلقة الآن.
            </p>
          ) : (
            <div className="grid gap-3">
              {data.quickWins.map((task) => (
                <TaskRow key={`quick-${task.key}`} task={task} compact />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="روابط العمل اليومي" description="اختصارات للأماكن التي تعالج أكثر النواقص تكرارًا." icon={ClipboardList}>
          <div className="grid gap-2">
            <Quick href="/dashboard/students/import" label="استيراد الطلاب والمنجزات" />
            <Quick href="/dashboard/student-requests" label="اعتماد طلبات الطلاب" />
            <Quick href="/dashboard/reports/student-progress" label="متابعة منجزات الطلاب" />
            <Quick href="/dashboard/finance/payroll" label="مراجعة الرواتب والآيبانات" />
            <Quick href="/dashboard/settings/invitations" label="متابعة الدعوات" />
            <Quick href="/dashboard/programs" label="الفائزون والتحويلات" />
            <Quick href="/dashboard/daily-monitor" label="المتابعة اليومية للحلقات" />
          </div>
        </SectionCard>
      </section>
    </div>
  );
}

function TaskMetric({ label, value, warning = false }: { label: string; value: number; warning?: boolean }) {
  return <Link href="/dashboard/tasks" className={`rounded-2xl border p-4 ${warning && value ? "border-amber-200 bg-amber-50 text-amber-900" : "border-[var(--border)] bg-white text-[var(--primary-dark)]"}`}><p className="text-sm font-bold">{label}</p><p className="mt-2 text-3xl font-bold">{new Intl.NumberFormat("ar-SA").format(value)}</p></Link>;
}

function Metric({ label, value, tone }: { label: string; value: number; tone: "danger" | "warning" | "success" }) {
  const classes = {
    danger: "border-red-200 bg-red-50 text-red-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  }[tone];

  return (
    <article className={`rounded-[1.4rem] border p-5 ${classes}`}>
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-2 text-4xl font-bold">{new Intl.NumberFormat("ar-SA").format(value)}</p>
    </article>
  );
}

function TaskRow({ task, compact = false }: { task: OperationsTask; compact?: boolean }) {
  return (
    <Link href={task.href} className={`group rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${taskTone(task.severity)}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/75 px-3 py-1 text-xs font-semibold">{task.area}</span>
            <span className="rounded-full bg-white/75 px-3 py-1 text-xs font-semibold">{severityLabel(task.severity)}</span>
          </div>
          <h3 className="mt-3 text-lg font-bold">{task.title}</h3>
          {!compact ? <p className="mt-2 text-sm font-semibold leading-7 opacity-85">{task.description}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-3xl font-bold">{new Intl.NumberFormat("ar-SA").format(task.count)}</span>
          <ArrowLeft aria-hidden className="size-5 transition group-hover:-translate-x-1" />
        </div>
      </div>
    </Link>
  );
}

function Quick({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="flex min-h-12 items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] px-4 text-sm font-semibold text-[var(--primary-dark)] transition hover:border-[var(--gold)]">
      {label}
      <ArrowLeft aria-hidden className="size-4 text-[var(--gold)]" />
    </Link>
  );
}

function severityLabel(severity: OperationsTask["severity"]) {
  return { high: "عالي", medium: "متوسط", low: "منخفض" }[severity];
}

function taskTone(severity: OperationsTask["severity"]) {
  if (severity === "high") return "border-red-200 bg-red-50 text-red-900";
  if (severity === "medium") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-emerald-100 bg-emerald-50 text-emerald-900";
}
