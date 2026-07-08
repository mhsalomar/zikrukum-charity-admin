export const appRoles = [
  "admin",
  "demo_admin",
  "executive_director",
  "executive_manager",
  "halaqat_manager",
  "programs_manager",
  "supervisor",
  "teacher",
  "media_officer",
  "hr",
  "finance_viewer",
] as const;

export type AppRole = (typeof appRoles)[number];

export const roleLabels: Record<AppRole, string> = {
  admin: "مدير النظام",
  demo_admin: "حساب تجربة",
  executive_director: "المدير التنفيذي",
  executive_manager: "المدير التنفيذي",
  halaqat_manager: "مدير الحلقات",
  programs_manager: "مدير البرامج",
  supervisor: "مشرف",
  teacher: "معلم",
  media_officer: "إعلامي",
  hr: "الموارد البشرية",
  finance_viewer: "مطلع مالي",
};

export function isAppRole(value: string): value is AppRole {
  return appRoles.includes(value as AppRole);
}

export function getRoleLabel(role: AppRole | string) {
  return isAppRole(role) ? roleLabels[role] : role;
}

export function formatRoleList(roles: string[]) {
  if (roles.length === 0) {
    return "لا توجد أدوار";
  }

  return roles.map(getRoleLabel).join("، ");
}

export function hasRole(roles: string[], role: AppRole) {
  return roles.includes(role);
}

export function hasAnyRole(roles: string[], allowedRoles: AppRole[]) {
  return allowedRoles.some((role) => hasRole(roles, role));
}

/**
 * Production roles must come from trusted onboarding, stored roles, or verified
 * operational records. Email-address fallbacks are intentionally unsupported.
 */
export function resolveRoleFromTrustedSources({
  requestedRole,
  existingRoles,
  inferredRole,
}: {
  requestedRole: string | null | undefined;
  existingRoles: AppRole[];
  inferredRole: AppRole | null;
}) {
  if (requestedRole && isAppRole(requestedRole)) return requestedRole;
  return existingRoles[0] ?? inferredRole;
}
