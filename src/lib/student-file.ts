import "server-only";

import { notFound, redirect } from "next/navigation";

import { requireAnyRole } from "@/lib/auth";
import { operationalRoles } from "@/lib/operational-resources";
import { getStudentRequestsForStudent, type StudentRequestRow } from "@/lib/student-requests";
import { getTeacherPortalData } from "@/lib/teacher-portal";
import { createClient } from "@/lib/supabase/server";

export type StudentFileData = {
  student: {
    id: string;
    fullName: string;
    nationalId: string;
    birthDate: string;
    guardianName: string;
    guardianPhone: string;
    level: string;
    enrolledAt: string;
    notes: string;
    status: string;
  };
  enrollment: {
    halaqaId: string;
    halaqaName: string;
    period: string;
    mosqueName: string;
    teacherName: string;
    status: string;
  };
  attendance: Array<{ id: string; date: string; status: string; notes: string }>;
  sessions: Array<{
    id: string;
    date: string;
    type: string;
    teacherName: string;
    recitation: string;
    review: string;
    rating: string;
    notes: string;
  }>;
  progress: Array<{
    id: string;
    date: string;
    type: string;
    memorization: string;
    review: string;
    rating: string;
    notes: string;
  }>;
  exams: Array<{
    id: string;
    title: string;
    examType: string;
    date: string;
    score: string;
    rating: string;
    resultStatus: string;
    mistakesCount: number;
    alertsCount: number;
    fullScore: number;
    mistakeDeduction: number;
    alertDeduction: number;
    mistakesDiscount: number;
    alertsDiscount: number;
    tajweedRating: string;
    evaluatorName: string;
    notes: string;
    approvedAt: string;
    lockedAt: string;
    teacherSubmitted: boolean;
    needsReview: boolean;
    selectedJuz: number[];
    passage: string;
    memorizationNotes: string;
    tajweedNotes: string;
    recommendation: string;
  }>;
  requests: StudentRequestRow[];
};

type Related = Record<string, unknown>;

export async function getTeacherStudentFile(studentId: string) {
  const portal = await getTeacherPortalData();
  if (portal.setupRequired || !portal.teacher) {
    redirect("/teacher/dashboard");
  }
  const allowed = portal.students.some((student) => student.id === studentId);
  if (!allowed) {
    notFound();
  }
  return getStudentFile(studentId);
}

export async function getOperationalStudentFile(studentId: string) {
  await requireAnyRole([...operationalRoles]);
  return getStudentFile(studentId);
}

