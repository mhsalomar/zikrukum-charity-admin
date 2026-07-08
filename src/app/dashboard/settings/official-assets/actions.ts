"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const bucket = "official-assets";
const maxFileSize = 5 * 1024 * 1024;

const assetConfig = {
  stamp: {
    label: "الختم الرسمي",
    path: "official/stamp-zikrukum.png",
  },
  signature: {
    label: "توقيع رئيس مجلس الإدارة",
    path: "official/signature-chairman.png",
  },
} as const;

type AssetKey = keyof typeof assetConfig;

export async function uploadOfficialAsset(formData: FormData) {
  await requireRole("admin");

  const asset = String(formData.get("asset") ?? "") as AssetKey;
  const file = formData.get("file");
  const config = assetConfig[asset];

  if (!config || !(file instanceof File) || file.size === 0) {
    redirect("/dashboard/settings/official-assets?error=missing");
  }

  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    redirect("/dashboard/settings/official-assets?error=type");
  }

  if (file.size > maxFileSize) {
    redirect("/dashboard/settings/official-assets?error=size");
  }

  const admin = createAdminClient();
  const { data: existingBucket, error: bucketError } = await admin.storage.getBucket(bucket);

  if (bucketError || !existingBucket || existingBucket.public !== false) {
    redirect("/dashboard/settings/official-assets?error=bucket");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await admin.storage
    .from(bucket)
    .upload(config.path, bytes, {
      contentType: file.type,
      upsert: true,
    });

  if (error) {
    redirect("/dashboard/settings/official-assets?error=upload");
  }

  revalidatePath("/dashboard/settings/official-assets");
  redirect(`/dashboard/settings/official-assets?updated=${asset}`);
}
