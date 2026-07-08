"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireAnyRole } from "@/lib/auth";
import { cleanText } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";

const programWriteRoles = ["admin", "executive_manager", "programs_manager"] as const;
type ProgramEntity =
  | "participants"
  | "committees"
  | "tasks"
  | "expenses"
  | "reports"
  | "attachments"
  | "rounds"
  | "criteria"
  | "scores"
  | "awards"
  | "winners";

export type CompetitionWinnerImportRow = {
  attendance_no: string;
  winner_name: string;
  rank_level: string;
  iban: string;
  bank_name: string;
  national_id: string;
  prize_amount: number | null;
  notes?: string | null;
};

export type CompetitionWinnerImportResult = {
  ok: boolean;
  savedCount: number;
  updatedCount: number;
  errors: string[];
  warnings: string[];
};

export async function saveProgram(formData: FormData) {
  await requireAnyRole([...programWriteRoles]);
  const id = text(formData, "id");
  const name = text(formData, "name");

  if (!name) {
    redirect("/dashboard/programs?error=missing");
  }

  const payload = {
    name,
    type: text(formData, "type") || "initiative",
    description: nullableText(formData, "description"),
    start_date: nullableText(formData, "start_date"),
    end_date: nullableText(formData, "end_date"),
    status: text(formData, "status") || "planned",
    sponsor_name: nullableText(formData, "sponsor_name"),
    estimated_budget: numberOrNull(formData, "estimated_budget"),
    notes: nullableText(formData, "notes"),
  };

  const supabase = await createClient();
  const result = id
    ? await supabase.from("programs").update(payload).eq("id", id)
    : await supabase.from("programs").insert(payload);

  if (result.error) {
    redirect("/dashboard/programs?error=save");
  }

  redirect(`/dashboard/programs?${id ? "updated" : "created"}=1`);
}

export async function saveProgramEntity(formData: FormData) {
  await requireAnyRole([...programWriteRoles]);
  const entity = text(formData, "entity") as ProgramEntity;
  const programId = text(formData, "program_id");
  const id = text(formData, "id");

  if (!programId) {
    redirect("/dashboard/programs?error=missing");
  }

  const payload = buildEntityPayload(entity, programId, formData);
  if (!payload) {
    redirect(`/dashboard/programs/${programId}?error=missing`);
  }

  const supabase = await createClient();
  const table = entityTable(entity);
  if (!table) {
    redirect(`/dashboard/programs/${programId}?error=missing`);
  }

  const result = id
    ? await supabase.from(table).update(payload).eq("id", id)
    : await supabase.from(table).insert(payload);

  if (result.error) {
    redirect(`/dashboard/programs/${programId}?error=save`);
  }

  redirect(`/dashboard/programs/${programId}?${id ? "updated" : "created"}=1`);
}

