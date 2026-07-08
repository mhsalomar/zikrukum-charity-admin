import Link from "next/link";
import { CheckCircle2, ClipboardList, FileSpreadsheet, ListChecks, PlayCircle, Printer, UserPlus, Users } from "lucide-react";

import {
  addManualParticipantAction,
  createPermanentStudentAction,
  saveExamEvaluationAction,
  updateExamStatusAction,
} from "@/app/dashboard/exams/actions";
import { EmptyState, KpiCard, PageHero, SectionCard, StatusChip } from "@/components/dashboard-ui";
import { ExamExistingParticipantForm } from "@/components/exam-existing-participant-form";
import { ExamImportPanel } from "@/components/exam-import-panel";
import { ExamAssessmentFields } from "@/components/exam-assessment-fields";
import { CsvExportButton } from "@/components/csv-export-button";
import {
  attendanceStatusLabels,
  examStatusLabels,
  examTypeLabels,
  getExamDetail,
  getExamOptions,
  summarizeExam,
} from "@/lib/exams";

export default async function ExamDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const query = await searchParams;
  const [exam, options] = await Promise.all([getExamDetail(id, ["admin", "demo_admin"]), getExamOptions()]);
  const summary = summarizeExam(exam);
  const locked = exam.status === "approved";
  const resultsComplete = exam.participants.length > 0 && exam.participants.every((participant) => participant.attendanceStatus === "absent" || participant.attendanceStatus === "tested");

  return (
    <div className="space-y-5">
      <PageHero
        eyebrow={`${examTypeLabels[exam.examType] ?? "اختبار"} · ${examStatusLabels[exam.status] ?? exam.status}`}
        title={exam.title}
        description={[formatDate(exam.examDate), exam.examTime, exam.venue].filter(Boolean).join(" · ") || "لم تحدد تفاصيل الموعد بعد."}
        actions={<><Link href="#add-students" className="primary-button inline-flex min-h-12 items-center gap-2 rounded-xl px-4 text-sm font-semibold"><UserPlus className="size-4" />إضافة الطلاب</Link>{!locked && summary.total > 0 && !["in_progress", "completed"].includes(exam.status) ? <form action={updateExamStatusAction}><input type="hidden" name="exam_id" value={id} /><input type="hidden" name="status" value="in_progress" /><button className="gold-button inline-flex min-h-12 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white"><PlayCircle className="size-4" />بدء الاختبار</button></form> : null}<Link href="#results" className="secondary-button inline-flex min-h-12 items-center gap-2 rounded-xl px-4 text-sm font-semibold"><ListChecks className="size-4" />إدخال النتائج</Link>{resultsComplete && !locked ? <form action={updateExamStatusAction}><input type="hidden" name="exam_id" value={id} /><input type="hidden" name="status" value="approved" /><button className="primary-button min-h-12 rounded-xl px-4 text-sm font-semibold">اعتماد النتائج</button></form> : null}<Link href="#print-exam" className="secondary-button inline-flex min-h-12 items-center gap-2 rounded-xl px-4 text-sm font-semibold"><Printer className="size-4" />طباعة الكشوف</Link></>}
      />
      {query.error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{errorLabel(query.error)}</div> : null}
      {query.saved ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">تم حفظ تقييم الاختبار بنجاح.</div> : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="المشاركون" value={summary.total} icon={Users} />
        <KpiCard label="تم اختبارهم" value={summary.tested} icon={ClipboardList} />
        <KpiCard label="بانتظار الاختبار" value={summary.remaining} icon={CheckCircle2} />
        <KpiCard label="متوسط الأخطاء" value={summary.averageMistakes || "—"} tone="success" />
      </div>
      {summary.total > 0 ? <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-5"><SummaryMetric label="الحضور" value={summary.present} /><SummaryMetric label="الغياب" value={summary.absent} /><SummaryMetric label="تم اختبارهم" value={summary.tested} /><SummaryMetric label="إجمالي الأخطاء" value={summary.totalMistakes} /><SummaryMetric label="إجمالي التنبيهات" value={summary.totalAlerts} /></div> : null}

      <SectionCard title="خطوات تشغيل الاختبار" description="اتبع الخطوات بالترتيب؛ كل زر ينقلك مباشرة إلى الإجراء المطلوب.">
        <div className="grid gap-3 md:grid-cols-4">
          <WorkflowStep href="#add-students" icon={UserPlus} title="١. إضافة الطلاب" description={summary.total ? `${summary.total} مشارك مضاف` : "لم تتم إضافة طلاب بعد"} done={summary.total > 0} />
          <WorkflowStep href="#exam-status" icon={PlayCircle} title="٢. بدء الاختبار" description={exam.status === "in_progress" ? "الاختبار جارٍ الآن" : "غيّر الحالة إلى جارٍ الاختبار"} done={["in_progress", "completed", "approved"].includes(exam.status)} />
          <WorkflowStep href="#results" icon={ListChecks} title="٣. إدخال النتائج" description={summary.tested ? `${summary.tested} تم اختبارهم` : "لا توجد نتائج مسجلة"} done={resultsComplete} />
          <WorkflowStep href="#print-exam" icon={Printer} title="٤. الطباعة والاعتماد" description={locked ? "النتائج معتمدة" : resultsComplete ? "جاهز للاعتماد" : "أكمل النتائج أولًا"} done={locked} />
        </div>
      </SectionCard>

      <div id="exam-status" className="scroll-mt-24">
      <SectionCard title="حالة الاختبار والاعتماد" description={locked ? "النتائج معتمدة ومقفلة. يمكن للإدارة إعادة فتحها رسميًا للتعديل." : resultsComplete ? "اكتملت نتائج المشاركين ويمكن اعتمادها الآن." : "ابدأ الاختبار بعد إضافة المشاركين، ثم أكمل النتائج قبل الاعتماد."}>
        <div className="flex flex-wrap gap-2">
          {["draft", "ready", "in_progress", "completed", "approved", "cancelled"].map((status) => (
            <form key={status} action={updateExamStatusAction}>
              <input type="hidden" name="exam_id" value={id} /><input type="hidden" name="status" value={status} />
              <button disabled={status === exam.status} className="min-h-11 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--primary-dark)] disabled:bg-[var(--gold-soft)] disabled:text-[var(--gold)]">{status === "completed" && locked ? "إعادة فتح للتعديل" : examStatusLabels[status]}</button>
            </form>
          ))}
        </div>
        <div id="print-exam" className="mt-4 flex scroll-mt-24 flex-wrap gap-2 border-t border-[var(--border)] pt-4">
          <Link href={`/dashboard/exams/${id}/print?type=participants`} className="secondary-button inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold">كشف المشاركين</Link>
          <Link href={`/dashboard/exams/${id}/print?type=attendance`} className="secondary-button inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold">كشف الحضور</Link>
          <Link href={`/dashboard/exams/${id}/print?type=results`} className="secondary-button inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold">كشف النتائج</Link>
          <CsvExportButton
            filename={`نتائج-${exam.title}`}
            label="تصدير ملف جدول"
            data={exam.participants.map((participant) => ({
              "الطالب": participant.participantName,
              "الحلقة": participant.halaqaName || "—",
              "المعلم": participant.teacherName || "—",
              "الأجزاء": participant.selectedJuz.join("، "),
              "مقدار التسميع": participant.examScope || exam.surahScope || "—",
              "الأخطاء": participant.mistakesCount,
              "التنبيهات": participant.alertsCount,
              "الدرجة": participant.score || "—",
              "النتيجة": participant.resultStatus,
            }))}
          />
        </div>
      </SectionCard>
      </div>

      {!locked ? (
        <div id="add-students" className="grid scroll-mt-24 gap-5 xl:grid-cols-2">
          <SectionCard title="إضافة طالب موجود" icon={UserPlus} description="ابحث في قائمة الطلاب المرتبطين بالنظام ثم حدد مقدار الاختبار.">
            <ExamExistingParticipantForm examId={id} students={options.students} />
          </SectionCard>
          <SectionCard title="إدخال سريع للاختبار فقط" icon={UserPlus} description="لا ينشئ طالبًا دائمًا. يمكن ربطه أو إنشاء سجل دائم لاحقًا بقرار صريح.">
            <form action={addManualParticipantAction} className="grid gap-3">
              <input type="hidden" name="exam_id" value={id} />
              <input name="participant_name" required className={inputClass} placeholder="اسم الطالب" />
              <select name="halaqa_id" className={inputClass}><option value="">بدون حلقة محددة</option>{options.halaqat.map((halaqa) => <option key={halaqa.id} value={halaqa.id}>{halaqa.name}</option>)}</select>
              <input name="halaqa_name" className={inputClass} placeholder="اسم الحلقة عند عدم وجودها بالنظام" />
              <input name="teacher_name" className={inputClass} placeholder="اسم المعلم" />
              <input name="exam_scope" className={inputClass} placeholder="مقدار الاختبار" />
              <button className="primary-button min-h-12 rounded-xl px-5 text-sm font-semibold">إضافة للاختبار فقط</button>
            </form>
          </SectionCard>
        </div>
      ) : null}

      {!locked ? <div id="import-students" className="scroll-mt-24"><SectionCard title="استيراد أسماء المشاركين" icon={FileSpreadsheet} description="يدعم ملف البيانات وملف الجدول، ويعرض معاينة قبل الإضافة."><ExamImportPanel examId={id} options={options} participants={exam.participants} /></SectionCard></div> : null}

      <div id="results" className="scroll-mt-24">
      <SectionCard title="شاشة الاختبار والتسميع" description="سجل تقييم التسميع لكل طالب من نموذج مختصر وواضح.">
        {exam.participants.length === 0 ? <div className="grid justify-items-center gap-3 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg)] p-6 text-center"><EmptyState title="لم تتم إضافة طلاب بعد" description="أضف طالبًا موجودًا أو إدخالًا سريعًا أو استورد ملف المشاركين." /><Link href="#add-students" className="primary-button inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold">إضافة الطلاب</Link></div> : (
          <div className="grid gap-4">
            {exam.participants.map((participant) => (
              <article id={`participant-${participant.id}`} key={participant.id} className="rounded-2xl border border-[var(--border)] bg-white p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><h3 className="text-lg font-bold text-[var(--primary-dark)]">{participant.participantName}</h3><p className="mt-1 text-sm font-bold text-[var(--muted)]">{participant.halaqaName || "بدون حلقة"} · {participant.teacherName || "لم يحدد المعلم"} · {participant.examScope || exam.surahScope || "لم يحدد المقدار"}</p></div>
                  <div className="flex flex-wrap gap-2"><Link href={`/dashboard/exams/${id}/print?type=student&participant=${participant.id}`} className="text-xs font-semibold text-[var(--primary)] underline underline-offset-4">طباعة تقرير الطالب</Link><StatusChip tone={participant.attendanceStatus === "tested" ? "success" : "default"}>{attendanceStatusLabels[participant.attendanceStatus]}</StatusChip>{participant.isManual ? <StatusChip tone="warning">إدخال للاختبار فقط</StatusChip> : null}</div>
                </div>
                <form action={saveExamEvaluationAction} className="mt-4 grid gap-3">
                  <input type="hidden" name="exam_id" value={id} /><input type="hidden" name="result_id" value={participant.id} />
                  <input type="hidden" name="exam_scope" value={participant.examScope || exam.surahScope} />
                  <ExamAssessmentFields defaults={{ selectedJuz: participant.selectedJuz, fromSurahNo: participant.fromSurahNo, fromAyah: participant.fromAyah, toSurahNo: participant.toSurahNo, toAyah: participant.toAyah, mistakesCount: participant.mistakesCount, alertsCount: participant.alertsCount, tajweedRating: participant.tajweedRating, memorizationNotes: participant.memorizationNotes, tajweedNotes: participant.tajweedNotes, generalNotes: participant.generalNotes, recommendation: participant.recommendation, fullScore: exam.fullScore, mistakeDeduction: exam.mistakeDeduction, alertsDeduct: exam.alertsDeduct, alertDeduction: exam.alertDeduction }} />
                  <InputField label="التاريخ" name="evaluation_date" value={participant.evaluationDate || exam.examDate || today()} type="date" required disabled={locked} />
                  {!locked ? <button className="primary-button min-h-12 self-end rounded-xl px-4 text-sm font-semibold">حفظ تقييم الاختبار</button> : null}
                </form>
                {participant.isManual && !locked ? <form action={createPermanentStudentAction} className="mt-3"><input type="hidden" name="exam_id" value={id} /><input type="hidden" name="result_id" value={participant.id} /><button className="text-sm font-semibold text-[var(--primary)] underline underline-offset-4">إنشاء طالب دائم من هذا السجل</button></form> : null}
              </article>
            ))}
          </div>
        )}
      </SectionCard>
      </div>
    </div>
  );
}

const inputClass = "mt-1 min-h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-bold text-[var(--text)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-emerald-100 disabled:bg-[var(--bg)]";
function InputField({ label, name, value, type = "text", required, disabled }: { label: string; name: string; value: string; type?: string; required?: boolean; disabled?: boolean }) {
  return <label className="text-xs font-semibold text-[var(--primary-dark)]">{label}<input name={name} defaultValue={value} type={type} min={type === "number" ? 0 : undefined} required={required} disabled={disabled} className={inputClass} /></label>;
}
function formatDate(value: string) { return value ? new Intl.DateTimeFormat("ar-SA").format(new Date(value)) : ""; }
function errorLabel(value: string) {
  const labels: Record<string, string> = { duplicate: "الطالب مضاف مسبقًا لهذا الاختبار.", approved: "النتائج معتمدة. أعد فتح الاختبار رسميًا قبل التعديل.", "student-similar": "يوجد طالب مشابه في النظام. اربطه بدل إنشاء سجل مكرر.", import: "تعذر قراءة بيانات الاستيراد.", "no-participants": "أضف طالبًا واحدًا على الأقل قبل بدء الاختبار.", "incomplete-results": "لا يمكن اعتماد الاختبار قبل إكمال تقييم جميع المشاركين.", "evaluation-required": "أكمل مقدار التسميع وتقييم التجويد والتاريخ قبل الحفظ.", "exam-policy": "تعذر الحفظ بسبب إعدادات صلاحيات الاختبارات. أعد المحاولة بعد تحديث الصفحة.", "exam-permission": "ليست لديك صلاحية حفظ هذا التقييم.", save: "تعذر حفظ الاختبار. راجع البيانات وحاول مجددًا." };
  return labels[value] ?? "تعذر إكمال العملية. راجع البيانات وحاول مجددًا.";
}
function WorkflowStep({ href, icon: Icon, title, description, done }: { href: string; icon: typeof UserPlus; title: string; description: string; done: boolean }) {
  return <Link href={href} className={`rounded-2xl border p-4 transition hover:border-[var(--gold)] ${done ? "border-emerald-200 bg-emerald-50" : "border-[var(--border)] bg-white"}`}><Icon className={`size-5 ${done ? "text-emerald-700" : "text-[var(--gold)]"}`} /><p className="mt-3 font-semibold text-[var(--primary-dark)]">{title}</p><p className="mt-1 text-xs font-bold leading-6 text-[var(--muted)]">{description}</p></Link>;
}
function SummaryMetric({ label, value }: { label: string; value: string | number }) { return <div className="rounded-xl border border-[var(--border)] bg-white p-3 text-center"><p className="text-xs font-bold text-[var(--muted)]">{label}</p><p className="mt-1 text-xl font-bold text-[var(--primary-dark)]">{value}</p></div>; }
function today() { return new Date().toISOString().slice(0, 10); }
