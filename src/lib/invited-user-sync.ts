import "server-only";

import type { User } from "@supabase/supabase-js";

import type { AppRole } from "@/lib/roles";
import { isAppRole, resolveRoleFromTrustedSources } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";

type SyncSuccess = {
  success: true;
  roles: AppRole[];
  linkedOperationalRecord: boolean;
};

type SyncFailure = {
  success: false;
  error: string;
  roles: AppRole[];
};

type OnboardingRequest = {
  id: string;
  full_name: string | null;
  email: string | null;
  requested_role: string | null;
  linked_teacher_id: string | null;
  linked_supervisor_id: string | null;
  linked_hr_employee_id: string | null;
};

type RoleRow = {
  role_id: string;
  roles: { name: string } | { name: string }[] | null;
};

export async function ensureUserProfileAndRole(user: User): Promise<SyncSuccess | SyncFailure> {
  const email = user.email?.trim().toLowerCase();
  if (!email) {
    return { success: false, error: "لا يوجد بريد إلكتروني مرتبط بالحساب.", roles: [] };
  }

  const admin = createAdminClient();
  const [requestResult, existingRoleRows] = await Promise.all([
    admin
      .from("user_onboarding_requests")
      .select("id,full_name,email,requested_role,linked_teacher_id,linked_supervisor_id,linked_hr_employee_id")
      .eq("email", email)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<OnboardingRequest>(),
    getRoleRowsForUser(admin, user.id),
  ]);

  if (requestResult.error) {
    console.error("[user-sync] failed to load onboarding request", { message: requestResult.error.message });
    return { success: false, error: "تعذر قراءة طلب ربط الحساب.", roles: toRoleNames(existingRoleRows) };
  }

  const existingRoles = toRoleNames(existingRoleRows);
  const operational = await findOperationalRecords(admin, email);
  const requestedRole = resolveRequestedRole(requestResult.data, existingRoles, operational);

  if (!requestedRole) {
    return {
      success: false,
      error: "تم تسجيل الدخول، لكن لم يتم ربط حسابك بسجل داخلي. يرجى التواصل مع الإدارة.",
      roles: existingRoles,
    };
  }

  const operationalIsRequired = ["teacher", "supervisor", "executive_director", "media_officer"].includes(requestedRole);
  if (operationalIsRequired && !hasOperationalRecord(requestedRole, operational, requestResult.data)) {
    return {
      success: false,
      error: "تم تسجيل الدخول، لكن لم يتم ربط حسابك بسجل داخلي. يرجى التواصل مع الإدارة.",
      roles: existingRoles,
    };
  }

  const displayName =
    requestResult.data?.full_name ||
    operational.teacher?.full_name ||
    operational.supervisor?.full_name ||
    operational.hrEmployee?.full_name ||
    user.user_metadata?.full_name ||
    email;

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .upsert(
      {
        user_id: user.id,
        email,
        full_name: displayName,
        status: "active",
      },
      { onConflict: "user_id" },
    )
    .select("id")
    .single();

  if (profileError || !profile?.id) {
    console.error("[user-sync] failed to upsert profile", { message: profileError?.message });
    return { success: false, error: "تعذر تحديث بيانات الحساب.", roles: existingRoles };
  }

  const { data: role, error: roleError } = await admin
    .from("roles")
    .select("id,name")
    .eq("name", requestedRole)
    .maybeSingle();

  if (roleError || !role?.id) {
    console.error("[user-sync] failed to load role", { message: roleError?.message, role: requestedRole });
    return { success: false, error: "تعذر تحميل صلاحية الحساب.", roles: existingRoles };
  }

  const { error: userRoleError } = await admin.from("user_roles").upsert(
    {
      user_id: user.id,
      role_id: role.id,
    },
    { onConflict: "user_id,role_id" },
  );

  if (userRoleError) {
    console.error("[user-sync] failed to assign role", { message: userRoleError.message });
    return { success: false, error: "تعذر ربط صلاحية الحساب.", roles: existingRoles };
  }

  const linked = await linkOperationalRecords({
    admin,
    userId: user.id,
    profileId: String(profile.id),
    requestedRole,
    request: requestResult.data,
    operational,
  });

  if (!linked.success) {
    return {
      success: false,
      error: linked.error,
      roles: [...new Set([...existingRoles, requestedRole])],
    };
  }

  if (requestResult.data?.id) {
    const { error: updateError } = await admin
      .from("user_onboarding_requests")
      .update({
        status: "linked",
        auth_status: "linked",
        invited_at: new Date().toISOString(),
        linked_teacher_id: linked.teacherId ?? requestResult.data.linked_teacher_id,
        linked_supervisor_id: linked.supervisorId ?? requestResult.data.linked_supervisor_id,
        linked_hr_employee_id: linked.hrEmployeeId ?? requestResult.data.linked_hr_employee_id,
      })
      .eq("id", requestResult.data.id);

    if (updateError) {
      console.error("[user-sync] failed to mark request linked", { message: updateError.message });
      return { success: false, error: "تعذر اعتماد تفعيل الحساب.", roles: [...new Set([...existingRoles, requestedRole])] };
    }
  }

  return {
    success: true,
    roles: [...new Set([...existingRoles, requestedRole])],
    linkedOperationalRecord: linked.linkedOperationalRecord,
  };
}

async function getRoleRowsForUser(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const { data, error } = await admin.from("user_roles").select("role_id,roles(name)").eq("user_id", userId);
  if (error) {
    console.error("[user-sync] failed to load existing roles", { message: error.message });
    return [];
  }
  return (data ?? []) as RoleRow[];
}

