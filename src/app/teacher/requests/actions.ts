"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireTeacherPortal } from "@/lib/teacher-portal";
import { cleanText } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";

const requestTypes = new Set(["add_student", "edit_attendance", "edit_recitation", "transfer_student"]);
type StudentNameMatch = { student_name?: string | null; halaqa_id?: string | null };

export async function createTeacherStudentRequest(formData: FormData) {
  const { user, teacher, preview } = await requireTeacherPortal();
  if (!teacher) redirect("/teacher/dashboard?requestError=profile#teacher-requests");

  const requestType = text(formData, "request_type");
  const currentHalaqaId = text(formData, "current_halaqa_id");
  const studentId = text(formData, "student_id");
  const reason = text(formData, "reason");
  const requestedStudentName = text(formData, "requested_student_name");

  if (!requestTypes.has(requestType)) {
    redirect("/teacher/dashboard?requestError=type#teacher-requests");
  }

  if (requestType === "add_student" && !requestedStudentName) {
    redirect("/teacher/dashboard?requestError=missing#teacher-requests");
  }

  if (requestType !== "add_student" && !studentId) {
    redirect("/teacher/dashboard?requestError=student#teacher-requests");
  }

  const supabase = await createClient();

  if (currentHalaqaId && !(await verifyTeacherHalaqa(supabase, teacher.id, currentHalaqaId))) {
    redirect("/teacher/dashboard?requestError=scope#teacher-requests");
  }

  if (studentId && currentHalaqaId && !(await verifyTeacherStudent(supabase, teacher.id, currentHalaqaId, studentId))) {
    redirect("/teacher/dashboard?requestError=scope#teacher-requests");
  }

  // ─── add_student: check duplicate then create student directly ─────────────
  if (requestType === "add_student") {
    if (!currentHalaqaId) redirect("/teacher/dashboard?requestError=halaqa#teacher-requests");
    const { data: rawMatches } = await supabase.rpc(
      preview.active ? "qa_student_name_matches" : "teacher_student_name_matches",
      { input_name: requestedStudentName },
    );
    const matches = (rawMatches ?? []) as StudentNameMatch[];
    const normalized = normalizeName(requestedStudentName);
    const exact = matches.find((item) => normalizeName(String(item.student_name ?? "")) === normalized);
    if (exact) redirect(`/teacher/dashboard?requestError=${String(exact.halaqa_id) === currentHalaqaId ? "duplicate-same" : "duplicate-other"}#teacher-requests`);
    const similar = matches.find((item) => nameSimilarity(normalizeName(String(item.student_name ?? "")), normalized) >= 0.72);
    if (similar && text(formData, "confirm_similar") !== "1") {
      redirect(`/teacher/dashboard?requestError=similar&similar=${encodeURIComponent(String(similar.student_name ?? ""))}#teacher-requests`);
    }
    const guardianPhone = text(formData, "guardian_phone");
    const level = text(formData, "level");
    const notes = text(formData, "reason");
    const rpcName = preview.active ? "qa_add_student_to_halaqa" : "teacher_add_student_to_halaqa";
    const rpcPayload = {
      input_name: requestedStudentName,
      input_halaqa_id: currentHalaqaId,
      input_guardian_phone: guardianPhone || null,
      input_level: level || null,
      input_notes: notes || null,
      ...(preview.active ? { input_teacher_id: teacher.id } : {}),
    };
    const { data: newStudentId, error: studentError } = await supabase.rpc(rpcName, rpcPayload);
    if (studentError || !newStudentId) {
      const code = studentError?.message?.includes("duplicate_same_halaqa") ? "duplicate-same" : studentError?.message?.includes("duplicate_other_halaqa") ? "duplicate-other" : "save";
      redirect(`/teacher/dashboard?requestError=${code}#teacher-requests`);
    }
    await supabase.from("student_change_requests").insert({
      request_type: "add_student",
      status: "approved",
      requester_id: user.id,
      requester_teacher_id: teacher.id,
      student_id: newStudentId,
      current_halaqa_id: currentHalaqaId || null,
      requested_student_name: requestedStudentName,
      requested_payload: {
        guardian_phone: guardianPhone || null,
        level: level || null,
        created_via_admin_preview: preview.active,
        entered_by: preview.actorName,
        acting_as_teacher_id: preview.active ? teacher.id : null,
      },
      reason: notes || null,
      decided_at: new Date().toISOString(),
      decision_notes: preview.active
        ? `أضافه ${preview.actorName} ضمن تجربة بوابة ${teacher.fullName}`
        : "أضافه المعلم مباشرة إلى حلقته",
    });

    revalidatePath("/teacher/dashboard");
    revalidatePath("/dashboard/students");
    revalidatePath("/dashboard/student-requests");
    redirect("/teacher/dashboard?requestSaved=added#teacher-requests");
  }

  // ─── Other request types: insert pending then auto-approve ─────────────────
  const attendanceId = requestType === "edit_attendance"
    ? await findAttendanceId(supabase, studentId, currentHalaqaId, text(formData, "attendance_date"))
    : null;
  const sessionEntryId = requestType === "edit_recitation"
    ? await findSessionEntryId(supabase, teacher.id, studentId)
    : null;

  const payload = {
    attendance_date: text(formData, "attendance_date") || null,
    requested_attendance_status: text(formData, "requested_attendance_status") || null,
    correction_notes: text(formData, "correction_notes") || null,
    target_halaqa_name: text(formData, "target_halaqa_name") || null,
    guardian_phone: text(formData, "guardian_phone") || null,
  };

  const { data: inserted, error } = await supabase.from("student_change_requests").insert({
    request_type: requestType,
    status: "pending",
    requester_id: user.id,
    requester_teacher_id: teacher.id,
    student_id: studentId || null,
    current_halaqa_id: currentHalaqaId || null,
    attendance_id: attendanceId,
    session_entry_id: sessionEntryId,
    requested_student_name: null,
    requested_payload: payload,
    reason: reason || null,
  }).select("id").single();

  if (error) {
    console.error("[teacher-requests] save failed", { message: error.message });
    redirect("/teacher/dashboard?requestError=save#teacher-requests");
  }

  // Auto-approve non-add requests
  if (inserted?.id) {
    await supabase
      .from("student_change_requests")
      .update({
        status: "approved",
        decided_at: new Date().toISOString(),
        decision_notes: "اعتماد تلقائي",
      })
      .eq("id", inserted.id);
  }

  revalidatePath("/teacher/dashboard");
  revalidatePath("/dashboard/student-requests");
  revalidatePath("/supervisor/requests");
  revalidatePath("/dashboard/operations");
  redirect("/teacher/dashboard?requestSaved=1#teacher-requests");
}

