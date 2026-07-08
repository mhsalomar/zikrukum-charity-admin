import { ClipboardCheck, PlusCircle } from "lucide-react";
import type { ReactNode } from "react";

import { createTeacherStudentRequest } from "@/app/teacher/requests/actions";
import { SectionCard } from "@/components/dashboard-ui";
import { attendanceLabels, type TeacherHalaqa, type TeacherStudent } from "@/lib/teacher-portal";

export function TeacherRequestsPanel({
  halaqat,
  students,
  saved,
  error,
  similar,
}: {
  halaqat: TeacherHalaqa[];
  students: TeacherStudent[];
  saved?: string;
  error?: string;
  similar?: string;
}) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <section id="teacher-requests" className="scroll-mt-24">
      <SectionCard
        title="إضافة طالب وتصحيح السجلات"
        description="إضافة طالب أو طلب تصحيح سجل."
        icon={ClipboardCheck}
      >
        {saved === "added" ? (
          <Notice tone="success" text="تمت إضافة الطالب بنجاح وتسجيله في الحلقة." />
        ) : saved ? (
          <Notice tone="success" text="تم إرسال الطلب وسيُعالَج تلقائياً." />
        ) : null}
        {error ? <Notice tone="error" text={error === "similar" && similar ? `يوجد اسم مشابه: ${similar}. تأكد قبل الإضافة كطالب جديد.` : errorText(error)} /> : null}

        <div className="grid gap-3 lg:grid-cols-2">
          <RequestBox title="إضافة طالب للحلقة" helper="يُضاف الطالب فورًا إلى حلقتك بعد التحقق من عدم التكرار." icon>
            <form action={createTeacherStudentRequest} className="grid gap-3">
              <input type="hidden" name="request_type" value="add_student" />
              <TextField name="requested_student_name" label="اسم الطالب" required />
              <SelectField name="current_halaqa_id" label="الحلقة" options={halaqat.map(toOption)} />
              <TextField name="guardian_phone" label="جوال ولي الأمر إن وجد" />
              <TextField name="level" label="المستوى إن وجد" />
              <Textarea name="reason" label="ملاحظات" />
              {error === "similar" ? <label className="flex items-center gap-2 text-sm font-bold text-[var(--text)]"><input type="checkbox" name="confirm_similar" value="1" required /> تحققت من الاسم وأريد إضافته كطالب جديد</label> : null}
              <Submit label="إضافة الطالب" />
            </form>
          </RequestBox>

          <RequestBox title="طلب تعديل حضور" helper="استخدمه عندما تحفظ حضورًا ثم تكتشف أن حالة طالب تحتاج تعديلًا.">
            <form action={createTeacherStudentRequest} className="grid gap-3">
              <input type="hidden" name="request_type" value="edit_attendance" />
              <SelectField name="current_halaqa_id" label="الحلقة" options={halaqat.map(toOption)} />
              <SelectField name="student_id" label="الطالب" options={students.map(toStudentOption)} />
              <TextField name="attendance_date" label="تاريخ الحضور" type="date" defaultValue={today} required />
              <SelectField
                name="requested_attendance_status"
                label="الحالة الصحيحة"
                options={Object.entries(attendanceLabels).map(([value, label]) => ({ value, label }))}
              />
              <Textarea name="reason" label="سبب التعديل" required />
              <Submit label="إرسال طلب تعديل الحضور" />
            </form>
          </RequestBox>

          <RequestBox title="طلب تعديل تسميع" helper="استخدمه لو كان موضع التسميع أو التقييم يحتاج تصحيحًا بعد الحفظ.">
            <form action={createTeacherStudentRequest} className="grid gap-3">
              <input type="hidden" name="request_type" value="edit_recitation" />
              <SelectField name="current_halaqa_id" label="الحلقة" options={halaqat.map(toOption)} />
              <SelectField name="student_id" label="الطالب" options={students.map(toStudentOption)} />
              <Textarea name="correction_notes" label="ما التصحيح المطلوب؟" required />
              <Textarea name="reason" label="سبب الطلب" />
              <Submit label="إرسال طلب تعديل التسميع" />
            </form>
          </RequestBox>

          <RequestBox title="طلب نقل طالب" helper="استخدمه إذا احتاج الطالب الانتقال إلى حلقة أخرى.">
            <form action={createTeacherStudentRequest} className="grid gap-3">
              <input type="hidden" name="request_type" value="transfer_student" />
              <SelectField name="current_halaqa_id" label="الحلقة الحالية" options={halaqat.map(toOption)} />
              <SelectField name="student_id" label="الطالب" options={students.map(toStudentOption)} />
              <TextField name="target_halaqa_name" label="الحلقة المطلوبة" required />
              <Textarea name="reason" label="سبب النقل" required />
              <Submit label="إرسال طلب النقل" />
            </form>
          </RequestBox>
        </div>
      </SectionCard>
    </section>
  );
}

