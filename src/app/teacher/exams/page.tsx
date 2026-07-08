import Link from "next/link";
import { ClipboardPenLine, Plus } from "lucide-react";

import { EmptyState, PageHero, SectionCard, StatusChip } from "@/components/dashboard-ui";
import { examTypeLabels, resultStatusLabels } from "@/lib/exams";
import { createClient } from "@/lib/supabase/server";
import { requireTeacherPortal } from "@/lib/teacher-portal";
import { redirect } from "next/navigation";

type Row = Record<string, unknown>;
function text(v: unknown) { return typeof v === "string" || typeof v === "number" ? String(v) : ""; }
function obj(v: unknown): Row { return v && typeof v === "object" && !Array.isArray(v) ? (v as Row) : {}; }
function num(v: unknown) { const n = Number(v ?? 0); return isFinite(n) ? n : 0; }
function fmt(d: string) { return d ? new Intl.DateTimeFormat("ar-SA").format(new Date(d)) : "—"; }

export default async function TeacherExamsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { teacher } = await requireTeacherPortal();
  if (!teacher) redirect("/teacher/dashboard?error=teacher-profile");

  const query = await searchParams;
  const supabase = await createClient();

  // Fetch all direct teacher exam results.
  const { data } = await supabase
    .from("exam_results")
    .select(
      "id,score,rating,result_status,mistakes_count,alerts_count,notes,teacher_submitted,exam_title,exam_type,exam_date,approved_at,locked_at,needs_review,created_at,selected_juz,from_surah_name,from_ayah,to_surah_name,to_ayah,created_via_admin_preview,entered_by_name,students!exam_results_student_id_fkey(full_name),exams!exam_results_exam_id_fkey(title,exam_date,exam_type)"
    )
    .eq("teacher_id", teacher.id)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(200);

  const results = ((data ?? []) as unknown as Row[]).map((row) => {
    const linked = obj(row.exams);
    return {
      id: text(row.id),
      studentName: text(obj(row.students).full_name),
      title: text(row.exam_title) || text(linked.title) || "اختبار",
      examType: text(row.exam_type) || text(linked.exam_type) || "general",
      date: text(row.exam_date) || text(linked.exam_date) || text(row.created_at),
      score: text(row.score),
      rating: text(row.rating),
      resultStatus: text(row.result_status) || "pending",
      mistakesCount: num(row.mistakes_count),
      alertsCount: num(row.alerts_count),
      notes: text(row.notes),
      approvedAt: text(row.approved_at),
      lockedAt: text(row.locked_at),
      needsReview: Boolean(row.needs_review),
      teacherSubmitted: Boolean(row.teacher_submitted),
      selectedJuz: Array.isArray(row.selected_juz) ? row.selected_juz.map(Number) : [],
      passage: passage(row),
      previewEntry: Boolean(row.created_via_admin_preview),
      enteredByName: text(row.entered_by_name),
    };
  });

  const saved = results.filter((r) => !r.approvedAt && !r.lockedAt);
  const locked = results.filter((r) => r.approvedAt || r.lockedAt);

  return (
    <main className="mx-auto w-full max-w-6xl p-4 pb-28 sm:p-6">
      <div className="space-y-5">
        <PageHero
          eyebrow="اختبارات الطلاب"
          title="اختبارات طلابي"
          description="سجل الاختبارات والنتائج."
          actions={
            <Link href="/teacher/exams/new" className="primary-button inline-flex min-h-12 items-center gap-2 rounded-xl px-5 text-sm font-semibold">
              <Plus className="size-4" />
              تسجيل اختبار
            </Link>
          }
        />

        {query.added ? <Banner tone="success">تم حفظ نتيجة الاختبار في سجل الطالب.</Banner> : null}
        {query.updated ? <Banner tone="success">تم حفظ التعديل بنجاح.</Banner> : null}
        {query.error ? <Banner tone="error">{errorMsg(query.error)}</Banner> : null}

        <SectionCard
          title={`النتائج المحفوظة (${saved.length})`}
          icon={ClipboardPenLine}
          description="يمكن تعديل النتيجة حتى تقفلها الإدارة."
        >
          {saved.length === 0 ? (
            <EmptyState title="لا توجد نتائج محفوظة" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {saved.map((r) => <ResultCard key={r.id} result={r} canEdit />)}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title={`المقفلة إداريًا (${locked.length})`}
          icon={ClipboardPenLine}
          description="لا يمكن تعديل النتائج المقفلة."
        >
          {locked.length === 0 ? (
            <EmptyState title="لا توجد نتائج مقفلة" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {locked.map((r) => <ResultCard key={r.id} result={r} canEdit={false} />)}
            </div>
          )}
        </SectionCard>
      </div>
    </main>
  );
}

type Result = {
  id: string;
  studentName: string;
  title: string;
  examType: string;
  date: string;
  score: string;
  rating: string;
  resultStatus: string;
  mistakesCount: number;
  alertsCount: number;
  notes: string;
  approvedAt: string;
  lockedAt: string;
  needsReview: boolean;
  teacherSubmitted: boolean;
  selectedJuz: number[];
  passage: string;
  previewEntry: boolean;
  enteredByName: string;
};

function ResultCard({ result, canEdit }: { result: Result; canEdit: boolean }) {
  const approved = Boolean(result.approvedAt || result.lockedAt);
  return (
    <article className="rounded-2xl border border-[var(--border)] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-[var(--primary-dark)]">{result.studentName}</h2>
          <p className="mt-0.5 text-sm font-bold text-[var(--muted)]">
            {result.title} · {examTypeLabels[result.examType] ?? "اختبار"}
          </p>
          <p className="mt-0.5 text-xs font-bold text-[var(--muted)]">{fmt(result.date)}</p>
        </div>
        <StatusChip tone={result.resultStatus === "passed" ? "success" : "default"}>
          {resultStatusLabels[result.resultStatus] ?? "لم تحدد"}
        </StatusChip>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <Stat label="الدرجة" value={result.score || "—"} />
        <Stat label="الأخطاء" value={String(result.mistakesCount)} />
        <Stat label="التنبيهات" value={String(result.alertsCount)} />
      </div>
      {result.passage ? <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">{result.passage}{result.selectedJuz.length ? ` · الأجزاء: ${result.selectedJuz.join("، ")}` : ""}</p> : null}
      {result.notes ? (
        <p className="mt-3 rounded-xl bg-[var(--bg)] px-3 py-2 text-xs font-bold text-[var(--muted)]">{result.notes}</p>
      ) : null}
      {result.previewEntry ? (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          أُدخل بواسطة: {result.enteredByName || "حساب تجربة"} ضمن وضع تجربة بوابة المعلم
        </p>
      ) : null}
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${approved ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
          {approved ? "مقفلة إداريًا" : result.needsReview ? "يحتاج مراجعة" : "محفوظ"}
        </span>
        {canEdit && result.teacherSubmitted && !approved ? (
          <div className="flex gap-2">
            <Link href={`/teacher/exams/${result.id}/print`} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--primary-dark)] hover:bg-[var(--bg)]">طباعة</Link>
            <Link href={`/teacher/exams/${result.id}/edit`} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--primary-dark)] hover:bg-[var(--bg)]">تعديل</Link>
          </div>
        ) : (
          <Link href={`/teacher/exams/${result.id}/print`} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--primary-dark)] hover:bg-[var(--bg)]">طباعة</Link>
        )}
      </div>
    </article>
  );
}

