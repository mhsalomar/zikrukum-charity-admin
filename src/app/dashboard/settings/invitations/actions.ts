"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth";
import { ensureUserProfileAndRole } from "@/lib/invited-user-sync";
import { queryTimeoutSignal, recordAuditEvent } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseUrl } from "@/lib/supabase/env";

const RECENT_INVITE_MINUTES = 10;
const MAX_BULK = 50;
const emailSchema = z.string().trim().toLowerCase().email().max(254);
const uuidSchema = z.string().uuid();
const QA_EMAIL = "qa@example.com";

type OnboardingRow = {
  id: string;
  email: string | null;
  auth_status: string | null;
  invited_at: string | null;
};

function getServiceRoleKey() {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) {
    return null;
  }
  return value;
}

function getInviteRedirectUrl() {
  const configuredUrl = process.env.APP_URL?.trim();
  if (configuredUrl) {
    try {
      return new URL("/login", configuredUrl).toString();
    } catch {
      return null;
    }
  }

  return process.env.NODE_ENV === "production" ? null : "http://localhost:3000/login";
}

function invitedRecently(invitedAt: string | null) {
  if (!invitedAt) return false;
  const sentMs = new Date(invitedAt).getTime();
  if (Number.isNaN(sentMs)) return false;
  return Date.now() - sentMs < RECENT_INVITE_MINUTES * 60 * 1000;
}

function isActiveAccount(authStatus: string | null) {
  return authStatus === "linked";
}

function translateInviteError(detail: string, status: number) {
  const normalized = detail.toLowerCase();
  if (normalized.includes("already been registered") || normalized.includes("already registered")) {
    return "يوجد حساب مسجل مسبقًا بهذا البريد";
  }
  if (normalized.includes("invalid email")) {
    return "البريد الإلكتروني غير صالح";
  }
  if (normalized.includes("email rate limit") || status === 429) {
    return "تم تجاوز حد الإرسال، حاول لاحقًا";
  }
  if (normalized.includes("smtp") || normalized.includes("email provider")) {
    return "تعذر إرسال البريد من مزود الرسائل";
  }
  return detail ? "تعذر إرسال الدعوة. راجع إعدادات البريد أو حالة الحساب." : `فشل الإرسال (${status})`;
}

/**
 * Calls the Supabase admin invite endpoint. Server-only: uses the service_role key.
 * Returns true on success, otherwise an error label (no secrets, no invite links).
 */
async function callInviteApi(email: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const url = `${getSupabaseUrl()}/auth/v1/invite`;
  const key = getServiceRoleKey();
  const redirectTo = getInviteRedirectUrl();
  if (!key) {
    console.error("[invitations] missing server invite key");
    return { ok: false, error: "إعداد إرسال الدعوات غير مكتمل على الخادم" };
  }
  if (!redirectTo) {
    console.error("[invitations] missing or invalid APP_URL");
    return { ok: false, error: "رابط إعادة توجيه الدعوات غير مكتمل على الخادم" };
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        data: { invited_via: "admin_invitations" },
        redirect_to: redirectTo,
      }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    console.error("[invitations] invite request failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return { ok: false, error: "تعذّر الاتصال بخدمة الدعوات" };
  }

  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as { msg?: string; error_description?: string };
      detail = body.msg ?? body.error_description ?? "";
    } catch {
      // ignore body parse errors
    }
    console.error("[invitations] invite rejected", { status: response.status, detail });

    return { ok: false, error: translateInviteError(detail, response.status) };
  }

  return { ok: true };
}

