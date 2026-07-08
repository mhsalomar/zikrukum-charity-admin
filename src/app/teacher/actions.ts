"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSurahByNumber } from "@/lib/quran-surahs";
import { cleanText, safeInternalPath } from "@/lib/security";
import { requireTeacherPortal } from "@/lib/teacher-portal";
import { createClient } from "@/lib/supabase/server";

export async function createCircleLesson(formData: FormData) {
  const { user, teacher } = await requireTeacherPortal();
  if (!teacher) redirect("/teacher/dashboard?error=teacher-profile");

  const halaqaId = readText(formData, "halaqa_id");
  const lessonType = readText(formData, "lesson_type");
  const lessonDate = readText(formData, "lesson_date") || today();
  const lessonTitle = readText(formData, "lesson_title");
  const returnTo = readText(formData, "return_to");

  if (!halaqaId || !lessonType) {
    redirect(sessionRedirect(returnTo, halaqaId, "sessionError", "missing"));
  }

  const supabase = await createClient();
  const allowed = await verifyTeacherHalaqa(supabase, teacher.id, halaqaId);
  if (!allowed) {
    redirect(sessionRedirect(returnTo, halaqaId, "sessionError", "scope"));
  }

  const { error } = await supabase.from("teacher_circle_lessons").insert({
    teacher_id: teacher.id,
    halaqa_id: halaqaId,
    lesson_date: lessonDate,
    lesson_type: lessonType,
    lesson_title: lessonTitle || null,
    present_count: readNumber(formData, "present_count"),
    absent_count: readNumber(formData, "absent_count"),
    late_count: readNumber(formData, "late_count"),
    excused_count: readNumber(formData, "excused_count"),
    notes: readText(formData, "notes") || null,
    created_by: user.id,
  });

  if (error) {
    redirect(sessionRedirect(returnTo, halaqaId, "sessionError", "save"));
  }

  revalidatePath("/teacher/dashboard");
  revalidatePath("/teacher/sessions");
  redirect(sessionRedirect(returnTo, halaqaId, "sessionSaved", "lesson"));
}

export async function createStudentSession(formData: FormData) {
  const { user, teacher } = await requireTeacherPortal();
  if (!teacher) redirect("/teacher/dashboard?error=teacher-profile");

  const halaqaId = readText(formData, "halaqa_id");
  const studentId = readText(formData, "student_id");
  const sessionType = "recitation";
  const sessionDate = readText(formData, "session_date") || today();
  const returnTo = readText(formData, "return_to");

  if (!halaqaId || !studentId || !sessionType) {
    redirect(sessionRedirect(returnTo, halaqaId, "sessionError", "missing"));
  }

  const recitationSurahNumber = readOptionalNumber(formData, "recitation_surah_number");
  const recitationSurah = recitationSurahNumber ? getSurahByNumber(recitationSurahNumber) : undefined;
  const reviewSurahNumber = readOptionalNumber(formData, "review_surah_number");
  const reviewSurah = reviewSurahNumber ? getSurahByNumber(reviewSurahNumber) : undefined;

  const recitationFromAyah = readOptionalNumber(formData, "recitation_from_ayah");
  const recitationToAyah = readOptionalNumber(formData, "recitation_to_ayah");
  const reviewFromAyah = readOptionalNumber(formData, "review_from_ayah");
  const reviewToAyah = readOptionalNumber(formData, "review_to_ayah");

  if (
    !validAyah(recitationSurah?.ayahCount, recitationFromAyah, recitationToAyah) ||
    !validAyah(reviewSurah?.ayahCount, reviewFromAyah, reviewToAyah)
  ) {
    redirect(sessionRedirect(returnTo, halaqaId, "sessionError", "ayah"));
  }

  const supabase = await createClient();
  const allowed = await verifyTeacherStudent(supabase, teacher.id, halaqaId, studentId);
  if (!allowed) {
    redirect(sessionRedirect(returnTo, halaqaId, "sessionError", "scope"));
  }

  const sessionPayload = {
    teacher_id: teacher.id,
    halaqa_id: halaqaId,
    student_id: studentId,
    session_date: sessionDate,
    session_type: sessionType,
    attendance_status: readText(formData, "attendance_status") || "present",
    recitation_surah_number: recitationSurah?.number ?? null,
    recitation_surah_name: recitationSurah?.name ?? null,
    recitation_from_ayah: recitationFromAyah,
    recitation_to_ayah: recitationToAyah,
    review_surah_number: reviewSurah?.number ?? null,
    review_surah_name: reviewSurah?.name ?? null,
    review_from_ayah: reviewFromAyah,
    review_to_ayah: reviewToAyah,
    memorization_pages: readDecimal(formData, "memorization_pages"),
    review_pages: readDecimal(formData, "review_pages"),
    major_mistakes_count: readNumber(formData, "mistakes_count"),
    minor_mistakes_count: 0,
    rating: readText(formData, "rating") || null,
    notes: readText(formData, "notes") || null,
    created_by: user.id,
  };

  const { data: existing } = await supabase
    .from("teacher_session_entries")
    .select("id,session_date")
    .eq("teacher_id", teacher.id)
    .eq("halaqa_id", halaqaId)
    .eq("student_id", studentId)
    .eq("session_date", sessionDate)
    .eq("session_type", sessionType)
    .is("archived_at", null)
    .limit(1)
    .maybeSingle();

  if (existing?.id && sessionDate !== today()) {
    redirect(sessionRedirect(returnTo, halaqaId, "sessionError", "duplicate_old"));
  }

  const { error } = existing?.id
    ? await supabase.from("teacher_session_entries").update(sessionPayload).eq("id", existing.id)
    : await supabase.from("teacher_session_entries").insert(sessionPayload);

  if (error) {
    redirect(sessionRedirect(returnTo, halaqaId, "sessionError", "save"));
  }

  revalidatePath("/teacher/dashboard");
  revalidatePath("/teacher/sessions");
  revalidatePath("/teacher/students");
  revalidatePath(`/teacher/students/${studentId}`);
  redirect(sessionRedirect(returnTo, halaqaId, "sessionSaved", existing?.id ? "updated" : "session"));
}

