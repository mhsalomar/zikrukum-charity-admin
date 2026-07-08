"use server";

import { revalidatePath } from "next/cache";

import { requireAnyRole } from "@/lib/auth";
import { operationalRoles } from "@/lib/operational-resources";
import { quranSurahs } from "@/lib/quran-surahs";
import { createClient } from "@/lib/supabase/server";

export type StudentProgressImportRow = {
  student_name: string;
  halaqa_name: string;
  teacher_name?: string;
  mosque_name?: string;
  level?: string;
  memorization_surah_name?: string;
  memorization_from_ayah?: string;
  memorization_to_ayah?: string;
  review_surah_name?: string;
  review_from_ayah?: string;
  review_to_ayah?: string;
  memorization_pages?: string;
  review_pages?: string;
  progress_date?: string;
  notes?: string;
};

type ImportResult = {
  ok: boolean;
  savedCount: number;
  createdStudents: number;
  linkedEnrollments: number;
  errors: string[];
  warnings: string[];
};

type Related = Record<string, unknown>;

export async function importStudentProgressRows(
  rows: StudentProgressImportRow[],
  options: { createNewStudents?: boolean } = {},
): Promise<ImportResult> {
  await requireAnyRole([...operationalRoles]);

  const cleanRows = rows
    .map(normalizeImportRow)
    .filter((row) => row.student_name || row.halaqa_name);

  if (cleanRows.length === 0) {
    return failure(["الملف لا يحتوي على صفوف قابلة للاستيراد."]);
  }

  if (cleanRows.length > 1200) {
    return failure(["الحد الأعلى للاستيراد دفعة واحدة هو 1200 صف. قسّم الملف إلى دفعات أصغر."]);
  }

  const rowErrors = validateRows(cleanRows);
  if (rowErrors.length > 0) {
    return failure(rowErrors);
  }

  const supabase = await createClient();
  const { data: halaqatData, error: halaqatError } = await supabase
    .from("halaqat")
    .select("id,name,teacher_id,mosque_id,teachers!halaqat_teacher_id_fkey(full_name),mosques!halaqat_mosque_id_fkey(name)")
    .is("archived_at", null)
    .limit(1000);

  if (halaqatError) {
    return failure(["تعذر قراءة الحلقات الحالية. تأكد من الصلاحيات ثم حاول مرة أخرى."]);
  }

  const halaqat = ((halaqatData ?? []) as Related[]).map((halaqa) => ({
    id: text(halaqa.id),
    name: text(halaqa.name),
    teacherId: text(halaqa.teacher_id),
    mosqueId: text(halaqa.mosque_id),
    teacherName: text(readObject(halaqa.teachers).full_name),
    mosqueName: text(readObject(halaqa.mosques).name),
  }));
  const halaqaByName = new Map(halaqat.map((halaqa) => [normalizeKey(halaqa.name), halaqa]));
  const unmatched = [...new Set(cleanRows.map((row) => row.halaqa_name).filter((name) => !halaqaByName.has(normalizeKey(name))))];

  if (unmatched.length > 0) {
    return failure(unmatched.map((name) => `الحلقة غير مطابقة في قاعدة البيانات: ${name}`));
  }

  const targetHalaqaIds = [...new Set(cleanRows.map((row) => halaqaByName.get(normalizeKey(row.halaqa_name))?.id).filter(Boolean))] as string[];

  const [{ data: enrollmentRows }, { data: studentRows }] = await Promise.all([
    supabase
      .from("student_enrollments")
      .select("id,student_id,halaqa_id,status,archived_at,students!student_enrollments_student_id_fkey(id,full_name)")
      .in("halaqa_id", targetHalaqaIds)
      .limit(3000),
    supabase.from("students").select("id,full_name").is("archived_at", null).limit(6000),
  ]);

  const enrollmentByStudentAndHalaqa = new Map<string, { id: string; studentId: string }>();
  for (const enrollment of ((enrollmentRows ?? []) as Related[])) {
    const student = readObject(enrollment.students);
    const key = joinKey(text(student.full_name), text(enrollment.halaqa_id));
    if (text(enrollment.status) === "active" && !enrollment.archived_at && text(enrollment.student_id)) {
      enrollmentByStudentAndHalaqa.set(key, {
        id: text(enrollment.id),
        studentId: text(enrollment.student_id),
      });
    }
  }

  const studentByName = new Map<string, string>();
  for (const student of ((studentRows ?? []) as Related[])) {
    studentByName.set(normalizeKey(text(student.full_name)), text(student.id));
  }

  let createdStudents = 0;
  let linkedEnrollments = 0;
  const warnings: string[] = [];

  for (const row of cleanRows) {
    const halaqa = halaqaByName.get(normalizeKey(row.halaqa_name));
    if (!halaqa) continue;

    if (row.teacher_name && halaqa.teacherName && normalizeKey(row.teacher_name) !== normalizeKey(halaqa.teacherName)) {
      return failure([`المعلم غير مطابق للحلقة ${row.halaqa_name}: المعلم في النظام هو ${halaqa.teacherName}.`]);
    }

    const enrollmentKey = joinKey(row.student_name, halaqa.id);
    let studentId = enrollmentByStudentAndHalaqa.get(enrollmentKey)?.studentId ?? studentByName.get(normalizeKey(row.student_name)) ?? "";

    if (!studentId) {
      if (!options.createNewStudents) {
        return failure([`الطالب غير موجود ويحتاج مراجعة قبل الإنشاء: ${row.student_name}`]);
      }

      const { data: created, error: createError } = await supabase
        .from("students")
        .insert({
          full_name: row.student_name,
          level: row.level || null,
          notes: row.notes || null,
          status: "active",
          enrolled_at: row.progress_date || new Date().toISOString().slice(0, 10),
        })
        .select("id")
        .single();

      if (createError || !created?.id) {
        return failure([`تعذر إنشاء الطالب: ${row.student_name}`]);
      }

      studentId = String(created.id);
      studentByName.set(normalizeKey(row.student_name), studentId);
      createdStudents += 1;
    }

    if (!enrollmentByStudentAndHalaqa.has(enrollmentKey)) {
      const { error: enrollmentError } = await supabase
        .from("student_enrollments")
        .insert({ student_id: studentId, halaqa_id: halaqa.id, status: "active" });

      if (enrollmentError) {
        warnings.push(`لم يتم إنشاء ربط الحلقة للطالب ${row.student_name}: ${row.halaqa_name}`);
      } else {
        linkedEnrollments += 1;
        enrollmentByStudentAndHalaqa.set(enrollmentKey, { id: "", studentId });
      }
    }

    const memorizationSurah = findSurah(row.memorization_surah_name);
    const reviewSurah = findSurah(row.review_surah_name);
    const primarySurah = memorizationSurah ?? reviewSurah;
    const primaryFromAyah = row.memorization_surah_name ? row.memorization_from_ayah : row.review_from_ayah;
    const primaryToAyah = row.memorization_surah_name ? row.memorization_to_ayah : row.review_to_ayah;
    const primaryPages = row.memorization_surah_name ? row.memorization_pages : row.review_pages;
    const progressDate = row.progress_date || new Date().toISOString().slice(0, 10);
    const { data: existingProgress } = await supabase
      .from("student_progress_records")
      .select("id,progress_date,memorization_surah_name,memorization_from_ayah,memorization_to_ayah,review_surah_name,review_from_ayah,review_to_ayah")
      .eq("student_id", studentId)
      .eq("halaqa_id", halaqa.id)
      .maybeSingle();

    if (existingProgress && isSameProgress(row, existingProgress as Related, progressDate)) {
      warnings.push(`يوجد منجز سابق مطابق للطالب ${row.student_name}، تم تحديث السجل بدل إنشاء سجل جديد.`);
    }

    const { error: progressError } = await supabase
      .from("student_progress_records")
      .upsert(
        {
          student_id: studentId,
          halaqa_id: halaqa.id,
          teacher_id: halaqa.teacherId || null,
          mosque_id: halaqa.mosqueId || null,
          level: row.level || null,
          memorization_surah_number: memorizationSurah?.number ?? null,
          memorization_surah_name: memorizationSurah?.name ?? (row.memorization_surah_name || null),
          memorization_from_ayah: toPositiveInt(row.memorization_from_ayah),
          memorization_to_ayah: toPositiveInt(row.memorization_to_ayah),
          review_surah_number: reviewSurah?.number ?? null,
          review_surah_name: reviewSurah?.name ?? (row.review_surah_name || null),
          review_from_ayah: toPositiveInt(row.review_from_ayah),
          review_to_ayah: toPositiveInt(row.review_to_ayah),
          memorization_pages: toNumber(row.memorization_pages),
          review_pages: toNumber(row.review_pages),
          entry_type: row.review_surah_name && !row.memorization_surah_name ? "review" : "memorization",
          surah_name: primarySurah?.name ?? row.memorization_surah_name ?? row.review_surah_name ?? null,
          from_ayah: toPositiveInt(primaryFromAyah),
          to_ayah: toPositiveInt(primaryToAyah),
          pages_count: toNumber(primaryPages),
          progress_date: progressDate,
          notes: row.notes || null,
          source: "import",
        },
        { onConflict: "student_id,halaqa_id" },
      );

    if (progressError) {
      return failure([`تعذر حفظ منجز الطالب: ${row.student_name}`]);
    }
  }

  revalidatePath("/dashboard/students");
  revalidatePath("/dashboard/reports/student-progress");
  revalidatePath("/teacher/dashboard");
  revalidatePath("/teacher/progress");
  revalidatePath("/teacher/students");

  return {
    ok: true,
    savedCount: cleanRows.length,
    createdStudents,
    linkedEnrollments,
    errors: [],
    warnings,
  };
}

