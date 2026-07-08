import { redirect } from "next/navigation";
import { CheckCircle2, Clock, MinusCircle, XCircle } from "lucide-react";

import { AttendanceSelectAll } from "@/components/attendance-select-all";
import { requireTeacherPortal } from "@/lib/teacher-portal";
import { createClient } from "@/lib/supabase/server";
import { saveAttendance } from "./actions";

type SearchParams = Promise<{ date?: string; halaqa?: string; saved?: string; error?: string }>;

const periodLabels: Record<string, string> = {
  fajr: "الفجر",
  asr: "العصر",
  maghrib: "المغرب",
  isha: "العشاء",
};

export default async function TeacherAttendancePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { teacher } = await requireTeacherPortal();
  if (!teacher) redirect("/teacher/dashboard?error=teacher-profile");

  const today = new Date().toISOString().slice(0, 10);
  const selectedDate = params.date || today;

  const supabase = await createClient();

  // حلقات المعلم
  const { data: halaqatData } = await supabase
    .from("halaqat")
    .select("id,name,period,mosques!halaqat_mosque_id_fkey(name)")
    .or(`teacher_id.eq.${teacher.id},assistant_teacher_id.eq.${teacher.id}`)
    .eq("status", "active")
    .is("archived_at", null)
    .order("name");

  const halaqat = (halaqatData ?? []) as unknown as { id: string; name: string; period: string; mosques: { name: string } | null }[];
  const selectedHalaqaId = params.halaqa || halaqat[0]?.id || "";

  // طلاب الحلقة المختارة
  const { data: enrollments } = await supabase
    .from("student_enrollments")
    .select("id,student_id,students!student_enrollments_student_id_fkey(id,full_name,level)")
    .eq("halaqa_id", selectedHalaqaId)
    .eq("status", "active")
    .is("archived_at", null)
    .order("students(full_name)");

  const students = (enrollments ?? []).map((e) => {
    const s = e.students as unknown as { id: string; full_name: string; level: string } | null;
    return { id: s?.id ?? "", fullName: s?.full_name ?? "", level: s?.level ?? "" };
  }).filter((s) => s.id);

  // سجل الحضور الموجود لهذا اليوم
  const { data: existingAttendance } = await supabase
    .from("attendance")
    .select("student_id,status,notes")
    .eq("halaqa_id", selectedHalaqaId)
    .eq("session_date", selectedDate);

  const attendanceMap = new Map(
    (existingAttendance ?? []).map((r) => [r.student_id as string, r.status as string])
  );

  const isSaved = !!params.saved;

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 pb-24">
      {/* Hero */}
      <section className="app-card luxury-pattern overflow-hidden rounded-[1.7rem]">
        <div className="relative border-r-4 border-[var(--gold)] p-5 sm:p-7">
          <p className="mb-1 text-sm font-semibold text-[var(--gold)]">بوابة المعلم</p>
          <h1 className="text-2xl font-bold text-[var(--primary-dark)] sm:text-3xl">تسجيل الحضور</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">حدد الحلقة والتاريخ ثم سجّل حضور طلابك.</p>
        </div>
      </section>

      {isSaved && (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
          ✓ تم حفظ سجل الحضور بنجاح.
        </p>
      )}
      {params.error && (
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          تعذر الحفظ. تأكد من الاختيارات وحاول مرة أخرى.
        </p>
      )}

      {/* اختيار الحلقة والتاريخ */}
      <form method="GET" className="app-card rounded-2xl p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[var(--muted)]">الحلقة</span>
            <select
              name="halaqa"
              defaultValue={selectedHalaqaId}
              className="h-12 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm font-bold text-[var(--primary-dark)] focus:border-[var(--primary)] focus:outline-none"
              
            >
              {halaqat.map((h) => (
                <option key={h.id} value={h.id}>{h.name} — {periodLabels[h.period] ?? h.period}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[var(--muted)]">التاريخ</span>
            <input
              type="date"
              name="date"
              defaultValue={selectedDate}
              max={today}
              className="h-12 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm font-bold text-[var(--primary-dark)] focus:border-[var(--primary)] focus:outline-none"
              
            />
          </label>
        </div>
        <button type="submit" className="mt-3 rounded-xl border border-[var(--line)] bg-[#fffdf8] px-4 py-2 text-xs font-semibold text-[var(--primary-dark)]">
          تحديث
        </button>
      </form>

      {/* قائمة الطلاب */}
      {students.length === 0 ? (
        <p className="rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-6 text-center text-sm font-bold text-[var(--muted)]">
          لا يوجد طلاب في هذه الحلقة.
        </p>
      ) : (
        <form id="attendance-form" action={saveAttendance}>
          <input type="hidden" name="halaqa_id" value={selectedHalaqaId} />
          <input type="hidden" name="session_date" value={selectedDate} />
          <div className="mb-3">
            <AttendanceSelectAll formId="attendance-form" />
          </div>

          <div className="space-y-3">
            {students.map((student) => {
              const current = attendanceMap.get(student.id) ?? "present";
              return (
                <div key={student.id} className="app-card rounded-2xl p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-[var(--primary-dark)]">{student.fullName}</p>
                      {student.level && <p className="text-xs font-bold text-[var(--muted)]">{student.level}</p>}
                    </div>
                    <div className="flex gap-2">
                      {(["present", "late", "excused", "absent"] as const).map((status) => (
                        <AttendanceToggle
                          key={status}
                          studentId={student.id}
                          status={status}
                          checked={current === status}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="submit"
            className="mt-5 flex h-13 w-full items-center justify-center rounded-2xl bg-[var(--primary)] text-base font-semibold text-white shadow-lg shadow-[var(--primary)]/20"
          >
            حفظ الحضور ({students.length} طالب)
          </button>
        </form>
      )}
    </div>
  );
}

function AttendanceToggle({
  studentId,
  status,
  checked,
}: {
  studentId: string;
  status: "present" | "absent" | "late" | "excused";
  checked: boolean;
}) {
  const config = {
    present:  { icon: CheckCircle2, label: "حاضر",  color: "text-emerald-600 border-emerald-300 bg-emerald-50",  active: "bg-emerald-500 border-emerald-500 text-white" },
    late:     { icon: Clock,         label: "متأخر",  color: "text-amber-600  border-amber-300  bg-amber-50",   active: "bg-amber-500  border-amber-500  text-white" },
    excused:  { icon: MinusCircle,   label: "بعذر",   color: "text-blue-600   border-blue-300   bg-blue-50",    active: "bg-blue-500   border-blue-500   text-white" },
    absent:   { icon: XCircle,       label: "غائب",   color: "text-red-600    border-red-300    bg-red-50",     active: "bg-red-500    border-red-500    text-white" },
  } as const;
  const { icon: Icon, label, color, active } = config[status];

  return (
    <label className="cursor-pointer">
      <input type="radio" name={`status_${studentId}`} value={status} defaultChecked={checked} className="sr-only" />
      <span className={`flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition ${checked ? active : color}`}>
        <Icon className="size-3.5" aria-hidden />
        {label}
      </span>
    </label>
  );
}
