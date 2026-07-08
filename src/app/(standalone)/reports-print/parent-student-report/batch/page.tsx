import { OfficialPrintPage } from "@/components/official-print-layout";
import { requireAnyRole } from "@/lib/auth";
import { executiveRoles } from "@/lib/module-access";
import { createClient } from "@/lib/supabase/server";

type PageProps = { searchParams: Promise<{ halaqaId?: string; from?: string; to?: string }> };

type BatchStudentReport = {
  id: string;
  student: string;
  halaqa: string;
  teacher: string;
  mosque: string;
  attendance: string;
  memorization: string;
  review: string;
  pages: number;
  rating: string;
  notes: string;
  recommendation: string;
};

export default async function BatchParentReportPrintPage({ searchParams }: PageProps) {
  await requireAnyRole([...executiveRoles]);
  const params = await searchParams;
  const report = params.halaqaId ? await getBatchReport(params.halaqaId, params.from, params.to) : null;

  return (
    <OfficialPrintPage
      title="تقارير أولياء الأمور"
      documentDate={new Date().toISOString()}
      subtitle={report ? `${report.halaqa} - تقرير مجمع قابل للطباعة` : "اختر حلقة من صفحة تقرير ولي الأمر المجمع"}
      variant="report"
    >
      {!report ? (
        <p className="rounded-xl border border-[#d8c8a9] p-5 text-center font-bold">اختر الحلقة والفترة من صفحة التقرير المجمع.</p>
      ) : report.students.length === 0 ? (
        <p className="rounded-xl border border-[#d8c8a9] p-5 text-center font-bold">لا توجد بيانات طلاب مرتبطة بهذه الحلقة.</p>
      ) : (
        <div className="space-y-7 text-sm font-bold leading-8 text-[#111827]">
          <section className="grid grid-cols-2 gap-3">
            <Info label="الحلقة" value={report.halaqa} />
            <Info label="المعلم" value={report.teacher} />
            <Info label="المسجد" value={report.mosque} />
            <Info label="الفترة" value={report.periodText} />
          </section>

          {report.students.map((student) => (
            <section key={student.id} className="rounded-2xl border border-[#d8c8a9] p-4" style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
              <h2 className="mb-3 text-lg font-bold text-[#0b3d33]">{student.student}</h2>
              <table className="w-full border-collapse text-right">
                <tbody>
                  <Row label="الحضور" value={student.attendance} />
                  <Row label="آخر حفظ" value={student.memorization} />
                  <Row label="آخر مراجعة" value={student.review} />
                  <Row label="الأوجه" value={String(student.pages)} />
                  <Row label="آخر تقييم" value={student.rating} />
                  <Row label="ملاحظة المعلم" value={student.notes} />
                  <Row label="التوصية" value={student.recommendation} />
                </tbody>
              </table>
            </section>
          ))}
        </div>
      )}
    </OfficialPrintPage>
  );
}