async function verifyTeacherHalaqa(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teacherId: string,
  halaqaId: string,
) {
  const { data, error } = await supabase
    .from("halaqat")
    .select("id")
    .eq("id", halaqaId)
    .or(`teacher_id.eq.${teacherId},assistant_teacher_id.eq.${teacherId}`)
    .is("archived_at", null)
    .maybeSingle();

  return !error && Boolean(data);
}

async function verifyTeacherStudent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teacherId: string,
  halaqaId: string,
  studentId: string,
) {
  const halaqaAllowed = await verifyTeacherHalaqa(supabase, teacherId, halaqaId);
  if (!halaqaAllowed) return false;

  const { data, error } = await supabase
    .from("student_enrollments")
    .select("id")
    .eq("student_id", studentId)
    .eq("halaqa_id", halaqaId)
    .eq("status", "active")
    .is("archived_at", null)
    .maybeSingle();

  return !error && Boolean(data);
}

function readText(formData: FormData, key: string) {
  return cleanText(formData.get(key), key.includes("notes") ? 2000 : 500);
}

function readNumber(formData: FormData, key: string) {
  const value = Number(readText(formData, key) || 0);
  return Number.isFinite(value) && value >= 0 ? Math.trunc(value) : 0;
}

function readDecimal(formData: FormData, key: string) {
  const value = Number(readText(formData, key) || 0);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function readOptionalNumber(formData: FormData, key: string) {
  const text = readText(formData, key);
  if (!text) return null;
  const value = Number(text);
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : null;
}

function validAyah(ayahCount: number | undefined, from: number | null, to: number | null) {
  if (!ayahCount || (!from && !to)) return true;
  if (from && (from < 1 || from > ayahCount)) return false;
  if (to && (to < 1 || to > ayahCount)) return false;
  if (from && to && from > to) return false;
  return true;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function sessionRedirect(returnTo: string, halaqaId: string, key: "sessionSaved" | "sessionError", value: string) {
  if (safeInternalPath(returnTo, "") === "/teacher/dashboard") {
    const params = new URLSearchParams();
    if (halaqaId) params.set("attendanceHalaqa", halaqaId);
    params.set(key, value);
    return `/teacher/dashboard?${params.toString()}#teacher-recitation`;
  }
  const params = new URLSearchParams();
  if (halaqaId) params.set("halaqa", halaqaId);
  params.set(key === "sessionSaved" ? "saved" : "error", value);
  return `/teacher/sessions?${params.toString()}`;
}
