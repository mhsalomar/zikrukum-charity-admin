"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { requireRole } from "@/lib/auth";
import { cleanText, queryTimeoutSignal, recordAuditEvent } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { sendInviteAction } from "../settings/invitations/actions";

type OnboardingRole =
  | "teacher"
  | "supervisor"
  | "hr_employee"
  | "executive_director"
  | "media_officer"
  | "admin";

const onboardingSchema = z
  .object({
    fullName: z.string().trim().min(2).max(150),
    email: z.string().trim().toLowerCase().email().max(254),
    requestedRole: z.enum([
      "teacher",
      "supervisor",
      "hr_employee",
      "executive_director",
      "media_officer",
      "admin",
    ]),
    submitMode: z.enum(["save", "save_and_invite"]).default("save"),
  })
  .strict();

export async function createUserOnboardingRequest(formData: FormData) {
  await requireRole("admin");
  const parsed = onboardingSchema.safeParse({
    fullName: text(formData, "full_name"),
    email: text(formData, "email"),
    requestedRole: text(formData, "requested_role"),
    submitMode: text(formData, "submit_mode") || "save",
  });

  if (!parsed.success) {
    redirect("/dashboard/users/new?error=missing");
  }
  const { fullName, email, requestedRole, submitMode } = parsed.data;

  const supabase = await createClient();
  const authUser = await findAuthUserByEmail(email);
  const { data: existing } = await supabase
    .from("user_onboarding_requests")
    .select("id,linked_teacher_id,linked_supervisor_id,linked_hr_employee_id")
    .eq("email", email)
    .eq("requested_role", requestedRole)
    .abortSignal(queryTimeoutSignal())
    .maybeSingle();

  const linked = existing
    ? {
        linked_teacher_id: existing.linked_teacher_id as string | null,
        linked_supervisor_id: existing.linked_supervisor_id as string | null,
        linked_hr_employee_id: existing.linked_hr_employee_id as string | null,
      }
    : await findOrCreateLinkedRecord({
        supabase,
        fullName,
        email,
        phone: nullableText(formData, "phone"),
        requestedRole,
        documentType: nullableText(formData, "document_type"),
        documentNumber: nullableText(formData, "document_number"),
        bankName: nullableText(formData, "bank_name"),
        iban: nullableText(formData, "iban"),
      });

  const payload = {
    full_name: fullName,
    email,
    phone: nullableText(formData, "phone"),
    requested_role: requestedRole,
    status: "pending_auth",
    auth_status: authUser ? "auth_created" : "manual_auth_required",
    document_type: nullableText(formData, "document_type"),
    document_number: nullableText(formData, "document_number"),
    bank_name: nullableText(formData, "bank_name"),
    iban: nullableText(formData, "iban"),
    payroll_data_status: nullableText(formData, "payroll_data_status") ?? "incomplete",
    notes: nullableText(formData, "notes"),
    ...linked,
  };

  const result = existing
    ? await supabase.from("user_onboarding_requests").update(payload).eq("id", existing.id).select("id").single()
    : await supabase.from("user_onboarding_requests").insert(payload).select("id").single();

  if (result.error) {
    redirect("/dashboard/users/new?error=save");
  }

  const requestId = String(result.data?.id ?? existing?.id ?? "");
  await recordAuditEvent({
    action: existing ? "onboarding_request_updated" : "onboarding_request_created",
    tableName: "user_onboarding_requests",
    recordId: requestId || null,
    metadata: { requested_role: requestedRole, invited: submitMode === "save_and_invite" },
  });
  if (submitMode === "save_and_invite" && requestId) {
    const invite = await sendInviteAction(requestId);
    if (!invite.success) {
      redirect(`/dashboard/users?onboarding=created&invite=failed&reason=${encodeURIComponent(invite.error ?? "تعذر إرسال الدعوة")}`);
    }
    redirect("/dashboard/settings/invitations?sent=1");
  }

  redirect("/dashboard/users?onboarding=created");
}

