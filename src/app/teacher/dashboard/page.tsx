import Link from "next/link";
import { BookOpen, CalendarCheck, ClipboardPenLine, GraduationCap, UserPlus, UsersRound, type LucideIcon } from "lucide-react";

import { ActivityList, PageHero, PrimaryAction, SecondaryAction, SectionCard } from "@/components/dashboard-ui";
import { KpiCard } from "@/components/report-charts";
import { TeacherAttendanceQuickForm } from "@/components/teacher-attendance-quick-form";
import { TeacherRequestsPanel } from "@/components/teacher-requests-panel";
import { TeacherSessionForm } from "@/components/teacher-session-form";
import { TeacherTodayBoard } from "@/components/teacher-today-board";
import { MyTasksSummary } from "@/components/my-tasks-summary";
import {
  getTeacherPortalData,
  lessonTypeLabels,
  sessionTypeLabels,
} from "@/lib/teacher-portal";

type SearchParams = Promise<{
  attendanceHalaqa?: string;
  attendanceDate?: string;
  attendanceSaved?: string;
  attendanceError?: string;
  sessionSaved?: string;
  sessionError?: string;
  student?: string;
  requestSaved?: string;
  requestError?: string;
  similar?: string;
}>;

export default async function TeacherDashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const selectedDate = params.attendanceDate || today;
  const { teacher, halaqat, students, recentEntries, lastPositions, todayAttendance, setupRequired, loadError } =
    await getTeacherPortalData(selectedDate);
  const todayEntries = recentEntries.filter((entry) => entry.date === today).length;
  const lastRecitation = recentEntries.find((entry) => entry.kind === "session");
  const lastTajweed = recentEntries.find((entry) => entry.kind === "lesson");
  const hijriDate = new Intl.DateTimeFormat("ar-SA-u-ca-islamic", { day: "numeric", month: "long", year: "numeric" }).format(new Date());
  const firstName = teacher?.fullName?.split(" ")[0] ?? teacher?.fullName;
  const weeklyTrend = buildRecentTrend(recentEntries).map((item) => item.value);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 p-4 sm:p-6">
      <PageHero
        eyebrow={`بوابة المعلم — ${hijriDate}`}
        title={`السلام عليكم${firstName ? `، ${firstName}` : ""}`}
        description="الحضور والتسميع وآخر المنجزات."
        actions={
          <>
            <PrimaryAction href="#teacher-attendance">تسجيل الحضور</PrimaryAction>
            <SecondaryAction href="#teacher-recitation">تسجيل التسميع</SecondaryAction>
          </>
        }
      />

      {loadError ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold leading-7 text-red-700">
          تعذر تحميل بيانات بوابة المعلم مؤقتًا. تواصل مع الإدارة إذا استمرت المشكلة.
        </section>
      ) : setupRequired || !teacher ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold leading-7 text-amber-800">
          لم يتم ربط حسابك بسجل معلم بعد. تواصل مع الإدارة لربط البريد الإلكتروني بحلقتك.
        </section>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="جلسات اليوم" value={todayEntries} icon={ClipboardPenLine} trend={weeklyTrend} />
            <KpiCard label="عدد الطلاب" value={students.length} icon={UsersRound} tone="gold" trend={weeklyTrend} />
            <KpiCard label="آخر تسميع" value={lastRecitation?.date ?? "—"} icon={BookOpen} tone={lastRecitation ? "sage" : "warning"} description={lastRecitation ? "آخر جلسة مسجلة" : "لم يسجل بعد"} trend={weeklyTrend} />
            <KpiCard label="آخر تجويد" value={lastTajweed?.date ?? "—"} icon={GraduationCap} tone={lastTajweed ? "emerald" : "warning"} description={lastTajweed ? "آخر درس مسجل" : "لم يسجل بعد"} trend={weeklyTrend} />
          </section>

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <StartCard href="#teacher-attendance" title="١. حضور الحلقة" description="تسجيل حضور الطلاب." icon={CalendarCheck} />
            <StartCard href="#teacher-recitation" title="٢. التسميع والحفظ" description="تسجيل حفظ أو مراجعة." icon={BookOpen} />
            <StartCard href="#teacher-students" title="٣. طلابي" description="ملفات الطلاب والمنجزات." icon={UsersRound} />
            <StartCard href="/teacher/exams/new" title="٤. اختبار طالب" description="تسجيل اختبار جديد." icon={GraduationCap} />
            <StartCard href="#teacher-requests" title="٥. إضافة طالب" description="إضافة طالب للحلقة." icon={UserPlus} />
          </section>

          <TeacherTodayBoard
            students={students}
            attendance={todayAttendance}
            lastPositions={lastPositions}
            date={selectedDate}
          />

          <TeacherAttendanceQuickForm
            teacherId={teacher.id}
            halaqat={halaqat}
            students={students}
            selectedHalaqaId={params.attendanceHalaqa}
            selectedDate={params.attendanceDate}
            saved={params.attendanceSaved}
            error={params.attendanceError}
          />

          <section id="teacher-recitation" className="scroll-mt-24">
            <TeacherSessionForm
              halaqat={halaqat}
              students={students}
              lastPositions={lastPositions}
              initialHalaqaId={params.attendanceHalaqa}
              initialStudentId={params.student}
              saved={params.sessionSaved}
              error={params.sessionError}
            />
          </section>

          <TeacherRequestsPanel
            halaqat={halaqat}
            students={students}
            saved={params.requestSaved}
            error={params.requestError}
            similar={params.similar}
          />

          <MyTasksSummary />

          <section id="teacher-students" className="scroll-mt-24">
            <SectionCard title="آخر الإدخالات" icon={ClipboardPenLine}>
              <ActivityList
                emptyText="لم تسجل أي حصة أو جلسة بعد."
                items={recentEntries.slice(0, 6).map((entry) => ({
                  title: entry.title,
                  subtitle: `${entry.subtitle} - ${entry.kind === "lesson" ? lessonTypeLabels[entry.type] : sessionTypeLabels[entry.type]}`,
                  meta: entry.date,
                }))}
              />
            </SectionCard>
          </section>
        </>
      )}
    </main>
  );
}

function StartCard({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <Link href={href} className="app-card rounded-[1.5rem] p-4 transition hover:-translate-y-0.5 hover:border-[var(--gold)]">
      <span className="grid size-11 place-items-center rounded-2xl border border-[var(--line)] bg-[#fff8e6] text-[#765514]">
        <Icon aria-hidden className="size-5" />
      </span>
      <h2 className="mt-3 text-lg font-bold text-[var(--primary-dark)]">{title}</h2>
      <p className="mt-2 text-sm font-bold leading-7 text-[var(--muted)]">{description}</p>
    </Link>
  );
}

function buildRecentTrend(entries: Array<{ date: string }>) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    return {
      key,
      label: new Intl.DateTimeFormat("ar-SA", { weekday: "short" }).format(date),
      value: 0,
    };
  });
  const byKey = new Map(days.map((day) => [day.key, day]));
  for (const entry of entries) {
    const day = byKey.get(entry.date);
    if (day) day.value += 1;
  }
  return days.map(({ label, value }) => ({ label, value }));
}
