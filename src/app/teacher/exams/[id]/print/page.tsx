import { notFound } from "next/navigation";

import { OfficialPrintPage } from "@/components/official-print-layout";
import { examTypeLabels, ratingLabels, resultStatusLabels } from "@/lib/exams";
import { createClient } from "@/lib/supabase/server";
import { requireTeacherPortal } from "@/lib/teacher-portal";

export default async function TeacherExamPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { teacher } = await requireTeacherPortal();
  if (!teacher) notFound();
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("exam_results")
    .select("id,teacher_id,exam_title,exam_type,exam_date,score,rating,result_status,mistakes_count,alerts_count,full_score,mistake_deduction,alerts_deduct,alert_deduction,tajweed_rating,selected_juz,from_surah_name,from_ayah,to_surah_name,to_ayah,memorization_notes,tajweed_notes,general_notes,recommendation,students!exam_results_student_id_fkey(full_name),teachers!exam_results_teacher_id_fkey(full_name)")
    .eq("id", id)
    .eq("teacher_id", teacher.id)
    .is("archived_at", null)
    .maybeSingle();
  if (!data) notFound();
  const row = data as Record<string, unknown>;
  const student = objectValue(row.students);
  const examiner = objectValue(row.teachers);
  return (
    <OfficialPrintPage title="تقرير اختبار طالب" subtitle={text(row.exam_title) || "اختبار طالب"} documentDate={text(row.exam_date)} variant="report">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Info label="الطالب" value={text(student.full_name)} />
        <Info label="المعلم / المختبر" value={text(examiner.full_name)} />
        <Info label="نوع الاختبار" value={examTypeLabels[text(row.exam_type)] ?? "عام"} />
        <Info label="الأجزاء" value={Array.isArray(row.selected_juz) ? row.selected_juz.join("، ") : "—"} />
        <Info label="مقدار التسميع" value={passage(row)} />
        <Info label="الدرجة" value={text(row.score) || "—"} />
        <Info label="التقدير" value={ratingLabels[text(row.rating)] ?? "—"} />
        <Info label="النتيجة" value={resultStatusLabels[text(row.result_status)] ?? "—"} />
        <Info label="الأخطاء" value={text(row.mistakes_count) || "0"} />
        <Info label="التنبيهات" value={text(row.alerts_count) || "0"} />
        <Info label="خصم الأخطاء" value={deduction(row.mistakes_count, row.mistake_deduction)} />
        <Info label="خصم التنبيهات" value={row.alerts_deduct ? deduction(row.alerts_count, row.alert_deduction) : "لا يخصم"} />
      </div>
      <div className="mt-6 grid gap-3 text-sm">
        <Info label="ملاحظات الحفظ" value={text(row.memorization_notes) || "—"} />
        <Info label="ملاحظات التجويد" value={text(row.tajweed_notes) || "—"} />
        <Info label="ملاحظات عامة" value={text(row.general_notes) || "—"} />
        <Info label="التوصية" value={text(row.recommendation) || "—"} />
      </div>
    </OfficialPrintPage>
  );
}

function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-[#e3decf] p-3"><p className="font-bold text-[#5f6b63]">{label}</p><p className="mt-1 font-semibold">{value}</p></div>; }
function objectValue(value: unknown) { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function text(value: unknown) { return typeof value === "string" || typeof value === "number" ? String(value) : ""; }
function passage(row: Record<string, unknown>) { const from = text(row.from_surah_name); const to = text(row.to_surah_name); return from ? (from === to ? `سورة ${from} من الآية ${text(row.from_ayah)} إلى ${text(row.to_ayah)}` : `من سورة ${from} آية ${text(row.from_ayah)} إلى سورة ${to} آية ${text(row.to_ayah)}`) : "—"; }
function deduction(count: unknown, value: unknown) { return String(Math.round(Number(count ?? 0) * Number(value ?? 0) * 100) / 100); }