export async function importCompetitionWinnerTransfers(
  programId: string,
  rows: CompetitionWinnerImportRow[],
  mode: "draft" | "ready",
): Promise<CompetitionWinnerImportResult> {
  await requireAnyRole(["admin"]);

  const normalizedRows = rows.map(normalizeWinnerRow).filter((row) => row.winner_name || row.iban || row.national_id);
  const validation = validateWinnerRows(normalizedRows, mode);
  if (validation.errors.length > 0) {
    return { ok: false, savedCount: 0, updatedCount: 0, errors: validation.errors, warnings: validation.warnings };
  }

  const supabase = await createClient();
  const { data: program, error: programError } = await supabase
    .from("programs")
    .select("id,name,type")
    .eq("id", programId)
    .is("archived_at", null)
    .maybeSingle();

  if (programError || !program) {
    return { ok: false, savedCount: 0, updatedCount: 0, errors: ["تعذر العثور على المسابقة المحددة."], warnings: validation.warnings };
  }

  const [
    existingParticipants,
    existingWinners,
  ] = await Promise.all([
    supabase
      .from("program_participants")
      .select("id,participant_name")
      .eq("program_id", programId)
      .is("archived_at", null),
    supabase
      .from("program_winners")
      .select("id,participant_id,winner_name,rank_level,iban,national_id")
      .eq("program_id", programId)
      .is("archived_at", null),
  ]);

  if (existingParticipants.error || existingWinners.error) {
    return { ok: false, savedCount: 0, updatedCount: 0, errors: ["تعذر قراءة الفائزين الحاليين للمقارنة ومنع التكرار."], warnings: validation.warnings };
  }

  const participantsByName = new Map(
    (existingParticipants.data ?? []).map((participant) => [
      normalizeKey(String(participant.participant_name ?? "")),
      String(participant.id),
    ]),
  );
  const winners = (existingWinners.data ?? []) as Array<{
    id: string;
    participant_id: string;
    winner_name: string | null;
    rank_level: string | null;
    iban: string | null;
    national_id: string | null;
  }>;

  let savedCount = 0;
  let updatedCount = 0;

  for (const row of normalizedRows) {
    let participantId = participantsByName.get(normalizeKey(row.winner_name));
    if (!participantId) {
      const participantResult = await supabase
        .from("program_participants")
        .insert({
          program_id: programId,
          participant_type: "external",
          participant_name: row.winner_name,
          status: "completed",
          notes: "أضيف تلقائيًا من ملف فائزين مسابقة الشهيد الخامسة.",
        })
        .select("id")
        .single();

      if (participantResult.error || !participantResult.data?.id) {
        return {
          ok: false,
          savedCount,
          updatedCount,
          errors: [`تعذر حفظ المشارك: ${row.winner_name}`],
          warnings: validation.warnings,
        };
      }
      participantId = String(participantResult.data.id);
      participantsByName.set(normalizeKey(row.winner_name), participantId);
    }

    const existing = winners.find((winner) =>
      (row.national_id && winner.national_id === row.national_id)
      || (row.iban && winner.iban === row.iban)
      || (normalizeKey(String(winner.winner_name ?? "")) === normalizeKey(row.winner_name)
        && normalizeKey(String(winner.rank_level ?? "")) === normalizeKey(row.rank_level)),
    );

    const payload = {
      program_id: programId,
      participant_id: participantId,
      attendance_no: row.attendance_no || null,
      winner_name: row.winner_name,
      rank_level: row.rank_level,
      iban: row.iban,
      bank_name: row.bank_name,
      national_id: row.national_id,
      prize_amount: row.prize_amount,
      transfer_status: mode === "ready" ? "ready" : row.prize_amount && row.prize_amount > 0 ? "ready" : "draft",
      notes: row.notes || null,
    };

    const result = existing
      ? await supabase.from("program_winners").update(payload).eq("id", existing.id)
      : await supabase.from("program_winners").insert(payload);

    if (result.error) {
      return {
        ok: false,
        savedCount,
        updatedCount,
        errors: [`تعذر حفظ الفائز: ${row.winner_name}`],
        warnings: validation.warnings,
      };
    }

    if (existing) {
      updatedCount += 1;
    } else {
      savedCount += 1;
      winners.push({
        id: "",
        participant_id: participantId,
        winner_name: row.winner_name,
        rank_level: row.rank_level,
        iban: row.iban,
        national_id: row.national_id,
      });
    }
  }

  revalidatePath(`/dashboard/programs/${programId}`);
  revalidatePath("/dashboard/programs");
  revalidatePath("/dashboard/competitions");

  return { ok: true, savedCount, updatedCount, errors: [], warnings: validation.warnings };
}

export async function markCompetitionWinnersExported(programId: string): Promise<{ ok: boolean; message: string }> {
  await requireAnyRole(["admin"]);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("program_winners")
    .select("id,winner_name,iban,bank_name,national_id,prize_amount,transfer_status")
    .eq("program_id", programId)
    .is("archived_at", null);

  if (error) {
    return { ok: false, message: "تعذر قراءة بيانات الفائزين قبل التصدير." };
  }

  const rows = data ?? [];
  const incomplete = rows.filter((row) =>
    !row.winner_name
    || !isValidSaudiIban(String(row.iban ?? ""))
    || !row.bank_name
    || !row.national_id
    || Number(row.prize_amount ?? 0) <= 0,
  );

  if (rows.length === 0) {
    return { ok: false, message: "لا توجد بيانات فائزين محفوظة للتصدير." };
  }

  if (incomplete.length > 0) {
    return { ok: false, message: "لا يمكن وضع حالة التصدير قبل اكتمال كل بيانات التحويل والمبالغ." };
  }

  const update = await supabase
    .from("program_winners")
    .update({ transfer_status: "exported", transfer_exported_at: new Date().toISOString() })
    .eq("program_id", programId)
    .is("archived_at", null)
    .neq("transfer_status", "paid");

  if (update.error) {
    return { ok: false, message: "تم تجهيز الملف محليًا، لكن تعذر تحديث حالة التصدير في النظام." };
  }

  revalidatePath(`/dashboard/programs/${programId}`);
  return { ok: true, message: "تم تحديث حالة الفائزين إلى: تم التصدير." };
}