function passage(row: Row) {
  const from = text(row.from_surah_name);
  const to = text(row.to_surah_name);
  if (!from) return "";
  return from === to ? `سورة ${from} من الآية ${text(row.from_ayah)} إلى ${text(row.to_ayah)}` : `من سورة ${from} آية ${text(row.from_ayah)} إلى سورة ${to} آية ${text(row.to_ayah)}`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--bg)] p-2">
      <p className="text-[10px] font-bold text-[var(--muted)]">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-[var(--primary-dark)]">{value}</p>
    </div>
  );
}

function Banner({ tone, children }: { tone: "success" | "error"; children: React.ReactNode }) {
  const cls = tone === "success"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : "border-red-200 bg-red-50 text-red-800";
  return <div className={`rounded-xl border p-4 text-sm font-semibold ${cls}`}>{children}</div>;
}

function errorMsg(code: string) {
  const msgs: Record<string, string> = {
    "no-teacher": "لم يتم ربط حسابك بملف معلم. تواصل مع الإدارة.",
    "not-your-student": "هذا الطالب ليس من طلابك.",
    "missing-student": "يرجى اختيار طالب.",
    "missing-title": "يرجى إدخال اسم الاختبار.",
    "save-failed": "حدث خطأ أثناء الحفظ. حاول مجدداً.",
    "already-locked": "لا يمكن تعديل نتيجة مقفلة إداريًا.",
    "forbidden": "لا تملك صلاحية التعديل.",
  };
  return msgs[code] ?? "حدث خطأ غير متوقع.";
}
