"use server";

import { revalidatePath } from "next/cache";

import { requireAnyRole } from "@/lib/auth";
import {
  normalizeKey,
  normalizeStaffImportRow,
  splitHalaqat,
  type StaffImportKind,
  type StaffImportPreviewRow,
  type StaffImportRow,
  validateStaffImportRow,
} from "@/lib/staff-import";
import { createAdminClient } from "@/lib/supabase/admin";

const staffImportRoles = [
  "admin",
  "demo_admin",
  "executive_director",
  "executive_manager",
  "halaqat_manager",
] as const;

type Related = Record<string, unknown>;

type StaffImportResponse = {
  ok: boolean;
  preview: StaffImportPreviewRow[];
  savedCount: number;
  createdCount: number;
  updatedCount: number;
  identityUpdatedCount: number;
  ibanUpdatedCount: number;
  errors: string[];
};

export async function previewStaffImportRows(
  rows: StaffImportRow[],
  kind: StaffImportKind,
): Promise<StaffImportResponse> {
  await requireAnyRole([...staffImportRoles]);
  return evaluateRows(rows, kind);
}

export async function saveStaffImportRows(
  rows: StaffImportRow[],
  kind: StaffImportKind,
): Promise<StaffImportResponse> {
  await requireAnyRole([...staffImportRoles]);
  const evaluated = await evaluateRows(rows, kind);
  if (!evaluated.ok) return evaluated;

  const readyRows = evaluated.preview.filter((item) => item.canSave);
  if (readyRows.length === 0) {
    return { ...evaluated, ok: false, errors: ["لا توجد صفوف جاهزة للحفظ."] };
  }

  const admin = createAdminClient();
  const table = kind === "teacher" ? "teachers" : "supervisors";
  const halaqaColumn = kind === "teacher" ? "teacher_id" : "supervisor_id";
  let createdCount = 0;
  let updatedCount = 0;
  let identityUpdatedCount = 0;
  let ibanUpdatedCount = 0;
  const errors: string[] = [];

  for (const item of readyRows) {
    const row = normalizeStaffImportRow(item.row);
    const payload = buildPayload(row, kind);
    const result = item.matchedId
      ? await admin.from(table).update(payload).eq("id", item.matchedId).select("id").single()
      : await admin.from(table).insert(payload).select("id").single();

    if (result.error || !result.data?.id) {
      errors.push(`تعذر حفظ السطر ${item.rowNumber}: ${row.full_name}.`);
      continue;
    }

    const staffId = String(result.data.id);
    if (item.matchedId) updatedCount += 1;
    else createdCount += 1;
    if (row.national_id) identityUpdatedCount += 1;
    if (row.iban) ibanUpdatedCount += 1;

    const halaqaNames = splitHalaqat(row.halaqat);
    if (halaqaNames.length > 0) {
      const { data: halaqat } = await admin
        .from("halaqat")
        .select("id,name")
        .is("archived_at", null)
        .limit(1500);

      const ids = ((halaqat ?? []) as Related[])
        .filter((halaqa) =>
          halaqaNames.some((name) => normalizeKey(name) === normalizeKey(text(halaqa.name))),
        )
        .map((halaqa) => text(halaqa.id))
        .filter(Boolean);

      if (ids.length > 0) {
        const { error: linkError } = await admin
          .from("halaqat")
          .update({ [halaqaColumn]: staffId })
          .in("id", ids);
        if (linkError) errors.push(`تم حفظ ${row.full_name} وتعذر ربط بعض الحلقات.`);
      }
    }
  }

  revalidatePath("/dashboard/teachers", "layout");
  revalidatePath("/dashboard/supervisors", "layout");
  revalidatePath("/dashboard/halaqat");

  return {
    ok: errors.length === 0,
    preview: evaluated.preview,
    savedCount: createdCount + updatedCount,
    createdCount,
    updatedCount,
    identityUpdatedCount,
    ibanUpdatedCount,
    errors,
  };
}

