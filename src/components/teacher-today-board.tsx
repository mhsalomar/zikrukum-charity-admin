"use client";

import Link from "next/link";
import { ArrowLeft, BookOpen, ClipboardPenLine, Search, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";

import { attendanceLabels, ratingLabels } from "@/lib/teacher-portal-labels";

type TeacherStudent = {
  id: string;
  fullName: string;
  halaqaId: string;
  halaqaName: string;
  period: string;
  mosqueName: string;
};

type LastPosition = {
  studentId: string;
  recitation?: PositionEntry;
  review?: PositionEntry;
  lastRating?: string;
};

type PositionEntry = {
  surahName: string;
  fromAyah: number | null;
  toAyah: number | null;
  date: string;
};

type TeacherTodayAttendance = {
  studentId: string;
  status: string;
};

const attendanceStatusLabels: Record<string, string> = {
  ...attendanceLabels,
  not_recorded: "لم يسجل",
};

const statusClass: Record<string, string> = {
  present: "border-emerald-200 bg-emerald-50 text-emerald-800",
  late: "border-amber-200 bg-amber-50 text-amber-800",
  excused: "border-sky-200 bg-sky-50 text-sky-800",
  absent: "border-red-200 bg-red-50 text-red-800",
  not_recorded: "border-[#e4dccb] bg-[#f7f2e8] text-[#5f6b63]",
};

const periodLabels: Record<string, string> = {
  fajr: "الفجر",
  asr: "العصر",
  maghrib: "المغرب",
  isha: "العشاء",
};

type Filter = "all" | "needs" | "not_recorded" | "absent";

export function TeacherTodayBoard({
  students,
  attendance,
  lastPositions,
  date,
}: {
  students: TeacherStudent[];
  attendance: TeacherTodayAttendance[];
  lastPositions: LastPosition[];
  date: string;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const attendanceByStudent = useMemo(() => new Map(attendance.map((item) => [item.studentId, item])), [attendance]);
  const positionByStudent = useMemo(() => new Map(lastPositions.map((item) => [item.studentId, item])), [lastPositions]);

  const rows = useMemo(() => {
    const normalized = query.trim();
    return students
      .map((student) => {
        const status = attendanceByStudent.get(student.id)?.status || "not_recorded";
        const position = positionByStudent.get(student.id);
        const needsFollowup =
          status === "not_recorded" ||
          status === "absent" ||
          status === "late" ||
          position?.lastRating === "needs_follow_up";
        return { student, status, position, needsFollowup };
      })
      .filter(({ student, status, needsFollowup }) => {
        const matchesQuery =
          !normalized ||
          student.fullName.includes(normalized) ||
          student.halaqaName.includes(normalized) ||
          student.mosqueName.includes(normalized);
        if (!matchesQuery) return false;
        if (filter === "needs") return needsFollowup;
        if (filter === "not_recorded") return status === "not_recorded";
        if (filter === "absent") return status === "absent" || status === "late";
        return true;
      });
  }, [attendanceByStudent, filter, positionByStudent, query, students]);

  const counts = useMemo(() => {
    const all = students.map((student) => attendanceByStudent.get(student.id)?.status || "not_recorded");
    return {
      total: students.length,
      present: all.filter((status) => status === "present").length,
      notRecorded: all.filter((status) => status === "not_recorded").length,
      needs: students.filter((student) => {
        const status = attendanceByStudent.get(student.id)?.status || "not_recorded";
        const position = positionByStudent.get(student.id);
        return status === "not_recorded" || status === "absent" || status === "late" || position?.lastRating === "needs_follow_up";
      }).length,
    };
  }, [attendanceByStudent, positionByStudent, students]);

  return (
    <section className="app-card rounded-[1.7rem] p-4 sm:p-6" id="teacher-day-board">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold text-[var(--gold)]">متابعة الحلقة</p>
          <h2 className="mt-1 text-2xl font-bold text-[var(--primary-dark)]">طلاب الحلقة وسجل التسميع</h2>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
          <MiniMetric label="الطلاب" value={counts.total} />
          <MiniMetric label="حاضر" value={counts.present} tone="success" />
          <MiniMetric label="لم يسجل" value={counts.notRecorded} tone="warning" />
          <MiniMetric label="تحتاج متابعة" value={counts.needs} tone="danger" />
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
        <label className="relative block">
          <span className="sr-only">بحث الطلاب</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث باسم الطالب أو الحلقة أو المسجد"
            className="h-12 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 pl-11 text-sm font-bold outline-none focus:border-[var(--gold)]"
          />
          <Search aria-hidden className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--gold)]" />
        </label>
        <div className="flex flex-wrap gap-2">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="الكل" />
          <FilterChip active={filter === "needs"} onClick={() => setFilter("needs")} label="يحتاج متابعة" />
          <FilterChip active={filter === "not_recorded"} onClick={() => setFilter("not_recorded")} label="لم يسجل حضور" />
          <FilterChip active={filter === "absent"} onClick={() => setFilter("absent")} label="غياب أو تأخر" />
        </div>
      </div>

      {students.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-[var(--line)] bg-[#fffdf8] p-5 text-center text-sm font-bold leading-7 text-[var(--muted)]">
          لا يوجد طلاب مرتبطون بحلقاتك حاليًا. عند ربط الطلاب ستظهر هنا قائمة العمل اليومية.
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-[var(--line)] bg-[#fffdf8] p-5 text-center text-sm font-bold leading-7 text-[var(--muted)]">
          لا توجد نتائج مطابقة للبحث أو التصفية الحالية.
        </p>
      ) : (
        <div className="mt-5 grid gap-3">
          {rows.slice(0, 24).map(({ student, status, position }) => (
            <article key={`${student.halaqaId}-${student.id}`} className="rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-4">
              <div className="grid gap-4 lg:grid-cols-[1fr_1.25fr_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-[var(--primary-dark)]">{student.fullName}</h3>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass[status] ?? statusClass.not_recorded}`}>
                      {attendanceStatusLabels[status] ?? status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-bold leading-6 text-[var(--muted)]">
                    {student.halaqaName} — {periodLabels[student.period] ?? student.period} — {student.mosqueName || "المسجد غير محدد"}
                  </p>
                </div>

                <div className="grid gap-2 text-xs font-bold leading-6 text-[var(--muted)] sm:grid-cols-3">
                  <Info label="آخر حفظ" value={formatPosition(position?.recitation)} icon={BookOpen} />
                  <Info label="آخر مراجعة" value={formatPosition(position?.review)} icon={BookOpen} />
                  <Info label="التقييم" value={position?.lastRating ? ratingLabels[position.lastRating] ?? position.lastRating : "غير محدد"} icon={ClipboardPenLine} />
                </div>

                <div className="grid gap-2 sm:flex lg:justify-end">
                  <Link
                    href={`/teacher/dashboard?attendanceHalaqa=${student.halaqaId}&attendanceDate=${date}&student=${student.id}#teacher-recitation`}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-4 text-xs font-semibold text-white"
                  >
                    سجل تسميع
                    <ArrowLeft aria-hidden className="size-4" />
                  </Link>
                  <Link
                    href={`/teacher/students/${student.id}`}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-[var(--line)] bg-white px-4 text-xs font-semibold text-[var(--primary-dark)]"
                  >
                    ملف الطالب
                    <UsersRound aria-hidden className="size-4 text-[var(--gold)]" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function MiniMetric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const classes = {
    default: "border-[#e4dccb] bg-[#fffdf8] text-[var(--primary-dark)]",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    danger: "border-red-200 bg-red-50 text-red-800",
  }[tone];

  return (
    <div className={`rounded-2xl border px-3 py-2 ${classes}`}>
      <p className="text-xs font-semibold">{label}</p>
      <p className="mt-1 text-2xl font-bold">{new Intl.NumberFormat("ar-SA").format(value)}</p>
    </div>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 rounded-2xl border px-4 text-xs font-semibold transition ${
        active
          ? "border-[var(--primary)] bg-[var(--primary)] text-white"
          : "border-[var(--line)] bg-[#fffdf8] text-[var(--primary-dark)] hover:border-[var(--gold)]"
      }`}
    >
      {label}
    </button>
  );
}

function Info({ label, value, icon: Icon }: { label: string; value: string; icon: typeof BookOpen }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-3">
      <p className="flex items-center gap-1.5 text-[0.7rem] font-semibold text-[var(--gold)]">
        <Icon aria-hidden className="size-3.5" />
        {label}
      </p>
      <p className="mt-1 line-clamp-2 text-[0.8rem] font-semibold text-[var(--primary-dark)]">{value}</p>
    </div>
  );
}

function formatPosition(entry?: LastPosition["recitation"]) {
  if (!entry) return "لا يوجد";
  const range = entry.fromAyah || entry.toAyah ? ` ${entry.fromAyah ?? ""}-${entry.toAyah ?? ""}` : "";
  return `${entry.surahName}${range} — ${formatDate(entry.date)}`;
}

function formatDate(value: string) {
  if (!value) return "تاريخ غير محدد";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("ar-SA").format(date);
}
