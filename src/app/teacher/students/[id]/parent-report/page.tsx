import { redirect } from "next/navigation";

import { OfficialPrintPage } from "@/components/official-print-layout";
import { requireTeacherPortal } from "@/lib/teacher-portal";
import { createClient } from "@/lib/supabase/server";

type PageProps = { params: Promise<{ id: string }> };

export default async function TeacherParentReportPage({ params }: PageProps) {
  const { id } = await params;
  const { teacher } = await requireTeacherPortal();
  if (!teacher) redirect("/teacher/dashboard?error=teacher-profile");

  const supabase = await createClient();
  const { data: enrollment } = await supabase
    .from("student_enrollments")
    .select("students!student_enrollments_student_id_fkey(full_name),halaqat!student_enrollments_halaqa_id_fkey(name,period,teacher_id,assistant_teacher_id,teachers!halaqat_teacher_id_fkey(full_name),mosques!halaqat_mosque_id_fkey(name))")
    .eq("student_id", id)
    .eq("status", "active")
    .maybeSingle();

  const halaqa = object(enrollment?.halaqat);
  if (halaqa.teacher_id !== teacher.id && halaqa.assistant_teacher_id !== teacher.id) redirect("/teacher/students?error=scope");

  const { data: progress } = await supabase
    .from("student_progress_records")
    .select("memorization_surah_name,memorization_from_ayah,memorization_to_ayah,review_surah_name,review_from_ayah,review_to_ayah,pages_count,memorization_pages,review_pages,rating,attendance_status,notes,progress_date")
    .eq("student_id", id)
    .is("archived_at", null)
    .order("progress_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <OfficialPrintPage title="تقرير ولي الأمر" documentDate={new Date().toISOString()} variant="report">
      <div className="space-y-6 text-sm font-bold leading-8 text-[#111827]">
        <section className="grid grid-cols-2 gap-3">
          <Info label="اسم الطالب" value={String(object(enrollment?.students).full_name ?? "غير محدد")} />
          <Info label="الحلقة" value={String(halaqa.name ?? "غير محدد")} />
          <Info label="المعلم" value={String(object(halaqa.teachers).full_name ?? "غير محدد")} />
          <Info label="المسجد" value={String(object(halaqa.mosques).name ?? "غير محدد")} />
        </section>
        <table className="w-full border-collapse text-right">
          <tbody>
            <Row label="آخر حفظ" value={position(progress?.memorization_surah_name, progress?.memorization_from_ayah, progress?.memorization_to_ayah)} />
            <Row label="آخر مراجعة" value={position(progress?.review_surah_name, progress?.review_from_ayah, progress?.review_to_ayah)} />
            <Row label="الأوجه" value={String(Number(progress?.pages_count ?? progress?.memorization_pages ?? 0) + Number(progress?.review_pages ?? 0))} />
            <Row label="آخر تقييم" value={labels[String(progress?.rating ?? "")] ?? "غير محدد"} />
            <Row label="الحضور" value={labels[String(progress?.attendance_status ?? "")] ?? "غير محدد"} />
            <Row label="ملاحظة المعلم" value={String(progress?.notes ?? "لا توجد ملاحظات")} />
          </tbody>
        </table>
      </div>
    </OfficialPrintPage>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <p className="rounded-xl border border-[#d8c8a9] p-3"><span className="block text-[#667085]">{label}</span>{value}</p>;
}
function Row({ label, value }: { label: string; value: string }) {
  return <tr><td className="border border-[#d8c8a9] p-3 font-semibold text-[#0b3d33]">{label}</td><td className="border border-[#d8c8a9] p-3">{value}</td></tr>;
}
function object(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function position(surah: unknown, from: unknown, to: unknown) { return surah ? `${surah} ${from ?? ""}-${to ?? ""}` : "غير محدد"; }
const labels: Record<string, string> = { excellent: "ممتاز", very_good: "جيد جدًا", good: "جيد", needs_follow_up: "يحتاج متابعة", weak: "ضعيف", present: "حاضر", absent: "غائب", late: "متأخر", excused: "بعذر" };
