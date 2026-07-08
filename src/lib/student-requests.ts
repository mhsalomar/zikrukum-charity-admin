import "server-only";

import { revalidatePath } from "next/cache";

import { requireAnyRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const studentRequestTypeLabels: Record<string, string> = {
  add_student: "إضافة طالب",
  edit_attendance: "تعديل حضور",
  edit_recitation: "تعديل تسميع",
  transfer_student: "نقل طالب",
};

export const studentRequestStatusLabels: Record<string, string> = {
  pending: "بانتظار الاعتماد",
  approved: "معتمد",
  rejected: "مرفوض",
  cancelled: "ملغي",
};

export type StudentRequestRow = {
  id: string;
  requestType: string;
  status: string;
  requesterName: string;
  studentName: string;
  requestedStudentName: string;
  currentHalaqaName: string;
  targetHalaqaName: string;
  reason: string;
  decisionNotes: string;
  payload: Record<string, unknown>;
  createdAt: string;
  decidedAt: string;
};

type RawRequest = {
  id: string;
  request_type: string | null;
  status: string | null;
  requester_teacher_id: string | null;
  student_id: string | null;
  current_halaqa_id: string | null;
  target_halaqa_id: string | null;
  requested_student_name: string | null;
  requested_payload: unknown;
  reason: string | null;
  decision_notes: string | null;
  created_at: string | null;
  decided_at: string | null;
};

export async function getStudentRequestsForReview(limit = 80) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_change_requests")
    .select(
      "id,request_type,status,requester_teacher_id,student_id,current_halaqa_id,target_halaqa_id,requested_student_name,requested_payload,reason,decision_notes,created_at,decided_at",
    )
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[student-requests] review load failed", { message: error.message });
    return [];
  }

  return hydrateRequests((data ?? []) as RawRequest[]);
}

export async function getStudentRequestsForStudent(studentId: string) {
  if (!studentId) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_change_requests")
    .select(
      "id,request_type,status,requester_teacher_id,student_id,current_halaqa_id,target_halaqa_id,requested_student_name,requested_payload,reason,decision_notes,created_at,decided_at",
    )
    .eq("student_id", studentId)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return [];
  return hydrateRequests((data ?? []) as RawRequest[]);
}

export async function getPendingStudentRequestCount() {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("student_change_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")
    .is("archived_at", null);

  if (error) return 0;
  return count ?? 0;
}

export async function decideStudentRequest(formData: FormData) {
  await requireAnyRole(["admin", "demo_admin", "halaqat_manager", "supervisor"]);

  const id = text(formData, "id");
  const decision = text(formData, "decision");
  const notes = text(formData, "decision_notes");
  const returnTo = text(formData, "return_to") || "/dashboard/student-requests";

  if (!id || !["approved", "rejected"].includes(decision)) {
    return { success: false, error: "بيانات الاعتماد غير مكتملة" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("student_change_requests")
    .update({
      status: decision,
      decision_notes: notes || null,
      decided_by: user?.id ?? null,
      decided_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "pending");

  if (error) {
    return { success: false, error: "تعذر حفظ قرار الطلب" };
  }

  revalidatePath("/dashboard/student-requests");
  revalidatePath("/supervisor/requests");
  revalidatePath("/dashboard/operations");
  revalidatePath(returnTo);
  return { success: true };
}

async function hydrateRequests(rows: RawRequest[]): Promise<StudentRequestRow[]> {
  const supabase = await createClient();
  const teacherIds = unique(rows.map((row) => row.requester_teacher_id));
  const studentIds = unique(rows.map((row) => row.student_id));
  const halaqaIds = unique(rows.flatMap((row) => [row.current_halaqa_id, row.target_halaqa_id]));

  const [teachers, students, halaqat] = await Promise.all([
    teacherIds.length
      ? supabase.from("teachers").select("id,full_name").in("id", teacherIds)
      : Promise.resolve({ data: [] }),
    studentIds.length
      ? supabase.from("students").select("id,full_name").in("id", studentIds)
      : Promise.resolve({ data: [] }),
    halaqaIds.length
      ? supabase.from("halaqat").select("id,name").in("id", halaqaIds)
      : Promise.resolve({ data: [] }),
  ]);

  const teacherNames = mapNames(teachers.data);
  const studentNames = mapNames(students.data);
  const halaqaNames = mapNames(halaqat.data);

  return rows.map((row) => ({
    id: row.id,
    requestType: row.request_type ?? "",
    status: row.status ?? "pending",
    requesterName: teacherNames.get(row.requester_teacher_id ?? "") ?? "غير محدد",
    studentName: studentNames.get(row.student_id ?? "") ?? "",
    requestedStudentName: row.requested_student_name ?? "",
    currentHalaqaName: halaqaNames.get(row.current_halaqa_id ?? "") ?? "",
    targetHalaqaName: halaqaNames.get(row.target_halaqa_id ?? "") ?? "",
    reason: row.reason ?? "",
    decisionNotes: row.decision_notes ?? "",
    payload: toPayload(row.requested_payload),
    createdAt: row.created_at ?? "",
    decidedAt: row.decided_at ?? "",
  }));
}

function unique(values: Array<string | null>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function mapNames(rows: unknown) {
  const map = new Map<string, string>();
  if (!Array.isArray(rows)) return map;
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const id = textValue(record.id);
    const name = textValue(record.full_name) || textValue(record.name);
    if (id) map.set(id, name);
  }
  return map;
}

function toPayload(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function textValue(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}
