import { notFound } from "next/navigation";

import { requireAnyRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const viewRoles = ["admin", "demo_admin", "executive_director", "executive_manager"] as const;
type Row = Record<string, unknown>;

export type TaskDistribution = {
  id: string;
  title: string;
  eventDate: string;
  programName: string;
  generalNotes: string;
  status: string;
  createdAt: string;
  taskCount: number;
  completedCount: number;
  notCompletedCount: number;
  overdueCount: number;
};

export type DistributionTask = {
  id: string;
  title: string;
  assigneeName: string;
  priority: string;
  status: string;
  dueDate: string;
  completedAt: string;
  executorNote: string;
  adminNote: string;
  overdue: boolean;
};

export async function getTaskDistributions() {
  await requireAnyRole([...viewRoles]);
  const supabase = await createClient();
  const { data } = await supabase.from("task_groups").select("id,title,event_date,program_name,general_notes,status,created_at").is("archived_at", null).order("event_date", { ascending: false }).order("created_at", { ascending: false }).limit(150);
  const groups = (data ?? []) as Row[];
  const ids = groups.map((row) => text(row.id));
  const { data: taskRows } = ids.length ? await supabase.from("tasks").select("id,group_id,status,due_date").in("group_id", ids).is("archived_at", null).limit(2000) : { data: [] };
  const today = new Date().toISOString().slice(0, 10);
  return groups.map((row) => {
    const tasks = (taskRows ?? []).filter((task) => task.group_id === row.id);
    return {
      id: text(row.id), title: text(row.title), eventDate: text(row.event_date), programName: text(row.program_name),
      generalNotes: text(row.general_notes), status: text(row.status), createdAt: text(row.created_at),
      taskCount: tasks.length,
      completedCount: tasks.filter((task) => task.status === "completed").length,
      notCompletedCount: tasks.filter((task) => task.status === "not_completed").length,
      overdueCount: tasks.filter((task) => task.due_date && task.due_date < today && !["completed", "cancelled"].includes(task.status)).length,
    } satisfies TaskDistribution;
  });
}

export async function getTaskDistribution(id: string) {
  await requireAnyRole([...viewRoles]);
  const supabase = await createClient();
  const { data: group } = await supabase.from("task_groups").select("id,title,event_date,program_name,general_notes,status,created_at").eq("id", id).is("archived_at", null).maybeSingle();
  if (!group) notFound();
  const { data: taskRows } = await supabase.from("tasks").select("id,title,assigned_user_id,temporary_assignee_name,priority,status,due_date,completed_at,executor_note,admin_note").eq("group_id", id).is("archived_at", null).order("created_at").limit(500);
  const userIds = Array.from(new Set((taskRows ?? []).map((row) => row.assigned_user_id).filter(Boolean)));
  const { data: profiles } = userIds.length ? await supabase.from("profiles").select("user_id,full_name,email").in("user_id", userIds) : { data: [] };
  const names = new Map((profiles ?? []).map((row) => [String(row.user_id), String(row.full_name || row.email || "مستخدم")]));
  const today = new Date().toISOString().slice(0, 10);
  const tasks = (taskRows ?? []).map((row) => ({
    id: String(row.id), title: row.title, assigneeName: names.get(String(row.assigned_user_id)) || row.temporary_assignee_name || "غير محدد",
    priority: row.priority, status: row.status, dueDate: row.due_date || "", completedAt: row.completed_at || "",
    executorNote: row.executor_note || "", adminNote: row.admin_note || "",
    overdue: Boolean(row.due_date && row.due_date < today && !["completed", "cancelled"].includes(row.status)),
  })) satisfies DistributionTask[];
  return { group: { ...group, eventDate: group.event_date || "", programName: group.program_name || "", generalNotes: group.general_notes || "" }, tasks };
}

function text(value: unknown) { return typeof value === "string" || typeof value === "number" ? String(value) : ""; }
