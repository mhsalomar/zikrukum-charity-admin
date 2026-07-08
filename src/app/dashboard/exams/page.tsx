import Link from "next/link";
import { CalendarCheck, CheckCircle2, ClipboardPenLine, Plus, Users } from "lucide-react";

import { EmptyState, KpiCard, PageHero, SectionCard, StatusChip } from "@/components/dashboard-ui";
import { lockTeacherResultAction } from "@/app/dashboard/exams/actions";
import { examStatusLabels, examTypeLabels, getAdminExams, getPendingTeacherResults, ratingLabels, resultStatusLabels } from "@/lib/exams";

export default async function ExamsPage() {
  const [exams, pendingTeacher] = await Promise.all([getAdminExams(), getPendingTeacherResults()]);
  return (
    <div className="space-y-5">
      <PageHero
        eyebrow="الاختبارات الإلكترونية"
        title="إدارة الاختبارات من التسجيل حتى الاعتماد"
        description="أنشئ الاختبار، أضف المشاركين، سجل الحضور والدرجات، ثم اعتمد النتائج واطبع الكشوف الرسمية."
        actions={<Link href="/dashboard/exams/new" className="primary-button inline-flex min-h-12 items-center gap-2 rounded-xl px-5 text-sm font-semibold"><Plus className="size-4" />إنشاء اختبار</Link>}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="إجمالي الاختبارات" value={exams.length} icon={ClipboardPenLine} />
        <KpiCard label="جاهزة أو جارية" value={exams.filter((exam) => exam.status === "ready" || exam.status === "in_progress").length} icon={CalendarCheck} />
        <KpiCard label="الطلاب المشاركون" value={exams.reduce((sum, exam) => sum + exam.participantCount, 0)} icon={Users} />
        <KpiCard label="اختبارات معتمدة" value={exams.filter((exam) => exam.status === "approved").length} icon={CheckCircle2} tone="success" />
      </div>
      {pendingTeacher.length > 0 && (
        <SectionCard
          title={`نتائج اختبارات المعلمين (${pendingTeacher.length})`}
          description="نتائج محفوظة في ملفات الطلاب، ويمكن للإدارة قفلها عند الحاجة."
        >
          <div className="grid gap-3 lg:grid-cols-2">
            {pendingTeacher.map((r) => (
              <article key={r.id} className="rounded-2xl border border-[var(--line)] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--primary-dark)]">{r.studentName}</p>
                    <p className="mt-0.5 text-sm font-bold text-[var(--muted)]">{r.title} · {examTypeLabels[r.examType] ?? r.examType}</p>
                    <p className="mt-0.5 text-xs font-bold text-[var(--muted)]">المعلم: {r.teacherName} — {r.halaqaName}</p>
                    {r.previewEntry ? (
                      <p className="mt-2 rounded-lg bg-white px-2 py-1 text-[11px] font-semibold text-amber-800">
                        أُدخل بواسطة {r.enteredByName || "حساب تجربة"} ضمن تجربة بوابة المعلم
                      </p>
                    ) : null}
                  </div>
                  <StatusChip tone={r.resultStatus === "passed" ? "success" : "default"}>
                    {resultStatusLabels[r.resultStatus] ?? "لم تحدد"}
                  </StatusChip>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                  <SmallStat label="الدرجة" value={r.score || "—"} />
                  <SmallStat label="التقدير" value={(ratingLabels[r.rating] ?? r.rating) || "—"} />
                  <SmallStat label="الأخطاء" value={String(r.mistakesCount)} />
                  <SmallStat label="التنبيهات" value={String(r.alertsCount)} />
                </div>
                {r.lockedAt ? (
                  <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-center text-sm font-semibold text-amber-800">مقفلة إداريًا</p>
                ) : (
                  <form action={lockTeacherResultAction} className="mt-3 space-y-2">
                    {r.needsReview ? <p className="rounded-xl bg-red-50 px-3 py-2 text-center text-xs font-semibold text-red-700">طلب المعلم مراجعة هذه النتيجة</p> : null}
                    <input type="hidden" name="result_id" value={r.id} />
                    <button type="submit" className="w-full rounded-xl border border-amber-300 bg-amber-50 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100">
                      قفل النتيجة
                    </button>
                  </form>
                )}
              </article>
            ))}
          </div>
        </SectionCard>
      )}
      <SectionCard title="سجل الاختبارات" description="افتح أي اختبار لإدارة المشاركين والنتائج والطباعة.">
        {exams.length === 0 ? (
          <EmptyState title="لا توجد اختبارات مسجلة" description="ابدأ بإنشاء أول اختبار إلكتروني من زر إنشاء اختبار." />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {exams.map((exam) => (
              <Link key={exam.id} href={`/dashboard/exams/${exam.id}`} className="rounded-2xl border border-[var(--border)] bg-white p-5 transition hover:border-[var(--gold)] hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div><h2 className="text-lg font-bold text-[var(--primary-dark)]">{exam.title}</h2><p className="mt-1 text-sm font-bold text-[var(--muted)]">{examTypeLabels[exam.examType] ?? "عام"} · {formatDate(exam.examDate)}</p></div>
                  <StatusChip tone={exam.status === "approved" ? "success" : exam.status === "in_progress" ? "warning" : "default"}>{examStatusLabels[exam.status] ?? exam.status}</StatusChip>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <SmallStat label="المشاركون" value={exam.participantCount} />
                  <SmallStat label="تم اختبارهم" value={exam.testedCount} />
                  <SmallStat label="المقر" value={exam.venue || "—"} />
                </div>
                <p className="mt-4 rounded-xl bg-[var(--bg)] px-3 py-2 text-sm font-semibold text-[var(--primary)]">{nextAction(exam.participantCount, exam.testedCount, exam.status)}</p>
              </Link>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl bg-[var(--bg)] p-3"><p className="text-xs font-bold text-[var(--muted)]">{label}</p><p className="mt-1 truncate text-base font-semibold text-[var(--primary-dark)]">{value}</p></div>;
}
function formatDate(value: string) {
  return value ? new Intl.DateTimeFormat("ar-SA").format(new Date(value)) : "لم يحدد التاريخ";
}
function nextAction(participants: number, tested: number, status: string) {
  if (status === "approved") return "عرض النتائج المعتمدة والطباعة";
  if (participants === 0) return "الإجراء التالي: إضافة الطلاب";
  if (tested < participants) return "الإجراء التالي: بدء الاختبار وإدخال النتائج";
  return "الإجراء التالي: مراجعة واعتماد النتائج";
}
