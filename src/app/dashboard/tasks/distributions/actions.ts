"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAnyRole } from "@/lib/auth";
import { cleanText, parseBoundedJsonArray } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";

type InputRow = { assignedUserId?: string; temporaryName?: string; title?: string; priority?: string; dueDate?: string; note?: string };
const distributionRowSchema = z.object({
  assignedUserId: z.string().uuid().optional().or(z.literal("")),
  temporaryName: z.string().trim().max(150).optional(),
  title: z.string().trim().max(300).optional(),
  priority: z.enum(["urgent", "important", "normal"]).optional(),
  dueDate: z.string().date().optional().or(z.literal("")),
  note: z.string().trim().max(1000).optional(),
}).strip();

export async function createTaskDistributionAction(formData: FormData) {
  const { user } = await requireAnyRole(["admin", "demo_admin"]);
  const title = value(formData, "title");
  const parsedRows = parseBoundedJsonArray(value(formData, "rows"), distributionRowSchema, 100);
  if (!parsedRows?.success) redirect("/dashboard/tasks/distributions/new?error=rows");
  let rows: InputRow[] = parsedRows.data;
  rows = rows.filter((row) => row.title?.trim() && (row.assignedUserId || row.temporaryName?.trim())).slice(0, 100);
  if (!title || rows.length === 0) redirect("/dashboard/tasks/distributions/new?error=missing");

  const supabase = await createClient();
  const { data: group, error } = await supabase.from("task_groups").insert({
    title, event_date: nullable(formData, "event_date"), program_name: nullable(formData, "program_name"),
    general_notes: nullable(formData, "general_notes"), created_by: user.id,
  }).select("id").single();
  if (error || !group) redirect("/dashboard/tasks/distributions/new?error=save");

  const tasks = rows.map((row) => ({
    group_id: group.id, title: row.title!.trim(), description: row.note?.trim() || null,
    target_type: "user", assigned_user_id: row.assignedUserId || null,
    temporary_assignee_name: row.assignedUserId ? null : row.temporaryName?.trim() || null,
    priority: ["urgent", "important", "normal"].includes(row.priority || "") ? row.priority : "normal",
    status: "new", due_date: row.dueDate || null, created_by: user.id,
  }));
  const { error: taskError } = await supabase.from("tasks").insert(tasks);
  if (taskError) redirect(`/dashboard/tasks/distributions/${group.id}?error=tasks`);
  await notifyAssignees(supabase, user.id, title, rows);
  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard/tasks/distributions");
  redirect(`/dashboard/tasks/distributions/${group.id}?created=1`);
}

export async function closeTaskDistributionAction(formData: FormData) {
  await requireAnyRole(["admin", "demo_admin"]);
  const id = value(formData, "group_id");
  const supabase = await createClient();
  await supabase.from("task_groups").update({ status: "closed", closed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id);
  revalidatePath(`/dashboard/tasks/distributions/${id}`);
  redirect(`/dashboard/tasks/distributions/${id}?closed=1`);
}

async function notifyAssignees(supabase: Awaited<ReturnType<typeof createClient>>, createdBy: string, groupTitle: string, rows: InputRow[]) {
  for (const row of rows.filter((item) => item.assignedUserId)) {
    const { data: notification } = await supabase.from("notifications").insert({
      title: `مهمة جديدة ضمن: ${groupTitle}`, body: row.title, type: "task", priority: row.priority === "urgent" ? "urgent" : "normal",
      target_type: "user", link_url: "/tasks", created_by: createdBy,
    }).select("id").single();
    if (notification) await supabase.from("notification_recipients").insert({ notification_id: notification.id, user_id: row.assignedUserId });
  }
}
function value(formData: FormData, key: string) { return cleanText(formData.get(key), key === "rows" ? 100_000 : 1000); }
function nullable(formData: FormData, key: string) { return value(formData, key) || null; }
