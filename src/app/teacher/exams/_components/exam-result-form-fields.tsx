import { ExamAssessmentFields, type ExamAssessmentDefaults } from "@/components/exam-assessment-fields";
import { examTypeLabels } from "@/lib/exams";

type Student = { id: string; name: string };

export function ExamResultFormFields({
  students,
  defaults,
}: {
  students: Student[];
  defaults?: ExamAssessmentDefaults & {
    studentId?: string;
    examTitle?: string;
    examType?: string;
    examDate?: string;
    evaluatorName?: string;
    needsReview?: boolean;
  };
}) {
  const d = defaults ?? {};

  return (
    <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-white p-5">
      {/* Student */}
      <Field label="الطالب *">
        <select name="student_id" defaultValue={d.studentId ?? ""} required className="form-input w-full">
          <option value="" disabled>اختر الطالب</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </Field>

      {/* Exam title */}
      <Field label="اسم الاختبار *">
        <input
          name="exam_title"
          type="text"
          defaultValue={d.examTitle ?? ""}
          required
          placeholder="مثال: اختبار حفظ سورة البقرة"
          className="form-input w-full"
        />
      </Field>

      {/* Type + Date */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="نوع الاختبار">
          <select name="exam_type" defaultValue={d.examType ?? "general"} className="form-input w-full">
            {Object.entries(examTypeLabels).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </Field>
        <Field label="تاريخ الاختبار">
          <input
            name="exam_date"
            type="date"
            defaultValue={d.examDate ?? ""}
            required
            className="form-input w-full"
          />
        </Field>
      </div>

      <ExamAssessmentFields defaults={d} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="اسم المقيّم">
          <input
            name="evaluator_name"
            type="text"
            defaultValue={d.evaluatorName ?? ""}
            placeholder="اسم المصحح أو المقيّم"
            className="form-input w-full"
          />
        </Field>
      </div>
      <label className="flex min-h-11 items-center gap-3 rounded-xl border border-[var(--border)] bg-[#fffdf8] px-3 text-xs font-semibold text-[var(--primary-dark)]">
        <input name="needs_review" type="checkbox" defaultChecked={d.needsReview ?? false} className="size-4 accent-[var(--primary)]" />
        يحتاج مراجعة الإدارة
      </label>

    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-[var(--primary-dark)]">{label}</label>
      {children}
    </div>
  );
}
