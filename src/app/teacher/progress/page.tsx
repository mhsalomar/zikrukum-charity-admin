import Link from "next/link";
import { BookOpen, CheckCircle2 } from "lucide-react";

import { createDailyProgress } from "@/app/teacher/progress/actions";
import { quranSurahs } from "@/lib/quran-surahs";
import { getTeacherPortalData, ratingLabels } from "@/lib/teacher-portal";

type PageProps = {
  searchParams: Promise<{ saved?: string; updated?: string; error?: string }>;
};

const entryTypes = [
  ["memorization", "حفظ جديد"],
  ["review", "مراجعة"],
  ["recitation", "تسميع"],
  ["tajweed", "تجويد"],
] as const;

const attendance = [
  ["present", "حاضر"],
  ["absent", "غائب"],
  ["late", "متأخر"],
  ["excused", "بعذر"],
] as const;

export default async function TeacherProgressPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { teacher, halaqat, students, lastPositions, recentEntries, setupRequired, loadError } = await getTeacherPortalData();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <main className="mx-auto w-full max-w-6xl p-4 pb-28 sm:p-6">
      <section className="app-card luxury-pattern overflow-hidden rounded-[1.7rem]">
        <div className="relative border-r-4 border-[var(--gold)] p-5 sm:p-7">
          <p className="text-sm font-semibold text-[var(--gold)]">متابعة الحفظ اليومية</p>
          <h1 className="mt-2 text-2xl font-bold text-[var(--primary-dark)] sm:text-4xl">تسجيل منجز الطالب</h1>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-[var(--muted)]">
            سجل الحفظ أو المراجعة اليومية ببيانات مختصرة، وتظهر لاحقًا في تقرير ولي الأمر والشهادات وأداء المعلمين.
          </p>
        </div>
      </section>

      <Status saved={params.saved} updated={params.updated} error={params.error} />

      {loadError ? (
        <Alert text="تعذر تحميل بيانات بوابة المعلم مؤقتًا." />
      ) : setupRequired || !teacher ? (
        <Alert text="لم يتم ربط حسابك بسجل معلم بعد. تواصل مع الإدارة." />
      ) : halaqat.length === 0 ? (
        <Alert text="لا توجد حلقات مرتبطة بحسابك حتى الآن." />
      ) : students.length === 0 ? (
        <Alert text="لا يوجد طلاب مرتبطون بحلقاتك حتى الآن." />
      ) : (
        <div className="mt-5 grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
          <form action={createDailyProgress} className="app-card grid gap-5 rounded-[1.7rem] p-5">
            <section className="grid gap-4 md:grid-cols-2">
              <Select name="halaqa_id" label="الحلقة" options={halaqat.map((item) => [item.id, item.name])} />
              <Select name="student_id" label="الطالب" options={students.map((item) => [item.id, `${item.fullName} - ${item.halaqaName}`])} />
              <Field name="progress_date" label="التاريخ" type="date" defaultValue={today} />
              <Select name="entry_type" label="نوع الإدخال" options={entryTypes} />
            </section>

            <section className="rounded-3xl border border-[var(--line)] bg-[#fffdf8] p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--primary-dark)]">
                <BookOpen aria-hidden className="size-4 text-[var(--gold)]" />
                موضع الحفظ أو المراجعة
              </p>
              <div className="grid gap-4 md:grid-cols-4">
                <Select name="surah_number" label="السورة" options={quranSurahs.map((item) => [String(item.number), `${item.number}. ${item.name}`])} />
                <Field name="from_ayah" label="من آية" type="number" />
                <Field name="to_ayah" label="إلى آية" type="number" />
                <Field name="pages_count" label="عدد الأوجه" type="number" step="0.25" defaultValue="0" />
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
              <Select name="rating" label="التقييم" options={Object.entries({ ...ratingLabels, weak: "ضعيف" })} />
              <Field name="mistakes_count" label="عدد الأخطاء" type="number" defaultValue="0" />
              <Select name="attendance_status" label="الحضور" options={attendance} />
            </section>
            <label className="block text-sm font-bold text-[var(--text)]">
              ملاحظات المعلم
              <textarea name="notes" rows={4} className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[var(--gold)]" />
            </label>
            <button className="gold-button inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-6 text-sm font-semibold text-white">
              <CheckCircle2 aria-hidden className="size-5" />
              حفظ المنجز
            </button>
          </form>

          <aside className="space-y-4">
            <section className="app-card rounded-[1.7rem] p-5">
              <h2 className="text-lg font-bold text-[var(--primary-dark)]">آخر مواضع الطلاب</h2>
              {lastPositions.length === 0 ? (
                <p className="mt-4 text-sm font-bold text-[var(--muted)]">لا يوجد منجز سابق لهذا الطالب.</p>
              ) : (
                <div className="mt-4 grid gap-3">
                  {lastPositions.slice(0, 6).map((item) => (
                    <div key={item.studentId} className="rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-3 text-sm font-bold text-[var(--muted)]">
                      <p>آخر حفظ: {item.recitation ? `${item.recitation.surahName} ${item.recitation.fromAyah ?? ""}-${item.recitation.toAyah ?? ""}` : "غير محدد"}</p>
                      <p className="mt-1">آخر تقييم: {item.lastRating ? ratingLabels[item.lastRating] ?? item.lastRating : "غير محدد"}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
            <section className="app-card rounded-[1.7rem] p-5">
              <h2 className="text-lg font-bold text-[var(--primary-dark)]">آخر الإدخالات</h2>
              {recentEntries.length === 0 ? (
                <p className="mt-4 text-sm font-bold text-[var(--muted)]">لا توجد إدخالات بعد.</p>
              ) : recentEntries.slice(0, 5).map((entry) => (
                <p key={`${entry.kind}-${entry.id}`} className="mt-3 rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-3 text-sm font-bold text-[var(--muted)]">
                  {entry.title} - {entry.date}
                </p>
              ))}
            </section>
          </aside>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <Link href="/teacher/dashboard" className="rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 py-2 text-xs font-semibold text-[var(--primary-dark)]">الرئيسية</Link>
        <Link href="/teacher/students" className="rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 py-2 text-xs font-semibold text-[var(--primary-dark)]">طلابي</Link>
      </div>
    </main>
  );
}

function Field({ name, label, type = "text", defaultValue = "", step }: { name: string; label: string; type?: string; defaultValue?: string; step?: string }) {
  return (
    <label className="block text-sm font-bold text-[var(--text)]">
      {label}
      <input name={name} type={type} defaultValue={defaultValue} step={step} min={type === "number" ? 0 : undefined} className="mt-2 h-12 w-full rounded-2xl border border-[var(--line)] bg-white px-4 text-sm font-semibold outline-none focus:border-[var(--gold)]" />
    </label>
  );
}

function Select({ name, label, options }: { name: string; label: string; options: ReadonlyArray<readonly [string, string]> | Array<[string, string]> }) {
  return (
    <label className="block text-sm font-bold text-[var(--text)]">
      {label}
      <select name={name} className="mt-2 h-12 w-full rounded-2xl border border-[var(--line)] bg-white px-4 text-sm font-semibold outline-none focus:border-[var(--gold)]">
        <option value="">اختر</option>
        {options.map(([value, labelText]) => <option key={value} value={value}>{labelText}</option>)}
      </select>
    </label>
  );
}

function Alert({ text }: { text: string }) {
  return <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold leading-7 text-amber-800">{text}</p>;
}

function Status({ saved, updated, error }: { saved?: string; updated?: string; error?: string }) {
  if (saved) return <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">تم حفظ المنجز بنجاح.</p>;
  if (updated === "duplicate") return <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">يوجد إدخال سابق لهذا الطالب في نفس اليوم ونفس النوع، لذلك تم تحديث الإدخال السابق بدل إنشاء سجل جديد.</p>;
  if (updated) return <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">تم تحديث منجز الطالب السابق بدل إنشاء سجل مكرر.</p>;
  if (!error) return null;
  const messages: Record<string, string> = {
    missing: "يرجى اختيار الحلقة والطالب والسورة.",
    scope: "لا يمكن تسجيل منجز لطالب خارج حلقاتك.",
    ayah: "تأكد من أرقام الآيات المختارة.",
    save: "تعذر حفظ المنجز. حاول لاحقًا أو تواصل مع الإدارة.",
    "teacher-profile": "لم يتم ربط حسابك بسجل معلم.",
  };
  return <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{messages[error] ?? "حدث خطأ غير متوقع."}</p>;
}