function buildEntityPayload(entity: ProgramEntity, programId: string, formData: FormData) {
  if (entity === "participants") {
    const participantName = text(formData, "participant_name");
    if (!participantName) return null;
    return {
      program_id: programId,
      participant_type: text(formData, "participant_type") || "external",
      participant_name: participantName,
      related_student_id: nullableText(formData, "related_student_id"),
      related_teacher_id: nullableText(formData, "related_teacher_id"),
      related_mosque_id: nullableText(formData, "related_mosque_id"),
      status: text(formData, "status") || "active",
      notes: nullableText(formData, "notes"),
    };
  }

  if (entity === "committees") {
    const name = text(formData, "name");
    const memberName = text(formData, "member_name");
    if (!name || !memberName) return null;
    return {
      program_id: programId,
      name,
      member_name: memberName,
      role: nullableText(formData, "role"),
      phone: nullableText(formData, "phone"),
      notes: nullableText(formData, "notes"),
    };
  }

  if (entity === "tasks") {
    const title = text(formData, "title");
    if (!title) return null;
    return {
      program_id: programId,
      title,
      description: nullableText(formData, "description"),
      assigned_to: nullableText(formData, "assigned_to"),
      due_date: nullableText(formData, "due_date"),
      status: text(formData, "status") || "pending",
      priority: text(formData, "priority") || "medium",
    };
  }

  if (entity === "expenses") {
    return {
      program_id: programId,
      expense_date: nullableText(formData, "expense_date"),
      amount: numberValue(formData, "amount"),
      category: nullableText(formData, "category"),
      description: nullableText(formData, "description"),
      payment_method: nullableText(formData, "payment_method"),
      reference_number: nullableText(formData, "reference_number"),
      status: text(formData, "status") || "draft",
    };
  }

  if (entity === "reports") {
    const title = text(formData, "title");
    if (!title) return null;
    return {
      program_id: programId,
      title,
      report_type: nullableText(formData, "report_type"),
      summary: nullableText(formData, "summary"),
    };
  }

  if (entity === "attachments") {
    const fileName = text(formData, "file_name");
    if (!fileName) return null;
    return {
      program_id: programId,
      related_table: nullableText(formData, "related_table"),
      related_id: nullableText(formData, "related_id"),
      file_name: fileName,
      file_type: nullableText(formData, "file_type"),
      file_size: numberOrNull(formData, "file_size"),
      storage_path: nullableText(formData, "storage_path"),
      notes: nullableText(formData, "notes"),
    };
  }

  if (entity === "rounds") {
    const name = text(formData, "name");
    if (!name) return null;
    return {
      program_id: programId,
      name,
      round_order: Number(text(formData, "round_order") || 1),
      start_date: nullableText(formData, "start_date"),
      end_date: nullableText(formData, "end_date"),
      status: text(formData, "status") || "planned",
      notes: nullableText(formData, "notes"),
    };
  }

  if (entity === "criteria") {
    const name = text(formData, "name");
    if (!name) return null;
    return {
      program_id: programId,
      name,
      max_score: numberValue(formData, "max_score") || 100,
      weight: numberValue(formData, "weight") || 1,
      notes: nullableText(formData, "notes"),
    };
  }

  if (entity === "scores") {
    const participantId = text(formData, "participant_id");
    const criterionId = text(formData, "criterion_id");
    if (!participantId || !criterionId) return null;
    return {
      program_id: programId,
      round_id: nullableText(formData, "round_id"),
      participant_id: participantId,
      criterion_id: criterionId,
      judge_name: nullableText(formData, "judge_name"),
      score: numberValue(formData, "score"),
      notes: nullableText(formData, "notes"),
    };
  }

  if (entity === "awards") {
    const name = text(formData, "name");
    if (!name) return null;
    return {
      program_id: programId,
      name,
      rank: numberOrNull(formData, "rank"),
      prize_amount: numberOrNull(formData, "prize_amount"),
      prize_description: nullableText(formData, "prize_description"),
    };
  }

  if (entity === "winners") {
    const participantId = text(formData, "participant_id");
    if (!participantId) return null;
    return {
      program_id: programId,
      participant_id: participantId,
      award_id: nullableText(formData, "award_id"),
      final_score: numberOrNull(formData, "final_score"),
      rank: numberOrNull(formData, "rank"),
      attendance_no: nullableText(formData, "attendance_no"),
      winner_name: nullableText(formData, "winner_name"),
      rank_level: nullableText(formData, "rank_level"),
      iban: nullableText(formData, "iban"),
      bank_name: nullableText(formData, "bank_name"),
      national_id: nullableText(formData, "national_id"),
      prize_amount: numberOrNull(formData, "prize_amount"),
      transfer_status: text(formData, "transfer_status") || "draft",
      notes: nullableText(formData, "notes"),
    };
  }

  return null;
}

