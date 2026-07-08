"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { cleanText } from "@/lib/security";
import { calculateExamScore } from "@/lib/exam-scoring";
import { createClient } from "@/lib/supabase/server";
import { requireTeacherPortal } from "@/lib/teacher-portal";

function val(fd: FormData, key: string) {
  return cleanText(fd.get(key)?.toString() ?? "");
}
function num(fd: FormData, key: string) {
  const v = parseInt(fd.get(key)?.toString() ?? "0", 10);
  return isNaN(v) ? 0 : Math.max(0, v);
}
function nullable(fd: FormData, key: string) {
  const v = val(fd, key);
  return v || null;
}
function numberValue(fd: FormData, key: string, fallback = 0) {
  const parsed = Number(fd.get(key)?.toString() ?? fallback);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
}
function booleanValue(fd: FormData, key: string) {
  return ["1", "true", "on"].includes(fd.get(key)?.toString() ?? "");
}
function selectedJuz(fd: FormData) {
  return [...new Set(val(fd, "selected_juz").split(",").map(Number).filter((item) => item >= 1 && item <= 30))];
}
function assessmentPayload(formData: FormData) {
  const mistakes = num(formData, "mistakes_count");
  const alerts = num(formData, "alerts_count");
  const fullScore = numberValue(formData, "full_score", 100);
  const mistakeDeduction = numberValue(formData, "mistake_deduction", 1);
  const alertsDeduct = booleanValue(formData, "alerts_deduct");
  const alertDeduction = numberValue(formData, "alert_deduction", 0.25);
  const scoring = calculateExamScore({
    fullScore,
    mistakesCount: mistakes,
    mistakeDeduction,
    alertsCount: alerts,
    alertsDeduct,
    alertDeduction,
  });
  return {
    selected_juz: selectedJuz(formData),
    from_surah_no: numberValue(formData, "from_surah_no") || null,
    from_surah_name: nullable(formData, "from_surah_name"),
    from_ayah: numberValue(formData, "from_ayah") || null,
    to_surah_no: numberValue(formData, "to_surah_no") || null,
    to_surah_name: nullable(formData, "to_surah_name"),
    to_ayah: numberValue(formData, "to_ayah") || null,
    passage_length: val(formData, "passage_length") || "medium",
    mistakes_count: mistakes,
    alerts_count: alerts,
    tajweed_rating: nullable(formData, "tajweed_rating"),
    memorization_notes: nullable(formData, "memorization_notes"),
    tajweed_notes: nullable(formData, "tajweed_notes"),
    general_notes: nullable(formData, "general_notes"),
    recommendation: nullable(formData, "recommendation"),
    full_score: fullScore,
    mistake_deduction: mistakeDeduction,
    alerts_deduct: alertsDeduct,
    alert_deduction: alertDeduction,
    calculated_score: scoring.finalScore,
    score: scoring.finalScore,
    rating: scoring.rating,
    result_status: scoring.resultStatus,
    needs_review: booleanValue(formData, "needs_review"),
    notes: nullable(formData, "general_notes"),
  };
}

async function resolveTeacher() {
  const context = await requireTeacherPortal();
  const supabase = await createClient();
  return { supabase, user: context.user, teacher: context.teacher, preview: context.preview };
}

