import Link from "next/link";

import { TeacherSessionForm } from "@/components/teacher-session-form";
import {
  getTeacherPortalData,
  lessonTypeLabels,
  sessionTypeLabels,
} from "@/lib/teacher-portal";

type PageProps = {
  searchParams: Promise<{ saved?: string; error?: string; halaqa?: string }>;
};

export default async function TeacherSessionsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { teacher, halaqat, students, lastPositions, recentEntries, setupRequired, loadError } =
    await getTeacherPortalData();

  return (
    <main className="mx-auto w-full max-w-6xl p-4 sm:p-6">
      <header className="app-card luxury-pattern overflow-hidden rounded-[1.7rem]">
        <div className="relative border-r-4 border-[var(--gold)] p-5 sm:p-7">
          <p className="text-sm font-semibold text-[var(--gold)]">بوابة المعلم</p>
          <h1 className="mt-2 text-2xl font-bold text-[var(--primary-dark)] sm:text-4xl">
            تسجيل الحصص والجلسات
          </h1>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-[var(--muted)]">
            اختر بين حصة عامة للحلقة أو جلسة لطالب محدد.
          </p>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/teacher/dashboard" className="rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 py-2 text-xs font-semibold text-[var(--primary-dark)]">
          الرئيسية
        </Link>
        <Link href="/teacher/students" className="rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 py-2 text-xs font-semibold text-[var(--primary-dark)]">
          طلابي
        </Link>
      </div>

      <StatusMessage saved={params.saved} error={params.error} />

      {loadError ? (
        <section className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold leading-7 text-red-700">
          تعذر تحميل بيانات بوابة المعلم مؤقتًا. حاول لاحقًا أو تواصل مع الإدارة.
        </section>
      ) : setupRequired || !teacher ? (
        <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold leading-7 text-amber-800">
          لم يتم ربط حسابك بسجل معلم بعد. تواصل مع الإدارة.
        </section>
      ) : halaqat.length === 0 ? (
        <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold leading-7 text-amber-800">
          لا توجد حلقات مرتبطة بك. لا يمكن تسجيل حصة قبل ربط المعلم بحلقة.
        </section>
      ) : (
        <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
          <TeacherSessionForm
            halaqat={halaqat}
            students={students}
            lastPositions={lastPositions}
            initialHalaqaId={params.halaqa}
          />
          <aside className="app-card rounded-[1.7rem] p-5">
            <h2 className="text-lg font-bold text-[var(--primary-dark)]">سجل مختصر</h2>
            {recentEntries.length === 0 ? (
              <p className="mt-4 text-sm font-bold text-[var(--muted)]">لا توجد إدخالات بعد.</p>
            ) : (
              <div className="mt-4 grid gap-3">
                {recentEntries.map((entry) => (
                  <div key={`${entry.kind}-${entry.id}`} className="rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-3">
                    <p className="font-semibold text-[var(--primary-dark)]">{entry.title}</p>
                    <p className="mt-1 text-xs font-bold text-[var(--muted)]">
                      {entry.kind === "lesson" ? lessonTypeLabels[entry.type] : sessionTypeLabels[entry.type]} — {entry.date}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}

function StatusMessage({ saved, error }: { saved?: string; error?: string }) {
  if (saved) {
    return (
      <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
        تم حفظ {saved === "lesson" ? "الحصة العامة" : "جلسة الطالب"} بنجاح.
      </p>
    );
  }
  if (!error) return null;

  const messages: Record<string, string> = {
    missing: "يرجى تعبئة الحقول المطلوبة.",
    scope: "لا يمكن تسجيل إدخال لحلقة أو طالب غير مرتبط بك.",
    ayah: "تأكد من أرقام الآيات المختارة.",
    save: "تعذر الحفظ. تأكد من الصلاحيات أو تواصل مع الإدارة.",
    "teacher-profile": "لم يتم ربط حسابك بسجل معلم.",
  };

  return (
    <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
      {messages[error] ?? "حدث خطأ غير متوقع."}
    </p>
  );
}
