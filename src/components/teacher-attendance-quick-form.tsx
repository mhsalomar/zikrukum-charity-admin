import { CheckCircle2, Clock, MinusCircle, XCircle } from "lucide-react";

import { saveAttendance } from "@/app/teacher/attendance/actions";
import { createClient } from "@/lib/supabase/server";
import type { TeacherHalaqa, TeacherStudent } from "@/lib/teacher-portal";

const periodLabels: Record<string, string> = {
  fajr: "الفجر",
  asr: "العصر",
  maghrib: "المغرب",
  isha: "العشاء",
};

export async function TeacherAttendanceQuickForm({
  teacherId,
  halaqat,
  students,
  selectedHalaqaId,
  selectedDate,
  saved,
  error,
}: {
  teacherId: string;
  halaqat: TeacherHalaqa[];
  students: TeacherStudent[];
  selectedHalaqaId?: string;
  selectedDate?: string;
  saved?: string;
  error?: string;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const date = selectedDate || today;
  const halaqaId = halaqat.some((halaqa) => halaqa.id === selectedHalaqaId)
    ? selectedHalaqaId || ""
    : halaqat[0]?.id || "";
  const halaqaStudents = students.filter((student) => student.halaqaId === halaqaId);
  const selectedHalaqa = halaqat.find((halaqa) => halaqa.id === halaqaId);

  const supabase = await createClient();
  const { data: existingAttendance } = halaqaId
    ? await supabase
      .from("attendance")
      .select("student_id,status")
      .eq("halaqa_id", halaqaId)
      .eq("session_date", date)
      .limit(1000)
    : { data: [] };

  const attendanceMap = new Map(
    (existingAttendance ?? []).map((row) => [String(row.student_id), String(row.status)]),
  );

  return (
    <section id="teacher-attendance" className="app-card scroll-mt-24 rounded-[1.7rem] p-4 sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold text-[var(--gold)]">ابدأ الحصة من هنا</p>
          <h2 className="mt-1 text-xl font-bold text-[var(--primary-dark)]">تسجيل حضور اليوم</h2>
          <p className="mt-2 text-sm font-bold leading-7 text-[var(--muted)]">
            اختر الحلقة والتاريخ، ثم احفظ حضور الطلاب من نفس لوحة المعلم.
          </p>
        </div>
        <span className="w-fit rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 py-2 text-xs font-semibold text-[var(--primary-dark)]">
          {selectedHalaqa ? `${selectedHalaqa.name} — ${periodLabels[selectedHalaqa.period] ?? selectedHalaqa.period}` : "لا توجد حلقة"}
        </span>
      </div>

      {saved ? (
        <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
          تم حفظ حضور الطلاب بنجاح.
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
          تعذر حفظ الحضور. راجع الحلقة والطلاب ثم حاول مرة أخرى.
        </p>
      ) : null}

      <form method="GET" action="/teacher/dashboard" className="mt-5 grid gap-3 rounded-3xl border border-[var(--line)] bg-[#fffdf8] p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <label className="block text-sm font-bold text-[var(--text)]">
          الحلقة
          <select
            name="attendanceHalaqa"
            defaultValue={halaqaId}
            className="mt-2 h-12 w-full rounded-2xl border border-[var(--line)] bg-white px-4 text-sm font-semibold outline-none focus:border-[var(--gold)]"
          >
            {halaqat.length === 0 ? <option value="">لا توجد حلقات مرتبطة</option> : null}
            {halaqat.map((halaqa) => (
              <option key={halaqa.id} value={halaqa.id}>
                {halaqa.name} — {periodLabels[halaqa.period] ?? halaqa.period}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-bold text-[var(--text)]">
          التاريخ
          <input
            type="date"
            name="attendanceDate"
            defaultValue={date}
            max={today}
            className="mt-2 h-12 w-full rounded-2xl border border-[var(--line)] bg-white px-4 text-sm font-semibold outline-none focus:border-[var(--gold)]"
          />
        </label>
        <button type="submit" className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[var(--line)] bg-white px-5 text-sm font-semibold text-[var(--primary-dark)]">
          عرض الطلاب
        </button>
      </form>

      {halaqat.length === 0 ? (
        <EmptyAttendance text="لا توجد حلقة مرتبطة بحسابك. تواصل مع الإدارة لربطك بحلقة." />
      ) : halaqaStudents.length === 0 ? (
        <EmptyAttendance text="لا يوجد طلاب في هذه الحلقة حتى الآن." />
      ) : (
        <form action={saveAttendance} className="mt-5">
          <input type="hidden" name="halaqa_id" value={halaqaId} />
          <input type="hidden" name="session_date" value={date} />
          <input type="hidden" name="return_to" value="/teacher/dashboard" />
          <input type="hidden" name="teacher_id_hint" value={teacherId} />

          <div className="grid gap-3">
            {halaqaStudents.map((student) => {
              const current = attendanceMap.get(student.id) || "present";
              return (
                <article key={student.id} className="rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-[var(--primary-dark)]">{student.fullName}</p>
                      <p className="mt-1 text-xs font-bold text-[var(--muted)]">{student.halaqaName}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex">
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
                </article>
              );
            })}
          </div>

          <button className="mt-5 flex min-h-12 w-full items-center justify-center rounded-2xl bg-[var(--primary)] px-5 text-base font-semibold text-white shadow-lg shadow-[var(--primary)]/20">
            حفظ حضور الحلقة ({halaqaStudents.length} طالب)
          </button>
        </form>
      )}
    </section>
  );
}

function EmptyAttendance({ text }: { text: string }) {
  return (
    <p className="mt-5 rounded-2xl border border-dashed border-[var(--line)] bg-[#fffdf8] p-5 text-center text-sm font-bold leading-7 text-[var(--muted)]">
      {text}
    </p>
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
    present: { icon: CheckCircle2, label: "حاضر", color: "text-emerald-700 border-emerald-300 bg-emerald-50", active: "bg-emerald-600 border-emerald-600 text-white" },
    late: { icon: Clock, label: "متأخر", color: "text-amber-700 border-amber-300 bg-amber-50", active: "bg-amber-500 border-amber-500 text-white" },
    excused: { icon: MinusCircle, label: "بعذر", color: "text-sky-700 border-sky-300 bg-sky-50", active: "bg-sky-600 border-sky-600 text-white" },
    absent: { icon: XCircle, label: "غائب", color: "text-red-700 border-red-300 bg-red-50", active: "bg-red-600 border-red-600 text-white" },
  } as const;
  const { icon: Icon, label, color, active } = config[status];

  return (
    <label className="cursor-pointer">
      <input type="radio" name={`status_${studentId}`} value={status} defaultChecked={checked} className="sr-only" />
      <span className={`flex min-h-10 items-center justify-center gap-1 rounded-xl border px-3 py-2 text-xs font-semibold transition ${checked ? active : color}`}>
        <Icon className="size-4" aria-hidden />
        {label}
      </span>
    </label>
  );
}
