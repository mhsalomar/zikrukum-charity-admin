"use server";

import { redirect } from "next/navigation";

import {
  operationalRoles,
  resourceConfigs,
} from "@/lib/operational-resources";
import { requireAnyRole } from "@/lib/auth";
import { cleanText } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";

type ResourceName = keyof typeof resourceConfigs;

export async function createOperationalRecord(formData: FormData) {
  const resourceName = cleanText(formData.get("resource"), 100) as ResourceName;
  const config = resourceConfigs[resourceName];

  if (!config) {
    redirect("/dashboard?error=invalid-resource");
  }

  await requireAnyRole([...operationalRoles]);

  const payload: Record<string, string | null> = {};

  for (const field of config.fields) {
    const value = cleanText(formData.get(field.name), 2000);

    if (field.required && !value) {
      redirect(`/dashboard/${config.name}?error=missing`);
    }

    if (value) {
      payload[field.name] = value;
    } else if (field.name === "status") {
      payload[field.name] = "active";
    } else if (field.kind === "select") {
      payload[field.name] = null;
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.from(config.table).insert(payload);

  if (error) {
    redirect(`/dashboard/${config.name}?error=save`);
  }

  redirect(`/dashboard/${config.name}?created=1`);
}

export async function updateOperationalRecord(formData: FormData) {
  const resourceName = cleanText(formData.get("resource"), 100) as ResourceName;
  const config = resourceConfigs[resourceName];
  const id = cleanText(formData.get("id"), 100);

  if (!config || !id) {
    redirect("/dashboard?error=invalid-resource");
  }

  await requireAnyRole([...operationalRoles]);

  const payload: Record<string, string | null> = {};

  for (const field of config.fields) {
    const value = cleanText(formData.get(field.name), 2000);

    if (field.required && !value) {
      redirect(`/dashboard/${config.name}?error=missing`);
    }

    if (value) {
      payload[field.name] = value;
    } else if (field.name === "status") {
      payload[field.name] = "active";
    } else if (field.kind === "select") {
      payload[field.name] = null;
    } else {
      payload[field.name] = null;
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.from(config.table).update(payload).eq("id", id);

  if (error) {
    redirect(`/dashboard/${config.name}?error=save`);
  }

  redirect(`/dashboard/${config.name}?updated=1`);
}

export async function updateStudentRecord(formData: FormData) {
  const id = cleanText(formData.get("id"), 100);
  const fullName = cleanText(formData.get("full_name"), 150);
  const halaqaId = cleanText(formData.get("halaqa_id"), 100);
  const status = cleanText(formData.get("status") ?? "active", 100) || "active";

  if (!id || !fullName) {
    redirect("/dashboard/students?error=missing");
  }

  await requireAnyRole([...operationalRoles]);

  const supabase = await createClient();
  const studentPayload = {
    full_name: fullName,
    national_id: normalizeNullable(formData.get("national_id")),
    birth_date: normalizeNullable(formData.get("birth_date")),
    guardian_name: normalizeNullable(formData.get("guardian_name")),
    guardian_phone: normalizeNullable(formData.get("guardian_phone")),
    level: normalizeNullable(formData.get("level")),
    enrolled_at: normalizeNullable(formData.get("enrolled_at")),
    notes: normalizeNullable(formData.get("notes")),
    status,
  };

  const { error: studentError } = await supabase
    .from("students")
    .update(studentPayload)
    .eq("id", id);

  if (studentError) {
    redirect("/dashboard/students?error=save");
  }

  if (halaqaId) {
    const now = new Date().toISOString();
    const { data: currentEnrollment, error: currentError } = await supabase
      .from("student_enrollments")
      .select("id,halaqa_id")
      .eq("student_id", id)
      .eq("status", "active")
      .is("archived_at", null)
      .limit(1)
      .maybeSingle();

    if (currentError) {
      redirect("/dashboard/students?error=save");
    }

    const currentHalaqaId =
      typeof currentEnrollment?.halaqa_id === "string"
        ? currentEnrollment.halaqa_id
        : "";

    if (currentHalaqaId !== halaqaId) {
      const currentEnrollmentId =
        typeof currentEnrollment?.id === "string" ? currentEnrollment.id : "";

      if (currentEnrollmentId) {
        const { error: archiveError } = await supabase
          .from("student_enrollments")
          .update({ status: "transferred", archived_at: now })
          .eq("id", currentEnrollmentId);

        if (archiveError) {
          redirect("/dashboard/students?error=save");
        }
      }

      const { data: existingTarget, error: targetLookupError } = await supabase
        .from("student_enrollments")
        .select("id")
        .eq("student_id", id)
        .eq("halaqa_id", halaqaId)
        .limit(1)
        .maybeSingle();

      if (targetLookupError) {
        redirect("/dashboard/students?error=save");
      }

      const targetId = typeof existingTarget?.id === "string" ? existingTarget.id : "";

      if (targetId) {
        const { error: reactivateError } = await supabase
          .from("student_enrollments")
          .update({ status: "active", archived_at: null })
          .eq("id", targetId);

        if (reactivateError) {
          redirect("/dashboard/students?error=save");
        }
      } else {
        const { error: insertError } = await supabase
          .from("student_enrollments")
          .insert({ student_id: id, halaqa_id: halaqaId, status: "active" });

        if (insertError) {
          redirect("/dashboard/students?error=save");
        }
      }
    }
  }

  redirect("/dashboard/students?updated=1");
}

function normalizeNullable(value: FormDataEntryValue | null) {
  const text = cleanText(value, 2000);
  return text || null;
}