function RequestBox({
  title,
  helper,
  children,
  icon = false,
}: {
  title: string;
  helper: string;
  children: ReactNode;
  icon?: boolean;
}) {
  return (
    <details className="group rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-4 open:border-[var(--gold)]/55 open:bg-white">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          {icon ? <PlusCircle aria-hidden className="mt-1 size-5 shrink-0 text-[var(--gold)]" /> : null}
          <div>
            <h3 className="text-base font-semibold text-[var(--primary-dark)]">{title}</h3>
            <p className="mt-1 text-xs font-bold leading-6 text-[var(--muted)]">{helper}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-[var(--line)] bg-white px-3 py-1 text-xs font-semibold text-[var(--primary-dark)] group-open:bg-[var(--primary)] group-open:text-white">
          فتح
        </span>
      </summary>
      <div className="mt-4 border-t border-[var(--line)] pt-4">{children}</div>
    </details>
  );
}

function TextField({
  name,
  label,
  type = "text",
  defaultValue,
  required = false,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-bold text-[var(--text)]">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        className="mt-2 h-11 w-full rounded-2xl border border-[var(--line)] bg-white px-4 text-sm font-semibold outline-none focus:border-[var(--gold)]"
      />
    </label>
  );
}

function SelectField({ name, label, options }: { name: string; label: string; options: Array<{ value: string; label: string }> }) {
  return (
    <label className="block text-sm font-bold text-[var(--text)]">
      {label}
      <select
        name={name}
        className="mt-2 h-11 w-full rounded-2xl border border-[var(--line)] bg-white px-4 text-sm font-semibold outline-none focus:border-[var(--gold)]"
      >
        <option value="">اختر</option>
        {options.map((option) => (
          <option key={`${name}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Textarea({ name, label, required = false }: { name: string; label: string; required?: boolean }) {
  return (
    <label className="block text-sm font-bold text-[var(--text)]">
      {label}
      <textarea
        name={name}
        rows={3}
        required={required}
        className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[var(--gold)]"
      />
    </label>
  );
}

function Submit({ label }: { label: string }) {
  return (
    <button className="min-h-11 rounded-2xl bg-[var(--primary)] px-4 text-sm font-semibold text-white">
      {label}
    </button>
  );
}

function Notice({ text, tone }: { text: string; tone: "success" | "error" }) {
  return (
    <p className={`mb-4 rounded-2xl border p-3 text-sm font-bold ${tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>
      {text}
    </p>
  );
}

function toOption(halaqa: TeacherHalaqa) {
  return { value: halaqa.id, label: halaqa.name };
}

function toStudentOption(student: TeacherStudent) {
  return { value: student.id, label: `${student.fullName} — ${student.halaqaName}` };
}

function errorText(code: string) {
  const messages: Record<string, string> = {
    profile: "لم يتم ربط حسابك بسجل معلم بعد.",
    type: "نوع الطلب غير معروف.",
    missing: "يرجى تعبئة البيانات المطلوبة.",
    student: "يرجى اختيار الطالب.",
    scope: "هذا الطالب أو الحلقة خارج نطاق حسابك.",
    save: "تعذر حفظ الطلب، حاول مرة أخرى.",
    halaqa: "اختر الحلقة التي تريد إضافة الطالب إليها.",
    "duplicate-same": "يوجد طالب بنفس الاسم في هذه الحلقة.",
    "duplicate-other": "يوجد طالب بنفس الاسم في حلقة أخرى. يرجى مراجعة الإدارة قبل إضافته.",
  };
  return messages[code] ?? "تعذر حفظ الطلب، حاول مرة أخرى.";
}
