import { redirect } from "next/navigation";

import { getCurrentUserRoles, requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { previewActorName, readTeacherPreviewId } from "@/lib/teacher-preview";
import { lessonTypeLabels } from "@/lib/teacher-portal-labels";
export {
  attendanceLabels,
  lessonTypeLabels,
  ratingLabels,
  sessionTypeLabels,
} from "@/lib/teacher-portal-labels";

export type TeacherProfile = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  status: string;
  teacherRole: string;
  documentType: string;
  payrollDataStatus: string;
};

export type TeacherHalaqa = {
  id: string;
  name: string;
  period: string;
  mosqueName: string;
  level: string;
  status: string;
  studentCount: number;
};

export type TeacherStudent = {
  id: string;
  fullName: string;
  halaqaId: string;
  halaqaName: string;
  period: string;
  mosqueName: string;
  status: string;
};

export type LastPosition = {
  studentId: string;
  recitation?: PositionEntry;
  review?: PositionEntry;
  lastRating?: string;
  lastNotes?: string;
};

export type PositionEntry = {
  surahName: string;
  fromAyah: number | null;
  toAyah: number | null;
  date: string;
};

export type TeacherRecentEntry = {
  id: string;
  kind: "lesson" | "session";
  title: string;
  subtitle: string;
  date: string;
  type: string;
};

export type TeacherTodayAttendance = {
  studentId: string;
  halaqaId: string;
  status: string;
  date: string;
};

type RelatedObject = Record<string, unknown>;

export async function requireTeacherPortal() {
  const user = await requireAuth();
  const roles = await getCurrentUserRoles(user);

  if (!roles.includes("teacher") && !roles.includes("admin") && !roles.includes("demo_admin") && !roles.includes("halaqat_manager")) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const previewTeacherId = await readTeacherPreviewId(roles);
  const { data, error } = await supabase
    .from("teachers")
    .select("id,full_name,email,phone,status,teacher_role,document_type,payroll_data_status")
    .or(previewTeacherId
      ? `id.eq.${previewTeacherId}`
      : user.email
        ? `auth_user_id.eq.${user.id},email.eq.${user.email}`
        : `auth_user_id.eq.${user.id}`)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("teacher-profile-load-error", error);
    return {
      user,
      roles,
      teacher: null as TeacherProfile | null,
      setupRequired: true,
      loadError: true,
      preview: { active: false, actorName: previewActorName(user.email, roles) },
    };
  }

  if (!data) {
    return {
      user,
      roles,
      teacher: null as TeacherProfile | null,
      setupRequired: true,
      preview: { active: false, actorName: previewActorName(user.email, roles) },
    };
  }

  return {
    user,
    roles,
    teacher: {
      id: String(data.id),
      fullName: readString(data.full_name),
      email: readString(data.email),
      phone: readString(data.phone),
      status: readString(data.status) || "active",
      teacherRole: readString(data.teacher_role) || "teacher",
      documentType: readString(data.document_type) || "other",
      payrollDataStatus: readString(data.payroll_data_status) || "incomplete",
    },
    setupRequired: false,
    preview: {
      active: Boolean(previewTeacherId),
      actorName: previewActorName(user.email, roles),
      teacherId: previewTeacherId ?? undefined,
      teacherName: readString(data.full_name),
    },
  };
}

