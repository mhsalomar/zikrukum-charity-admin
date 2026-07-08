"use server";

import { redirect } from "next/navigation";

import { cleanText } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";
import { getSupervisorScope } from "@/lib/supervisor-scope";

const clampScore = (value: FormDataEntryValue | null) => Math.max(1, Math.min(5, Number(value ?? 1) || 1));
const num = (v: FormDataEntryValue | null) => Math.max(0, Number(v ?? 0) || 0);

export async function createSupervisorVisit(formData: FormData) {
  const supabase = await createClient();
  const scope = await getSupervisorScope();
  const circleId = cleanText(formData.get("circle_id"), 100);
  const visitDate = cleanText(formData.get("visit_date"), 20);
  const sampleStudentId = cleanText(formData.get("sample_student_id"), 100);
  if (!circleId || !visitDate) redirect("/supervisor/visits/new?error=required");

  if (!scope.isAdmin && (!scope.circleIds || !scope.circleIds.includes(circleId))) redirect("/supervisor/visits/new?error=scope");

  if (sampleStudentId) {
    const student = await supabase.from("student_enrollments").select("id").eq("halaqa_id", circleId).eq("student_id", sampleStudentId).eq("status", "active").maybeSingle();
    if (!student.data) redirect("/supervisor/visits/new?error=student");
  }

  const payload = {
    supervisor_id: scope.supervisorId,
    circle_id: circleId,
    teacher_id: cleanText(formData.get("teacher_id"), 100) || null,
    sample_student_id: sampleStudentId || null,
    visit_date: visitDate,
    teacher_status: cleanText(formData.get("teacher_status") ?? "present", 50),
    present_count: num(formData.get("present_count")),
    absent_count: num(formData.get("absent_count")),
    late_count: num(formData.get("late_count")),
    excused_count: num(formData.get("excused_count")),
    tajweed_lesson_given: formData.get("tajweed_lesson_given") === "yes",
    observed_session_type: cleanText(formData.get("observed_session_type"), 100),
    achievement_match_status: cleanText(formData.get("achievement_match_status"), 100),
    recitation_quality_score: clampScore(formData.get("recitation_quality_score")),
    circle_discipline_score: clampScore(formData.get("circle_discipline_score")),
    student_engagement_score: clampScore(formData.get("student_engagement_score")),
    teacher_organization_score: clampScore(formData.get("teacher_organization_score")),
    notes: cleanText(formData.get("notes"), 3000) || null,
    recommendation: cleanText(formData.get("recommendation"), 3000) || null,
    status: cleanText(formData.get("status") ?? "open", 50),
    created_by: scope.user.id,
    is_demo: scope.user.email === "qa@example.com",
  };
  const { data, error } = await supabase.from("supervisor_visits").insert(payload).select("id").single();
  if (error) redirect(`/supervisor/visits/new?error=save`);
  redirect(`/supervisor/visits/${data.id}?saved=1`);
}