// ─── Helpers ────────────────────────────────────────────────────────────────

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

async function findAttendanceId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studentId: string,
  halaqaId: string,
  date: string,
) {
  if (!studentId || !halaqaId || !date) return null;
  const { data } = await supabase
    .from("attendance")
    .select("id")
    .eq("student_id", studentId)
    .eq("halaqa_id", halaqaId)
    .eq("session_date", date)
    .maybeSingle();
  return data?.id ?? null;
}

async function findSessionEntryId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teacherId: string,
  studentId: string,
) {
  if (!studentId) return null;
  const { data } = await supabase
    .from("teacher_session_entries")
    .select("id")
    .eq("teacher_id", teacherId)
    .eq("student_id", studentId)
    .is("archived_at", null)
    .order("session_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

function text(formData: FormData, key: string) {
  return cleanText(formData.get(key), key.includes("notes") || key.includes("reason") ? 2000 : 500);
}

function normalizeName(value: string) {
  return value.normalize("NFKD").replace(/[\u064B-\u065F\u0670\u0640]/g, "").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/\s+/g, " ").trim().toLowerCase();
}
function nameSimilarity(left: string, right: string) {
  if (!left || !right) return 0;
  const a = new Set(left.split(" ")); const b = new Set(right.split(" "));
  return (2 * [...a].filter((token) => b.has(token)).length) / (a.size + b.size);
}
