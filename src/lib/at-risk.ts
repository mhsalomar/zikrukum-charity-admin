import "server-only";

import { requireAnyRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { operationalRoles } from "@/lib/operational-resources";

export type AtRiskReason = "stale" | "absent" | "weak";

export type AtRiskStudent = {
  studentId: string;
  studentName: string;
  halaqaId: string;
  halaqaName: string;
  teacherName: string;
  lastActivityDate: string | null;
  daysSinceActivity: number;
  consecutiveAbsences: number;
  lastRating: string | null;
  reasons: AtRiskReason[];
};

const STALE_DAYS = 14;
const ABSENT_THRESHOLD = 3;
const WEAK_RATINGS = new Set(["needs_follow_up", "weak"]);

export async function getAtRiskStudents(): Promise<AtRiskStudent[]> {
  await requireAnyRole([...operationalRoles]);
  const supabase = await createClient();

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - STALE_DAYS);

  const [enrollments, sessions, halaqat, teachers] = await Promise.all([
    supabase
      .from("student_enrollments")
      .select("student_id,halaqa_id,students!student_enrollments_student_id_fkey(id,full_name)")
      .eq("status", "active")
      .is("archived_at", null)
      .limit(5000),
    supabase
      .from("teacher_session_entries")
      .select("student_id,halaqa_id,session_date,attendance_status,rating")
      .is("archived_at", null)
      .order("session_date", { ascending: false })
      .limit(10000),
    supabase
      .from("halaqat")
      .select("id,name,teacher_id")
      .is("archived_at", null)
      .limit(1000),
    supabase
      .from("teachers")
      .select("id,full_name")
      .is("archived_at", null)
      .limit(1000),
  ]);

  const halaqaMap = new Map<string, { name: string; teacherId: string }>(
    (halaqat.data ?? []).map((h) => [h.id, { name: h.name, teacherId: h.teacher_id ?? "" }])
  );
  const teacherMap = new Map<string, string>(
    (teachers.data ?? []).map((t) => [t.id, t.full_name ?? "غير محدد"])
  );

  // Group sessions by studentId
  const sessionsByStudent = new Map<string, Array<{ date: string; status: string; rating: string }>>();
  for (const s of sessions.data ?? []) {
    const key = s.student_id ?? "";
    if (!key) continue;
    if (!sessionsByStudent.has(key)) sessionsByStudent.set(key, []);
    sessionsByStudent.get(key)!.push({
      date: s.session_date ?? "",
      status: s.attendance_status ?? "",
      rating: s.rating ?? "",
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const atRisk: AtRiskStudent[] = [];

  for (const row of enrollments.data ?? []) {
    const studentId = row.student_id ?? "";
    const halaqaId = row.halaqa_id ?? "";
    const student = row.students as unknown as { id: string; full_name: string } | null;
    if (!studentId || !student) continue;

    const halaqa = halaqaMap.get(halaqaId);
    const entries = sessionsByStudent.get(studentId) ?? [];
    const latestEntry = entries[0];
    const lastDate = latestEntry?.date ?? null;
    const daysSince = lastDate
      ? Math.floor((new Date(today).getTime() - new Date(lastDate).getTime()) / 86400000)
      : 999;

    const recentAbsent = entries
      .slice(0, 5)
      .filter((e) => e.status === "absent").length;

    const reasons: AtRiskReason[] = [];
    if (daysSince >= STALE_DAYS) reasons.push("stale");
    if (recentAbsent >= ABSENT_THRESHOLD) reasons.push("absent");
    if (latestEntry && WEAK_RATINGS.has(latestEntry.rating)) reasons.push("weak");

    if (reasons.length === 0) continue;

    atRisk.push({
      studentId,
      studentName: student.full_name,
      halaqaId,
      halaqaName: halaqa?.name ?? "غير محدد",
      teacherName: teacherMap.get(halaqa?.teacherId ?? "") ?? "غير محدد",
      lastActivityDate: lastDate,
      daysSinceActivity: daysSince === 999 ? -1 : daysSince,
      consecutiveAbsences: recentAbsent,
      lastRating: latestEntry?.rating ?? null,
      reasons,
    });
  }

  return atRisk.sort((a, b) => b.reasons.length - a.reasons.length || b.daysSinceActivity - a.daysSinceActivity);
}
