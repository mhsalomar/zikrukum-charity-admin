import Link from "next/link";
import { ClipboardPenLine } from "lucide-react";

import { EmptyState, PageHero, SectionCard, StatusChip } from "@/components/dashboard-ui";
import { examStatusLabels, examTypeLabels, getAdminExams } from "@/lib/exams";

export default async function SupervisorExamsPage() {
  const exams = await getAdminExams(["admin", "demo_admin", "supervisor"]);
  return (
    <div className="space-y-5">
      <PageHero eyebrow="الاختبارات والتسميع" title="اختبارات نطاق الإشراف" description="عرض الاختبارات التي تضم طلابًا من الحلقات التابعة لنطاقك." />
      <SectionCard title="سجل الاختبارات" icon={ClipboardPenLine}>
        {exams.length === 0 ? <EmptyState title="لا توجد اختبارات ضمن نطاق الإشراف" description="ستظهر الاختبارات تلقائيًا عند إضافة طلاب من حلقاتك." /> : <div className="grid gap-3 sm:grid-cols-2">{exams.map((exam) => <Link href={`/supervisor/exams/${exam.id}/print?type=results`} key={exam.id} className="rounded-2xl border border-[var(--border)] bg-white p-4"><div className="flex justify-between gap-3"><div><h2 className="font-semibold text-[var(--primary-dark)]">{exam.title}</h2><p className="mt-1 text-sm font-bold text-[var(--muted)]">{examTypeLabels[exam.examType]} · {exam.participantCount} مشارك</p></div><StatusChip>{examStatusLabels[exam.status]}</StatusChip></div></Link>)}</div>}
      </SectionCard>
    </div>
  );
}