export async function getTeacherPortalData(attendanceDate?: string) {
  const context = await requireTeacherPortal();
  if (!context.teacher) {
    return { ...context, halaqat: [], students: [], recentEntries: [], lastPositions: [], todayAttendance: [], loadError: "loadError" in context ? Boolean(context.loadError) : false };
  }

  const supabase = await createClient();
  const teacherId = context.teacher.id;
  const day = validDate(attendanceDate) ? attendanceDate : new Date().toISOString().slice(0, 10);
  const [halaqatResult, lessonsResult, sessionsResult] = await Promise.all([
    supabase
      .from("halaqat")
      .select("id,name,period,level,status,mosques!halaqat_mosque_id_fkey(name)")
      .or(`teacher_id.eq.${teacherId},assistant_teacher_id.eq.${teacherId}`)
      .is("archived_at", null)
      .order("name")
      .limit(100),
    supabase
      .from("teacher_circle_lessons")
      .select("id,lesson_date,lesson_type,lesson_title,halaqat!teacher_circle_lessons_halaqa_id_fkey(name)")
      .eq("teacher_id", teacherId)
      .is("archived_at", null)
      .order("lesson_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("teacher_session_entries")
      .select("id,student_id,session_date,created_at,session_type,rating,notes,recitation_surah_name,recitation_from_ayah,recitation_to_ayah,review_surah_name,review_from_ayah,review_to_ayah,students!teacher_session_entries_student_id_fkey(full_name),halaqat!teacher_session_entries_halaqa_id_fkey(name)")
      .eq("teacher_id", teacherId)
      .is("archived_at", null)
      .order("session_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(2000),
  ]);

  for (const result of [halaqatResult, lessonsResult, sessionsResult]) {
    if (result.error) {
      console.error("teacher-portal-data-load-error", result.error);
      return {
        ...context,
        halaqat: [],
        students: [],
        recentEntries: [],
        lastPositions: [],
        todayAttendance: [],
        loadError: true,
      };
    }
  }

  const halaqaIds = new Set((halaqatResult.data ?? []).map((item) => String(item.id)));
  const studentsResult = halaqaIds.size > 0
    ? await supabase
      .from("student_enrollments")
      .select("halaqa_id,halaqat!student_enrollments_halaqa_id_fkey(id,name,period,mosques!halaqat_mosque_id_fkey(name)),students!student_enrollments_student_id_fkey(id,full_name,status)")
      .in("halaqa_id", [...halaqaIds])
      .eq("status", "active")
      .is("archived_at", null)
      .limit(1000)
    : { data: [], error: null };

  if (studentsResult.error) {
    console.error("teacher-portal-data-load-error", studentsResult.error);
    return {
      ...context,
        halaqat: [],
        students: [],
        recentEntries: [],
        lastPositions: [],
        todayAttendance: [],
        loadError: true,
      };
  }

  const students = ((studentsResult.data ?? []) as unknown as RelatedObject[])
    .filter((enrollment) => halaqaIds.has(readString(enrollment.halaqa_id)))
    .map((enrollment) => {
      const student = readObject(enrollment.students);
      const halaqa = readObject(enrollment.halaqat);
      return {
        id: readString(student.id),
        fullName: readString(student.full_name),
        halaqaId: readString(enrollment.halaqa_id),
        halaqaName: readString(halaqa.name),
        period: readString(halaqa.period),
        mosqueName: readString(readObject(halaqa.mosques).name),
        status: readString(student.status) || "active",
      } satisfies TeacherStudent;
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "ar"));

  const attendanceResult = halaqaIds.size > 0
    ? await supabase
      .from("attendance")
      .select("student_id,halaqa_id,status,session_date")
      .in("halaqa_id", [...halaqaIds])
      .eq("session_date", day)
      .limit(2000)
    : { data: [], error: null };

  const studentIds = [...new Set(students.map((student) => student.id).filter(Boolean))];
  const progressResult = studentIds.length > 0
    ? await supabase
      .from("student_progress_records")
      .select("student_id,progress_date,created_at,entry_type,rating,notes,surah_name,from_ayah,to_ayah,memorization_surah_name,memorization_from_ayah,memorization_to_ayah,review_surah_name,review_from_ayah,review_to_ayah")
      .in("student_id", studentIds)
      .is("archived_at", null)
      .order("progress_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(3000)
    : { data: [], error: null };

  if (attendanceResult.error || progressResult.error) {
    console.error("teacher-portal-attendance-load-error", attendanceResult.error);
    return {
      ...context,
      halaqat: [],
      students: [],
      recentEntries: [],
      lastPositions: [],
      todayAttendance: [],
      loadError: true,
    };
  }

  const studentCountsByHalaqa = new Map<string, number>();
  for (const enrollment of (studentsResult.data ?? []) as unknown as RelatedObject[]) {
    const halaqaId = readString(enrollment.halaqa_id);
    if (halaqaId) studentCountsByHalaqa.set(halaqaId, (studentCountsByHalaqa.get(halaqaId) ?? 0) + 1);
  }

  const halaqat = ((halaqatResult.data ?? []) as unknown as RelatedObject[]).map((halaqa) => {
    return {
      id: readString(halaqa.id),
      name: readString(halaqa.name),
      period: readString(halaqa.period),
      mosqueName: readString(readObject(halaqa.mosques).name),
      level: readString(halaqa.level),
      status: readString(halaqa.status),
      studentCount: studentCountsByHalaqa.get(readString(halaqa.id)) ?? 0,
    } satisfies TeacherHalaqa;
  });

  const sessionRows = (sessionsResult.data ?? []) as unknown as RelatedObject[];
  const recentEntries: TeacherRecentEntry[] = [
    ...((lessonsResult.data ?? []) as unknown as RelatedObject[]).map((lesson) => ({
      id: readString(lesson.id),
      kind: "lesson" as const,
      title: readString(lesson.lesson_title) || lessonTypeLabels[readString(lesson.lesson_type)] || "حصة عامة",
      subtitle: readString(readObject(lesson.halaqat).name),
      date: readString(lesson.lesson_date),
      type: readString(lesson.lesson_type),
    })),
    ...sessionRows.slice(0, 8).map((session) => ({
      id: readString(session.id),
      kind: "session" as const,
      title: readString(readObject(session.students).full_name),
      subtitle: readString(readObject(session.halaqat).name),
      date: readString(session.session_date),
      type: readString(session.session_type),
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);

  return {
    ...context,
    halaqat,
    students,
    recentEntries,
    lastPositions: buildLastPositions(
      sessionRows,
      (progressResult.data ?? []) as unknown as RelatedObject[],
    ),
    todayAttendance: ((attendanceResult.data ?? []) as unknown as RelatedObject[]).map((row) => ({
      studentId: readString(row.student_id),
      halaqaId: readString(row.halaqa_id),
      status: readString(row.status),
      date: readString(row.session_date),
    })),
    loadError: false,
  };
}

export function buildLastPositions(sessionRows: RelatedObject[], progressRows: RelatedObject[] = []) {
  const byStudent = new Map<string, LastPosition>();

  const rows = [
    ...sessionRows.map((row) => ({
      row,
      date: readString(row.session_date),
      createdAt: readString(row.created_at),
      recitationSurahName: readString(row.recitation_surah_name),
      recitationFromAyah: row.recitation_from_ayah,
      recitationToAyah: row.recitation_to_ayah,
      reviewSurahName: readString(row.review_surah_name),
      reviewFromAyah: row.review_from_ayah,
      reviewToAyah: row.review_to_ayah,
    })),
    ...progressRows.map((row) => {
      const isReview = readString(row.entry_type) === "review";
      return {
        row,
        date: readString(row.progress_date),
        createdAt: readString(row.created_at),
        recitationSurahName: readString(row.memorization_surah_name) || (!isReview ? readString(row.surah_name) : ""),
        recitationFromAyah: row.memorization_from_ayah ?? (!isReview ? row.from_ayah : null),
        recitationToAyah: row.memorization_to_ayah ?? (!isReview ? row.to_ayah : null),
        reviewSurahName: readString(row.review_surah_name) || (isReview ? readString(row.surah_name) : ""),
        reviewFromAyah: row.review_from_ayah ?? (isReview ? row.from_ayah : null),
        reviewToAyah: row.review_to_ayah ?? (isReview ? row.to_ayah : null),
      };
    }),
  ].sort((a, b) => `${b.date}|${b.createdAt}`.localeCompare(`${a.date}|${a.createdAt}`));

  for (const entry of rows) {
    const row = entry.row;
    const studentId = readString(row.student_id);
    if (!studentId) continue;

    const current = byStudent.get(studentId) ?? { studentId };
    if (!current.recitation && entry.recitationSurahName) {
      current.recitation = {
        surahName: entry.recitationSurahName,
        fromAyah: readNumberOrNull(entry.recitationFromAyah),
        toAyah: readNumberOrNull(entry.recitationToAyah),
        date: entry.date,
      };
    }
    if (!current.review && entry.reviewSurahName) {
      current.review = {
        surahName: entry.reviewSurahName,
        fromAyah: readNumberOrNull(entry.reviewFromAyah),
        toAyah: readNumberOrNull(entry.reviewToAyah),
        date: entry.date,
      };
    }
    if (!current.lastRating) current.lastRating = readString(row.rating);
    if (!current.lastNotes) current.lastNotes = readString(row.notes);
    byStudent.set(studentId, current);
  }

  return [...byStudent.values()];
}

function readObject(value: unknown): RelatedObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as RelatedObject)
    : {};
}

function readString(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function readNumberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function validDate(value?: string) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}
