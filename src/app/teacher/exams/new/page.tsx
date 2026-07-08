import { redirect } from "next/navigation";

import { addTeacherExamResultAction } from "@/app/teacher/exams/actions";
import { PageHero } from "@/components/dashboard-ui";
import { getTeacherPortalData } from "@/lib/teacher-portal";
import { ExamResultFormFields } from "@/app/teacher/exams/_components/exam-result-form-fields";

export default async function NewTeacherExamPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const portal = await getTeacherPortalData();
  if (!portal.teacher) redirect("/teacher/dashboard?error=teacher-profile");
  if (!portal.students || portal.students.length === 0) redirect("/teacher/dashboard?error=no-students");

  const query = await searchParams;
  const students = portal.students.map((s) => ({ id: s.id, name: s.fullName || s.id }));

  return (
    <main className="mx-auto w-full max-w-2xl p-4 pb-28 sm:p-6">
      <div className="space-y-5">
        <PageHero
          eyebrow="اختبارات الطلاب"
          title="تسجيل اختبار طالب"
          description="حدد المقطع وسجل التقييم."
        />
        {query.error ? <ErrorBanner code={query.error} /> : null}
        <form action={addTeacherExamResultAction} className="space-y-4">
          <ExamResultFormFields students={students} defaults={{ examDate: new Date().toISOString().slice(0, 10) }} />
          <button type="submit" className="primary-button w-full min-h-12 rounded-xl text-sm font-semibold">
            حفظ الاختبار
          </button>
        </form>
      </div>
    </main>
  );
}

function ErrorBanner({ code }: { code: string }) {
  const msgs: Record<string, string> = {
    "no-teacher": "لم يتم ربط حسابك بملف معلم. تواصل مع الإدارة.",
    "not-your-student": "هذا الطالب ليس من طلابك.",
    "missing-student": "يرجى اختيار طالب.",
    "missing-title": "يرجى إدخال اسم الاختبار.",
    "save-failed": "حدث خطأ أثناء الحفظ. حاول مجدداً.",
    duplicate: "يوجد اختبار مشابه لهذا الطالب اليوم. افتح السجل السابق وعدله أو غيّر المقطع قبل الحفظ.",
  };
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
      {msgs[code] ?? "حدث خطأ غير متوقع."}
    </div>
  );
}
