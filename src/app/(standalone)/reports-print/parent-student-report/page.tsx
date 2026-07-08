import { OfficialPrintPage } from "@/components/official-print-layout";
import { requireAnyRole } from "@/lib/auth";
import { executiveRoles } from "@/lib/module-access";
import { createClient } from "@/lib/supabase/server";

type PageProps = { searchParams: Promise<{ studentId?: string }> };

export default async function ParentStudentReportPrintPage({ searchParams }: PageProps) {
  await requireAnyRole([...executiveRoles]);
  const { studentId } = await searchParams;
  const report = studentId ? await getParentReport(studentId) : null;

  return (
    <OfficialPrintPage title="تقرير ولي الأمر" documentDate={new Date().toISOString()} subtitle="تقرير متابعة الطالب في الحلقة" variant="report">
      {!report ? (
        <p className="rounded-xl border border-[#d8c8a9] p-5 text-center font-bold">اختر طالبًا من صفحة تقرير ولي الأمر.</p>
      ) : (
        <div className="space-y-6 text-sm font-bold leading-8 text-[#111827]">
          <section className="grid grid-cols-2 gap-3">
            <Info label="اسم الطالب" value={report.student} />
            <Info label="الحلقة" value={report.halaqa} />
            <Info label="المعلم" value={report.teacher} />
            <Info label="المسجد" value={report.mosque} />
          </section>
          <section>
            <h2 className="mb-3 text-lg font-bold text-[#0b3d33]">ملخص المنجز</h2>
            <table className="w-full border-collapse text-right">
              <tbody>
                <Row label="آخر حفظ" value={report.memorization} />
                <Row label="آخر مراجعة" value={report.review} />
                <Row label="الأوجه" value={String(report.pages)} />
                <Row label="آخر تقييم" value={report.rating} />
                <Row label="الحضور" value={report.attendance} />
                <Row label="ملاحظة المعلم" value={report.notes} />
                <Row label="التوصية" value={report.recommendation} />
              </tbody>
            </table>
          </section>
        </div>
      )}
    </OfficialPrintPage>
  );
}

async function getParentReport(studentId: string) {
  const supabase = await createClient();
  const [studentResult, progressResult] = await Promise.all([
    supabase
      .from("students")
      .select("full_name,student_enrollments!student_enrollments_student_id_fkey(halaqat!student_enrollments_halaqa_id_fkey(name,period,teachers!halaqat_teacher_id_fkey(full_name),mosques!halaqat_mosque_id_fkey(name)))")
      .eq("id", studentId)
      .maybeSingle(),
    supabase
      .from("student_progress_records")
      .select("memorization_surah_name,memorization_from_ayah,memorization_to_ayah,review_surah_name,review_from_ayah,review_to_ayah,pages_count,memorization_pages,review_pages,rating,attendance_status,notes,progress_date")
      .eq("student_id", studentId)
      .is("archived_at", null)
      .order("progress_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (!studentResult.data) return null;
  const enrollment = first(studentResult.data.student_enrollments);
  const halaqa = object(enrollment.halaqat);
  const progress = progressResult.data;
  return {
    student: String(studentResult.data.full_name ?? "غير محدد"),
    halaqa: String(halaqa.name ?? "غير محدد"),
    teacher: String(object(halaqa.teachers).full_name ?? "غير محدد"),
    mosque: String(object(halaqa.mosques).name ?? "غير محدد"),
    memorization: position(progress?.memorization_surah_name, progress?.memorization_from_ayah, progress?.memorization_to_ayah),
    review: position(progress?.review_surah_name, progress?.review_from_ayah, progress?.review_to_ayah),
    pages: Number(progress?.pages_count ?? progress?.memorization_pages ?? 0) + Number(progress?.review_pages ?? 0),
    rating: labels[String(progress?.rating ?? "")] ?? "غير محدد",
    attendance: labels[String(progress?.attendance_status ?? "")] ?? "غير محدد",
    notes: String(progress?.notes ?? "لا توجد ملاحظات"),
    recommendation: recommendation(String(progress?.rating ?? ""), String(progress?.attendance_status ?? "")),
  };
}

function Info({ label, value }: { label: string; value: string }) {
  return <p className="rounded-xl border border-[#d8c8a9] p-3"><span className="block text-[#667085]">{label}</span>{value}</p>;
}
function Row({ label, value }: { label: string; value: string }) {
  return <tr><td className="border border-[#d8c8a9] p-3 font-semibold text-[#0b3d33]">{label}</td><td className="border border-[#d8c8a9] p-3">{value}</td></tr>;
}
function first(value: unknown) { return Array.isArray(value) ? object(value[0]) : {}; }
function object(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function position(surah: unknown, from: unknown, to: unknown) { return surah ? `${surah} ${from ?? ""}-${to ?? ""}` : "غير محدد"; }
function recommendation(rating: string, attendance: string) {
  if (attendance === "absent" || attendance === "late") return "يحتاج تحسين الحضور";
  if (rating === "needs_follow_up" || rating === "weak") return "يحتاج متابعة";
  if (rating === "excellent" || rating === "very_good") return "ممتاز ومستمر";
  return "يحتاج متابعة منتظمة";
}
const labels: Record<string, string> = { excellent: "ممتاز", very_good: "جيد جدًا", good: "جيد", needs_follow_up: "يحتاج متابعة", weak: "ضعيف", present: "حاضر", absent: "غائب", late: "متأخر", excused: "بعذر" };
