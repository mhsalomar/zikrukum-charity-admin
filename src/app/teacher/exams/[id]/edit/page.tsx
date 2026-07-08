import { redirect } from "next/navigation";

import { updateTeacherExamResultAction } from "@/app/teacher/exams/actions";
import { PageHero } from "@/components/dashboard-ui";
import { createClient } from "@/lib/supabase/server";
import { requireTeacherPortal } from "@/lib/teacher-portal";
import { ExamResultFormFields } from "@/app/teacher/exams/_components/exam-result-form-fields";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function EditTeacherExamPage({ params, searchParams }: Props) {
  const { teacher } = await requireTeacherPortal();
  if (!teacher) redirect("/teacher/dashboard?error=teacher-profile");

  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase
    .from("exam_results")
    .select("id,teacher_id,teacher_submitted,approved_at,locked_at,needs_review,mistakes_count,alerts_count,tajweed_rating,evaluator_name,exam_title,exam_type,exam_date,student_id,selected_juz,from_surah_no,from_ayah,to_surah_no,to_ayah,passage_length,memorization_notes,tajweed_notes,general_notes,recommendation,full_score,mistake_deduction,alerts_deduct,alert_deduction,students!exam_results_student_id_fkey(full_name)")
    .eq("id", id)
    .maybeSingle();

  if (!data) redirect("/teacher/exams?error=not-found");

  const r = data as Record<string, unknown>;

  // Guard: must own, must be teacher-submitted, and must not be administratively locked.
  if (String(r.teacher_id) !== teacher.id) redirect("/teacher/exams?error=forbidden");
  if (!r.teacher_submitted) redirect("/teacher/exams?error=forbidden");
  if (r.locked_at) redirect("/teacher/exams?error=already-locked");

  const studentName = String((r.students as Record<string, unknown> | null)?.full_name ?? "");

  const defaults = {
    studentId: String(r.student_id ?? ""),
    examTitle: String(r.exam_title ?? ""),
    examType: String(r.exam_type ?? "general"),
    examDate: String(r.exam_date ?? ""),
    mistakesCount: Number(r.mistakes_count ?? 0),
    alertsCount: Number(r.alerts_count ?? 0),
    tajweedRating: String(r.tajweed_rating ?? ""),
    evaluatorName: String(r.evaluator_name ?? ""),
    selectedJuz: Array.isArray(r.selected_juz) ? r.selected_juz.map(Number) : [],
    fromSurahNo: Number(r.from_surah_no ?? 2),
    fromAyah: Number(r.from_ayah ?? 1),
    toSurahNo: Number(r.to_surah_no ?? r.from_surah_no ?? 2),
    toAyah: Number(r.to_ayah ?? 10),
    passageLength: String(r.passage_length ?? "medium") as "short" | "medium" | "long",
    memorizationNotes: String(r.memorization_notes ?? ""),
    tajweedNotes: String(r.tajweed_notes ?? ""),
    generalNotes: String(r.general_notes ?? ""),
    recommendation: String(r.recommendation ?? ""),
    fullScore: Number(r.full_score ?? 100),
    mistakeDeduction: Number(r.mistake_deduction ?? 1),
    alertsDeduct: r.alerts_deduct === null || r.alerts_deduct === undefined ? true : Boolean(r.alerts_deduct),
    alertDeduction: Number(r.alert_deduction ?? 0.25),
    needsReview: Boolean(r.needs_review),
  };

  return (
    <main className="mx-auto w-full max-w-2xl p-4 pb-28 sm:p-6">
      <div className="space-y-5">
        <PageHero
          eyebrow="اختبارات الطلاب"
          title="تعديل نتيجة اختبار"
          description={`تعديل اختبار: ${studentName} — ${defaults.examTitle || "اختبار"}`}
        />
        {query.error ? <ErrorBanner code={query.error} /> : null}
        <form action={updateTeacherExamResultAction} className="space-y-4">
          <input type="hidden" name="result_id" value={id} />
          {/* Student fixed — show as read-only */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3">
            <p className="text-xs font-bold text-[var(--muted)]">الطالب</p>
            <p className="mt-1 font-semibold text-[var(--primary-dark)]">{studentName}</p>
          </div>
          <ExamResultFormFields
            students={[{ id: defaults.studentId, name: studentName }]}
            defaults={defaults}
          />
          <button type="submit" className="primary-button w-full min-h-12 rounded-xl text-sm font-semibold">
            حفظ التعديلات
          </button>
        </form>
      </div>
    </main>
  );
}

function ErrorBanner({ code }: { code: string }) {
  const msgs: Record<string, string> = {
    "forbidden": "لا تملك صلاحية تعديل هذه النتيجة.",
    "already-locked": "لا يمكن تعديل نتيجة مقفلة إداريًا.",
    "save-failed": "حدث خطأ أثناء الحفظ. حاول مجدداً.",
  };
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
      {msgs[code] ?? "حدث خطأ غير متوقع."}
    </div>
  );
}
