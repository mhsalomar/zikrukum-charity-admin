"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { requireAnyRole } from "@/lib/auth";
import { cleanText } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";
import { TEACHER_PREVIEW_COOKIE } from "@/lib/teacher-preview";

export async function startTeacherPreviewAction(formData: FormData) {
  await requireAnyRole(["admin", "demo_admin"]);
  const teacherId = cleanText(formData.get("teacher_id"), 100);
  if (!teacherId) redirect("/dashboard/teacher-preview?error=missing");

  const supabase = await createClient();
  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("id", teacherId)
    .is("archived_at", null)
    .maybeSingle();
  if (!teacher) redirect("/dashboard/teacher-preview?error=not-found");

  (await cookies()).set(TEACHER_PREVIEW_COOKIE, teacherId, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 4,
  });
  redirect("/teacher/dashboard");
}

export async function clearTeacherPreviewAction() {
  await requireAnyRole(["admin", "demo_admin"]);
  (await cookies()).delete(TEACHER_PREVIEW_COOKIE);
  redirect("/dashboard/teacher-preview");
}