function toRoleNames(rows: RoleRow[]) {
  return rows.flatMap((row) => {
    const roles = Array.isArray(row.roles) ? row.roles : [row.roles];
    return roles
      .map((role) => role?.name)
      .filter((role): role is AppRole => typeof role === "string" && isAppRole(role));
  });
}

async function findOperationalRecords(admin: ReturnType<typeof createAdminClient>, email: string) {
  const [teacher, supervisor, hrEmployee] = await Promise.all([
    admin
      .from("teachers")
      .select("id,full_name,email,teacher_role")
      .eq("email", email)
      .is("archived_at", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("supervisors")
      .select("id,full_name,email")
      .eq("email", email)
      .is("archived_at", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("hr_employees")
      .select("id,full_name,email,job_title,department")
      .eq("email", email)
      .is("archived_at", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  for (const result of [teacher, supervisor, hrEmployee]) {
    if (result.error) {
      console.error("[user-sync] operational lookup failed", { message: result.error.message });
    }
  }

  return {
    teacher: teacher.data as { id: string; full_name: string | null; teacher_role: string | null } | null,
    supervisor: supervisor.data as { id: string; full_name: string | null } | null,
    hrEmployee: hrEmployee.data as { id: string; full_name: string | null; job_title: string | null; department: string | null } | null,
  };
}

function resolveRequestedRole(
  request: OnboardingRequest | null,
  roles: AppRole[],
  operational: Awaited<ReturnType<typeof findOperationalRecords>>,
) {
  let inferredRole: AppRole | null = null;
  if (operational.supervisor) inferredRole = "supervisor";
  else if (operational.teacher?.teacher_role === "supervisor") inferredRole = "supervisor";
  else if (operational.teacher) inferredRole = "teacher";
  if (operational.hrEmployee) {
    const text = `${operational.hrEmployee.job_title ?? ""} ${operational.hrEmployee.department ?? ""}`;
    if (text.includes("تنفيذي")) inferredRole = "executive_director";
    else if (text.includes("إعلام")) inferredRole = "media_officer";
  }

  return resolveRoleFromTrustedSources({
    requestedRole: request?.requested_role,
    existingRoles: roles,
    inferredRole,
  });
}

function hasOperationalRecord(
  role: AppRole,
  operational: Awaited<ReturnType<typeof findOperationalRecords>>,
  request: OnboardingRequest | null,
) {
  if (role === "teacher") return Boolean(request?.linked_teacher_id || operational.teacher);
  if (role === "supervisor") {
    return Boolean(
      request?.linked_supervisor_id ||
        request?.linked_teacher_id ||
        operational.supervisor ||
        operational.teacher?.teacher_role === "supervisor",
    );
  }
  if (role === "executive_director" || role === "media_officer") {
    return Boolean(request?.linked_hr_employee_id || operational.hrEmployee);
  }
  return true;
}

async function linkOperationalRecords({
  admin,
  userId,
  profileId,
  requestedRole,
  request,
  operational,
}: {
  admin: ReturnType<typeof createAdminClient>;
  userId: string;
  profileId: string;
  requestedRole: AppRole;
  request: OnboardingRequest | null;
  operational: Awaited<ReturnType<typeof findOperationalRecords>>;
}) {
  let linkedOperationalRecord = false;
  let teacherId = request?.linked_teacher_id ?? operational.teacher?.id ?? null;
  const supervisorId = request?.linked_supervisor_id ?? operational.supervisor?.id ?? null;
  const hrEmployeeId = request?.linked_hr_employee_id ?? operational.hrEmployee?.id ?? null;

  if (requestedRole === "teacher" && teacherId) {
    const { error } = await admin
      .from("teachers")
      .update({ auth_user_id: userId, profile_id: profileId })
      .eq("id", teacherId);
    if (error) {
      console.error("[user-sync] failed to link teacher", { message: error.message });
      return { success: false as const, error: "تعذر ربط حساب المعلم بسجله الداخلي." };
    }
    linkedOperationalRecord = true;
  }

  if (requestedRole === "supervisor" && supervisorId) {
    const { error } = await admin
      .from("supervisors")
      .update({ profile_id: profileId })
      .eq("id", supervisorId);
    if (error) {
      console.error("[user-sync] failed to link supervisor", { message: error.message });
      return { success: false as const, error: "تعذر ربط حساب المشرف بسجله الداخلي." };
    }
    linkedOperationalRecord = true;
  }

  if (requestedRole === "supervisor" && !supervisorId && (teacherId || operational.teacher?.teacher_role === "supervisor")) {
    teacherId = teacherId ?? operational.teacher?.id ?? null;
    if (!teacherId) {
      return { success: false as const, error: "تعذر ربط حساب المشرف بسجله الداخلي." };
    }
    const { error } = await admin
      .from("teachers")
      .update({ auth_user_id: userId, profile_id: profileId })
      .eq("id", teacherId);
    if (error) {
      console.error("[user-sync] failed to link supervisor teacher record", { message: error.message });
      return { success: false as const, error: "تعذر ربط حساب المشرف بسجله الداخلي." };
    }
    linkedOperationalRecord = true;
  }

  if ((requestedRole === "executive_director" || requestedRole === "media_officer") && hrEmployeeId) {
    linkedOperationalRecord = true;
  }

  if (requestedRole === "admin") {
    linkedOperationalRecord = true;
  }

  return {
    success: true as const,
    linkedOperationalRecord,
    teacherId,
    supervisorId,
    hrEmployeeId,
  };
}