async function getAuthUserByEmail(email: string) {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) {
      console.error("[invitations] failed to inspect auth user", { message: error.message });
      return null;
    }

    return data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) ?? null;
  } catch (error) {
    console.error("[invitations] auth inspection unavailable", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

async function markInvited(requestId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("user_onboarding_requests")
    .update({ invited_at: new Date().toISOString() })
    .eq("id", requestId);

  if (error) {
    console.error("[invitations] failed to update invited_at", { message: error.message });
  }
}

export async function sendInviteAction(
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  await requireRole("admin");

  const parsedId = uuidSchema.safeParse(userId);
  if (!parsedId.success) {
    return { success: false, error: "معرّف غير صالح" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_onboarding_requests")
    .select("id,email,auth_status,invited_at")
    .eq("id", parsedId.data)
    .abortSignal(queryTimeoutSignal())
    .maybeSingle<OnboardingRow>();

  if (error || !data) {
    return { success: false, error: "تعذّر العثور على السجل" };
  }

  const email = data.email?.trim();
  if (!email) {
    return { success: false, error: "لا يوجد بريد إلكتروني" };
  }
  if (email.toLowerCase() === QA_EMAIL) {
    return { success: false, error: "حساب التجربة داخلي ولا تُرسل له دعوات" };
  }
  if (isActiveAccount(data.auth_status)) {
    return { success: false, error: "الحساب مفعّل بالفعل" };
  }
  const authUser = await getAuthUserByEmail(email);
  if (authUser?.email_confirmed_at) {
    return { success: false, error: "الحساب مفعّل بالفعل" };
  }
  if (authUser && !authUser.email_confirmed_at && invitedRecently(data.invited_at)) {
    return { success: false, error: "توجد دعوة مرسلة لهذا البريد، انتظر قليلًا قبل إعادة الإرسال" };
  }
  if (invitedRecently(data.invited_at)) {
    return { success: false, error: "تم إرسال دعوة خلال آخر 10 دقائق" };
  }

  const result = await callInviteApi(email);
  if (!result.ok) {
    return { success: false, error: result.error };
  }

  await markInvited(data.id);
  await recordAuditEvent({
    action: "invite_sent",
    tableName: "user_onboarding_requests",
    recordId: data.id,
    metadata: { target_email: email.toLowerCase() },
  });
  return { success: true };
}

export async function sendTestInviteAction(
  email: string,
): Promise<{ success: boolean; error?: string }> {
  await requireRole("admin");

  const parsedEmail = emailSchema.safeParse(email);
  if (!parsedEmail.success) {
    return { success: false, error: "بريد إلكتروني غير صالح" };
  }
  const target = parsedEmail.data;
  if (target === QA_EMAIL) {
    return { success: false, error: "حساب التجربة داخلي ولا تُرسل له دعوات" };
  }

  const authUser = await getAuthUserByEmail(target);
  if (authUser?.email_confirmed_at) {
    return { success: false, error: "الحساب مفعّل بالفعل" };
  }
  if (authUser && !authUser.email_confirmed_at) {
    return { success: false, error: "توجد دعوة غير مكتملة لهذا البريد. احذف الحساب التجريبي أو استخدم رابط الدعوة الأخير." };
  }

  const result = await callInviteApi(target);
  if (!result.ok) {
    return { success: false, error: result.error };
  }
  await recordAuditEvent({
    action: "test_invite_sent",
    tableName: "auth.users",
    metadata: { target_email: target },
  });
  return { success: true };
}

export async function sendBulkInvitesAction(
  userIds: string[],
): Promise<{ sent: number; skipped: number; errors: string[] }> {
  await requireRole("admin");

  const ids = Array.from(
    new Set((userIds ?? []).filter((id) => uuidSchema.safeParse(id).success)),
  ).slice(0, MAX_BULK);
  if (ids.length === 0) {
    return { sent: 0, skipped: 0, errors: [] };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_onboarding_requests")
    .select("id,email,auth_status,invited_at")
    .abortSignal(queryTimeoutSignal())
    .in("id", ids);

  if (error) {
    console.error("[invitations] bulk fetch failed", { message: error.message });
    return { sent: 0, skipped: 0, errors: ["تعذّر تحميل السجلات"] };
  }

  const rows = (data ?? []) as OnboardingRow[];
  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const email = row.email?.trim();
    if (!email || email.toLowerCase() === QA_EMAIL || isActiveAccount(row.auth_status) || invitedRecently(row.invited_at)) {
      skipped += 1;
      continue;
    }

    const result = await callInviteApi(email);
    if (!result.ok) {
      errors.push(`${email}: ${result.error}`);
      continue;
    }

    await markInvited(row.id);
    sent += 1;
  }

  await recordAuditEvent({
    action: "bulk_invites_sent",
    tableName: "user_onboarding_requests",
    metadata: { sent, skipped, requested: ids.length },
  });
  return { sent, skipped, errors };
}

export async function relinkInvitedUserAction(
  requestId: string,
): Promise<{ success: boolean; error?: string }> {
  await requireRole("admin");

  const parsedId = uuidSchema.safeParse(requestId);
  if (!parsedId.success) {
    return { success: false, error: "معرّف غير صالح" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_onboarding_requests")
    .select("id,email")
    .eq("id", parsedId.data)
    .abortSignal(queryTimeoutSignal())
    .maybeSingle<{ id: string; email: string | null }>();

  if (error || !data) {
    return { success: false, error: "تعذّر العثور على السجل" };
  }

  const email = data.email?.trim().toLowerCase();
  if (!email) {
    return { success: false, error: "لا يوجد بريد إلكتروني لهذا السجل" };
  }

  const authUser = await getAuthUserByEmail(email);
  if (!authUser) {
    return { success: false, error: "لا يوجد حساب دخول لهذا البريد. أرسل دعوة أولًا." };
  }

  const sync = await ensureUserProfileAndRole(authUser);
  if (!sync.success) {
    return { success: false, error: sync.error };
  }

  revalidatePath("/dashboard/settings/invitations");
  revalidatePath("/dashboard/users");
  revalidatePath("/dashboard/operations");
  await recordAuditEvent({
    action: "invited_user_relinked",
    tableName: "user_onboarding_requests",
    recordId: data.id,
    metadata: { target_email: email },
  });
  return { success: true };
}
