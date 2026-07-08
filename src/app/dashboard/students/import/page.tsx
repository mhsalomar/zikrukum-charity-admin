import { StudentProgressImporter } from "@/components/student-progress-importer";
import { requireAnyRole } from "@/lib/auth";
import { operationalRoles } from "@/lib/operational-resources";
import { createClient } from "@/lib/supabase/server";

type Related = Record<string, unknown>;

export default async function StudentProgressImportPage() {
  await requireAnyRole([...operationalRoles]);
  const [halaqat, students, enrollments, progressRecords] = await Promise.all([
    getHalaqat(),
    getStudents(),
    getEnrollments(),
    getProgressRecords(),
  ]);

  return (
    <StudentProgressImporter
      halaqat={halaqat}
      students={students}
      enrollments={enrollments}
      progressRecords={progressRecords}
    />
  );
}

async function getHalaqat() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("halaqat")
    .select("id,name,teachers!halaqat_teacher_id_fkey(full_name),mosques!halaqat_mosque_id_fkey(name)")
    .is("archived_at", null)
    .order("name")
    .limit(500);

  return ((data ?? []) as Related[]).map((halaqa) => ({
    id: text(halaqa.id),
    name: text(halaqa.name),
    teacherName: text(readObject(halaqa.teachers).full_name),
    mosqueName: text(readObject(halaqa.mosques).name),
  }));
}

async function getStudents() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("students")
    .select("id,full_name")
    .is("archived_at", null)
    .order("full_name")
    .limit(5000);

  return ((data ?? []) as Related[]).map((student) => ({
    id: text(student.id),
    fullName: text(student.full_name),
  }));
}

async function getEnrollments() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_enrollments")
    .select("student_id,halaqa_id,status,archived_at,students!student_enrollments_student_id_fkey(full_name)")
    .limit(5000);

  return ((data ?? []) as Related[])
    .filter((enrollment) => text(enrollment.status) === "active" && !enrollment.archived_at)
    .map((enrollment) => ({
      studentName: text(readObject(enrollment.students).full_name),
      studentId: text(enrollment.student_id),
      halaqaId: text(enrollment.halaqa_id),
    }));
}

async function getProgressRecords() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_progress_records")
    .select("student_id,halaqa_id,progress_date,memorization_surah_name,memorization_from_ayah,memorization_to_ayah,review_surah_name,review_from_ayah,review_to_ayah")
    .is("archived_at", null)
    .limit(5000);

  return ((data ?? []) as Related[]).map((record) => ({
    studentId: text(record.student_id),
    halaqaId: text(record.halaqa_id),
    progressDate: text(record.progress_date),
    memorizationSurahName: text(record.memorization_surah_name),
    memorizationFromAyah: text(record.memorization_from_ayah),
    memorizationToAyah: text(record.memorization_to_ayah),
    reviewSurahName: text(record.review_surah_name),
    reviewFromAyah: text(record.review_from_ayah),
    reviewToAyah: text(record.review_to_ayah),
  }));
}

function readObject(value: unknown): Related {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Related) : {};
}

function text(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}
