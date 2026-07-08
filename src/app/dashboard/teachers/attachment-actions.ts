"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAnyRole } from "@/lib/auth";
import { cleanText } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";

const attachmentRoles = [
  "admin",
  "demo_admin",
  "executive_director",
  "executive_manager",
  "halaqat_manager",
] as const;

const categories = new Set([
  "identity",
  "contract",
  "qualification",
  "iban_certificate",
  "training",
  "other",
]);

const allowedTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export async function uploadTeacherAttachment(formData: FormData) {
  const { user } = await requireAnyRole([...attachmentRoles]);
  const teacherId = cleanText(formData.get("teacher_id"), 100);
  const category = cleanText(formData.get("category"), 100);
  const notes = cleanText(formData.get("notes"), 1000);
  const file = formData.get("file");

  if (!teacherId || !categories.has(category) || !(file instanceof File) || file.size === 0) {
    redirect(`/dashboard/teachers/${teacherId || ""}?attachment_error=missing`);
  }
  if (file.size > 10 * 1024 * 1024 || !allowedTypes.has(file.type)) {
    redirect(`/dashboard/teachers/${teacherId}?attachment_error=invalid`);
  }

  const admin = createAdminClient();
  const safeName = sanitizeFileName(file.name);
  const storagePath = `${teacherId}/${randomUUID()}-${safeName}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await admin.storage
    .from("teacher-attachments")
    .upload(storagePath, bytes, { contentType: file.type, upsert: false });

  if (uploadError) {
    redirect(`/dashboard/teachers/${teacherId}?attachment_error=upload`);
  }

  const { error: metadataError } = await admin.from("teacher_attachments").insert({
    teacher_id: teacherId,
    category,
    file_name: safeName,
    storage_path: storagePath,
    mime_type: file.type,
    file_size: file.size,
    notes: notes || null,
    uploaded_by: user.id,
  });

  if (metadataError) {
    await admin.storage.from("teacher-attachments").remove([storagePath]);
    redirect(`/dashboard/teachers/${teacherId}?attachment_error=save`);
  }

  revalidatePath(`/dashboard/teachers/${teacherId}`);
  redirect(`/dashboard/teachers/${teacherId}?attachment_uploaded=1`);
}

function sanitizeFileName(value: string) {
  const cleaned = value
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}._-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned.slice(-120) || "document";
}