async function getBatchReport(halaqaId: string, from?: string, to?: string) {
  const supabase = await createClient();
  const [halaqaResult, enrollmentsResult] = await Promise.all([
    supabase
      .from("halaqat")
      .select("id,name,period,teachers!halaqat_teacher_id_fkey(full_name),mosques!halaqat_mosque_id_fkey(name)")
      .eq("id", halaqaId)
      .maybeSingle(),
    supabase
      .from("student_enrollments")
      .select("student_id,status")
      .eq("halaqa_id", halaqaId)
      .eq("status", "active")
      .is("archived_at", null)
      .limit(500),
  ]);

  const halaqa = object(halaqaResult.data);
  const studentIds = (enrollmentsResult.data ?? []).map((row) => String(row.student_id)).filter(Boolean);
  if (studentIds.length === 0) {
    return {
      halaqa: String(halaqa.name ?? "غير محدد"),
      teacher: String(object(halaqa.teachers).full_name ?? "غير محدد"),
      mosque: String(object(halaqa.mosques).name ?? "غير محدد"),
      periodText: periodText(from, to),
      students: [] as BatchStudentReport[],
    };
  }

  const studentsResult = await supabase
    .from("students")
    .select("id,full_name")
    .in("id", studentIds)
    .is("archived_at", null)
    .order("full_name", { ascending: true })
    .limit(500);

  let progressQuery = supabase
    .from("student_progress_records")
    .select("student_id,memorization_surah_name,memorization_from_ayah,memorization_to_ayah,review_surah_name,review_from_ayah,review_to_ayah,pages_count,memorization_pages,review_pages,rating,attendance_status,notes,progress_date")
    .in("student_id", studentIds)
    .is("archived_at", null)
    .order("progress_date", { ascending: false })
    .limit(5000);
  if (from) progressQuery = progressQuery.gte("progress_date", from);
  if (to) progressQuery = progressQuery.lte("progress_date", to);
  const progressResult = await progressQuery;

  const latest = new Map<string, Record<string, unknown>>();
  const attendance = new Map<string, Record<string, number>>();
  for (const row of progressResult.data ?? []) {
    const studentId = String(row.student_id ?? "");
    if (!studentId) continue;
    if (!latest.has(studentId)) latest.set(studentId, row as Record<string, unknown>);
    const status = String(row.attendance_status ?? "");
    const current = attendance.get(studentId) ?? {};
    current[status] = (current[status] ?? 0) + 1;
    attendance.set(studentId, current);
  }

  return {
    halaqa: String(halaqa.name ?? "غير محدد"),
    teacher: String(object(halaqa.teachers).full_name ?? "غير محدد"),
    mosque: String(object(halaqa.mosques).name ?? "غير محدد"),
    periodText: periodText(from, to),
    students: (studentsResult.data ?? []).map((student) => {
      const progress = latest.get(String(student.id));
      return {
        id: String(student.id),
        student: String(student.full_name ?? "غير محدد"),
        halaqa: String(halaqa.name ?? "غير محدد"),
        teacher: String(object(halaqa.teachers).full_name ?? "غير محدد"),
        mosque: String(object(halaqa.mosques).name ?? "غير محدد"),
        attendance: attendanceText(attendance.get(String(student.id))),
        memorization: position(progress?.memorization_surah_name, progress?.memorization_from_ayah, progress?.memorization_to_ayah),
        review: position(progress?.review_surah_name, progress?.review_from_ayah, progress?.review_to_ayah),
        pages: Number(progress?.pages_count ?? progress?.memorization_pages ?? 0) + Number(progress?.review_pages ?? 0),
        rating: labels[String(progress?.rating ?? "")] ?? "غير محدد",
        notes: String(progress?.notes ?? "لا توجد ملاحظات"),
        recommendation: recommendation(String(progress?.rating ?? ""), String(progress?.attendance_status ?? "")),
      };
    }),
  };
}

function Info({ label, value }: { label: string; value: string }) {
  return <p className="rounded-xl border border-[#d8c8a9] p-3"><span className="block text-[#667085]">{label}</span>{value}</p>;
}
function Row({ label, value }: { label: string; value: string }) {
  return <tr><td className="border border-[#d8c8a9] p-3 font-semibold text-[#0b3d33]">{label}</td><td className="border border-[#d8c8a9] p-3">{value}</td></tr>;
}
function object(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function position(surah: unknown, from: unknown, to: unknown) { return surah ? `${surah} ${from ?? ""}-${to ?? ""}` : "لا يوجد منجز مسجل"; }
function periodText(from?: string, to?: string) {
  if (from && to) return `من ${formatDate(from)} إلى ${formatDate(to)}`;
  if (from) return `من ${formatDate(from)}`;
  if (to) return `حتى ${formatDate(to)}`;
  return "كل الفترة المتاحة";
}
function attendanceText(counts?: Record<string, number>) {
  if (!counts || Object.values(counts).every((value) => value === 0)) return "لا توجد سجلات حضور في الفترة";
  return [
    ["حاضر", counts.present ?? 0],
    ["غائب", counts.absent ?? 0],
    ["متأخر", counts.late ?? 0],
    ["بعذر", counts.excused ?? 0],
  ].map(([label, value]) => `${label}: ${value}`).join("، ");
}
function recommendation(rating: string, attendance: string) {
  if (attendance === "absent" || attendance === "late") return "يحتاج تحسين الحضور";
  if (rating === "needs_follow_up" || rating === "weak") return "يحتاج متابعة";
  if (rating === "excellent" || rating === "very_good") return "ممتاز ومستمر";
  return "متابعة منتظمة حسب خطة الحلقة";
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-SA").format(new Date(value));
}
const labels: Record<string, string> = { excellent: "ممتاز", very_good: "جيد جدًا", good: "جيد", needs_follow_up: "يحتاج متابعة", weak: "ضعيف", present: "حاضر", absent: "غائب", late: "متأخر", excused: "بعذر" };