async function getStudentFile(studentId: string): Promise<StudentFileData> {
  const supabase = await createClient();
  const [studentResult, enrollmentsResult, attendanceResult, sessionsResult, progressResult, examsResult, requests] =
    await Promise.all([
      supabase
        .from("students")
        .select("id,full_name,national_id,birth_date,guardian_name,guardian_phone,level,enrolled_at,notes,status")
        .eq("id", studentId)
        .is("archived_at", null)
        .maybeSingle(),
      supabase
        .from("student_enrollments")
        .select("id,halaqa_id,status,enrolled_at,halaqat!student_enrollments_halaqa_id_fkey(id,name,period,mosques!halaqat_mosque_id_fkey(name),primary_teacher:teachers!halaqat_teacher_id_fkey(full_name))")
        .eq("student_id", studentId)
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("attendance")
        .select("id,session_date,status,notes")
        .eq("student_id", studentId)
        .order("session_date", { ascending: false })
        .limit(20),
      supabase
        .from("teacher_session_entries")
        .select("id,session_date,session_type,recitation_surah_name,recitation_from_ayah,recitation_to_ayah,review_surah_name,review_from_ayah,review_to_ayah,rating,notes,teachers!teacher_session_entries_teacher_id_fkey(full_name)")
        .eq("student_id", studentId)
        .is("archived_at", null)
        .order("session_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("student_progress_records")
        .select("id,progress_date,entry_type,surah_name,from_ayah,to_ayah,memorization_surah_name,memorization_from_ayah,memorization_to_ayah,review_surah_name,review_from_ayah,review_to_ayah,rating,notes")
        .eq("student_id", studentId)
        .is("archived_at", null)
        .order("progress_date", { ascending: false })
        .limit(20),
      supabase
        .from("exam_results")
        .select("id,score,rating,result_status,exam_scope,mistakes_count,alerts_count,full_score,mistake_deduction,alerts_deduct,alert_deduction,tajweed_rating,evaluator_name,evaluation_date,notes,created_at,approved_at,locked_at,needs_review,teacher_submitted,exam_title,exam_type,exam_date,selected_juz,from_surah_name,from_ayah,to_surah_name,to_ayah,memorization_notes,tajweed_notes,recommendation,exams!exam_results_exam_id_fkey(title,exam_date,exam_type)")
        .eq("student_id", studentId)
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(20),
      getStudentRequestsForStudent(studentId),
    ]);

  if (studentResult.error || !studentResult.data) {
    notFound();
  }

  const enrollmentRow = activeEnrollment((enrollmentsResult.data ?? []) as unknown[]);
  const halaqa = objectValue(enrollmentRow.halaqat);
  const student = studentResult.data as Related;

  return {
    student: {
      id: text(student.id),
      fullName: text(student.full_name),
      nationalId: text(student.national_id),
      birthDate: text(student.birth_date),
      guardianName: text(student.guardian_name),
      guardianPhone: text(student.guardian_phone),
      level: text(student.level),
      enrolledAt: text(student.enrolled_at),
      notes: text(student.notes),
      status: text(student.status) || "active",
    },
    enrollment: {
      halaqaId: text(enrollmentRow.halaqa_id),
      halaqaName: text(halaqa.name),
      period: text(halaqa.period),
      mosqueName: text(objectValue(halaqa.mosques).name),
      teacherName: text(objectValue(halaqa.primary_teacher).full_name),
      status: text(enrollmentRow.status) || "active",
    },
    attendance: ((attendanceResult.data ?? []) as unknown as Related[]).map((row) => ({
      id: text(row.id),
      date: text(row.session_date),
      status: text(row.status),
      notes: text(row.notes),
    })),
    sessions: ((sessionsResult.data ?? []) as unknown as Related[]).map((row) => ({
      id: text(row.id),
      date: text(row.session_date),
      type: text(row.session_type),
      teacherName: text(objectValue(row.teachers).full_name),
      recitation: position(text(row.recitation_surah_name), row.recitation_from_ayah, row.recitation_to_ayah),
      review: position(text(row.review_surah_name), row.review_from_ayah, row.review_to_ayah),
      rating: text(row.rating),
      notes: text(row.notes),
    })),
    progress: ((progressResult.data ?? []) as unknown as Related[]).map((row) => {
      const isReview = text(row.entry_type) === "review";
      return {
        id: text(row.id),
        date: text(row.progress_date),
        type: text(row.entry_type),
        memorization: position(
          text(row.memorization_surah_name) || (!isReview ? text(row.surah_name) : ""),
          row.memorization_from_ayah ?? (!isReview ? row.from_ayah : null),
          row.memorization_to_ayah ?? (!isReview ? row.to_ayah : null),
        ),
        review: position(
          text(row.review_surah_name) || (isReview ? text(row.surah_name) : ""),
          row.review_from_ayah ?? (isReview ? row.from_ayah : null),
          row.review_to_ayah ?? (isReview ? row.to_ayah : null),
        ),
        rating: text(row.rating),
        notes: text(row.notes),
      };
    }),
    exams: ((examsResult.data ?? []) as unknown as Related[]).map((row) => {
      const linked = objectValue(row.exams);
      return {
        id: text(row.id),
        title: text(row.exam_title) || text(linked.title) || "اختبار",
        examType: text(row.exam_type) || text(linked.exam_type) || "general",
        date: text(row.exam_date) || text(row.evaluation_date) || text(linked.exam_date) || text(row.created_at),
        score: text(row.score),
        rating: text(row.rating),
        resultStatus: text(row.result_status) || "pending",
        mistakesCount: numberValue(row.mistakes_count),
        alertsCount: numberValue(row.alerts_count),
        fullScore: numberValue(row.full_score) || 100,
        mistakeDeduction: numberValue(row.mistake_deduction) || 1,
        alertDeduction: numberValue(row.alert_deduction),
        mistakesDiscount: numberValue(row.mistakes_count) * (numberValue(row.mistake_deduction) || 1),
        alertsDiscount: Boolean(row.alerts_deduct) ? numberValue(row.alerts_count) * numberValue(row.alert_deduction) : 0,
        tajweedRating: text(row.tajweed_rating),
        evaluatorName: text(row.evaluator_name),
        notes: text(row.notes),
        approvedAt: text(row.approved_at),
        lockedAt: text(row.locked_at),
        teacherSubmitted: Boolean(row.teacher_submitted),
        needsReview: Boolean(row.needs_review),
        selectedJuz: Array.isArray(row.selected_juz) ? row.selected_juz.map(numberValue) : [],
        passage: positionRange(text(row.from_surah_name), row.from_ayah, text(row.to_surah_name), row.to_ayah),
        memorizationNotes: text(row.memorization_notes),
        tajweedNotes: text(row.tajweed_notes),
        recommendation: text(row.recommendation),
      };
    }),
    requests,
  };
}

function activeEnrollment(rows: unknown[]) {
  const firstActive = rows.find((row) => {
    const enrollment = objectValue(row);
    return text(enrollment.status) === "active";
  });
  return objectValue(firstActive ?? rows[0]);
}

function objectValue(value: unknown): Related {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Related) : {};
}

function text(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function position(surah: string, from: unknown, to: unknown) {
  if (!surah) return "";
  const fromText = text(from);
  const toText = text(to);
  return [surah, fromText || toText ? `${fromText || "?"} - ${toText || "?"}` : ""].filter(Boolean).join(" ");
}
function positionRange(fromSurah: string, fromAyah: unknown, toSurah: string, toAyah: unknown) {
  if (!fromSurah) return "";
  return fromSurah === toSurah ? `سورة ${fromSurah} من الآية ${text(fromAyah)} إلى ${text(toAyah)}` : `من سورة ${fromSurah} آية ${text(fromAyah)} إلى سورة ${toSurah} آية ${text(toAyah)}`;
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}
