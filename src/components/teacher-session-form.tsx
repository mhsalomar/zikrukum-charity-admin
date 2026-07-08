"use client";

import { BookOpen, CheckCircle2, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { createCircleLesson, createStudentSession } from "@/app/teacher/actions";
import { quranSurahs } from "@/lib/quran-surahs";
import {
  ratingLabels,
} from "@/lib/teacher-portal-labels";
import type {
  LastPosition,
  TeacherHalaqa,
  TeacherStudent,
} from "@/lib/teacher-portal";

const today = new Date().toISOString().slice(0, 10);

export function TeacherSessionForm({
  halaqat,
  students,
  lastPositions,
  initialHalaqaId,
  initialStudentId,
  saved,
  error,
}: {
  halaqat: TeacherHalaqa[];
  students: TeacherStudent[];
  lastPositions: LastPosition[];
  initialHalaqaId?: string;
  initialStudentId?: string;
  saved?: string;
  error?: string;
}) {
  const [mode, setMode] = useState<"tajweed" | "recitation">("recitation");
  const [halaqaId, setHalaqaId] = useState(initialHalaqaId || halaqat[0]?.id || "");
  const [studentQuery, setStudentQuery] = useState("");
  const [studentId, setStudentId] = useState(initialStudentId || "");
  const [formError, setFormError] = useState("");

  const halaqaStudents = useMemo(
    () =>
      students
        .filter((student) => student.halaqaId === halaqaId)
        .filter((student) => student.fullName.includes(studentQuery.trim())),
    [halaqaId, studentQuery, students],
  );
  const selectedStudent = students.find((student) => student.id === studentId);
  const lastPosition = lastPositions.find((item) => item.studentId === studentId);

  return (
    <div className="app-card rounded-[1.7rem] p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-[var(--gold)]">إدخال مريح للمعلم</p>
          <h2 className="mt-1 text-xl font-bold text-[var(--primary-dark)]">
            تسجيل تسميع أو درس تجويد
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-1 text-sm font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode("recitation");
              setFormError("");
            }}
            className={`rounded-xl px-4 py-2 ${mode === "recitation" ? "bg-[var(--primary-dark)] text-white" : "text-[var(--primary-dark)]"}`}
          >
            تسميع
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("tajweed");
              setFormError("");
            }}
            className={`rounded-xl px-4 py-2 ${mode === "tajweed" ? "bg-[var(--primary-dark)] text-white" : "text-[var(--primary-dark)]"}`}
          >
            تجويد
          </button>
        </div>
      </div>
      {formError ? (
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
          {formError}
        </p>
      ) : null}
      {saved ? (
        <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
          تم حفظ إدخال المعلم بنجاح.
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
          {errorMessage(error)}
        </p>
      ) : null}

      {mode === "tajweed" ? (
        <form action={createCircleLesson} noValidate className="mt-6 grid gap-5">
          <input type="hidden" name="return_to" value="/teacher/dashboard" />
          <CommonHalaqaFields halaqat={halaqat} halaqaId={halaqaId} setHalaqaId={setHalaqaId} />
          <input type="hidden" name="halaqa_id" value={halaqaId} />
          <input type="hidden" name="lesson_type" value="tajweed" />
          <div className="grid gap-4 md:grid-cols-2">
            <Field name="lesson_date" label="التاريخ" type="date" defaultValue={today} />
            <Field name="lesson_title" label="موضوع درس التجويد" />
            <Field name="present_count" label="عدد الحضور" type="number" defaultValue="0" />
            <Field name="absent_count" label="عدد الغياب" type="number" defaultValue="0" />
            <Field name="late_count" label="عدد المتأخرين" type="number" defaultValue="0" />
            <Field name="excused_count" label="عدد المعتذرين" type="number" defaultValue="0" />
          </div>
          <NotesField />
          <SubmitButton label="حفظ درس التجويد" />
        </form>
      ) : (
        <form
          action={createStudentSession}
          noValidate
          onSubmit={(event) => {
            if (!studentId) {
              event.preventDefault();
              setFormError("اختر الطالب قبل حفظ التسميع.");
            }
          }}
          className="mt-6 grid gap-5"
        >
          <input type="hidden" name="return_to" value="/teacher/dashboard" />
          <CommonHalaqaFields
            halaqat={halaqat}
            halaqaId={halaqaId}
            setHalaqaId={(nextHalaqaId) => {
              setHalaqaId(nextHalaqaId);
              setStudentId("");
              setStudentQuery("");
            }}
          />
          <input type="hidden" name="halaqa_id" value={halaqaId} />
          <input type="hidden" name="session_type" value="recitation" />
          <input type="hidden" name="attendance_status" value="present" />
          <input type="hidden" name="minor_mistakes_count" value="0" />
          <section className="rounded-3xl border border-[var(--line)] bg-[#fffdf8] p-4">
            <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
              <label className="block text-sm font-bold text-[var(--text)]">
                بحث الطالب
                <span className="relative mt-2 block">
                  <input
                    value={studentQuery}
                    onChange={(event) => setStudentQuery(event.target.value)}
                    placeholder="اكتب جزءًا من اسم الطالب..."
                    className="h-12 w-full rounded-2xl border border-[var(--line)] bg-white px-4 pl-11 text-sm font-semibold outline-none focus:border-[var(--gold)]"
                  />
                  <Search aria-hidden className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--gold)]" />
                </span>
              </label>
              <label className="block text-sm font-bold text-[var(--text)]">
                الطالب
                <select
                  name="student_id"
                  value={studentId}
                  onChange={(event) => setStudentId(event.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border border-[var(--line)] bg-white px-4 text-sm font-semibold outline-none focus:border-[var(--gold)]"
                >
                  <option value="">اختر الطالب</option>
                  {halaqaStudents.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.fullName}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {halaqaStudents.length === 0 ? (
              <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800">
                الطالب غير موجود في هذه الحلقة، تواصل مع الإدارة لإضافته.
              </p>
            ) : null}
            {selectedStudent ? <LastPositionCard position={lastPosition} /> : null}
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <Field name="session_date" label="تاريخ الجلسة" type="date" defaultValue={today} />
            <Select name="rating" label="التقدير" options={ratingLabels} defaultValue="excellent" includeEmpty />
          </div>

          <section className="grid gap-4 rounded-3xl border border-[var(--line)] bg-[#fffdf8] p-4">
            <SurahFields prefix="recitation" title="موضع التسميع" />
          </section>

          <div className="grid gap-4 md:grid-cols-3">
            <Field name="memorization_pages" label="كمية الحفظ بالأوجه" type="number" defaultValue="0" step="0.25" />
            <Field name="review_pages" label="كمية المراجعة بالأوجه" type="number" defaultValue="0" step="0.25" />
            <Field name="mistakes_count" label="عدد الأخطاء" type="number" defaultValue="0" />
          </div>
          <NotesField />
          <SubmitButton label="حفظ جلسة الطالب" />
        </form>
      )}
    </div>
  );
}

