import { OfficialPrintPage } from "@/components/official-print-layout";
import { getExamDetail, summarizeExam } from "@/lib/exams";

export default async function ExamPrintPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ type?: string; participant?: string }> }) {
  const { id } = await params;
  const { type = "results", participant } = await searchParams;
  const exam = await getExamDetail(id, ["admin", "demo_admin", "executive_director", "executive_manager", "supervisor"]);
  const summary = summarizeExam(exam);
  const rows = type === "student" ? exam.participants.filter((item) => item.id === participant) : exam.participants;
  const title = type === "attendance" ? "كشف حضور الاختبار" : type === "participants" ? "كشف الطلاب المشاركين" : type === "student" ? "تقرير نتيجة طالب" : "كشف نتائج الاختبار";
  return (
    <OfficialPrintPage title={title} subtitle={exam.title} documentDate={exam.examDate} variant="report">
      <div className="mb-5 grid grid-cols-4 gap-3 text-center text-sm">
        <Stat label="المشاركون" value={summary.total} /><Stat label="تم اختبارهم" value={summary.tested} /><Stat label="إجمالي الأخطاء" value={summary.totalMistakes} /><Stat label="إجمالي التنبيهات" value={summary.totalAlerts} />
      </div>
      <table className="w-full border-collapse text-right text-xs">
        <thead><tr className="bg-[#f4efe3]"><th className="border p-2">م</th><th className="border p-2">الطالب</th><th className="border p-2">الحلقة</th><th className="border p-2">الأجزاء والمقطع</th>{type !== "participants" ? <><th className="border p-2">الدرجة</th><th className="border p-2">الأخطاء</th><th className="border p-2">التنبيهات</th><th className="border p-2">التجويد</th><th className="border p-2">التاريخ</th></> : null}</tr></thead>
        <tbody>{rows.map((participant, index) => <tr key={participant.id}><td className="border p-2">{index + 1}</td><td className="border p-2 font-bold">{participant.participantName}</td><td className="border p-2">{participant.halaqaName || "—"}</td><td className="border p-2">{participant.selectedJuz.length ? `الأجزاء: ${participant.selectedJuz.join("، ")} — ` : ""}{participant.examScope || exam.surahScope || "—"}</td>{type !== "participants" ? <><td className="border p-2">{participant.score || "—"}</td><td className="border p-2">{participant.mistakesCount}</td><td className="border p-2">{participant.alertsCount}</td><td className="border p-2">{tajweedLabel(participant.tajweedRating)}</td><td className="border p-2">{participant.evaluationDate || "—"}</td></> : null}</tr>)}</tbody>
      </table>
      <div className="mt-14 grid grid-cols-2 gap-12 text-center text-sm font-bold"><p>المختبر: ____________________</p><p>الاعتماد: ____________________</p></div>
    </OfficialPrintPage>
  );
}
function Stat({ label, value }: { label: string; value: string | number }) { return <div className="rounded-lg border border-[#e3decf] p-3"><p>{label}</p><p className="mt-1 text-lg font-bold">{value}</p></div>; }
function tajweedLabel(value: string) {
  return ({ excellent: "ممتاز", very_good: "جيد جدًا", good: "جيد", needs_followup: "يحتاج متابعة" } as Record<string, string>)[value] || "—";
}
