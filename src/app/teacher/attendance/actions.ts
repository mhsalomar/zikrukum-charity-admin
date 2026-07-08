"use server";

import { redirect } from "next/navigation";

import { requireTeacherPortal } from "@/lib/teacher-portal";
import { safeInternalPath } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";

const VALID_STATUS = new Set(["present", "absent", "late", "excused"]);

export async function saveAttendance(formData: FormData) {
  const { user, teacher } = await requireTeacherPortal();
  if (!teacher) redirect("/teacher/dashboard?error=teacher-profile");

  const halaqaId = formData.get("halaqa_id") as string;
  const sessionDate = formData.get("session_date") as string;
  const returnTo = safeInternalPath(formData.get("return_to"), "");

  if (!halaqaId || !sessionDate) redirect(attendanceRedirect(returnTo, halaqaId, sessionDate, "error", "missing"));

  const supabase = await createClient();

  // التحقق أن الحلقة تخص المعلم
  const { count } = await supabase
    .from("halaqat")
    .select("id", { count: "exact", head: true })
    .eq("id", halaqaId)
    .or(`teacher_id.eq.${teacher.id},assistant_teacher_id.eq.${teacher.id}`);

  if (!count) redirect(attendanceRedirect(returnTo, halaqaId, sessionDate, "error", "scope"));

  // استخراج حالات الحضور من الفورم
  const records: { halaqa_id: string; student_id: string; session_date: string; status: string; recorded_by: string }[] = [];

  for (const [key, value] of formData.entries()) {
    if (key.startsWith("status_")) {
      const studentId = key.replace("status_", "");
      const status = String(value);
      if (studentId && VALID_STATUS.has(status)) {
        records.push({ halaqa_id: halaqaId, student_id: studentId, session_date: sessionDate, status, recorded_by: user.id });
      }
    }
  }

  if (records.length === 0) redirect(attendanceRedirect(returnTo, halaqaId, sessionDate, "error", "empty"));

  // upsert: يحدّث إن وجد، يضيف إن لم يوجد
  const { error } = await supabase
    .from("attendance")
    .upsert(records, { onConflict: "halaqa_id,student_id,session_date", ignoreDuplicates: false });

  if (error) {
    console.error("attendance-save-error", error);
    redirect(attendanceRedirect(returnTo, halaqaId, sessionDate, "error", "save"));
  }

  redirect(attendanceRedirect(returnTo, halaqaId, sessionDate, "saved", "1"));
}

function attendanceRedirect(
  returnTo: string,
  halaqaId: string,
  sessionDate: string,
  key: "saved" | "error",
  value: string,
) {
  const dashboard = safeInternalPath(returnTo, "").startsWith("/teacher/dashboard");
  const params = new URLSearchParams();
  if (dashboard) {
    if (halaqaId) params.set("attendanceHalaqa", halaqaId);
    if (sessionDate) params.set("attendanceDate", sessionDate);
    params.set(key === "saved" ? "attendanceSaved" : "attendanceError", value);
    return `/teacher/dashboard?${params.toString()}#teacher-attendance`;
  }

  if (halaqaId) params.set("halaqa", halaqaId);
  if (sessionDate) params.set("date", sessionDate);
  params.set(key, value);
  return `/teacher/attendance?${params.toString()}`;
}
