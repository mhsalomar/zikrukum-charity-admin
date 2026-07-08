"use server";

import { redirect } from "next/navigation";

import { safeInternalPath } from "@/lib/security";
import { decideStudentRequest } from "@/lib/student-requests";

export async function decideStudentRequestAction(formData: FormData) {
  const returnTo = safeInternalPath(formData.get("return_to"), "/dashboard/student-requests");
  const result = await decideStudentRequest(formData);
  const params = new URLSearchParams();
  params.set(result.success ? "decision" : "error", result.success ? "saved" : result.error ?? "save");
  redirect(`${returnTo}?${params.toString()}`);
}
