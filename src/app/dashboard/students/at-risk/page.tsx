import Link from "next/link";
import { AlertTriangle, BookOpen, Clock, TrendingDown, UserRound } from "lucide-react";

import { PageHero, SectionCard } from "@/components/dashboard-ui";
import { getAtRiskStudents, type AtRiskStudent } from "@/lib/at-risk";

const reasonLabels: Record<string, { label: string; color: string }> = {
  stale:  { label: "لا نشاط +14 يوم", color: "bg-amber-100 text-amber-800" },
  absent: { label: "غياب متكرر",       color: "bg-red-100 text-red-800" },
  weak:   { label: "تقييم ضعيف",       color: "bg-orange-100 text-orange-800" },
};

export default async function AtRiskPage() {
  const students = await getAtRiskStudents();
  const critical = students.filter((s) => s.reasons.length >= 2);
  const warning  = students.filter((s) => s.reasons.length === 1);

  return (
    <div className="space-y-5">
      <PageHero
        eyebrow="إنذار مبكر للتسرب"
        title="طلاب يحتاجون متابعة عاجلة"
        description="طلاب تعرّضوا لغياب متكرر أو توقف حفظ أو تقييم ضعيف. هذه مؤشرات — المتابعة البشرية ضرورية قبل أي قرار."
        actions={
          <Link href="/dashboard/students" className="secondary-button inline-flex min-h-12 items-center rounded-xl px-5 text-sm font-semibold">
            قائمة الطلاب
          </Link>
        }
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <Metric label="خطر عالٍ (2+ مؤشرات)" value={critical.length} tone="danger" />
        <Metric label="تحتاج متابعة" value={warning.length}  tone="warning" />
        <Metric label="إجمالي المُنذَر" value={students.length} tone="default" />
      </section>

      {critical.length > 0 && (
        <SectionCard title="خطر عالٍ — يحتاج تدخلاً فورياً" icon={AlertTriangle}>
          <div className="grid gap-3 sm:grid-cols-2">
            {critical.map((s) => <StudentCard key={s.studentId} student={s} />)}
          </div>
        </SectionCard>
      )}

      {warning.length > 0 && (
        <SectionCard title="تحتاج متابعة" icon={Clock}>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {warning.map((s) => <StudentCard key={s.studentId} student={s} />)}
          </div>
        </SectionCard>
      )}

      {students.length === 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <p className="text-lg font-bold text-emerald-800">لا يوجد طلاب في دائرة الخطر حالياً ✓</p>
          <p className="mt-2 text-sm font-bold text-emerald-700">جميع الطلاب نشطون خلال آخر 14 يوماً.</p>
        </div>
      )}
    </div>
  );
}

function StudentCard({ student }: { student: AtRiskStudent }) {
  return (
    <article className="rounded-2xl border border-[var(--border)] bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-[var(--primary-dark)]">{student.studentName}</p>
          <p className="mt-1 flex items-center gap-1 text-xs font-bold text-[var(--muted)]">
            <BookOpen className="size-3" aria-hidden />
            {student.halaqaName}
          </p>
          <p className="flex items-center gap-1 text-xs font-bold text-[var(--muted)]">
            <UserRound className="size-3" aria-hidden />
            {student.teacherName}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {student.reasons.map((r) => (
            <span key={r} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${reasonLabels[r]?.color ?? ""}`}>
              {reasonLabels[r]?.label}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3 border-t border-[var(--line)] pt-3 text-xs font-bold text-[var(--muted)]">
        <span className="flex items-center gap-1">
          <Clock className="size-3" aria-hidden />
          {student.daysSinceActivity < 0 ? "لا نشاط" : `${student.daysSinceActivity} يوم`}
        </span>
        {student.consecutiveAbsences > 0 && (
          <span className="flex items-center gap-1 text-red-600">
            <TrendingDown className="size-3" aria-hidden />
            {student.consecutiveAbsences} غيابات
          </span>
        )}
      </div>
    </article>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: "danger" | "warning" | "default" }) {
  const color = tone === "danger" ? "text-red-700" : tone === "warning" ? "text-amber-700" : "text-[var(--primary-dark)]";
  const bg    = tone === "danger" ? "bg-red-50 border-red-200" : tone === "warning" ? "bg-amber-50 border-amber-200" : "bg-[#fffdf8] border-[var(--line)]";
  return (
    <div className={`rounded-2xl border p-4 text-center ${bg}`}>
      <p className="text-xs font-bold text-[var(--muted)]">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
