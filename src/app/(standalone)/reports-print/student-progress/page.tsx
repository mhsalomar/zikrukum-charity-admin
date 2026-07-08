import { OfficialPrintPage } from "@/components/official-print-layout";
import { EmptyChart, HorizontalBarChart, VerticalBarChart } from "@/components/report-charts";
import { requireAnyRole } from "@/lib/auth";
import { executiveRoles } from "@/lib/module-access";
import { createClient } from "@/lib/supabase/server";

type Related = Record<string, unknown>;

export default async function StudentProgressPrintPage() {
  await requireAnyRole([...executiveRoles]);
  const report = await getPrintData();

  return (
    <OfficialPrintPage
      title="تقرير إنجاز الطلاب"
      documentDate={new Date().toISOString()}
      variant="report"
    >
      <section>
        <div className="grid grid-cols-3 gap-3 text-sm font-bold">
          <Info label="إجمالي الطلاب" value={formatNumber(report.totalStudents)} />
          <Info label="عدد الحلقات" value={formatNumber(report.totalHalaqat)} />
          <Info label="الأوجه المنجزة" value={formatNumber(report.totalMemorizationPages)} />
          <Info label="أوجه المراجعة" value={formatNumber(report.totalReviewPages)} />
          <Info label="الطلاب بدون تحديث" value={formatNumber(report.studentsWithoutProgress)} />
          <Info label="تاريخ التقرير" value={new Intl.DateTimeFormat("ar-SA").format(new Date())} />
        </div>

        <div className="mt-7 grid gap-4">
          <VerticalBarChart title="الإنجاز حسب الحلقة" data={report.progressByHalaqa} />
          <HorizontalBarChart title="عدد الطلاب حسب الحلقة" data={report.studentsByHalaqa} />
          {report.progressByHalaqa.length === 0 ? <EmptyChart /> : null}
        </div>

        <h2 className="mt-8 text-lg font-bold text-[#075f4d]">الجدول التفصيلي</h2>
        <table className="mt-3 w-full border-collapse text-xs">
          <thead>
            <tr className="bg-[#f4f0e6]">
              {["الطالب", "الحلقة", "المعلم", "حفظ", "مراجعة", "الأوجه", "آخر تحديث"].map((heading) => (
                <th key={heading} className="border border-[#d1d5db] p-2 text-right">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {report.rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="border border-[#d1d5db] p-4 text-center font-bold text-[#667c74]">
                  لا توجد بيانات منجزات محفوظة حتى الآن.
                </td>
              </tr>
            ) : (
              report.rows.map((row) => (
                <tr key={`${row.student}-${row.halaqa}`}>
                  <td className="border border-[#d1d5db] p-2 font-bold">{row.student}</td>
                  <td className="border border-[#d1d5db] p-2">{row.halaqa}</td>
                  <td className="border border-[#d1d5db] p-2">{row.teacher}</td>
                  <td className="border border-[#d1d5db] p-2">{row.memorizationPosition}</td>
                  <td className="border border-[#d1d5db] p-2">{row.reviewPosition}</td>
                  <td className="border border-[#d1d5db] p-2">{formatNumber(row.memorizationPages)} / {formatNumber(row.reviewPages)}</td>
                  <td className="border border-[#d1d5db] p-2">{row.progressDate}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </OfficialPrintPage>
  );
}

async function getPrintData() {
  const supabase = await createClient();
  const [studentsResult, halaqatResult, progressResult] = await Promise.all([
    supabase
      .from("students")
      .select("id,full_name,status,student_enrollments!student_enrollments_student_id_fkey(halaqa_id,status,archived_at,halaqat!student_enrollments_halaqa_id_fkey(name))")
      .is("archived_at", null)
      .limit(1200),
    supabase.from("halaqat").select("id,name").is("archived_at", null).limit(500),
    supabase
      .from("student_progress_records")
      .select("student_id,halaqa_id,memorization_surah_name,memorization_from_ayah,memorization_to_ayah,review_surah_name,review_from_ayah,review_to_ayah,memorization_pages,review_pages,progress_date,students!student_progress_records_student_id_fkey(full_name),halaqat!student_progress_records_halaqa_id_fkey(name,teachers!halaqat_teacher_id_fkey(full_name))")
      .is("archived_at", null)
      .order("progress_date", { ascending: false })
      .limit(500),
  ]);

  const students = (studentsResult.data ?? []) as Related[];
  const progress = (progressResult.data ?? []) as Related[];
  const halaqat = (halaqatResult.data ?? []) as Related[];
  const progressStudentIds = new Set(progress.map((row) => text(row.student_id)).filter(Boolean));
  const studentsByHalaqaMap = new Map<string, ChartBucket>();
  const progressByHalaqaMap = new Map<string, ChartBucket>();

  for (const student of students) {
    const enrollment = firstRelated(student.student_enrollments);
    const halaqa = readObject(enrollment.halaqat);
    const key = text(enrollment.halaqa_id) || text(halaqa.name) || "unknown";
    addChartValue(studentsByHalaqaMap, key, halaqaChartLabel(halaqa), 1);
  }
  for (const row of progress) {
    const halaqa = readObject(row.halaqat);
    const key = text(row.halaqa_id) || text(halaqa.name) || "unknown";
    addChartValue(progressByHalaqaMap, key, halaqaChartLabel(halaqa), number(row.memorization_pages), teacherMeta(readObject(halaqa.teachers)));
  }

  return {
    totalStudents: students.length,
    totalHalaqat: halaqat.length,
    totalMemorizationPages: progress.reduce((sum, row) => sum + number(row.memorization_pages), 0),
    totalReviewPages: progress.reduce((sum, row) => sum + number(row.review_pages), 0),
    studentsWithoutProgress: Math.max(0, students.length - progressStudentIds.size),
    progressByHalaqa: mapBucketsToData(progressByHalaqaMap).slice(0, 8),
    studentsByHalaqa: mapBucketsToData(studentsByHalaqaMap).slice(0, 8),
    rows: progress.slice(0, 80).map((row) => {
      const halaqa = readObject(row.halaqat);
      return {
        student: text(readObject(row.students).full_name) || "غير محدد",
        halaqa: text(halaqa.name) || "غير محدد",
        teacher: text(readObject(halaqa.teachers).full_name) || "غير محدد",
        memorizationPosition: formatPosition(row.memorization_surah_name, row.memorization_from_ayah, row.memorization_to_ayah),
        reviewPosition: formatPosition(row.review_surah_name, row.review_from_ayah, row.review_to_ayah),
        memorizationPages: number(row.memorization_pages),
        reviewPages: number(row.review_pages),
        progressDate: formatDate(text(row.progress_date)),
      };
    }),
  };
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#d1d5db] bg-white/80 p-3">
      <p className="text-xs text-[#667c74]">{label}</p>
      <p className="mt-1 font-semibold text-[#111827]">{value}</p>
    </div>
  );
}

function firstRelated(value: unknown) {
  if (Array.isArray(value) && value.length > 0) {
    const active = value.find((item) => {
      const row = readObject(item);
      return row.status === "active" && !row.archived_at;
    });
    return readObject(active ?? value[0]);
  }
  return {};
}

type ChartBucket = {
  label: string;
  value: number;
  meta?: string;
};

function addChartValue(map: Map<string, ChartBucket>, key: string, label: string, value: number, meta?: string) {
  const current = map.get(key) ?? { label, value: 0, meta };
  current.label = label || current.label;
  current.meta = meta || current.meta;
  current.value += value;
  map.set(key, current);
}

function mapBucketsToData(map: Map<string, ChartBucket>) {
  return [...map.values()].sort((a, b) => b.value - a.value);
}

function halaqaChartLabel(halaqa: Related) {
  const name = text(halaqa.name) || "غير محدد";
  return name.startsWith("حلقة") || name.startsWith("جامع") || name.startsWith("مسجد") ? name : `الحلقة: ${name}`;
}

function teacherMeta(teacher: Related) {
  const teacherName = text(teacher.full_name);
  return teacherName ? `المعلم/ـة: ${teacherName}` : "";
}

function formatPosition(surah: unknown, from: unknown, to: unknown) {
  const name = text(surah);
  if (!name) return "غير محدد";
  const range = [text(from), text(to)].filter(Boolean).join(" - ");
  return range ? `${name} (${range})` : name;
}

function formatDate(value: string) {
  if (!value) return "غير محدد";
  return new Intl.DateTimeFormat("ar-SA").format(new Date(value));
}

function formatNumber(value: number | string) {
  return typeof value === "number" ? new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 1 }).format(value) : value;
}

function number(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readObject(value: unknown): Related {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Related) : {};
}

function text(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}
