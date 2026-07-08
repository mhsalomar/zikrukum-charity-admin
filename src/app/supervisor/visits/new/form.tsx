"use client";

import { Shuffle, UserCheck } from "lucide-react";
import { useMemo, useState } from "react";

import { achievementMatchLabels, observedSessionTypeLabels, teacherStatusLabels, visitStatusLabels } from "@/lib/supervisor-labels";

type Student = { id: string; name: string; circleId: string };
type Circle = { id: string; name: string; teacherId: string; teacherName: string; mosqueName: string; period: string };

const today = new Date().toISOString().slice(0, 10);

export function SupervisorVisitForm({
  circles,
  students,
  initialCircleId = "",
}: {
  circles: Circle[];
  students: Student[];
  initialCircleId?: string;
}) {
  const firstCircleId = initialCircleId && circles.some((circle) => circle.id === initialCircleId)
    ? initialCircleId
    : circles[0]?.id ?? "";
  const [circleId, setCircleId] = useState(firstCircleId);
  const [sampleStudentId, setSampleStudentId] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const selectedCircle = circles.find((circle) => circle.id === circleId);
  const filtered = useMemo(() => students.filter((student) => student.circleId === circleId), [students, circleId]);

  const pickRandom = () => {
    setError("");
    if (!circleId) {
      setNotice("");
      setError("اختر الحلقة أولًا ثم اختر طالبًا عشوائيًا.");
      return;
    }
    if (!filtered.length) {
      setNotice("");
      setError("لا يوجد طلاب مسجلون في هذه الحلقة.");
      return;
    }
    const selected = filtered[Math.floor(Math.random() * filtered.length)];
    setSampleStudentId(selected.id);
    setNotice(`تم اختيار طالب العينة: ${selected.name}`);
  };

  return (
    <div className="space-y-5">
      {error ? <Notice tone="danger" text={error} /> : null}
      {notice ? <Notice tone="success" text={notice} /> : null}
      {circles.length === 0 ? (
        <Notice tone="warning" text="لا توجد حلقات مرتبطة بحساب المشرف. تواصل مع الإدارة لربط الحلقات." />
      ) : null}

      <section className="rounded-[1.4rem] border border-[var(--line)] bg-[#fffdf8] p-4">
        <SectionTitle title="بيانات الزيارة" />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <SelectField
            label="الحلقة"
            name="circle_id"
            value={circleId}
            onChange={(value) => {
              setCircleId(value);
              setSampleStudentId("");
              setNotice("");
              setError("");
            }}
            options={circles.map((circle) => ({ value: circle.id, label: circle.name }))}
            placeholder="اختر الحلقة"
          />
          <Field label="تاريخ الزيارة" name="visit_date" type="date" defaultValue={today} />
        </div>
        <input type="hidden" name="teacher_id" value={selectedCircle?.teacherId ?? ""} />
        {selectedCircle ? (
          <div className="mt-4 grid gap-3 rounded-2xl border border-[var(--line)] bg-white p-4 text-sm font-bold text-[var(--muted)] md:grid-cols-3">
            <p>المعلم: <span className="text-[var(--primary-dark)]">{selectedCircle.teacherName || "غير محدد"}</span></p>
            <p>المسجد: <span className="text-[var(--primary-dark)]">{selectedCircle.mosqueName || "غير محدد"}</span></p>
            <p>الفترة: <span className="text-[var(--primary-dark)]">{selectedCircle.period || "غير محدد"}</span></p>
          </div>
        ) : null}
      </section>

      <section className="rounded-[1.4rem] border border-[var(--line)] bg-[#fffdf8] p-4">
        <SectionTitle title="الحضور والحصة" />
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SelectField label="حالة المعلم" name="teacher_status" defaultValue="present" options={toOptions(teacherStatusLabels)} />
          <SelectField label="نوع الحصة" name="observed_session_type" defaultValue="recitation" options={toOptions(observedSessionTypeLabels)} />
          <SelectField label="هل قدم المعلم درس تجويد؟" name="tajweed_lesson_given" defaultValue="no" options={[{ value: "yes", label: "نعم" }, { value: "no", label: "لا" }]} />
          <Field label="عدد الحاضرين" name="present_count" type="number" defaultValue="0" />
          <Field label="عدد الغائبين" name="absent_count" type="number" defaultValue="0" />
          <Field label="عدد المتأخرين" name="late_count" type="number" defaultValue="0" />
          <Field label="عدد المعتذرين" name="excused_count" type="number" defaultValue="0" />
        </div>
      </section>

      <section className="rounded-[1.4rem] border border-[var(--line)] bg-[#fffdf8] p-4">
        <SectionTitle title="طالب العينة" />
        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <SelectField
            label="طالب العينة"
            name="sample_student_id"
            value={sampleStudentId}
            onChange={setSampleStudentId}
            options={filtered.map((student) => ({ value: student.id, label: student.name }))}
            placeholder={filtered.length ? "اختر طالب العينة" : "لا يوجد طلاب لهذه الحلقة"}
          />
          <button type="button" onClick={pickRandom} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--gold)]/50 bg-[#fff8e6] px-5 text-sm font-semibold text-[#765514]">
            <Shuffle aria-hidden className="size-5" />
            اختيار طالب عشوائي
          </button>
        </div>
      </section>

      <section className="rounded-[1.4rem] border border-[var(--line)] bg-[#fffdf8] p-4">
        <SectionTitle title="التقييمات" />
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <SelectField label="مطابقة الإنجاز" name="achievement_match_status" defaultValue="not_available" options={toOptions(achievementMatchLabels)} />
          <ScoreField label="جودة التسميع" name="recitation_quality_score" />
          <ScoreField label="انضباط الحلقة" name="circle_discipline_score" />
          <ScoreField label="تفاعل الطلاب" name="student_engagement_score" />
          <ScoreField label="تنظيم المعلم" name="teacher_organization_score" />
        </div>
      </section>

      <section className="rounded-[1.4rem] border border-[var(--line)] bg-[#fffdf8] p-4">
        <SectionTitle title="الملاحظات والتوصية" />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Textarea label="ملاحظات المشرف" name="notes" />
          <Textarea label="التوصية" name="recommendation" />
          <SelectField label="حالة الزيارة" name="status" defaultValue="draft" options={toOptions(visitStatusLabels).filter((option) => option.value !== "open")} />
        </div>
      </section>

      <button
        type="submit"
        disabled={circles.length === 0}
        onClick={(event) => {
          if (!circleId) {
            event.preventDefault();
            setError("اختر الحلقة قبل حفظ الزيارة.");
          }
        }}
        className="gold-button inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-7 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        <UserCheck aria-hidden className="size-5" />
        حفظ الزيارة
      </button>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h2 className="text-lg font-bold text-[var(--primary-dark)]">{title}</h2>;
}

