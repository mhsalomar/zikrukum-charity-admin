import type { AppRole } from "@/lib/roles";

export const executiveRoles = ["admin", "demo_admin", "executive_director", "executive_manager"] as const satisfies AppRole[];

export const programsRoles = [
  "admin",
  "demo_admin",
  "executive_director",
  "executive_manager",
  "programs_manager",
  "halaqat_manager",
] as const satisfies AppRole[];

export const financeRoles = [
  "admin",
  "demo_admin",
  "executive_director",
  "executive_manager",
  "finance_viewer",
] as const satisfies AppRole[];

export const hrRoles = [
  "admin",
  "demo_admin",
  "executive_director",
  "executive_manager",
  "hr",
] as const satisfies AppRole[];

export const mediaRoles = [
  "admin",
  "demo_admin",
  "executive_director",
  "executive_manager",
  "media_officer",
] as const satisfies AppRole[];