function validateRows(rows: StudentProgressImportRow[]) {
  const errors: string[] = [];
  rows.forEach((row, index) => {
    const line = index + 2;
    if (!row.student_name) errors.push(`السطر ${line}: اسم الطالب مطلوب.`);
    if (!row.halaqa_name) errors.push(`السطر ${line}: اسم الحلقة مطلوب.`);
    validateSurah(errors, line, "آخر سورة حفظ", row.memorization_surah_name, row.memorization_from_ayah, row.memorization_to_ayah);
    validateSurah(errors, line, "آخر سورة مراجعة", row.review_surah_name, row.review_from_ayah, row.review_to_ayah);
  });
  return errors;
}

function validateSurah(errors: string[], line: number, label: string, surahName?: string, from?: string, to?: string) {
  if (!surahName) return;
  const surah = findSurah(surahName);
  if (!surah) {
    errors.push(`السطر ${line}: ${label} غير معروفة في قائمة السور: ${surahName}.`);
    return;
  }
  const fromAyah = toPositiveInt(from);
  const toAyah = toPositiveInt(to);
  if (fromAyah !== null && fromAyah > surah.ayahCount) {
    errors.push(`السطر ${line}: آية البداية في ${surah.name} أكبر من عدد آيات السورة.`);
  }
  if (toAyah !== null && toAyah > surah.ayahCount) {
    errors.push(`السطر ${line}: آية النهاية في ${surah.name} أكبر من عدد آيات السورة.`);
  }
  if (fromAyah !== null && toAyah !== null && fromAyah > toAyah) {
    errors.push(`السطر ${line}: آية البداية أكبر من آية النهاية في ${surah.name}.`);
  }
}

