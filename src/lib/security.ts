import "server-only";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const DEFAULT_QUERY_TIMEOUT_MS = 8_000;

export function queryTimeoutSignal(timeoutMs = DEFAULT_QUERY_TIMEOUT_MS) {
  return AbortSignal.timeout(timeoutMs);
}

export function cleanText(value: unknown, maxLength = 500) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

export function formText(formData: FormData, key: string, maxLength = 500) {
  return cleanText(formData.get(key), maxLength);
}

export function nullableFormText(
  formData: FormData,
  key: string,
  maxLength = 500,
) {
  return formText(formData, key, maxLength) || null;
}

export const uuidSchema = z.string().uuid();

export function safeInternalPath(value: unknown, fallback = "/dashboard") {
  const path = cleanText(value, 1000);
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) {
    return fallback;
  }
  return path;
}

export function finiteNumber(
  value: unknown,
  { min = -1_000_000_000, max = 1_000_000_000 } = {},
) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(max, Math.max(min, parsed));
}

export function parseBoundedJsonArray<T>(
  value: string,
  rowSchema: z.ZodType<T>,
  maxRows: number,
) {
  if (!value || value.length > 2_000_000) return null;

  try {
    return z.array(rowSchema).max(maxRows).safeParse(JSON.parse(value));
  } catch {
    return null;
  }
}

export async function recordAuditEvent({
  action,
  tableName,
  recordId,
  metadata = {},
}: {
  action: string;
  tableName: string;
  recordId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { error } = await supabase.from("audit_logs").insert({
    actor_user_id: user.id,
    action: cleanText(action, 100),
    table_name: cleanText(tableName, 100),
    record_id: recordId || null,
    metadata,
  });

  if (error) {
    console.error("[audit] failed", { action, tableName, message: error.message });
  }
}
