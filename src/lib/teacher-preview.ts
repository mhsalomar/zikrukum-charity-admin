import { cookies } from "next/headers";

import type { AppRole } from "@/lib/roles";

export const TEACHER_PREVIEW_COOKIE = "zikrukum_teacher_preview";
export const QA_ACCOUNT_EMAIL = "qa@example.com";

export function canUseTeacherPreview(roles: string[]) {
  return roles.includes("admin") || roles.includes("demo_admin");
}

export function isQaAccount(email?: string | null) {
  return email?.toLowerCase() === QA_ACCOUNT_EMAIL;
}

export function previewActorName(email: string | null | undefined, roles: AppRole[]) {
  if (isQaAccount(email) || roles.includes("demo_admin")) return "حساب تجربة QA";
  return "الإدارة";
}

export async function readTeacherPreviewId(roles: string[]) {
  if (!canUseTeacherPreview(roles)) return null;
  const value = (await cookies()).get(TEACHER_PREVIEW_COOKIE)?.value ?? "";
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