function entityTable(entity: ProgramEntity) {
  const tables: Record<ProgramEntity, string> = {
    participants: "program_participants",
    committees: "program_committees",
    tasks: "program_tasks",
    expenses: "program_expenses",
    reports: "program_reports",
    attachments: "program_attachments_metadata",
    rounds: "program_rounds",
    criteria: "program_judging_criteria",
    scores: "program_scores",
    awards: "program_awards",
    winners: "program_winners",
  };
  return tables[entity];
}

function normalizeWinnerRow(row: CompetitionWinnerImportRow): CompetitionWinnerImportRow {
  return {
    attendance_no: String(row.attendance_no ?? "").trim(),
    winner_name: String(row.winner_name ?? "").trim().replace(/\s+/g, " "),
    rank_level: String(row.rank_level ?? "").trim().replace(/\s+/g, " "),
    iban: normalizeIban(row.iban),
    bank_name: String(row.bank_name ?? "").trim(),
    national_id: String(row.national_id ?? "").trim().replace(/\.0$/, ""),
    prize_amount: row.prize_amount === null || row.prize_amount === undefined || Number(row.prize_amount) <= 0 ? null : Number(row.prize_amount),
    notes: row.notes ? String(row.notes).trim() : null,
  };
}

function validateWinnerRows(rows: CompetitionWinnerImportRow[], mode: "draft" | "ready") {
  const errors: string[] = [];
  const warnings: string[] = [];
  const ibanSeen = new Set<string>();
  const nationalSeen = new Set<string>();
  const nameRankSeen = new Set<string>();

  if (rows.length === 0) {
    errors.push("لا توجد صفوف فائزين صالحة في الملف.");
  }

  rows.forEach((row, index) => {
    const line = index + 2;
    if (!row.winner_name) errors.push(`السطر ${line}: اسم الفائز مطلوب.`);
    if (!row.rank_level) errors.push(`السطر ${line}: المركز والمستوى مطلوب.`);
    if (!isValidSaudiIban(row.iban)) errors.push(`السطر ${line}: الآيبان غير صحيح.`);
    if (!row.bank_name) errors.push(`السطر ${line}: اسم البنك مطلوب.`);
    if (!row.national_id) errors.push(`السطر ${line}: الهوية أو الإقامة مطلوبة.`);
    if (mode === "ready" && (!row.prize_amount || row.prize_amount <= 0)) {
      errors.push(`السطر ${line}: المبلغ مطلوب قبل الجاهزية للتحويل.`);
    }
    if (!row.prize_amount || row.prize_amount <= 0) {
      warnings.push(`السطر ${line}: المبلغ غير مدخل وسيُحفظ كمسودة.`);
    }

    if (row.iban) {
      if (ibanSeen.has(row.iban)) errors.push(`السطر ${line}: الآيبان مكرر داخل الملف.`);
      ibanSeen.add(row.iban);
    }
    if (row.national_id) {
      if (nationalSeen.has(row.national_id)) errors.push(`السطر ${line}: رقم الهوية أو الإقامة مكرر داخل الملف.`);
      nationalSeen.add(row.national_id);
    }
    const nameRank = `${normalizeKey(row.winner_name)}::${normalizeKey(row.rank_level)}`;
    if (nameRank !== "::") {
      if (nameRankSeen.has(nameRank)) errors.push(`السطر ${line}: الاسم والمركز مكرران داخل الملف.`);
      nameRankSeen.add(nameRank);
    }
  });

  return { errors, warnings };
}

function normalizeIban(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, "").toUpperCase();
}

function isValidSaudiIban(value: string) {
  return /^SA[0-9A-Z]{22}$/.test(normalizeIban(value));
}

function normalizeKey(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function text(formData: FormData, key: string) {
  return cleanText(formData.get(key), ["description", "notes", "summary"].includes(key) ? 5000 : 1000);
}

function nullableText(formData: FormData, key: string) {
  return text(formData, key) || null;
}

function numberValue(formData: FormData, key: string) {
  return Number(text(formData, key) || 0);
}

function numberOrNull(formData: FormData, key: string) {
  const value = text(formData, key);
  return value ? Number(value) : null;
}
