"use server";

import { redirect } from "next/navigation";

import { requireAnyRole } from "@/lib/auth";
import type { ManagementTable } from "@/lib/management-configs";
import { cleanText, safeInternalPath } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";

const adminRoles = ["admin", "demo_admin", "executive_director", "executive_manager"] as const;
const hrRoles = ["admin", "demo_admin", "executive_director", "executive_manager", "hr"] as const;

export async function saveManagementRecord(formData: FormData) {
  const table = text(formData, "table") as ManagementTable;
  await requireAnyRole(table === "hr_employees" || table === "hr_letters" ? [...hrRoles] : [...adminRoles]);

  const id = text(formData, "id");
  const returnTo = safeInternalPath(text(formData, "return_to"), "/dashboard");
  const payload = buildPayload(table, formData);

  if (!payload) {
    redirect(`${returnTo}?error=missing`);
  }

  const supabase = await createClient();
  const result = id
    ? await supabase.from(table).update(payload).eq("id", id)
    : await supabase.from(table).insert(payload);

  if (result.error) {
    redirect(`${returnTo}?error=save`);
  }

  redirect(`${returnTo}?${id ? "updated" : "created"}=1`);
}

export async function archiveManagementRecord(formData: FormData) {
  const table = text(formData, "table") as ManagementTable;
  await requireAnyRole(table === "hr_employees" || table === "hr_letters" ? [...hrRoles] : [...adminRoles]);

  const id = text(formData, "id");
  const returnTo = safeInternalPath(text(formData, "return_to"), "/dashboard");
  if (!id) {
    redirect(`${returnTo}?error=missing`);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from(table)
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    redirect(`${returnTo}?error=archive`);
  }

  redirect(`${returnTo}?archived=1`);
}

function buildPayload(table: ManagementTable, formData: FormData) {
  if (table === "meetings") {
    const title = text(formData, "title");
    const meetingDate = text(formData, "meeting_date");
    if (!title || !meetingDate) return null;
    return {
      title,
      meeting_number: nullableText(formData, "meeting_number"),
      meeting_type: text(formData, "meeting_type") || "committee",
      meeting_date: meetingDate,
      start_time: nullableText(formData, "start_time"),
      end_time: nullableText(formData, "end_time"),
      location: nullableText(formData, "location"),
      chair_name: nullableText(formData, "chair_name"),
      prepared_by: nullableText(formData, "prepared_by"),
      attendees: nullableText(formData, "attendees"),
      absentees: nullableText(formData, "absentees"),
      excused: nullableText(formData, "excused"),
      agenda: nullableText(formData, "agenda"),
      minutes: nullableText(formData, "minutes"),
      decisions: nullableText(formData, "decisions"),
      recommendations: nullableText(formData, "recommendations"),
      decision_owner: nullableText(formData, "decision_owner"),
      decision_due_date: nullableText(formData, "decision_due_date"),
      status: text(formData, "status") || "draft",
    };
  }

  if (table === "governance_items") {
    const title = text(formData, "title");
    if (!title) return null;
    return {
      title,
      item_type: text(formData, "item_type") || "policy",
      item_date: nullableText(formData, "item_date"),
      responsible_person: nullableText(formData, "responsible_person"),
      status: text(formData, "status") || "active",
      notes: nullableText(formData, "notes"),
    };
  }

  if (table === "hr_employees") {
    const fullName = text(formData, "full_name");
    if (!fullName) return null;
    return {
      full_name: fullName,
      national_id: nullableText(formData, "national_id"),
      phone: nullableText(formData, "phone"),
      email: nullableText(formData, "email"),
      job_title: nullableText(formData, "job_title"),
      department: nullableText(formData, "department"),
      start_date: nullableText(formData, "start_date"),
      salary: numberOrNull(formData, "salary"),
      status: text(formData, "status") || "active",
      notes: nullableText(formData, "notes"),
    };
  }

  if (table === "hr_letters") {
    const subject = text(formData, "subject");
    const letterDate = text(formData, "letter_date");
    if (!subject || !letterDate) return null;
    return {
      letter_number: nullableText(formData, "letter_number"),
      letter_date: letterDate,
      letter_type: text(formData, "letter_type") || "internal",
      recipient_name: nullableText(formData, "recipient_name"),
      related_person_name: nullableText(formData, "related_person_name"),
      subject,
      body: nullableText(formData, "body"),
      prepared_by: nullableText(formData, "prepared_by"),
      approved_by: nullableText(formData, "approved_by"),
      status: text(formData, "status") || "draft",
      notes: nullableText(formData, "notes"),
    };
  }

  if (table === "management_reports") {
    const title = text(formData, "title");
    if (!title) return null;
    return {
      title,
      report_type: text(formData, "report_type") || "executive",
      period_start: nullableText(formData, "period_start"),
      period_end: nullableText(formData, "period_end"),
      status: text(formData, "status") || "draft",
      summary: nullableText(formData, "summary"),
      notes: nullableText(formData, "notes"),
    };
  }

  if (table === "board_members") {
    const fullName = text(formData, "full_name");
    if (!fullName) return null;
    return {
      full_name: fullName,
      position: nullableText(formData, "position"),
      phone: nullableText(formData, "phone"),
      email: nullableText(formData, "email"),
      membership_start: nullableText(formData, "membership_start"),
      membership_end: nullableText(formData, "membership_end"),
      status: text(formData, "status") || "active",
      notes: nullableText(formData, "notes"),
    };
  }

  if (table === "media_posts") {
    const title = text(formData, "title");
    if (!title) return null;
    return {
      title,
      content_type: text(formData, "content_type") || "news",
      category: nullableText(formData, "category"),
      summary: nullableText(formData, "summary"),
      content: nullableText(formData, "content"),
      proposed_publish_date: nullableText(formData, "proposed_publish_date"),
      status: text(formData, "status") || "draft",
      author_name: nullableText(formData, "author_name"),
      external_asset_url: nullableText(formData, "external_asset_url"),
      internal_notes: nullableText(formData, "internal_notes"),
    };
  }

  return null;
}

function text(formData: FormData, key: string) {
  return cleanText(formData.get(key), ["body", "minutes", "content"].includes(key) ? 10_000 : 2000);
}

function nullableText(formData: FormData, key: string) {
  return text(formData, key) || null;
}

function numberOrNull(formData: FormData, key: string) {
  const value = text(formData, key);
  return value ? Number(value) : null;
}
