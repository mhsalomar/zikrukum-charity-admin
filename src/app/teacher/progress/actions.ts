"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { quranSurahs } from "@/lib/quran-surahs";
import { requireTeacherPortal } from "@/lib/teacher-portal";
import { createClient } from "@/lib/supabase/server";

export async function createDailyProgress(formData: FormData) {
  const { user, teacher } = await requireTeacherPortal();
  if (!teacher) redirect("/teacher/progress?error=teacher-profile");

  const halaqaId = text(formData.get("halaqa_id"));
  const studentId = text(formData.get("student_id"));
  const progressDate = text(formData.get("progress_date")) || new Date().toISOString().slice(0, 10);
  const entryType = text(formData.get("entry_type")) || "memorization";
  const surahNumber = number(formData.get("surah_number"));
  const fromAyah = number(formData.get("from_ayah"));
  const toAyah = number(formData.get("to_ayah"));
  const pagesCount = decimal(formData.get("pages_count"));
  const rating = text(formData.get("rating")) || "good";
  const attendanceStatus = text(formData.get("attendance_status")) || "present";

  if (!halaqaId || !studentId || !surahNumber) redirect("/teacher/progress?error=missing");

  const surah = quranSurahs.find((item) => item.number === surahNumber);
  if (!surah || (fromAyah && fromAyah > surah.ayahCount) || (toAyah && toAyah > surah.ayahCount)) {
    redirect("/teacher/progress?error=ayah");
  }

  const supabase = await createClient();
  const { data: enrollment } = await supabase
    .from("student_enrollments")
    .select("id,halaqat!student_enrollments_halaqa_id_fkey(id,teacher_id,assistant_teacher_id)")
    .eq("student_id", studentId)
    .eq("halaqa_id", halaqaId)
    .eq("status", "active")
    .maybeSingle();

  const halaqa = readObject(enrollment?.halaqat);
  if (halaqa.teacher_id !== teacher.id && halaqa.assistant_teacher_id !== teacher.id) {
    redirect("/teacher/progress?error=scope");
  }

  const payload = {
    student_id: studentId,
    halaqa_id: halaqaId,
    teacher_id: teacher.id,
    progress_date: progressDate,
    entry_type: entryType,
    surah_name: surah.name,
    from_ayah: fromAyah || null,
    to_ayah: toAyah || null,
    pages_count: pagesCount,
    memorization_surah_number: entryType === "review" ? null : surah.number,
    memorization_surah_name: entryType === "review" ? null : surah.name,
    memorization_from_ayah: entryType === "review" ? null : fromAyah || null,
    memorization_to_ayah: entryType === "review" ? null : toAyah || null,
    memorization_pages: entryType === "review" ? 0 : pagesCount,
    review_surah_number: entryType === "review" ? surah.number : null,
    review_surah_name: entryType === "review" ? surah.name : null,
    review_from_ayah: entryType === "review" ? fromAyah || null : null,
    review_to_ayah: entryType === "review" ? toAyah || null : null,
    review_pages: entryType === "review" ? pagesCount : 0,
    rating,
    mistakes_count: number(formData.get("mistakes_count")),
    attendance_status: attendanceStatus,
    notes: text(formData.get("notes")) || null,
    created_by: user.id,
    source: "teacher_entry",
    archived_at: null,
  };

  const existing = await supabase
    .from("student_progress_records")
    .select("id,progress_date,entry_type")
    .eq("student_id", studentId)
    .eq("halaqa_id", halaqaId)
    .is("archived_at", null)
    .maybeSingle();

  const { error } = await supabase
    .from("student_progress_records")
    .upsert(payload, { onConflict: "student_id,halaqa_id", ignoreDuplicates: false });
  if (error) redirect("/teacher/progress?error=save");

  revalidatePath("/teacher/progress");
  revalidatePath("/dashboard/reports/student-progress");
  const duplicateSameDay =
    existing.data &&
    String(existing.data.progress_date ?? "") === progressDate &&
    String(existing.data.entry_type ?? "") === entryType;
  redirect(duplicateSameDay ? "/teacher/progress?updated=duplicate" : existing.data ? "/teacher/progress?updated=1" : "/teacher/progress?saved=1");
}

function text(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function number(value: FormDataEntryValue | null) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function decimal(value: FormDataEntryValue | null) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
