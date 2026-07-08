"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAnyRole } from "@/lib/auth";
import { calculateExamScore } from "@/lib/exam-scoring";
import { cleanText, parseBoundedJsonArray } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";

const adminRoles = ["admin", "demo_admin"] as const;
const importParticipantSchema = z
  .object({
    participant_name: z.string().trim().min(1).max(150),
    student_id: z.string().uuid().optional().or(z.literal("")),
    halaqa_id: z.string().uuid().optional().or(z.literal("")),
    halaqa_name: z.string().trim().max(150).optional(),
    teacher_name: z.string().trim().max(150).optional(),
    exam_scope: z.string().trim().max(500).optional(),
    notes: z.string().trim().max(1000).optional(),
    status: z.enum(["ready", "manual", "duplicate", "review"]),
  })
  .strip();

export async function createExamAction(formData: FormData) {
  const { user } = await requireAnyRole([...adminRoles]);
  const title = value(formData, "title");
  if (!title) redirect("/dashboard/exams/new?error=missing");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exams")
    .insert({
      title,
      exam_type: value(formData, "exam_type") || "general",
      exam_date: nullable(formData, "exam_date"),
      exam_time: nullable(formData, "exam_time"),
      venue: nullable(formData, "venue"),
      surah_scope: nullable(formData, "surah_scope"),
      committee_name: nullable(formData, "committee_name"),
      notes: nullable(formData, "notes"),
      status: "draft",
      nomination_open: false,
      full_score: numberOrDefault(formData, "full_score", 100),
      mistake_deduction: numberOrDefault(formData, "mistake_deduction", 1),
      alerts_deduct: formData.has("alerts_deduct") ? booleanValue(formData, "alerts_deduct") : true,
      alert_deduction: numberOrDefault(formData, "alert_deduction", 0.25),
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) redirect(`/dashboard/exams/new?error=${examErrorCode(error?.code)}`);
  redirect(`/dashboard/exams/${data.id}?created=1`);
}

export async function addExistingParticipantAction(formData: FormData) {
  const { user } = await requireAnyRole([...adminRoles]);
  const examId = value(formData, "exam_id");
  const studentId = value(formData, "student_id");
  if (!examId || !studentId) redirect(`/dashboard/exams/${examId}?error=missing-participant`);

  const supabase = await createClient();
  const { data: student } = await supabase
    .from("students")
    .select("id,full_name,student_enrollments!student_enrollments_student_id_fkey(halaqa_id,status,archived_at,halaqat!student_enrollments_halaqa_id_fkey(name,primary_teacher:teachers!halaqat_teacher_id_fkey(full_name)))")
    .eq("id", studentId)
    .is("archived_at", null)
    .maybeSingle();

  const enrollment = firstActive((student?.student_enrollments ?? []) as unknown[]);
  const halaqa = objectValue(enrollment.halaqat);
  const result = await supabase.from("exam_results").insert({
    exam_id: examId,
    student_id: studentId,
    participant_name: student?.full_name ?? null,
    halaqa_id: text(enrollment.halaqa_id) || null,
    halaqa_name: text(halaqa.name) || null,
    teacher_name: text(objectValue(halaqa.primary_teacher).full_name) || null,
    exam_scope: nullable(formData, "exam_scope"),
    attendance_status: "not_started",
    result_status: "pending",
    notes: nullable(formData, "notes"),
    created_by: user.id,
  });

  redirect(`/dashboard/exams/${examId}?${result.error ? "error=duplicate" : "added=1"}`);
}

export async function addManualParticipantAction(formData: FormData) {
  const { user } = await requireAnyRole([...adminRoles]);
  const examId = value(formData, "exam_id");
  const name = value(formData, "participant_name");
  if (!examId || !name) redirect(`/dashboard/exams/${examId}?error=missing-participant`);

  const supabase = await createClient();
  const { data: similar } = await supabase
    .from("students")
    .select("id")
    .ilike("full_name", name)
    .is("archived_at", null)
    .limit(1)
    .maybeSingle();
  if (similar) redirect(`/dashboard/exams/${examId}?error=student-similar`);

  const result = await supabase.from("exam_results").insert({
    exam_id: examId,
    participant_name: name,
    halaqa_id: nullable(formData, "halaqa_id"),
    halaqa_name: nullable(formData, "halaqa_name"),
    teacher_name: nullable(formData, "teacher_name"),
    exam_scope: nullable(formData, "exam_scope"),
    attendance_status: "not_started",
    result_status: "pending",
    notes: nullable(formData, "notes"),
    created_by: user.id,
  });

  redirect(`/dashboard/exams/${examId}?${result.error ? "error=duplicate" : "added=1"}`);
}

export async function importExamParticipantsAction(formData: FormData) {
  const { user } = await requireAnyRole([...adminRoles]);
  const examId = value(formData, "exam_id");
  const raw = value(formData, "rows");
  if (!examId || !raw) redirect(`/dashboard/exams/${examId}?error=import`);

  const parsedRows = parseBoundedJsonArray(raw, importParticipantSchema, 500);
  if (!parsedRows?.success) {
    redirect(`/dashboard/exams/${examId}?error=import`);
  }
  const rows = parsedRows.data;

  const supabase = await createClient();
  let saved = 0;
  for (const row of rows) {
    if (!row.participant_name || !["ready", "manual"].includes(row.status)) continue;
    const result = await supabase.from("exam_results").insert({
      exam_id: examId,
      student_id: row.student_id || null,
      participant_name: row.participant_name,
      halaqa_id: row.halaqa_id || null,
      halaqa_name: row.halaqa_name || null,
      teacher_name: row.teacher_name || null,
      exam_scope: row.exam_scope || null,
      attendance_status: "not_started",
      result_status: "pending",
      notes: row.notes || null,
      created_by: user.id,
    });
    if (!result.error) saved += 1;
  }
  revalidatePath(`/dashboard/exams/${examId}`);
  redirect(`/dashboard/exams/${examId}?imported=${saved}`);
}

export async function saveExamEvaluationAction(formData: FormData) {
  await requireAnyRole([...adminRoles]);
  const examId = value(formData, "exam_id");
  const resultId = value(formData, "result_id");
  const examScope = value(formData, "exam_scope") || passageScope(formData);
  const tajweedRating = value(formData, "tajweed_rating");
  const evaluationDate = value(formData, "evaluation_date");
  if (!examId || !resultId || !examScope || !tajweedRating || !evaluationDate) redirect(`/dashboard/exams/${examId}?error=evaluation-required#participant-${resultId}`);
  const supabase = await createClient();
  const { data: exam } = await supabase.from("exams").select("status").eq("id", examId).maybeSingle();
  if (exam?.status === "approved") redirect(`/dashboard/exams/${examId}?error=approved`);

  const { error } = await supabase
    .from("exam_results")
    .update({
      attendance_status: "tested",
      exam_scope: examScope,
      ...assessmentPayload(formData),
      evaluation_date: evaluationDate,
    })
    .eq("id", resultId)
    .eq("exam_id", examId);

  if (error) redirect(`/dashboard/exams/${examId}?error=${examErrorCode(error.code)}#participant-${resultId}`);
  revalidatePath(`/dashboard/exams/${examId}`);
  redirect(`/dashboard/exams/${examId}?saved=1#participant-${resultId}`);
}

export async function updateExamStatusAction(formData: FormData) {
  const { user } = await requireAnyRole([...adminRoles]);
  const examId = value(formData, "exam_id");
  const status = value(formData, "status");
  const allowed = ["draft", "ready", "in_progress", "completed", "approved", "cancelled"];
  if (!allowed.includes(status)) redirect(`/dashboard/exams/${examId}?error=status`);

  const supabase = await createClient();
  const { data: participants } = await supabase.from("exam_results").select("id,attendance_status,result_status").eq("exam_id", examId).is("archived_at", null).limit(1000);
  if (["ready", "in_progress"].includes(status) && (participants ?? []).length === 0) redirect(`/dashboard/exams/${examId}?error=no-participants`);
  if (status === "approved" && ((participants ?? []).length === 0 || !(participants ?? []).every((item) => item.attendance_status === "absent" || item.attendance_status === "tested"))) redirect(`/dashboard/exams/${examId}?error=incomplete-results`);

  const payload: Record<string, unknown> = { status };
  if (status === "approved") {
    payload.approved_by = user.id;
    payload.approved_at = new Date().toISOString();
  }
  if (status === "completed") {
    payload.reopened_by = user.id;
    payload.reopened_at = new Date().toISOString();
  }

  await supabase.from("exams").update(payload).eq("id", examId);
  revalidatePath("/dashboard/exams");
  revalidatePath(`/dashboard/exams/${examId}`);
  redirect(`/dashboard/exams/${examId}?status-updated=1`);
}

export async function createPermanentStudentAction(formData: FormData) {
  await requireAnyRole([...adminRoles]);
  const examId = value(formData, "exam_id");
  const resultId = value(formData, "result_id");
  const supabase = await createClient();
  const { data: participant } = await supabase
    .from("exam_results")
    .select("id,student_id,participant_name,halaqa_id")
    .eq("id", resultId)
    .eq("exam_id", examId)
    .maybeSingle();

  if (!participant || participant.student_id || !participant.participant_name) {
    redirect(`/dashboard/exams/${examId}?error=student-create`);
  }

  const { data: existing } = await supabase
    .from("students")
    .select("id")
    .ilike("full_name", participant.participant_name)
    .is("archived_at", null)
    .limit(1)
    .maybeSingle();
  if (existing) redirect(`/dashboard/exams/${examId}?error=student-similar`);

  const { data: student, error } = await supabase
    .from("students")
    .insert({ full_name: participant.participant_name, status: "active" })
    .select("id")
    .single();
  if (error || !student) redirect(`/dashboard/exams/${examId}?error=student-create`);

  if (participant.halaqa_id) {
    await supabase.from("student_enrollments").insert({
      student_id: student.id,
      halaqa_id: participant.halaqa_id,
      status: "active",
      enrolled_at: new Date().toISOString().slice(0, 10),
    });
  }
  await supabase.from("exam_results").update({ student_id: student.id, linked_from_manual: true }).eq("id", resultId);
  revalidatePath(`/dashboard/exams/${examId}`);
  redirect(`/dashboard/exams/${examId}?student-created=1`);
}

function value(formData: FormData, key: string) {
  return cleanText(formData.get(key), key === "notes" ? 2000 : 500);
}
function nullable(formData: FormData, key: string) {
  return value(formData, key) || null;
}
function numberOrZero(formData: FormData, key: string) {
  return Number(value(formData, key) || 0);
}
function numberOrDefault(formData: FormData, key: string, fallback: number) {
  const parsed = Number(value(formData, key) || fallback);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
}
function booleanValue(formData: FormData, key: string) {
  return ["1", "true", "on"].includes(formData.get(key)?.toString() ?? "");
}
function passageScope(formData: FormData) {
  const fromName = value(formData, "from_surah_name");
  const toName = value(formData, "to_surah_name");
  if (!fromName) return "";
  return fromName === toName
    ? `سورة ${fromName} من الآية ${value(formData, "from_ayah")} إلى ${value(formData, "to_ayah")}`
    : `من سورة ${fromName} آية ${value(formData, "from_ayah")} إلى سورة ${toName} آية ${value(formData, "to_ayah")}`;
}
function assessmentPayload(formData: FormData) {
  const mistakes = numberOrZero(formData, "mistakes_count");
  const alerts = numberOrZero(formData, "alerts_count");
  const fullScore = numberOrDefault(formData, "full_score", 100);
  const mistakeDeduction = numberOrDefault(formData, "mistake_deduction", 1);
  const alertsDeduct = booleanValue(formData, "alerts_deduct");
  const alertDeduction = numberOrDefault(formData, "alert_deduction", 0.25);
  const scoring = calculateExamScore({
    fullScore,
    mistakesCount: mistakes,
    mistakeDeduction,
    alertsCount: alerts,
    alertsDeduct,
    alertDeduction,
  });
  return {
    selected_juz: [...new Set(value(formData, "selected_juz").split(",").map(Number).filter((item) => item >= 1 && item <= 30))],
    from_surah_no: numberOrZero(formData, "from_surah_no") || null,
    from_surah_name: nullable(formData, "from_surah_name"),
    from_ayah: numberOrZero(formData, "from_ayah") || null,
    to_surah_no: numberOrZero(formData, "to_surah_no") || null,
    to_surah_name: nullable(formData, "to_surah_name"),
    to_ayah: numberOrZero(formData, "to_ayah") || null,
    passage_length: value(formData, "passage_length") || "medium",
    mistakes_count: mistakes, alerts_count: alerts,
    memorization_notes: nullable(formData, "memorization_notes"),
    tajweed_notes: nullable(formData, "tajweed_notes"),
    general_notes: nullable(formData, "general_notes"),
    recommendation: nullable(formData, "recommendation"),
    full_score: fullScore, mistake_deduction: mistakeDeduction,
    alerts_deduct: alertsDeduct, alert_deduction: alertDeduction,
    calculated_score: scoring.finalScore, score: scoring.finalScore,
    rating: scoring.rating,
    result_status: scoring.resultStatus,
    notes: nullable(formData, "general_notes"),
  };
}
// ─── Approve teacher-submitted exam result ────────────────────────────────────
export async function approveTeacherResultAction(formData: FormData) {
  const { user } = await requireAnyRole([...adminRoles]);
  const resultId = value(formData, "result_id");
  if (!resultId) redirect("/dashboard/exams?error=missing");

  const supabase = await createClient();
  const { error } = await supabase
    .from("exam_results")
    .update({ approved_at: new Date().toISOString(), approved_by: user.id })
    .eq("id", resultId)
    .eq("teacher_submitted", true)
    .is("approved_at", null);

  if (error) redirect("/dashboard/exams?error=approve-failed");
  revalidatePath("/dashboard/exams");
  redirect("/dashboard/exams?approved=1");
}

// ─── Lock approved teacher-submitted exam result ──────────────────────────────
export async function lockTeacherResultAction(formData: FormData) {
  const { user } = await requireAnyRole([...adminRoles]);
  const resultId = value(formData, "result_id");
  if (!resultId) redirect("/dashboard/exams?error=missing");

  const supabase = await createClient();
  const { error } = await supabase
    .from("exam_results")
    .update({ locked_at: new Date().toISOString(), locked_by: user.id })
    .eq("id", resultId)
    .eq("teacher_submitted", true);

  if (error) redirect("/dashboard/exams?error=lock-failed");
  revalidatePath("/dashboard/exams");
  redirect("/dashboard/exams?locked=1");
}

function examErrorCode(code?: string) {
  if (code === "42P17") return "exam-policy";
  if (code === "42501") return "exam-permission";
  if (code === "23505") return "duplicate";
  return "save";
}
function text(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}
function objectValue(value: unknown): Record<string, unknown> {
  if (Array.isArray(value)) return objectValue(value[0]);
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}
function firstActive(rows: unknown[]) {
  return objectValue(rows.find((row) => {
    const item = objectValue(row);
    return text(item.status) === "active" && !text(item.archived_at);
  }) ?? rows[0]);
}
