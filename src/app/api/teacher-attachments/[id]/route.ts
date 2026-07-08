import { NextResponse } from "next/server";

import { requireAnyRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const attachmentRoles = [
  "admin",
  "demo_admin",
  "executive_director",
  "executive_manager",
  "halaqat_manager",
] as const;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAnyRole([...attachmentRoles]);
  const { id } = await params;
  const admin = createAdminClient();
  const { data: attachment } = await admin
    .from("teacher_attachments")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();

  if (!attachment?.storage_path) {
    return NextResponse.json({ message: "المرفق غير موجود." }, { status: 404 });
  }

  const { data, error } = await admin.storage
    .from("teacher-attachments")
    .createSignedUrl(String(attachment.storage_path), 60);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ message: "تعذر فتح المرفق." }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