function Field({ label, name, type = "text", defaultValue = "" }: { label: string; name: string; type?: string; defaultValue?: string }) {
  return (
    <label className="block text-sm font-bold text-[var(--text)]">
      {label}
      <input name={name} type={type} min={type === "number" ? 0 : undefined} defaultValue={defaultValue} className="mt-2 h-12 w-full rounded-2xl border border-[var(--line)] bg-white px-4 text-sm font-semibold outline-none focus:border-[var(--gold)]" />
    </label>
  );
}

function ScoreField({ label, name }: { label: string; name: string }) {
  return (
    <label className="block text-sm font-bold text-[var(--text)]">
      {label}
      <select name={name} defaultValue="3" className="mt-2 h-12 w-full rounded-2xl border border-[var(--line)] bg-white px-4 text-sm font-semibold outline-none focus:border-[var(--gold)]">
        {[1, 2, 3, 4, 5].map((score) => <option key={score} value={score}>{score}</option>)}
      </select>
    </label>
  );
}

function SelectField({
  label,
  name,
  options,
  placeholder,
  defaultValue,
  value,
  onChange,
}: {
  label: string;
  name: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-bold text-[var(--text)]">
      {label}
      <select
        name={name}
        value={value}
        defaultValue={value === undefined ? defaultValue : undefined}
        onChange={(event) => onChange?.(event.target.value)}
        className="mt-2 h-12 w-full rounded-2xl border border-[var(--line)] bg-white px-4 text-sm font-semibold outline-none focus:border-[var(--gold)]"
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function Textarea({ label, name }: { label: string; name: string }) {
  return (
    <label className="block text-sm font-bold text-[var(--text)]">
      {label}
      <textarea name={name} rows={4} className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[var(--gold)]" />
    </label>
  );
}

function Notice({ text, tone }: { text: string; tone: "success" | "danger" | "warning" }) {
  const className = tone === "success"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-red-200 bg-red-50 text-red-700";
  return <p className={`rounded-2xl border p-3 text-sm font-bold ${className}`}>{text}</p>;
}

function toOptions(map: Record<string, string>) {
  return Object.entries(map).map(([value, label]) => ({ value, label }));
}
