"use server";

import { revalidatePath } from "next/cache";

import { requireAnyRole } from "@/lib/auth";
import { executiveRoles } from "@/lib/module-access";
import { cleanText } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";

const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function uploadMemberSignature(formData: FormData) {
  await requireAnyRole([...executiveRoles]);

  const memberId = cleanText(formData.get("member_id"), 100);
  const file = formData.get("file");

  if (!memberId || !(file instanceof File) || file.size === 0) {
    return { error: "بيانات غير مكتملة." };
  }
  if (file.size > 2 * 1024 * 1024 || !allowedTypes.has(file.type)) {
    return { error: "يرجى اختيار صورة PNG أو JPG بحجم أقل من 2 ميجابايت." };
  }

  const admin = createAdminClient();
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const storagePath = `${memberId}/signature.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  await admin.storage
    .from("signatures")
    .remove([
      `${memberId}/signature.png`,
      `${memberId}/signature.jpg`,
      `${memberId}/signature.webp`,
    ]);

  const { error: uploadError } = await admin.storage
    .from("signatures")
    .upload(storagePath, bytes, { contentType: file.type, upsert: true });

  if (uploadError) {
    return { error: "تعذّر رفع التوقيع." };
  }

  const signatureUrl = `/api/board-member-signatures/${memberId}`;

  const { error: updateError } = await admin
    .from("board_members")
    .update({ signature_url: signatureUrl })
    .eq("id", memberId);

  if (updateError) {
    return { error: "تعذّر حفظ رابط التوقيع." };
  }

  revalidatePath(`/dashboard/board/members/${memberId}`);
  revalidatePath(`/dashboard/board/meetings`);
  return { url: `${signatureUrl}?t=${Date.now()}` };
}

export async function removeMemberSignature(memberId: string) {
  await requireAnyRole([...executiveRoles]);

  const cleanId = cleanText(memberId, 100);
  if (!cleanId) {
    return { error: "بيانات غير مكتملة." };
  }

  const admin = createAdminClient();
  const { error: updateError } = await admin
    .from("board_members")
    .update({ signature_url: null })
    .eq("id", cleanId);

  if (updateError) {
    return { error: "تعذّر حذف التوقيع." };
  }

  revalidatePath(`/dashboard/board/members/${cleanId}`);
  revalidatePath(`/dashboard/board/meetings`);
  return { ok: true };
}