// ─── Add exam result for a teacher's student ─────────────────────────────────
export async function addTeacherExamResultAction(formData: FormData) {
  const { supabase, user, teacher, preview } = await resolveTeacher();
  if (!teacher) redirect("/teacher/exams?error=no-teacher");

  const studentId = val(formData, "student_id");
  if (!studentId) redirect("/teacher/exams/new?error=missing-student");

  // Verify teacher owns this student
  const { data: enrollment } = await supabase
    .from("student_enrollments")
    .select("halaqa_id,halaqat!student_enrollments_halaqa_id_fkey(teacher_id,assistant_teacher_id)")
    .eq("student_id", studentId)
    .eq("status", "active")
    .is("archived_at", null)
    .limit(1)
    .maybeSingle();

  if (!enrollment) redirect("/teacher/exams/new?error=not-your-student");

  const halaqa = enrollment.halaqat as unknown as Record<string, unknown>;
  const isOwner = halaqa?.teacher_id === teacher.id || halaqa?.assistant_teacher_id === teacher.id;
  if (!isOwner) redirect("/teacher/exams/new?error=not-your-student");

  const title = val(formData, "exam_title");
  if (!title) redirect("/teacher/exams/new?error=missing-title");

  const { data: student } = await supabase
    .from("students")
    .select("full_name")
    .eq("id", studentId)
    .maybeSingle();

  const examDate = nullable(formData, "exam_date");
  const assessment = assessmentPayload(formData);
  const { data: duplicate } = await supabase
    .from("exam_results")
    .select("id")
    .eq("teacher_id", teacher.id)
    .eq("student_id", studentId)
    .eq("exam_type", val(formData, "exam_type") || "general")
    .eq("exam_date", examDate)
    .eq("from_surah_no", assessment.from_surah_no)
    .eq("from_ayah", assessment.from_ayah)
    .eq("to_surah_no", assessment.to_surah_no)
    .eq("to_ayah", assessment.to_ayah)
    .is("archived_at", null)
    .limit(1)
    .maybeSingle();
  if (duplicate && !booleanValue(formData, "confirm_duplicate")) {
    redirect(`/teacher/exams/new?error=duplicate&existing=${duplicate.id}`);
  }

  const { error } = await supabase.from("exam_results").insert({
    teacher_submitted: true,
    teacher_id: teacher.id,
    student_id: studentId,
    participant_name: student?.full_name ?? null,
    halaqa_id: enrollment.halaqa_id,
    exam_title: title,
    exam_type: val(formData, "exam_type") || "general",
    exam_date: examDate,
    ...assessment,
    evaluator_name: nullable(formData, "evaluator_name"),
    attendance_status: "tested",
    created_by: user.id,
    entered_by_name: preview.actorName,
    acting_as_teacher_id: preview.active ? teacher.id : null,
    created_via_admin_preview: preview.active,
  });

  if (error) {
    console.error("addTeacherExamResultAction", error);
    redirect("/teacher/exams/new?error=save-failed");
  }

  revalidatePath("/teacher/exams");
  revalidatePath(`/teacher/students/${studentId}`);
  revalidatePath("/dashboard/exams");
  redirect("/teacher/exams?added=1");
}

// ─── Update a pending (unapproved) exam result ────────────────────────────────
export async function updateTeacherExamResultAction(formData: FormData) {
  const { supabase, teacher, preview } = await resolveTeacher();
  if (!teacher) redirect("/teacher/exams?error=no-teacher");

  const resultId = val(formData, "result_id");
  if (!resultId) redirect("/teacher/exams?error=missing");

  // Guard: only allow update if it is owned by this teacher and not administratively locked.
  const { data: existing } = await supabase
    .from("exam_results")
    .select("id,teacher_id,approved_at,locked_at,teacher_submitted")
    .eq("id", resultId)
    .maybeSingle();

  if (!existing || !existing.teacher_submitted) redirect("/teacher/exams?error=not-found");
  if (existing.teacher_id !== teacher.id) redirect("/teacher/exams?error=forbidden");
  if (existing.locked_at) redirect("/teacher/exams?error=already-locked");

  const { error } = await supabase
    .from("exam_results")
    .update({
      ...assessmentPayload(formData),
      evaluator_name: nullable(formData, "evaluator_name"),
      exam_title: val(formData, "exam_title") || undefined,
      exam_type: val(formData, "exam_type") || undefined,
      exam_date: nullable(formData, "exam_date"),
      entered_by_name: preview.actorName,
      acting_as_teacher_id: preview.active ? teacher.id : null,
      created_via_admin_preview: preview.active,
    })
    .eq("id", resultId);

  if (error) {
    console.error("updateTeacherExamResultAction", error);
    redirect(`/teacher/exams?error=save-failed`);
  }

  revalidatePath("/teacher/exams");
  revalidatePath("/dashboard/exams");
  redirect("/teacher/exams?updated=1");
}
