import { notFound } from "next/navigation";

import { requireAnyRole } from "@/lib/auth";
import type { AppRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export const examAdminRoles = ["admin", "demo_admin"] as const;
export const examViewRoles = ["admin", "demo_admin", "executive_director", "executive_manager", "halaqat_manager"] as const;

export const examTypeLabels: Record<string, string> = {
  memorization: "حفظ",
  review: "مراجعة",
  nooraniya: "نورانية",
  tajweed: "تجويد",
  placement: "تحديد مستوى",
  general: "عام",
};

export const examStatusLabels: Record<string, string> = {
  draft: "مسودة",
  ready: "جاهز للاختبار",
  in_progress: "جارٍ الاختبار",
  completed: "مكتمل",
  approved: "معتمد",
  cancelled: "ملغي",
};

export const attendanceStatusLabels: Record<string, string> = {
  not_started: "لم يبدأ",
  present: "حاضر",
  absent: "غائب",
  tested: "تم اختباره",
};

export const resultStatusLabels: Record<string, string> = {
  pending: "لم تحدد",
  passed: "ناجح",
  failed: "غير مجتاز",
  retest: "يحتاج إعادة",
};

export const ratingLabels: Record<string, string> = {
  excellent: "ممتاز",
  very_good: "جيد جدًا",
  good: "جيد",
  acceptable: "مقبول",
  needs_improvement: "يحتاج تحسين",
};

export type ExamListItem = {
  id: string;
  title: string;
  examType: string;
  examDate: string;
  examTime: string;
  venue: string;
  status: string;
  participantCount: number;
  testedCount: number;
  approvedAt: string;
};

export type ExamParticipant = {
  id: string;
  studentId: string;
  participantName: string;
  halaqaId: string;
  halaqaName: string;
  teacherName: string;
  examScope: string;
  attendanceStatus: string;
  score: string;
  rating: string;
  mistakesCount: number;
  alertsCount: number;
  tajweedRating: string;
  evaluationDate: string;
  resultStatus: string;
  evaluatorName: string;
  notes: string;
  selectedJuz: number[];
  fromSurahNo: number;
  fromSurahName: string;
  fromAyah: number;
  toSurahNo: number;
  toSurahName: string;
  toAyah: number;
  memorizationNotes: string;
  tajweedNotes: string;
  generalNotes: string;
  recommendation: string;
  memorizationScore: string;
  accuracyScore: string;
  tajweedScore: string;
  fluencyScore: string;
  waqfScore: string;
  isManual: boolean;
};

export type ExamDetail = {
  id: string;
  title: string;
  examType: string;
  examDate: string;
  examTime: string;
  venue: string;
  halaqaId: string;
  surahScope: string;
  committeeName: string;
  status: string;
  notes: string;
  nominationOpen: boolean;
  approvedAt: string;
  fullScore: number;
  mistakeDeduction: number;
  alertsDeduct: boolean;
  alertDeduction: number;
  participants: ExamParticipant[];
};

export type ExamOptionData = {
  students: Array<{ id: string; name: string; halaqaId: string; halaqaName: string; teacherName: string }>;
  halaqat: Array<{ id: string; name: string; teacherName: string }>;
};

type Row = Record<string, unknown>;

export async function getAdminExams(allowedRoles: AppRole[] = [...examViewRoles]): Promise<ExamListItem[]> {
  await requireAnyRole(allowedRoles);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exams")
    .select("id,title,exam_type,exam_date,exam_time,venue,status,approved_at,exam_results!exam_results_exam_id_fkey(id,attendance_status,archived_at)")
    .is("archived_at", null)
    .order("exam_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(150);

  if (error) return [];

  return ((data ?? []) as unknown as Row[]).map((row) => {
    const participants = arrayValue(row.exam_results).filter((item) => !text(item.archived_at));
    return {
      id: text(row.id),
      title: text(row.title) || "اختبار",
      examType: text(row.exam_type),
      examDate: text(row.exam_date),
      examTime: text(row.exam_time),
      venue: text(row.venue),
      status: text(row.status) || "draft",
      participantCount: participants.length,
      testedCount: participants.filter((item) => text(item.attendance_status) === "tested").length,
      approvedAt: text(row.approved_at),
    };
  });
}

export async function getExamDetail(examId: string, allowedRoles: AppRole[] = [...examViewRoles]): Promise<ExamDetail> {
  await requireAnyRole(allowedRoles);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exams")
    .select("id,title,exam_type,exam_date,exam_time,venue,halaqa_id,surah_scope,committee_name,status,notes,nomination_open,approved_at,full_score,mistake_deduction,alerts_deduct,alert_deduction,exam_results!exam_results_exam_id_fkey(id,student_id,participant_name,halaqa_id,halaqa_name,teacher_name,exam_scope,attendance_status,score,rating,mistakes_count,alerts_count,tajweed_rating,evaluation_date,result_status,evaluator_name,notes,memorization_score,accuracy_score,tajweed_score,fluency_score,waqf_score,linked_from_manual,archived_at,selected_juz,from_surah_no,from_surah_name,from_ayah,to_surah_no,to_surah_name,to_ayah,memorization_notes,tajweed_notes,general_notes,recommendation,students!exam_results_student_id_fkey(full_name))")
    .eq("id", examId)
    .is("archived_at", null)
    .maybeSingle();

  if (error || !data) notFound();
  const row = data as unknown as Row;

  return {
    id: text(row.id),
    title: text(row.title),
    examType: text(row.exam_type),
    examDate: text(row.exam_date),
    examTime: text(row.exam_time),
    venue: text(row.venue),
    halaqaId: text(row.halaqa_id),
    surahScope: text(row.surah_scope),
    committeeName: text(row.committee_name),
    status: text(row.status) || "draft",
    notes: text(row.notes),
    nominationOpen: Boolean(row.nomination_open),
    approvedAt: text(row.approved_at),
    fullScore: numberValue(row.full_score) || 100,
    mistakeDeduction: numberValue(row.mistake_deduction) || 1,
    alertsDeduct: Boolean(row.alerts_deduct),
    alertDeduction: numberValue(row.alert_deduction),
    participants: arrayValue(row.exam_results)
      .filter((item) => !text(item.archived_at))
      .map((item) => ({
        id: text(item.id),
        studentId: text(item.student_id),
        participantName: text(objectValue(item.students).full_name) || text(item.participant_name) || "طالب",
        halaqaId: text(item.halaqa_id),
        halaqaName: text(item.halaqa_name),
        teacherName: text(item.teacher_name),
        examScope: text(item.exam_scope),
        attendanceStatus: text(item.attendance_status) || "not_started",
        score: text(item.score),
        rating: text(item.rating),
        mistakesCount: numberValue(item.mistakes_count),
        alertsCount: numberValue(item.alerts_count),
        tajweedRating: text(item.tajweed_rating),
        evaluationDate: text(item.evaluation_date),
        resultStatus: text(item.result_status) || "pending",
        evaluatorName: text(item.evaluator_name),
        notes: text(item.notes),
        selectedJuz: Array.isArray(item.selected_juz) ? item.selected_juz.map(numberValue) : [],
        fromSurahNo: numberValue(item.from_surah_no),
        fromSurahName: text(item.from_surah_name),
        fromAyah: numberValue(item.from_ayah),
        toSurahNo: numberValue(item.to_surah_no),
        toSurahName: text(item.to_surah_name),
        toAyah: numberValue(item.to_ayah),
        memorizationNotes: text(item.memorization_notes),
        tajweedNotes: text(item.tajweed_notes),
        generalNotes: text(item.general_notes),
        recommendation: text(item.recommendation),
        memorizationScore: text(item.memorization_score),
        accuracyScore: text(item.accuracy_score),
        tajweedScore: text(item.tajweed_score),
        fluencyScore: text(item.fluency_score),
        waqfScore: text(item.waqf_score),
        isManual: !text(item.student_id),
      })),
  };
}

export async function getExamOptions(): Promise<ExamOptionData> {
  await requireAnyRole([...examAdminRoles]);
  const supabase = await createClient();
  const [studentsResult, halaqatResult] = await Promise.all([
    supabase
      .from("students")
      .select("id,full_name,student_enrollments!student_enrollments_student_id_fkey(halaqa_id,status,archived_at,halaqat!student_enrollments_halaqa_id_fkey(name,primary_teacher:teachers!halaqat_teacher_id_fkey(full_name)))")
      .eq("is_test_account", false)
      .is("archived_at", null)
      .order("full_name")
      .limit(1000),
    supabase
      .from("halaqat")
      .select("id,name,primary_teacher:teachers!halaqat_teacher_id_fkey(full_name)")
      .eq("is_test_account", false)
      .is("archived_at", null)
      .eq("status", "active")
      .order("name")
      .limit(300),
  ]);

  return {
    students: ((studentsResult.data ?? []) as unknown as Row[]).map((row) => {
      const enrollment = arrayValue(row.student_enrollments).find((item) => text(item.status) === "active" && !text(item.archived_at)) ?? {};
      const halaqa = objectValue(enrollment.halaqat);
      return {
        id: text(row.id),
        name: text(row.full_name),
        halaqaId: text(enrollment.halaqa_id),
        halaqaName: text(halaqa.name),
        teacherName: text(objectValue(halaqa.primary_teacher).full_name),
      };
    }),
    halaqat: ((halaqatResult.data ?? []) as unknown as Row[]).map((row) => ({
      id: text(row.id),
      name: text(row.name),
      teacherName: text(objectValue(row.primary_teacher).full_name),
    })),
  };
}

export async function getTeacherApprovedExams() {
  await requireAnyRole(["teacher", "admin", "demo_admin"]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("exam_results")
    .select("id,score,rating,result_status,notes,students!exam_results_student_id_fkey(full_name),exams!exam_results_exam_id_fkey(id,title,exam_date,exam_type,status)")
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  return ((data ?? []) as unknown as Row[])
    .filter((row) => text(objectValue(row.exams).status) === "approved")
    .map((row) => ({
      id: text(row.id),
      studentName: text(objectValue(row.students).full_name),
      title: text(objectValue(row.exams).title),
      date: text(objectValue(row.exams).exam_date),
      type: text(objectValue(row.exams).exam_type),
      score: text(row.score),
      rating: text(row.rating),
      status: text(row.result_status),
      notes: text(row.notes),
    }));
}

export type PendingTeacherResult = {
  id: string;
  studentName: string;
  teacherName: string;
  halaqaName: string;
  title: string;
  examType: string;
  date: string;
  score: string;
  rating: string;
  resultStatus: string;
  mistakesCount: number;
  alertsCount: number;
  notes: string;
  createdAt: string;
  previewEntry: boolean;
  enteredByName: string;
  lockedAt: string;
  needsReview: boolean;
};

export async function getPendingTeacherResults(): Promise<PendingTeacherResult[]> {
  await requireAnyRole(["admin", "demo_admin", "executive_director", "executive_manager", "halaqat_manager"]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("exam_results")
    .select("id,score,rating,result_status,mistakes_count,alerts_count,notes,exam_title,exam_type,exam_date,created_at,created_via_admin_preview,entered_by_name,locked_at,needs_review,students!exam_results_student_id_fkey(full_name),teachers!exam_results_teacher_id_fkey(full_name,halaqat!halaqat_teacher_id_fkey(name))")
    .eq("teacher_submitted", true)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(200);

  return ((data ?? []) as unknown as Row[]).map((row) => {
    const teacher = objectValue(row.teachers);
    const halaqa = objectValue(arrayValue(teacher.halaqat)[0]);
    return {
      id: text(row.id),
      studentName: text(objectValue(row.students).full_name),
      teacherName: text(teacher.full_name),
      halaqaName: text(halaqa.name),
      title: text(row.exam_title) || "اختبار",
      examType: text(row.exam_type) || "general",
      date: text(row.exam_date) || text(row.created_at),
      score: text(row.score),
      rating: text(row.rating),
      resultStatus: text(row.result_status) || "pending",
      mistakesCount: numberValue(row.mistakes_count),
      alertsCount: numberValue(row.alerts_count),
      notes: text(row.notes),
      createdAt: text(row.created_at),
      previewEntry: Boolean(row.created_via_admin_preview),
      enteredByName: text(row.entered_by_name),
      lockedAt: text(row.locked_at),
      needsReview: Boolean(row.needs_review),
    };
  });
}

export function summarizeExam(exam: ExamDetail) {
  const participants = exam.participants;
  const scored = participants.filter((item) => item.score !== "");
  const evaluated = participants.filter((item) => item.attendanceStatus === "tested");
  return {
    total: participants.length,
    present: participants.filter((item) => item.attendanceStatus === "present" || item.attendanceStatus === "tested").length,
    absent: participants.filter((item) => item.attendanceStatus === "absent").length,
    tested: participants.filter((item) => item.attendanceStatus === "tested").length,
    passed: participants.filter((item) => item.resultStatus === "passed").length,
    failed: participants.filter((item) => item.resultStatus === "failed").length,
    retest: participants.filter((item) => item.resultStatus === "retest").length,
    average: scored.length ? Math.round((scored.reduce((sum, item) => sum + Number(item.score || 0), 0) / scored.length) * 10) / 10 : 0,
    remaining: participants.filter((item) => !["tested", "absent"].includes(item.attendanceStatus)).length,
    totalMistakes: evaluated.reduce((sum, item) => sum + item.mistakesCount, 0),
    totalAlerts: evaluated.reduce((sum, item) => sum + item.alertsCount, 0),
    averageMistakes: evaluated.length ? Math.round((evaluated.reduce((sum, item) => sum + item.mistakesCount, 0) / evaluated.length) * 10) / 10 : 0,
  };
}

function arrayValue(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === "object") : [];
}

function objectValue(value: unknown): Row {
  if (Array.isArray(value)) return objectValue(value[0]);
  return value && typeof value === "object" ? value as Row : {};
}

function text(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}