function normalizeImportRow(row: StudentProgressImportRow): StudentProgressImportRow {
  return {
    student_name: text(row.student_name).trim(),
    halaqa_name: text(row.halaqa_name).trim(),
    teacher_name: text(row.teacher_name).trim(),
    mosque_name: text(row.mosque_name).trim(),
    level: text(row.level).trim(),
    memorization_surah_name: stripSurahPrefix(text(row.memorization_surah_name).trim()),
    memorization_from_ayah: text(row.memorization_from_ayah).trim(),
    memorization_to_ayah: text(row.memorization_to_ayah).trim(),
    review_surah_name: stripSurahPrefix(text(row.review_surah_name).trim()),
    review_from_ayah: text(row.review_from_ayah).trim(),
    review_to_ayah: text(row.review_to_ayah).trim(),
    memorization_pages: text(row.memorization_pages).trim(),
    review_pages: text(row.review_pages).trim(),
    progress_date: normalizeDate(row.progress_date),
    notes: text(row.notes).trim(),
  };
}

function normalizeDate(value?: string) {
  const date = text(value).trim();
  if (!date) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function findSurah(name?: string) {
  const key = normalizeKey(stripSurahPrefix(text(name)));
  if (!key) return null;
  return quranSurahs.find((surah) => normalizeKey(surah.name) === key) ?? null;
}

function stripSurahPrefix(value: string) {
  return value.replace(/^سورة\s+/, "").trim();
}

function toPositiveInt(value?: string) {
  const number = Number(text(value).replace(/[^\d]/g, ""));
  return Number.isFinite(number) && number > 0 ? Math.trunc(number) : null;
}

function toNumber(value?: string) {
  const number = Number(text(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function isSameProgress(row: StudentProgressImportRow, existing: Related, progressDate: string) {
  return (
    text(existing.progress_date) === progressDate &&
    normalizeKey(text(existing.memorization_surah_name)) === normalizeKey(row.memorization_surah_name ?? "") &&
    text(existing.memorization_from_ayah) === text(toPositiveInt(row.memorization_from_ayah) ?? "") &&
    text(existing.memorization_to_ayah) === text(toPositiveInt(row.memorization_to_ayah) ?? "") &&
    normalizeKey(text(existing.review_surah_name)) === normalizeKey(row.review_surah_name ?? "") &&
    text(existing.review_from_ayah) === text(toPositiveInt(row.review_from_ayah) ?? "") &&
    text(existing.review_to_ayah) === text(toPositiveInt(row.review_to_ayah) ?? "")
  );
}

function normalizeKey(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function joinKey(studentName: string, halaqaId: string) {
  return `${normalizeKey(studentName)}::${halaqaId}`;
}

function readObject(value: unknown): Related {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Related) : {};
}

function text(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function failure(errors: string[]): ImportResult {
  return { ok: false, savedCount: 0, createdStudents: 0, linkedEnrollments: 0, errors, warnings: [] };
}
