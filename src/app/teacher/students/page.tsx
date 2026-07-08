import Link from "next/link";
import { BookOpen, ClipboardPenLine, UserPlus } from "lucide-react";

import {
  getTeacherPortalData,
  ratingLabels,
  type LastPosition,
} from "@/lib/teacher-portal";

export default async function TeacherStudentsPage() {
  const { teacher, students, lastPositions, setupRequired, loadError } = await getTeacherPortalData();

  return (
    <main className="mx-auto w-full max-w-6xl p-4 sm:p-6">
      <header className="app-card luxury-pattern overflow-hidden rounded-[1.7rem]">
        <div className="relative border-r-4 border-[var(--gold)] p-5 sm:p-7">
          <p className="text-sm font-semibold text-[var(--gold)]">بوابة المعلم</p>
          <h1 className="mt-2 text-2xl font-bold text-[var(--primary-dark)] sm:text-4xl">
            طلابي
          </h1>
          <p className="mt-3 text-sm font-semibold text-[var(--muted)]">طلاب الحلقة وآخر المنجزات.</p>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/teacher/dashboard#teacher-requests" className="primary-button inline-flex min-h-10 items-center gap-2 rounded-2xl px-4 text-xs font-semibold">
          <UserPlus className="size-4" /> إضافة طالب
        </Link>
        <Link href="/teacher/dashboard" className="rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 py-2 text-xs font-semibold text-[var(--primary-dark)]">
          الرئيسية
        </Link>
        <Link href="/teacher/sessions" className="rounded-2xl border border-[var(--gold)]/45 bg-[#fff8e6] px-4 py-2 text-xs font-semibold text-[#765514]">
          تسجيل جلسة
        </Link>
      </div>

      {loadError ? (
        <section className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold leading-7 text-red-700">
          تعذر تحميل بيانات الطلاب مؤقتًا. تواصل مع الإدارة إذا استمرت المشكلة.
        </section>
      ) : setupRequired || !teacher ? (
        <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold leading-7 text-amber-800">
          لم يتم ربط حسابك بسجل معلم بعد.
        </section>
      ) : students.length === 0 ? (
        <section className="mt-5 rounded-2xl border border-dashed border-[var(--line)] bg-[#fffdf8] p-8 text-center">
          <BookOpen aria-hidden className="mx-auto size-10 text-[var(--gold)]" />
          <h2 className="mt-3 text-lg font-bold text-[var(--primary-dark)]">لا يوجد طلاب مرتبطون</h2>
          <p className="mt-2 text-sm font-bold text-[var(--muted)]">يمكنك إضافة طالب مباشرة إلى حلقتك.</p>
          <Link href="/teacher/dashboard#teacher-requests" className="primary-button mt-4 inline-flex min-h-11 items-center rounded-xl px-5 text-sm font-semibold">إضافة طالب</Link>
        </section>
      ) : (
        <section className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {students.map((student) => (
            <article key={`${student.halaqaId}-${student.id}`} className="resource-mobile-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-[var(--primary-dark)]">{student.fullName}</h2>
                  <p className="mt-1 text-xs font-bold text-[var(--muted)]">{student.halaqaName}</p>
                </div>
                <Link
                  href={`/teacher/sessions?halaqa=${student.halaqaId}`}
                  className="grid size-10 place-items-center rounded-2xl border border-[var(--gold)]/45 bg-[#fff8e6] text-[#765514]"
                  aria-label="تسجيل جلسة"
                >
                  <ClipboardPenLine aria-hidden className="size-5" />
                </Link>
              </div>
              <div className="mt-4 grid gap-2 text-sm">
                <Info label="المسجد" value={student.mosqueName} />
                <Info label="الفترة" value={periodLabels[student.period] ?? student.period} />
                <LastPositionSummary position={lastPositions.find((item) => item.studentId === student.id)} />
              </div>
              <Link
                href={`/teacher/students/${student.id}`}
                className="mt-4 inline-flex min-h-10 items-center justify-center rounded-2xl border border-[var(--gold)]/50 bg-[#fff8e6] px-4 text-xs font-semibold text-[#765514]"
              >
                فتح ملف الطالب
              </Link>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

const periodLabels: Record<string, string> = {
  fajr: "الفجر",
  asr: "العصر",
  maghrib: "المغرب",
  isha: "العشاء",
};

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-bold text-[#81928b]">{label}</span>
      <span className="font-semibold text-[var(--text)]">{value || "غير محدد"}</span>
    </div>
  );
}

function LastPositionSummary({ position }: { position?: LastPosition }) {
  if (!position) {
    return <p className="rounded-2xl bg-[#fff8e6] p-3 text-xs font-bold text-[#765514]">لا يوجد موضع سابق.</p>;
  }

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-3">
      <p className="text-xs font-semibold text-[var(--gold)]">آخر المنجزات</p>
      <p className="mt-2 text-xs font-bold text-[var(--muted)]">
        آخر حفظ: {formatPosition(position.recitation)}
      </p>
      <p className="mt-1 text-xs font-bold text-[var(--muted)]">
        آخر مراجعة: {formatPosition(position.review)}
      </p>
      <p className="mt-1 text-xs font-bold text-[var(--muted)]">
        التقييم: {position.lastRating ? ratingLabels[position.lastRating] ?? position.lastRating : "غير محدد"}
      </p>
    </div>
  );
}

function formatPosition(position?: LastPosition["recitation"]) {
  if (!position) return "لا يوجد";
  const range = position.fromAyah || position.toAyah ? ` ${position.fromAyah ?? ""}-${position.toAyah ?? ""}` : "";
  return `${position.surahName}${range} — ${formatDate(position.date)}`;
}

function formatDate(value: string) {
  if (!value) return "تاريخ غير محدد";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("ar-SA").format(date);
}