async function evaluateRows(
  rows: StaffImportRow[],
  kind: StaffImportKind,
): Promise<StaffImportResponse> {
  const cleanRows = rows
    .map(normalizeStaffImportRow)
    .filter((row) => Object.values(row).some(Boolean))
    .slice(0, 1000);

  if (cleanRows.length === 0) {
    return failure(["الملف لا يحتوي على صفوف قابلة للمعاينة."]);
  }

  const admin = createAdminClient();
  const table = kind === "teacher" ? "teachers" : "supervisors";
  const select =
    kind === "teacher"
      ? "id,full_name,email,document_number"
      : "id,full_name,email,document_number";

  const [{ data: existing, error: existingError }, { data: halaqat, error: halaqatError }] =
    await Promise.all([
      admin.from(table).select(select).is("archived_at", null).limit(3000),
      admin.from("halaqat").select("id,name").is("archived_at", null).limit(1500),
    ]);

  if (existingError || halaqatError) {
    return failure(["تعذر قراءة البيانات الحالية للمطابقة."]);
  }

  const emailMap = groupBy((existing ?? []) as Related[], (row) => text(row.email).toLowerCase());
  const identityMap = groupBy((existing ?? []) as Related[], (row) => text(row.document_number));
  const nameMap = groupBy((existing ?? []) as Related[], (row) => normalizeKey(text(row.full_name)));
  const halaqaNames = new Set(((halaqat ?? []) as Related[]).map((row) => normalizeKey(text(row.name))));
  const signatures = new Set<string>();

  const preview = cleanRows.map((row, index): StaffImportPreviewRow => {
    const rowNumber = index + 2;
    const validation = validateStaffImportRow(row);
    if (validation) {
      return blocked(rowNumber, row, validation.status, validation.message);
    }

    const signature = row.email || row.national_id || normalizeKey(row.full_name);
    if (signatures.has(signature)) {
      return blocked(rowNumber, row, "duplicate", "الصف مكرر داخل الملف.");
    }
    signatures.add(signature);

    const missingHalaqat = splitHalaqat(row.halaqat).filter(
      (name) => !halaqaNames.has(normalizeKey(name)),
    );
    if (missingHalaqat.length > 0) {
      return blocked(
        rowNumber,
        row,
        "missing_halaqa",
        `حلقة غير موجودة: ${missingHalaqat.join("، ")}`,
      );
    }

    const matches = row.email
      ? emailMap.get(row.email) ?? []
      : row.national_id
        ? identityMap.get(row.national_id) ?? []
        : nameMap.get(normalizeKey(row.full_name)) ?? [];

    if (matches.length > 1) {
      return blocked(rowNumber, row, "duplicate", "يوجد أكثر من سجل مطابق ويحتاج مراجعة يدوية.");
    }

    const matchedId = matches.length === 1 ? text(matches[0].id) : "";
    const extras: string[] = [];
    if (row.national_id) extras.push("هوية ستُحفظ");
    if (row.iban) extras.push("آيبان سيُحفظ");
    const baseMessage = matchedId ? "مطابق وسيتم تحديثه." : "سجل جديد.";
    return {
      rowNumber,
      row,
      status: matchedId ? "matched" : "new",
      matchedId,
      message: extras.length ? `${baseMessage} | ${extras.join(" | ")}` : baseMessage,
      canSave: true,
    };
  });

  return {
    ok: true,
    preview,
    savedCount: 0,
    createdCount: 0,
    updatedCount: 0,
    identityUpdatedCount: 0,
    ibanUpdatedCount: 0,
    errors: [],
  };
}

function buildPayload(row: StaffImportRow, kind: StaffImportKind) {
  const payload: Record<string, string | number | null> = { full_name: row.full_name };
  add(payload, "phone", row.phone);
  add(payload, "email", row.email);
  add(payload, "document_type", row.document_type);
  add(payload, "document_number", row.national_id || row.document_number);
  add(payload, "document_expiry_date", row.document_expiry_date);
  add(payload, "bank_name", row.bank_name);
  add(payload, "iban", row.iban);
  add(payload, "status", row.status);
  add(payload, "salary_amount", row.salary_amount ? Number(row.salary_amount) : "");
  add(payload, "notes", row.notes);

  if (kind === "teacher") {
    add(payload, "teacher_role", normalizeTeacherRole(row.role_title));
    if (row.bank_name && row.iban) payload.payroll_data_status = "complete";
  } else {
    add(payload, "job_title", row.role_title);
  }

  return payload;
}

function normalizeTeacherRole(value?: string) {
  const key = normalizeKey(value);
  if (key.includes("مشرف")) return "supervisor";
  if (key.includes("مساعد")) return "assistant_teacher";
  if (key.includes("ادار")) return "admin";
  if (key.includes("معلم") || key.includes("معلمه")) return "teacher";
  return text(value);
}

function add(payload: Record<string, string | number | null>, key: string, value: unknown) {
  if (value !== "" && value !== null && value !== undefined) {
    payload[key] = typeof value === "number" ? value : text(value);
  }
}

function groupBy(rows: Related[], key: (row: Related) => string) {
  const map = new Map<string, Related[]>();
  for (const row of rows) {
    const value = key(row);
    if (!value) continue;
    map.set(value, [...(map.get(value) ?? []), row]);
  }
  return map;
}

function blocked(
  rowNumber: number,
  row: StaffImportRow,
  status: StaffImportPreviewRow["status"],
  message: string,
): StaffImportPreviewRow {
  return { rowNumber, row, status, matchedId: "", message, canSave: false };
}

function failure(errors: string[]): StaffImportResponse {
  return {
    ok: false,
    preview: [],
    savedCount: 0,
    createdCount: 0,
    updatedCount: 0,
    identityUpdatedCount: 0,
    ibanUpdatedCount: 0,
    errors,
  };
}

function text(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}
