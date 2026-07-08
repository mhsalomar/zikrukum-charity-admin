import Link from "next/link";

import { createExamAction } from "@/app/dashboard/exams/actions";
import { FormCard, PageHero } from "@/components/dashboard-ui";
import { requireAnyRole } from "@/lib/auth";

export default async function NewExamPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAnyRole(["admin", "demo_admin"]);
  const query = await searchParams;
  return (
    <div className="space-y-5">
      <PageHero eyebrow="الاختبارات الإلكترونية" title="إنشاء اختبار جديد" description="بيانات الاختبار والمشاركون." actions={<Link href="/dashboard/exams" className="secondary-button inline-flex min-h-12 items-center rounded-xl px-5 text-sm font-semibold">العودة للاختبارات</Link>} />
      {query.error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{createErrorLabel(query.error)}</div> : null}
      <FormCard title="بيانات الاختبار" description="يمكن تعديل حالة الاختبار وإضافة المشاركين بعد الحفظ.">
        <form action={createExamAction} className="grid gap-4 md:grid-cols-2">
          <Field label="اسم الاختبار"><input name="title" required className={inputClass} placeholder="مثال: اختبار الحفظ للفصل الأول" /></Field>
          <Field label="نوع الاختبار"><select name="exam_type" className={inputClass}><option value="memorization">حفظ</option><option value="review">مراجعة</option><option value="nooraniya">نورانية</option><option value="tajweed">تجويد</option><option value="placement">تحديد مستوى</option><option value="general">عام</option></select></Field>
          <Field label="التاريخ"><input type="date" name="exam_date" className={inputClass} /></Field>
          <Field label="الوقت"><input type="time" name="exam_time" className={inputClass} /></Field>
          <Field label="المقر"><input name="venue" className={inputClass} placeholder="مقر الجمعية أو المسجد" /></Field>
          <Field label="اللجنة أو المختبر"><input name="committee_name" className={inputClass} /></Field>
          <Field label="الدرجة الكاملة"><input name="full_score" type="number" min="1" defaultValue="100" className={inputClass} /></Field>
          <Field label="خصم الخطأ الواحد"><input name="mistake_deduction" type="number" min="0" step="0.5" defaultValue="1" className={inputClass} /></Field>
          <Field label="خصم التنبيه"><input name="alert_deduction" type="number" min="0" step="0.25" defaultValue="0.25" className={inputClass} /></Field>
          <label className="flex min-h-12 items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--primary-dark)]"><input name="alerts_deduct" type="checkbox" defaultChecked /> احتساب خصم التنبيهات</label>
          <Field label="مقدار الاختبار العام"><input name="surah_scope" className={inputClass} placeholder="يمكن تخصيص مقدار مختلف لكل طالب لاحقًا" /></Field>
          <Field label="ملاحظات"><textarea name="notes" rows={3} className={inputClass} /></Field>
          <div className="md:col-span-2"><button className="primary-button min-h-12 rounded-xl px-6 text-sm font-semibold">حفظ وفتح الاختبار</button></div>
        </form>
      </FormCard>
    </div>
  );
}

const inputClass = "mt-2 min-h-12 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-bold text-[var(--text)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-emerald-100";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="text-sm font-semibold text-[var(--primary-dark)]">{label}{children}</label>;
}
function createErrorLabel(error: string) {
  if (error === "exam-policy") return "تعذر إنشاء الاختبار بسبب إعدادات صلاحيات الاختبارات. أعد المحاولة بعد تحديث الصفحة.";
  if (error === "exam-permission") return "ليست لديك صلاحية إنشاء اختبار.";
  if (error === "missing") return "اكتب اسم الاختبار قبل الحفظ.";
  return "تعذر إنشاء الاختبار. راجع البيانات وحاول مجددًا.";
}