function CommonHalaqaFields({
  halaqat,
  halaqaId,
  setHalaqaId,
}: {
  halaqat: TeacherHalaqa[];
  halaqaId: string;
  setHalaqaId: (id: string) => void;
}) {
  return (
    <label className="block text-sm font-bold text-[var(--text)]">
      الحلقة
      <select
        value={halaqaId}
        onChange={(event) => setHalaqaId(event.target.value)}
        className="mt-2 h-12 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 text-sm font-semibold outline-none focus:border-[var(--gold)]"
      >
        {halaqat.length === 0 ? <option value="">لا توجد حلقات مرتبطة</option> : null}
        {halaqat.map((halaqa) => (
          <option key={halaqa.id} value={halaqa.id}>
            {halaqa.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function SurahFields({ prefix, title }: { prefix: "recitation" | "review"; title: string }) {
  const [query, setQuery] = useState("");
  const visibleSurahs = quranSurahs.filter((surah) => `${surah.number} ${surah.name}`.includes(query.trim()));

  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-[var(--primary-dark)]">
        <BookOpen aria-hidden className="size-4 text-[var(--gold)]" />
        {title}
      </p>
      <label className="block text-xs font-bold text-[var(--muted)]">
        بحث السورة
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="اكتب اسم السورة أو رقمها"
          className="mt-2 h-12 w-full rounded-2xl border border-[var(--line)] bg-white px-4 text-sm font-semibold outline-none focus:border-[var(--gold)]"
        />
      </label>
      <label className="block text-xs font-bold text-[var(--muted)]">
        اختر السورة
        <select
          name={`${prefix}_surah_number`}
          className="mt-2 h-12 w-full rounded-2xl border border-[var(--line)] bg-white px-4 text-sm font-semibold outline-none focus:border-[var(--gold)]"
        >
          <option value="">بدون</option>
          {visibleSurahs.map((surah) => (
            <option key={surah.number} value={surah.number}>
              {surah.number}. {surah.name} ({surah.ayahCount} آية)
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <Field name={`${prefix}_from_ayah`} label="من آية" type="number" />
        <Field name={`${prefix}_to_ayah`} label="إلى آية" type="number" />
      </div>
    </div>
  );
}

function LastPositionCard({ position }: { position?: LastPosition }) {
  return (
    <div className="mt-4 rounded-2xl border border-[var(--line)] bg-white p-4">
      <p className="text-xs font-semibold text-[var(--gold)]">آخر موضع مسجل</p>
      {!position ? (
        <p className="mt-2 text-sm font-bold text-[var(--muted)]">لا توجد إدخالات سابقة لهذا الطالب.</p>
      ) : (
        <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
          <PositionLine label="آخر تسميع" entry={position.recitation} />
          <PositionLine label="آخر مراجعة" entry={position.review} />
          <p className="font-bold text-[var(--muted)]">آخر تقييم: {position.lastRating ? ratingLabels[position.lastRating] ?? position.lastRating : "غير محدد"}</p>
          <p className="font-bold text-[var(--muted)]">ملاحظة: {position.lastNotes || "لا توجد"}</p>
        </div>
      )}
    </div>
  );
}

function PositionLine({ label, entry }: { label: string; entry?: LastPosition["recitation"] }) {
  return (
    <p className="font-bold text-[var(--muted)]">
      {label}: {entry ? `${entry.surahName} ${entry.fromAyah ?? ""}-${entry.toAyah ?? ""} (${entry.date})` : "غير محدد"}
    </p>
  );
}

function Field({
  name,
  label,
  type = "text",
  defaultValue = "",
  step,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
  step?: string;
}) {
  return (
    <label className="block text-sm font-bold text-[var(--text)]">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        step={step}
        min={type === "number" ? 0 : undefined}
        className="mt-2 h-12 w-full rounded-2xl border border-[var(--line)] bg-white px-4 text-sm font-semibold outline-none focus:border-[var(--gold)]"
      />
    </label>
  );
}

function Select({
  name,
  label,
  options,
  defaultValue,
  includeEmpty = false,
}: {
  name: string;
  label: string;
  options: Record<string, string>;
  defaultValue: string;
  includeEmpty?: boolean;
}) {
  return (
    <label className="block text-sm font-bold text-[var(--text)]">
      {label}
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-2 h-12 w-full rounded-2xl border border-[var(--line)] bg-white px-4 text-sm font-semibold outline-none focus:border-[var(--gold)]"
      >
        {includeEmpty ? <option value="">بدون</option> : null}
        {Object.entries(options).map(([value, labelText]) => (
          <option key={value} value={value}>
            {labelText}
          </option>
        ))}
      </select>
    </label>
  );
}

function NotesField() {
  return (
    <label className="block text-sm font-bold text-[var(--text)]">
      ملاحظات المعلم
      <textarea
        name="notes"
        rows={3}
        className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[var(--gold)]"
      />
    </label>
  );
}

function SubmitButton({ label }: { label: string }) {
  return (
    <button className="gold-button inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-6 text-sm font-semibold text-white">
      <CheckCircle2 aria-hidden className="size-5" />
      {label}
    </button>
  );
}

function errorMessage(code: string) {
  const messages: Record<string, string> = {
    missing: "يرجى تعبئة الحلقة والطالب قبل الحفظ.",
    scope: "هذا الطالب أو الحلقة خارج نطاق حسابك.",
    ayah: "راجع أرقام الآيات المدخلة.",
    save: "تعذر حفظ الإدخال، حاول مرة أخرى.",
    duplicate_old: "يوجد إدخال سابق مطابق خارج اليوم الحالي. أرسل طلب تعديل بدل إعادة التسجيل.",
  };
  return messages[code] ?? "تعذر حفظ الإدخال، حاول مرة أخرى.";
}
