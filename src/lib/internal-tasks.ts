import type { AppRole } from "@/lib/roles";
import { getCurrentUserRoles, requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const taskPriorityLabels: Record<string, string> = { urgent: "عاجلة", important: "مهمة", normal: "عادية" };
export const taskStatusLabels: Record<string, string> = {
  new: "جديدة",
  in_progress: "قيد العمل",
  completed: "تم الإنجاز",
  not_completed: "لم يتم الإنجاز",
  cancelled: "ملغاة",
};
export const taskRoleLabels: Record<string, string> = {
  teacher: "المعلمون",
  supervisor: "المشرفون",
  executive_director: "المدير التنفيذي",
  media_officer: "الإعلاميون",
  hr: "الموظفون",
};

export type InternalTask = {
  id: string;
  title: string;
  description: string;
  targetType: string;
  assignedUserId: string;
  assigneeName: string;
  targetRole: string;
  priority: string;
  status: string;
  dueDate: string;
  linkedUrl: string;
  executorNote: string;
  adminNote: string;
  creatorName: string;
  completedAt: string;
  createdAt: string;
  updatedAt: string;
  groupId: string;
  temporaryAssigneeName: string;
  overdue: boolean;
};

export type TaskPerson = { userId: string; name: string; email: string; roles: AppRole[] };

type Row = Record<string, unknown>;

export async function getTaskWorkspaceData(filters: { status?: string; priority?: string; q?: string; tab?: string; assignee?: string; due?: string } = {}) {
  const user = await requireAuth();
  const roles = await getCurrentUserRoles(user);
  const isAdmin = roles.includes("admin") || roles.includes("demo_admin");
  const canSeeAll = isAdmin;
  const supabase = await createClient();

  let query = supabase
    .from("tasks")
    .select("id,title,description,target_type,assigned_user_id,target_role,priority,status,due_date,linked_url,executor_note,admin_note,created_by,completed_at,created_at,updated_at,group_id,temporary_assignee_name")
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(300);

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.priority) query = query.eq("priority", filters.priority);
  if (filters.q) query = query.ilike("title", `%${filters.q}%`);
  if (filters.assignee) query = query.eq("assigned_user_id", filters.assignee);
  if (filters.due) query = query.eq("due_date", filters.due);
  if (filters.tab === "completed") query = query.eq("status", "completed");
  if (filters.tab === "not_completed") query = query.eq("status", "not_completed");

  const { data, error } = await query;
  const rows = (data ?? []) as Row[];
  const userIds = Array.from(new Set(rows.flatMap((row) => [text(row.assigned_user_id), text(row.created_by)]).filter(Boolean)));
  const names = await getProfileNames(supabase, userIds);
  const today = new Date().toISOString().slice(0, 10);
  let tasks = rows.map((row) => ({
    id: text(row.id),
    title: text(row.title),
    description: text(row.description),
    targetType: text(row.target_type),
    assignedUserId: text(row.assigned_user_id),
    assigneeName: names.get(text(row.assigned_user_id)) ?? "",
    targetRole: text(row.target_role),
    priority: text(row.priority) || "normal",
    status: text(row.status) || "new",
    dueDate: text(row.due_date),
    linkedUrl: text(row.linked_url),
    executorNote: text(row.executor_note),
    adminNote: text(row.admin_note),
    creatorName: names.get(text(row.created_by)) ?? "الإدارة",
    completedAt: text(row.completed_at),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
    groupId: text(row.group_id),
    temporaryAssigneeName: text(row.temporary_assignee_name),
    overdue: Boolean(row.due_date && text(row.due_date) < today && !["completed", "cancelled"].includes(text(row.status))),
  })) satisfies InternalTask[];

  if (filters.tab === "overdue") tasks = tasks.filter((task) => task.overdue);
  if (filters.tab === "mine") tasks = tasks.filter((task) => task.assignedUserId === user.id || roles.includes(task.targetRole as AppRole));

  return {
    userId: user.id,
    roles,
    isAdmin,
    canSeeAll,
    tasks,
    error: error?.message ?? "",
    summary: {
      newCount: tasks.filter((task) => task.status === "new").length,
      inProgressCount: tasks.filter((task) => task.status === "in_progress").length,
      completedCount: tasks.filter((task) => task.status === "completed").length,
      overdueCount: tasks.filter((task) => task.overdue).length,
    },
  };
}

export async function getTaskOperationsSummary() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase.from("tasks").select("id,status,due_date,completed_at").is("archived_at", null).limit(1000);
  const rows = data ?? [];
  return {
    newCount: rows.filter((row) => row.status === "new").length,
    overdueCount: rows.filter((row) => row.due_date && row.due_date < today && !["completed", "cancelled"].includes(row.status)).length,
    completedTodayCount: rows.filter((row) => String(row.completed_at ?? "").startsWith(today)).length,
    notCompletedCount: rows.filter((row) => row.status === "not_completed").length,
  };
}

export async function getTaskPeople(): Promise<TaskPerson[]> {
  const supabase = await createClient();
  const [profilesResult, rolesResult] = await Promise.all([
    supabase.from("profiles").select("user_id,full_name,email,status").eq("status", "active").order("full_name").limit(500),
    supabase.from("user_roles").select("user_id,roles(name)").limit(1000),
  ]);
  const rolesByUser = new Map<string, AppRole[]>();
  for (const row of (rolesResult.data ?? []) as unknown as Row[]) {
    const role = text(objectValue(row.roles).name) as AppRole;
    if (role) rolesByUser.set(text(row.user_id), [...(rolesByUser.get(text(row.user_id)) ?? []), role]);
  }
  return ((profilesResult.data ?? []) as Row[])
    .map((row) => ({
      userId: text(row.user_id),
      name: text(row.full_name) || text(row.email),
      email: text(row.email),
      roles: rolesByUser.get(text(row.user_id)) ?? [],
    }))
    .filter((person) => person.email !== "qa@example.com");
}

export function taskPortalPath(roles: string[]) {
  if (roles.includes("teacher")) return "/teacher/tasks";
  if (roles.includes("supervisor")) return "/supervisor/tasks";
  if (roles.includes("media_officer")) return "/media/tasks";
  if (roles.includes("executive_director") || roles.includes("executive_manager")) return "/executive/tasks";
  return "/dashboard/tasks";
}

async function getProfileNames(supabase: Awaited<ReturnType<typeof createClient>>, ids: string[]) {
  if (!ids.length) return new Map<string, string>();
  const { data } = await supabase.from("profiles").select("user_id,full_name,email").in("user_id", ids);
  return new Map((data ?? []).map((row) => [String(row.user_id), String(row.full_name || row.email || "مستخدم")]));
}
function text(value: unknown) { return typeof value === "string" || typeof value === "number" ? String(value) : ""; }
function objectValue(value: unknown): Row {
  if (Array.isArray(value)) return objectValue(value[0]);
  return value && typeof value === "object" ? value as Row : {};
}
