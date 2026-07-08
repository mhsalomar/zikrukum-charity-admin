import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import type { AppRole } from "@/lib/roles";
import { hasAnyRole, hasRole, isAppRole } from "@/lib/roles";
import { queryTimeoutSignal } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";
import { isQaAccount } from "@/lib/teacher-preview";

export type AccountStatus = "active" | "inactive" | "suspended";

export type UserProfile = {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  status: AccountStatus;
  created_at: string;
  updated_at: string;
};

export type AdminUserRow = UserProfile & {
  roles: AppRole[];
};

type RoleRow = {
  user_id: string;
  roles: { name: string } | { name: string }[] | null;
};

export async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function getCurrentUserProfile(user?: User) {
  const currentUser = user ?? (await requireAuth());
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id,user_id,email,full_name,status,created_at,updated_at")
    .eq("user_id", currentUser.id)
    .abortSignal(queryTimeoutSignal())
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as UserProfile | null;
}

export async function getCurrentUserRoles(user?: User) {
  const currentUser = user ?? (await requireAuth());
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_roles")
    .select("user_id,roles(name)")
    .eq("user_id", currentUser.id)
    .abortSignal(queryTimeoutSignal());

  if (error) {
    throw error;
  }

  const roles = toRoleNames((data ?? []) as RoleRow[]);
  return isQaAccount(currentUser.email)
    ? roles.filter((role) => !["admin", "finance_viewer", "hr"].includes(role))
    : roles;
}

export async function requireRole(role: AppRole) {
  const user = await requireAuth();
  const [profile, roles] = await Promise.all([
    getCurrentUserProfile(user),
    getCurrentUserRoles(user),
  ]);

  if (!hasRole(roles, role)) {
    redirect("/dashboard");
  }

  return { user, profile, roles };
}

export async function requireAnyRole(allowedRoles: AppRole[]) {
  const user = await requireAuth();
  const [profile, roles] = await Promise.all([
    getCurrentUserProfile(user),
    getCurrentUserRoles(user),
  ]);

  if (!hasAnyRole(roles, allowedRoles)) {
    redirect("/auth/role-redirect");
  }

  return { user, profile, roles };
}

export async function getAdminUsers(page = 0, pageSize = 50) {
  await requireRole("admin");

  const supabase = await createClient();
  const from = page * pageSize;
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id,user_id,email,full_name,status,created_at,updated_at")
    .order("created_at", { ascending: false })
    .abortSignal(queryTimeoutSignal())
    .range(from, from + pageSize - 1);

  if (profilesError) {
    throw profilesError;
  }

  const profileRows = (profiles ?? []) as UserProfile[];
  const userIds = profileRows.map((profile) => profile.user_id);

  if (userIds.length === 0) {
    return [];
  }

  const { data: userRoles, error: rolesError } = await supabase
    .from("user_roles")
    .select("user_id,roles(name)")
    .abortSignal(queryTimeoutSignal())
    .in("user_id", userIds);

  if (rolesError) {
    throw rolesError;
  }

  const rolesByUser = new Map<string, AppRole[]>();
  for (const row of (userRoles ?? []) as RoleRow[]) {
    const currentRoles = rolesByUser.get(row.user_id) ?? [];
    rolesByUser.set(row.user_id, [...currentRoles, ...toRoleNames([row])]);
  }

  return profileRows.map((profile) => ({
    ...profile,
    roles: rolesByUser.get(profile.user_id) ?? [],
  })) satisfies AdminUserRow[];
}

function toRoleNames(rows: RoleRow[]) {
  return rows.flatMap((row) => {
    const roles = Array.isArray(row.roles) ? row.roles : [row.roles];

    return roles
      .map((role) => role?.name)
      .filter((role): role is AppRole =>
        typeof role === "string" && isAppRole(role),
      );
  });
}
