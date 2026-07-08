import { requireAnyRole } from "@/lib/auth";
import { operationalRoles } from "@/lib/operational-resources";
import { createClient } from "@/lib/supabase/server";

export type CircleStatus = "excellent" | "needs-followup" | "late" | "no-data";

export type DailyMonitorRow = {
  id: string;
  name: string;
  teacherName: string;
  teacherId: string;
  lastEntry: string | null;
  todayEntry: boolean;
  todayAttendance: number | null;
  lastVisit: string | null;
  status: CircleStatus;
};

export type DailyMonitorSummary = {
  activeCount: number;
  registeredToday: number;
  notRegisteredToday: number;
  lateTeachers: number;
  absentStudentsToday: number;
  needsVisit: number;
};

export type DailyMonitorData = {
  today: string;
  summary: DailyMonitorSummary;
  rows: DailyMonitorRow[];
  teacherOptions: Array<{ id: string; name: string }>;
  circleOptions: Array<{ id: string; name: string }>;
};

export type DailyMonitorFilters = {
  circleId?: string;
  teacherId?: string;
  status?: string;
};

const STATUS_SORT: Record<CircleStatus, number> = { late: 0, "needs-followup": 1, "no-data": 2, excellent: 3 };

export async function getDailyMonitorData(filters?: DailyMonitorFilters): Promise<DailyMonitorData> {
  await requireAnyRole([...operationalRoles]);
  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  const [halaqatResult, progressResult, visitsResult] = await Promise.all([
    supabase
      .from("halaqat")
      .select("id,name,teacher_id,teachers!halaqat_teacher_id_fkey(id,full_name)")
      .eq("status", "active")
      .is("archived_at", null)
      .order("name"),
    supabase
      .from("student_progress_records")
      .select("halaqa_id,progress_date,attendance_status")
      .gte("progress_date", sevenDaysAgo)
      .limit(10000),
    supabase
      .from("supervisor_visits")
      .select("circle_id,visit_date")
      .order("visit_date", { ascending: false })
      .limit(2000),
  ]);

  type RawHalaqa = { id: string; name: string; teacher_id: string; teachers: { id: string; full_name: string } | null };
  type RawProgress = { halaqa_id: string; progress_date: string; attendance_status: string };
  type RawVisit = { circle_id: string; visit_date: string };

  const halaqat = (halaqatResult.data ?? []) as unknown as RawHalaqa[];
  const progressRecords = (progressResult.data ?? []) as unknown as RawProgress[];
  const visits = (visitsResult.data ?? []) as unknown as RawVisit[];

  const lastEntryByHalaqa = new Map<string, string>();
  const todayEntryCount = new Map<string, number>();
  const todayAbsentCount = new Map<string, number>();

  for (const rec of progressRecords) {
    const { halaqa_id, progress_date, attendance_status } = rec;
    const prev = lastEntryByHalaqa.get(halaqa_id);
    if (!prev || progress_date > prev) lastEntryByHalaqa.set(halaqa_id, progress_date);
    if (progress_date === today) {
      todayEntryCount.set(halaqa_id, (todayEntryCount.get(halaqa_id) ?? 0) + 1);
      if (attendance_status === "absent") {
        todayAbsentCount.set(halaqa_id, (todayAbsentCount.get(halaqa_id) ?? 0) + 1);
      }
    }
  }

  const lastVisitByHalaqa = new Map<string, string>();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  for (const visit of visits) {
    if (!lastVisitByHalaqa.has(visit.circle_id)) {
      lastVisitByHalaqa.set(visit.circle_id, visit.visit_date);
    }
  }

  function computeStatus(id: string): CircleStatus {
    const lastEntry = lastEntryByHalaqa.get(id);
    if (!lastEntry) return "no-data";
    const daysSince = Math.floor((Date.now() - new Date(lastEntry).getTime()) / 86400000);
    if (daysSince >= 7) return "late";
    const lastVisit = lastVisitByHalaqa.get(id);
    const hasRecentVisit = !!lastVisit && lastVisit >= thirtyDaysAgo;
    if (todayEntryCount.has(id) && hasRecentVisit) return "excellent";
    return "needs-followup";
  }

  let rows: DailyMonitorRow[] = halaqat.map((h) => ({
    id: h.id,
    name: h.name,
    teacherName: h.teachers?.full_name ?? "غير محدد",
    teacherId: h.teacher_id,
    lastEntry: lastEntryByHalaqa.get(h.id) ?? null,
    todayEntry: todayEntryCount.has(h.id),
    todayAttendance: todayEntryCount.get(h.id) ?? null,
    lastVisit: lastVisitByHalaqa.get(h.id) ?? null,
    status: computeStatus(h.id),
  }));

  rows.sort((a, b) => STATUS_SORT[a.status] - STATUS_SORT[b.status]);

  if (filters?.circleId) rows = rows.filter((r) => r.id === filters.circleId);
  if (filters?.teacherId) rows = rows.filter((r) => r.teacherId === filters.teacherId);
  if (filters?.status) rows = rows.filter((r) => r.status === filters.status);

  const absentTotal = [...todayAbsentCount.values()].reduce((a, b) => a + b, 0);

  const summary: DailyMonitorSummary = {
    activeCount: halaqat.length,
    registeredToday: rows.filter((r) => r.todayEntry).length,
    notRegisteredToday: rows.filter((r) => !r.todayEntry).length,
    lateTeachers: rows.filter((r) => r.status === "late").length,
    absentStudentsToday: absentTotal,
    needsVisit: halaqat.filter((h) => {
      const last = lastVisitByHalaqa.get(h.id);
      return !last || last < thirtyDaysAgo;
    }).length,
  };

  const teacherOptions = halaqat
    .filter((h) => h.teachers)
    .map((h) => ({ id: h.teacher_id, name: h.teachers!.full_name }))
    .filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i)
    .sort((a, b) => a.name.localeCompare(b.name, "ar"));

  const circleOptions = halaqat.map((h) => ({ id: h.id, name: h.name }));

  return { today, summary, rows, teacherOptions, circleOptions };
}

export function statusLabel(s: CircleStatus) {
  return { excellent: "ممتازة", "needs-followup": "تحتاج متابعة", late: "متأخرة", "no-data": "بدون بيانات" }[s];
}

export function formatShortDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("ar-SA", { day: "numeric", month: "short" });
}
