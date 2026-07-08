"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAnyRole } from "@/lib/auth";
import { launchConfigs } from "@/lib/launch-core";
import { cleanText, safeInternalPath } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";

export async function createLaunchRecord(formData: FormData) {
  const key = cleanText(formData.get("config"), 100);
  const returnTo = safeInternalPath(formData.get("returnTo"), "");
  const config = key in launchConfigs ? launchConfigs[key as keyof typeof launchConfigs] : null;

  if (!config || !returnTo.startsWith("/")) redirect("/dashboard?error=invalid-module");
  const { user } = await requireAnyRole(config.allowedRoles);

  const payload: Record<string, string | number | null> = {};

  for (const field of config.fields) {
    const raw = cleanText(formData.get(field.name), 2000);
    if (field.required && !raw) redirect(`${returnTo}?error=missing`);
    if (!raw) continue;
    payload[field.name] = field.type === "number" ? Number(raw) || 0 : raw;
  }

  if (config.table !== "donors") {
    payload.created_by = user.id;
  }

  const supabase = await createClient();
  const { error } = await supabase.from(config.table).insert(payload);
  if (error) redirect(`${returnTo}?error=save`);

  revalidatePath(returnTo);
  redirect(`${returnTo}?created=1`);
}
