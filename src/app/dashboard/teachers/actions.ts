"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAnyRole } from "@/lib/auth";
import { operationalRoles } from "@/lib/operational-resources";
import { cleanText } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";

export async function saveTeacherRecord(formData: FormData) {
  await requireAnyRole([...operationalRoles]);

  const id = readText(formData, "id");
  const fullName = readText(formData, "full_name");
  const email = readText(formData, "email");
  const payrollEmployeeId = readText(formData, "payroll_employee_id");

  if (!fullName) {
    redirect("/dashboard/teachers?error=missing");
  }

  const payload = {
    full_name: fullName,
    phone: nullable(readText(formData, "phone")),
    email: nullable(email),
    document_type: readText(formData, "document_type") || "other",
    ...(readText(formData, "document_number") ? { document_number: nullable(readText(formData, "document_number")) } : {}),
    nationality: nullable(readText(formData, "nationality")),
    teacher_role: readText(formData, "teacher_role") || "teacher",
    status: readText(formData, "status") || "active",
    start_date: nullable(readText(formData, "start_date")),
    payroll_employee_id: nullable(payrollEmployeeId),
    bank_name: nullable(readText(formData, "bank_name")),
    ...(readText(formData, "iban") ? { iban: nullable(readText(formData, "iban")) } : {}),
    account_holder_name: nullable(readText(formData, "account_holder_name")),
    salary_amount: numberOrNull(readText(formData, "salary_amount")),
    payroll_data_status: readText(formData, "payroll_data_status") || "incomplete",
    payroll_notes: nullable(readText(formData, "payroll_notes")),
    notes: nullable(readText(formData, "notes")),
  };

  const supabase = await createClient();
  const { data: authUser } = email
    ? await supabase.from("profiles").select("user_id").ilike("email", email).maybeSingle()
    : { data: null };

  const finalPayload = {
    ...payload,
    auth_user_id: typeof authUser?.user_id === "string" ? authUser.user_id : null,
  };

  const result = id
    ? await supabase.from("teachers").update(finalPayload).eq("id", id).select("id").single()
    : await supabase.from("teachers").insert(finalPayload).select("id").single();

  if (result.error) {
    redirect("/dashboard/teachers?error=save");
  }

  const teacherId = String(result.data.id);
  if (payrollEmployeeId) {
    await supabase
      .from("employees_payroll")
      .update({ teacher_id: teacherId })
      .eq("id", payrollEmployeeId);
  }

  revalidatePath("/dashboard/teachers");
  redirect(`/dashboard/teachers?${id ? "updated" : "created"}=1`);
}

export async function archiveTeacherRecord(formData: FormData) {
  await requireAnyRole([...operationalRoles]);
  const id = readText(formData, "id");

  if (!id) redirect("/dashboard/teachers?error=missing");

  const supabase = await createClient();
  const { error } = await supabase
    .from("teachers")
    .update({ status: "inactive", archived_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    redirect("/dashboard/teachers?error=save");
  }

  revalidatePath("/dashboard/teachers");
  redirect("/dashboard/teachers?archived=1");
}

function readText(formData: FormData, key: string) {
  return cleanText(formData.get(key), key.includes("notes") ? 2000 : 500);
}

function nullable(value: string) {
  return value || null;
}

function numberOrNull(value: string) {
  if (!value) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