async function findOrCreateLinkedRecord({
  supabase,
  fullName,
  email,
  phone,
  requestedRole,
  documentType,
  documentNumber,
  bankName,
  iban,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  fullName: string;
  email: string;
  phone: string | null;
  requestedRole: OnboardingRole;
  documentType: string | null;
  documentNumber: string | null;
  bankName: string | null;
  iban: string | null;
}) {
  if (requestedRole === "teacher") {
    const existingTeacher = await findTeacher(supabase, fullName, email, "teacher");
    if (existingTeacher?.id) {
      await supabase
        .from("teachers")
        .update({
          email,
          phone: phone ?? existingTeacher.phone ?? null,
          document_type: documentType || existingTeacher.document_type || "other",
          document_number: documentNumber ?? existingTeacher.document_number ?? null,
          bank_name: bankName ?? existingTeacher.bank_name ?? null,
          iban: iban ?? existingTeacher.iban ?? null,
          teacher_role: "teacher",
          payroll_data_status:
            iban && bankName && documentNumber ? "complete" : existingTeacher.payroll_data_status ?? "incomplete",
        })
        .eq("id", existingTeacher.id);
      return { linked_teacher_id: existingTeacher.id, linked_supervisor_id: null, linked_hr_employee_id: null };
    }

    const { data } = await supabase
      .from("teachers")
      .insert({
        full_name: fullName,
        email,
        phone,
        document_type: documentType || "other",
        document_number: documentNumber,
        bank_name: bankName,
        iban,
        payroll_data_status: iban && bankName && documentNumber ? "complete" : "incomplete",
        status: "active",
      })
      .select("id")
      .single();
    return { linked_teacher_id: data?.id ?? null, linked_supervisor_id: null, linked_hr_employee_id: null };
  }

  if (requestedRole === "supervisor") {
    const existingSupervisor = await findSupervisor(supabase, fullName, email);
    if (existingSupervisor?.id) {
      await supabase
        .from("supervisors")
        .update({ email, phone: phone ?? existingSupervisor.phone ?? null, status: "active" })
        .eq("id", existingSupervisor.id);
      return { linked_teacher_id: null, linked_supervisor_id: existingSupervisor.id, linked_hr_employee_id: null };
    }

    const existingTeacherSupervisor = await findTeacher(supabase, fullName, email, "supervisor");
    if (existingTeacherSupervisor?.id) {
      await supabase
        .from("teachers")
        .update({
          email,
          phone: phone ?? existingTeacherSupervisor.phone ?? null,
          teacher_role: "supervisor",
          status: "active",
        })
        .eq("id", existingTeacherSupervisor.id);
      return { linked_teacher_id: existingTeacherSupervisor.id, linked_supervisor_id: null, linked_hr_employee_id: null };
    }

    const { data } = await supabase
      .from("supervisors")
      .insert({ full_name: fullName, email, phone, status: "active" })
      .select("id")
      .single();
    return { linked_teacher_id: null, linked_supervisor_id: data?.id ?? null, linked_hr_employee_id: null };
  }

  if (["hr_employee", "executive_director", "media_officer"].includes(requestedRole)) {
    const jobTitle =
      requestedRole === "executive_director"
        ? "مدير تنفيذي"
        : requestedRole === "media_officer"
          ? "إعلامي"
          : "موظف إداري";
    const existingEmployee = await findHrEmployee(supabase, fullName, email);
    if (existingEmployee?.id) {
      await supabase
        .from("hr_employees")
        .update({
          email,
          phone: phone ?? existingEmployee.phone ?? null,
          job_title: existingEmployee.job_title ?? jobTitle,
          department: existingEmployee.department ?? (requestedRole === "media_officer" ? "الإعلام" : "الإدارة"),
          status: "active",
        })
        .eq("id", existingEmployee.id);
      return { linked_teacher_id: null, linked_supervisor_id: null, linked_hr_employee_id: existingEmployee.id };
    }

    const { data } = await supabase
      .from("hr_employees")
      .insert({ full_name: fullName, email, phone, job_title: jobTitle, department: requestedRole === "media_officer" ? "الإعلام" : "الإدارة", status: "active" })
      .select("id")
      .single();
    return { linked_teacher_id: null, linked_supervisor_id: null, linked_hr_employee_id: data?.id ?? null };
  }

  return { linked_teacher_id: null, linked_supervisor_id: null, linked_hr_employee_id: null };
}

async function findAuthUserByEmail(email: string) {
  try {
    const admin = createAdminClient();
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    return data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) ?? null;
  } catch {
    return null;
  }
}

async function findTeacher(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fullName: string,
  email: string,
  teacherRole: "teacher" | "supervisor",
) {
  const { data } = await supabase
    .from("teachers")
    .select("id,full_name,email,phone,document_type,document_number,bank_name,iban,teacher_role,payroll_data_status")
    .is("archived_at", null)
    .or(`email.ilike.${escapeFilter(email)},full_name.ilike.${escapeFilter(fullName)}`)
    .limit(10);
  const rows = (data ?? []) as Array<Record<string, string | null>>;
  return (
    rows.find((row) => normalize(row.email) === normalize(email)) ??
    rows.find((row) => normalize(row.full_name) === normalize(fullName) && (teacherRole === "teacher" || row.teacher_role === "supervisor")) ??
    null
  );
}

async function findSupervisor(supabase: Awaited<ReturnType<typeof createClient>>, fullName: string, email: string) {
  const { data } = await supabase
    .from("supervisors")
    .select("id,full_name,email,phone")
    .is("archived_at", null)
    .or(`email.ilike.${escapeFilter(email)},full_name.ilike.${escapeFilter(fullName)}`)
    .limit(10);
  const rows = (data ?? []) as Array<Record<string, string | null>>;
  return rows.find((row) => normalize(row.email) === normalize(email)) ?? rows.find((row) => normalize(row.full_name) === normalize(fullName)) ?? null;
}

async function findHrEmployee(supabase: Awaited<ReturnType<typeof createClient>>, fullName: string, email: string) {
  const { data } = await supabase
    .from("hr_employees")
    .select("id,full_name,email,phone,job_title,department")
    .is("archived_at", null)
    .or(`email.ilike.${escapeFilter(email)},full_name.ilike.${escapeFilter(fullName)}`)
    .limit(10);
  const rows = (data ?? []) as Array<Record<string, string | null>>;
  return rows.find((row) => normalize(row.email) === normalize(email)) ?? rows.find((row) => normalize(row.full_name) === normalize(fullName)) ?? null;
}

function escapeFilter(value: string) {
  return value.replace(/[%*,]/g, "");
}

function normalize(value: unknown) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function text(formData: FormData, key: string) {
  return cleanText(formData.get(key), 1000);
}

function nullableText(formData: FormData, key: string) {
  return text(formData, key) || null;
}
