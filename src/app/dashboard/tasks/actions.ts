"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUserRoles, requireAnyRole, requireAuth } from "@/lib/auth";
import { taskPortalPath } from "@/lib/internal-tasks";
import { cleanText, safeInternalPath } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";

export async function createTaskAction(formData: FormData) {
  const { user } = await requireAnyRole(["admin", "demo_admin"]);
  const title = value(formData, "title");
  const targetType = value(formData, "target_type");
  const assignedUserId = value(formData, "assigned_user_id");
  const targetRole = value(formData, "target_role");
  const priority = value(formData, "priority") || "normal";
  if (!title || !["user", "role"].includes(targetType) || !["urgent", "important", "normal"].includes(priority)) redirect("/dashboard/tasks?error=missing");
  if (targetType === "user" ? !assignedUserId : !allowedTargetRoles.includes(targetRole)) redirect("/dashboard/tasks?error=missing");

  const supabase = await createClient();
  const { data: task, error } = await supabase.from("tasks").insert({
    title,
    description: nullable(formData, "description"),
    target_type: targetType,
    assigned_user_id: targetType === "user" ? assignedUserId : null,
    target_role: targetType === "role" ? targetRole : null,
    priority,
    status: "new",
    due_date: nullable(formData, "due_date"),
    linked_url: safeInternalUrl(value(formData, "linked_url")),
    admin_note: nullable(formData, "admin_note"),
    created_by: user.id,
  }).select("id").single();

  if (error || !task) redirect("/dashboard/tasks?error=save");
  await createTaskNotification(supabase, user.id, title, targetType, assignedUserId, targetRole, priority);
  revalidateTaskPaths();
  redirect("/dashboard/tasks?created=1");
}

export async function updateOwnTaskAction(formData: FormData) {
  const user = await requireAuth();
  const roles = await getCurrentUserRoles(user);
  const taskId = value(formData, "task_id");
  const status = value(formData, "status");
  const note = value(formData, "executor_note");
  if (!["in_progress", "completed", "not_completed"].includes(status)) redirect(taskPortalPath(roles));
  if (["completed", "not_completed"].includes(status) && !note) redirect(`${taskPortalPath(roles)}?error=note-required`);

  const payload: Record<string, unknown> = {
    status,
    executor_note: note || null,
    updated_at: new Date().toISOString(),
    completed_by: status === "completed" ? user.id : null,
    completed_at: status === "completed" ? new Date().toISOString() : null,
  };
  const supabase = await createClient();
  const { data, error } = await supabase.from("tasks").update(payload).eq("id", taskId).select("id").maybeSingle();
  if (error || !data) redirect(`${taskPortalPath(roles)}?error=save`);
  revalidateTaskPaths();
  redirect(`${taskPortalPath(roles)}?updated=1`);
}

export async function updateAdminTaskAction(formData: FormData) {
  await requireAnyRole(["admin", "demo_admin"]);
  const taskId = value(formData, "task_id");
  const status = value(formData, "status");
  if (!taskId || !allowedAdminStatuses.includes(status)) redirect("/dashboard/tasks?error=save");
  const payload: Record<string, unknown> = {
    title: value(formData, "title"),
    description: nullable(formData, "description"),
    priority: value(formData, "priority") || "normal",
    due_date: nullable(formData, "due_date"),
    linked_url: safeInternalUrl(value(formData, "linked_url")),
    admin_note: nullable(formData, "admin_note"),
    status,
    updated_at: new Date().toISOString(),
  };
  const assignedUserId = value(formData, "assigned_user_id");
  if (assignedUserId) {
    payload.assigned_user_id = assignedUserId;
    payload.target_type = "user";
    payload.target_role = null;
    payload.temporary_assignee_name = null;
  }
  if (status === "cancelled") payload.cancelled_at = new Date().toISOString();
  if (status === "completed" && !value(formData, "completed_at")) payload.completed_at = new Date().toISOString();
  const supabase = await createClient();
  const { data, error } = await supabase.from("tasks").update(payload).eq("id", taskId).select("id").maybeSingle();
  if (error || !data) redirect("/dashboard/tasks?error=save");
  revalidateTaskPaths();
  redirect("/dashboard/tasks?updated=1");
}

export async function archiveTaskAction(formData: FormData) {
  await requireAnyRole(["admin", "demo_admin"]);
  const supabase = await createClient();
  const { data, error } = await supabase.from("tasks").update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", value(formData, "task_id")).select("id").maybeSingle();
  if (error || !data) redirect("/dashboard/tasks?error=archive");
  revalidateTaskPaths();
  redirect("/dashboard/tasks?archived=1");
}

async function createTaskNotification(
  supabase: Awaited<ReturnType<typeof createClient>>,
  createdBy: string,
  title: string,
  targetType: string,
  assignedUserId: string,
  targetRole: string,
  priority: string,
) {
  const recipients = targetType === "user" ? [assignedUserId] : await usersByRole(supabase, targetRole);
  if (!recipients.length) return;
  const { data: notification } = await supabase.from("notifications").insert({
    title: `مهمة جديدة: ${title}`,
    body: "أُسندت إليك مهمة داخلية جديدة. افتح المهمة للاطلاع وتحديث حالتها.",
    type: "task",
    priority: priority === "urgent" ? "urgent" : priority === "important" ? "important" : "normal",
    target_type: targetType,
    target_role: targetRole || null,
    link_url: "/tasks",
    created_by: createdBy,
  }).select("id").single();
  if (notification) {
    await supabase.from("notification_recipients").upsert(recipients.map((userId) => ({ notification_id: notification.id, user_id: userId })), { onConflict: "notification_id,user_id" });
  }
}

async function usersByRole(supabase: Awaited<ReturnType<typeof createClient>>, roleName: string) {
  const { data: role } = await supabase.from("roles").select("id").eq("name", roleName).maybeSingle();
  if (!role?.id) return [];
  const { data } = await supabase.from("user_roles").select("user_id").eq("role_id", role.id);
  return Array.from(new Set((data ?? []).map((row) => row.user_id).filter(Boolean)));
}
function revalidateTaskPaths() {
  [
    "/dashboard/tasks",
    "/dashboard/operations",
    "/teacher/tasks",
    "/teacher/dashboard",
    "/supervisor/tasks",
    "/supervisor/dashboard",
    "/executive/tasks",
    "/executive/dashboard",
    "/media/tasks",
    "/media/dashboard",
  ].forEach((path) => revalidatePath(path));
}
function safeInternalUrl(url: string) { return url ? safeInternalPath(url, "") || null : null; }
function value(formData: FormData, key: string) { return cleanText(formData.get(key), key.includes("note") || key === "description" ? 2000 : 500); }
function nullable(formData: FormData, key: string) { return value(formData, key) || null; }
const allowedTargetRoles = ["teacher", "supervisor", "executive_director", "media_officer", "hr"];
const allowedAdminStatuses = ["new", "in_progress", "completed", "not_completed", "cancelled"];
