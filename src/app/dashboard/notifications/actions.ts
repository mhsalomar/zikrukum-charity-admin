"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAnyRole, requireAuth } from "@/lib/auth";
import { executiveRoles } from "@/lib/module-access";
import { cleanText, safeInternalPath } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";

export async function createNotification(formData: FormData) {
  const { user, roles } = await requireAnyRole([...executiveRoles, "supervisor"]);
  const supabase = await createClient();
  const title = text(formData, "title");
  const body = text(formData, "body");
  const targetType = text(formData, "target_type") || "role";
  const targetRole = text(formData, "target_role");
  const targetEmail = text(formData, "target_email");
  const linkUrl = safeInternalPath(nullableText(formData, "link_url"), "") || null;

  if (!title || !body) redirect("/dashboard/notifications/new?error=missing");

  const recipients = await resolveRecipients({ supabase, targetType, targetRole, targetEmail, senderRoles: roles });
  if (recipients.length === 0) redirect("/dashboard/notifications/new?error=no-recipients");

  const { data: notification, error } = await supabase
    .from("notifications")
    .insert({
      title,
      body,
      type: text(formData, "type") || "general",
      priority: text(formData, "priority") || "normal",
      target_type: targetType,
      target_role: targetRole || null,
      link_url: linkUrl,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !notification) redirect("/dashboard/notifications/new?error=save");

  const { error: recipientError } = await supabase
    .from("notification_recipients")
    .upsert(recipients.map((userId) => ({ notification_id: notification.id, user_id: userId })), {
      onConflict: "notification_id,user_id",
    });

  if (recipientError) redirect("/dashboard/notifications/new?error=recipients");

  revalidatePath("/dashboard/notifications");
  redirect("/dashboard/notifications?created=1");
}

export async function markNotificationRead(formData: FormData) {
  const user = await requireAuth();
  const recipientId = text(formData, "recipient_id");
  const returnTo = safeInternalPath(text(formData, "return_to"), "/dashboard/notifications");
  if (!recipientId) redirect(returnTo);

  const supabase = await createClient();
  await supabase
    .from("notification_recipients")
    .update({ read_at: new Date().toISOString() })
    .eq("id", recipientId)
    .eq("user_id", user.id);

  revalidatePath(returnTo);
  redirect(returnTo);
}

async function resolveRecipients({
  supabase,
  targetType,
  targetRole,
  targetEmail,
  senderRoles,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  targetType: string;
  targetRole: string;
  targetEmail: string;
  senderRoles: string[];
}) {
  const canSendBroad = senderRoles.some((role) => ["admin", "demo_admin", "executive_director", "executive_manager"].includes(role));

  if (targetType === "user") {
    const { data } = await supabase.from("profiles").select("user_id").eq("email", targetEmail).maybeSingle();
    return data?.user_id ? [data.user_id] : [];
  }

  if (targetType === "all_teachers") {
    return canSendBroad ? usersByRole(supabase, "teacher") : [];
  }

  if (targetType === "all_supervisors") {
    return canSendBroad ? usersByRole(supabase, "supervisor") : [];
  }

  if (targetType === "role" && targetRole) {
    if (!canSendBroad && targetRole !== "teacher") return [];
    return usersByRole(supabase, targetRole);
  }

  return [];
}

async function usersByRole(supabase: Awaited<ReturnType<typeof createClient>>, roleName: string) {
  const { data: role } = await supabase.from("roles").select("id").eq("name", roleName).maybeSingle();
  if (!role?.id) return [];
  const { data } = await supabase.from("user_roles").select("user_id").eq("role_id", role.id);
  return Array.from(new Set((data ?? []).map((row) => row.user_id).filter(Boolean)));
}

function text(formData: FormData, key: string) {
  return cleanText(formData.get(key), key === "body" ? 4000 : 500);
}

function nullableText(formData: FormData, key: string) {
  return text(formData, key) || null;
}
