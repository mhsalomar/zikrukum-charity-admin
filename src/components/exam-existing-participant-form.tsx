"use client";

import { useMemo, useState } from "react";

import { addExistingParticipantAction } from "@/app/dashboard/exams/actions";
import type { ExamOptionData } from "@/lib/exams";

export function ExamExistingParticipantForm({ examId, students }: { examId: string; students: ExamOptionData["students"] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => students.filter((student) => [student.name, student.halaqaName, student.teacherName].some((value) => value.includes(query))).slice(0, 100), [query, students]);
  return <form action={addExistingParticipantAction} className="grid gap-3">
    <input type="hidden" name="exam_id" value={examId} />
    <input value={query} onChange={(event) => setQuery(event.target.value)} className={inputClass} placeholder="ابحث باسم الطالب أو الحلقة أو المعلم" />
    <select name="student_id" required className={inputClass}><option value="">اختر الطالب من النتائج</option>{filtered.map((student) => <option key={student.id} value={student.id}>{student.name} — {student.halaqaName || "بلا حلقة"} — {student.teacherName || "معلم غير محدد"}</option>)}</select>
    <input name="exam_scope" className={inputClass} placeholder="مقدار الاختبار" />
    <input name="notes" className={inputClass} placeholder="ملاحظات اختيارية" />
    <button className="primary-button min-h-12 rounded-xl px-5 text-sm font-semibold">إضافة الطالب للاختبار</button>
  </form>;
}
const inputClass = "min-h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-bold outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-emerald-100";
