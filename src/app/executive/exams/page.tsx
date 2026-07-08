import Link from "next/link";
import { ClipboardPenLine } from "lucide-react";

import { EmptyState, KpiCard, PageHero, SectionCard, StatusChip } from "@/components/dashboard-ui";
import { examStatusLabels, examTypeLabels, getAdminExams } from "@/lib/exams";

export default async function ExecutiveExamsPage() {
  const exams = await getAdminExams();
  return (
    <div className="space-y-5">
      <PageHero eyebrow="متابعة تنفيذية" title="الاختبارات والنتائج" description="عرض تنفيذي للاختبارات وحالة إدخال واعتماد النتائج، دون أدوات حذف أو تعديل خطر." />
      <div className="grid gap-3 sm:grid-cols-3"><KpiCard label="الاختبارات" value={exams.length} /><KpiCard label="المشاركون" value={exams.reduce((sum, exam) => sum + exam.participantCount, 0)} /><KpiCard label="المعتمدة" value={exams.filter((exam) => exam.status === "approved").length} /></div>
      <SectionCard title="سجل الاختبارات" icon={ClipboardPenLine}>
        {exams.length === 0 ? <EmptyState title="لا توجد اختبارات مسجلة" /> : <div className="grid gap-3 sm:grid-cols-2">{exams.map((exam) => <Link key={exam.id} href={`/executive/exams/${exam.id}/print?type=results`} className="rounded-2xl border border-[var(--border)] bg-white p-4"><div className="flex justify-between gap-3"><div><h2 className="font-semibold text-[var(--primary-dark)]">{exam.title}</h2><p className="mt-1 text-sm font-bold text-[var(--muted)]">{examTypeLabels[exam.examType]} · {exam.participantCount} مشارك</p></div><StatusChip tone={exam.status === "approved" ? "success" : "default"}>{examStatusLabels[exam.status]}</StatusChip></div></Link>)}</div>}
      </SectionCard>
    </div>
  );
}
