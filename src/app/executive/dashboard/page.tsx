import {
  BookOpen,
  BriefcaseBusiness,
  CalendarCheck,
  ChartColumn,
  ClipboardCheck,
  FileCheck2,
  FileText,
  Megaphone,
  Scale,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { FollowupAlertsPanel } from "@/components/followup-alerts-panel";
import { ActivityList, PageHero, PrimaryAction, QuickActionLink, QuickLinksGrid, SecondaryAction, SectionCard, SummaryAside } from "@/components/dashboard-ui";
import { DonutSummaryChart, HorizontalBarChart, KpiCard } from "@/components/report-charts";
import { MyTasksSummary } from "@/components/my-tasks-summary";
import { requireAnyRole } from "@/lib/auth";
import { getFollowupAlertsData } from "@/lib/launch-readiness";
import { executiveRoles } from "@/lib/module-access";
import { createClient } from "@/lib/supabase/server";

export default async function ExecutiveDashboardPage() {
  await requireAnyRole([...executiveRoles]);
  const [summary, readiness] = await Promise.all([getExecutiveSummary(), getFollowupAlertsData()]);
  const hijriDate = new Intl.DateTimeFormat("ar-SA-u-ca-islamic", { day: "numeric", month: "long", year: "numeric" }).format(new Date());

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={`لوحة المدير التنفيذي — ${hijriDate}`}
        title="نظرة شاملة على المؤشرات والأنشطة"
        actions={
          <>
            <PrimaryAction href="/executive/reports">عرض التقارير</PrimaryAction>
            <SecondaryAction href="/executive/letters">الصادر والخطابات</SecondaryAction>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <SummaryAside
          title="ما يحتاج انتباهك الآن"
          items={[
            { label: "ناقصو الهوية/الإقامة", value: summary.missingDocument, tone: summary.missingDocument > 0 ? "warning" : "success" },
            { label: "ناقصو الآيبان/البنك", value: summary.missingIban, tone: summary.missingIban > 0 ? "warning" : "success" },
            { label: "محاضر قيد الاعتماد", value: summary.draftMeetings, tone: summary.draftMeetings > 0 ? "warning" : "default" },
            { label: "خطابات قيد المعالجة", value: summary.pendingLetters, tone: summary.pendingLetters > 0 ? "warning" : "default" },
            { label: "زيارات تحتاج متابعة", value: summary.followUpVisits, tone: summary.followUpVisits > 0 ? "warning" : "default" },
          ]}
          actions={
            <>
              <PrimaryAction href="/executive/hr">مراجعة الموارد البشرية</PrimaryAction>
              <SecondaryAction href="/executive/meetings">الاجتماعات</SecondaryAction>
            </>
          }
        />

        <main className="space-y-5">
          <nav aria-label="إجراءات سريعة" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <QuickActionLink href="/executive/letters/new" icon={FileText} label="إنشاء خطاب" color="sage" />
            <QuickActionLink href="/executive/meetings/new" icon={CalendarCheck} label="تسجيل اجتماع" color="emerald" />
            <QuickActionLink href="/executive/reports" icon={ShieldCheck} label="التقارير التشغيلية" color="sage" />
            <QuickActionLink href="/executive/hr" icon={BriefcaseBusiness} label="الموارد البشرية" color="gold" />
          </nav>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="المعلمون النشطون" value={summary.activeTeachers} icon={UserRound} trend={summary.entryTrend} />
            <KpiCard label="الحلقات النشطة" value={summary.activeHalaqat} icon={BookOpen} tone="gold" trend={summary.entryTrend} />
            <KpiCard label="إدخالات الأسبوع" value={summary.weekEntries} icon={ChartColumn} tone="sage" trend={summary.entryTrend} />
            <KpiCard label="اجتماعات قادمة" value={summary.upcomingMeetings} icon={CalendarCheck} trend={summary.entryTrend} />
          </section>

          <SectionCard
            title="المؤشرات التشغيلية"
            icon={ShieldCheck}
          >
            <div className="grid gap-4 xl:grid-cols-3">
              <HorizontalBarChart
                title="ملخص الإدارة التعليمية"
                data={[
                  { label: "الحلقات النشطة", value: summary.activeHalaqat },
                  { label: "المعلمون النشطون", value: summary.activeTeachers },
                  { label: "إدخالات الأسبوع", value: summary.weekEntries },
                ]}
              />
              <DonutSummaryChart
                title="جاهزية بيانات المعلمين"
                data={[
                  { label: "بيانات مكتملة", value: summary.completeTeacherPayrollData },
                  { label: "ناقص هوية/إقامة", value: summary.missingDocument },
                  { label: "ناقص آيبان/بنك", value: summary.missingIban },
                ]}
                centerLabel="معلم"
              />
              <DonutSummaryChart
                title="الاجتماعات والحوكمة"
                data={[
                  { label: "اجتماعات قادمة", value: summary.upcomingMeetings },
                  { label: "محاضر قيد الاعتماد", value: summary.draftMeetings },
                  { label: "سياسات تحتاج تحديث", value: summary.needsUpdateGovernance },
                ]}
                centerLabel="بند"
              />
            </div>
          </SectionCard>

          <FollowupAlertsPanel
            title="تنبيهات تحتاج متابعة تنفيذية"
            description="ملخص تنفيذي للطلاب والمعلمين والحلقات التي تحتاج إجراء قريب."
            items={readiness.followups}
            limit={6}
            emptyText="لا توجد تنبيهات متابعة تعليمية حاليًا."
          />

          <MyTasksSummary />

          <section className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="آخر ما يستحق المتابعة" icon={ClipboardCheck}>
              <ActivityList
                emptyText="لا توجد عناصر متابعة عاجلة حاليًا."
                items={[
                  { title: "الخطابات قيد المعالجة", subtitle: `${summary.pendingLetters} خطاب يحتاج متابعة`, meta: "الصادر والخطابات" },
                  { title: "الإشراف الميداني", subtitle: `${summary.followUpVisits} زيارة تحتاج متابعة`, meta: "زيارات المشرفين" },
                  { title: "الإعلام والتدوين", subtitle: `${summary.pendingMediaPosts} مادة إعلامية قيد المراجعة`, meta: "المركز الإعلامي" },
                ].filter((item) => !item.subtitle.startsWith("0"))}
              />
            </SectionCard>
            <SectionCard title="مسارات سريعة" icon={FileCheck2}>
              <QuickLinksGrid
                columns="xl:grid-cols-2"
                links={[
                  { href: "/executive/hr", title: "الموارد البشرية", description: "الموظفون والمعلمون والبيانات الناقصة.", icon: BriefcaseBusiness },
                  { href: "/executive/letters", title: "الصادر والخطابات", description: "إنشاء واعتماد وطباعة الخطابات.", icon: FileText },
                  { href: "/executive/meetings", title: "الاجتماعات", description: "المحاضر والقرارات والتوصيات.", icon: CalendarCheck },
                  { href: "/executive/governance", title: "الحوكمة", description: "السياسات والإفصاحات والامتثال.", icon: Scale },
                ]}
              />
            </SectionCard>
          </section>

          <SectionCard title="أقسام البوابة" icon={BookOpen}>
            <QuickLinksGrid
              columns="xl:grid-cols-2"
              links={[
                { href: "/executive/board", title: "مجلس الإدارة", description: "الأعضاء والقرارات وصفحات الطباعة الرسمية.", icon: ShieldCheck },
                { href: "/executive/reports", title: "التقارير", description: "تقارير مالية وتعليمية وإدارية.", icon: ChartColumn },
                { href: "/executive/supervision", title: "الإشراف", description: "زيارات المشرفين والحلقات التي تحتاج متابعة.", icon: ClipboardCheck },
                { href: "/executive/reports", title: "الإعلام والتدوين", description: "متابعة المواد الإعلامية ضمن التقارير التنفيذية.", icon: Megaphone },
              ]}
            />
          </SectionCard>
        </main>
      </div>
    </div>
  );
}

async function getExecutiveSummary() {
  const supabase = await createClient();
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const since = weekStart.toISOString().slice(0, 10);
  const [teachers, halaqat, meetings, governance, lessons, sessions, letters, visits, mediaPosts] = await Promise.all([
    supabase.from("teachers").select("id,document_number,iban,bank_name,payroll_data_status,status").is("archived_at", null).eq("is_test_account", false).limit(1000),
    supabase.from("halaqat").select("id", { count: "exact", head: true }).eq("status", "active").eq("is_test_account", false).is("archived_at", null),
    supabase.from("meetings").select("id,meeting_date,status").is("archived_at", null).limit(1000),
    supabase.from("governance_items").select("id,status").is("archived_at", null).limit(1000),
    supabase.from("teacher_circle_lessons").select("id,lesson_date").gte("lesson_date", since).is("archived_at", null).limit(2000),
    supabase.from("teacher_session_entries").select("id,session_date").gte("session_date", since).is("archived_at", null).limit(2000),
    supabase.from("hr_letters").select("id", { count: "exact", head: true }).in("status", ["draft", "ready"]).is("archived_at", null),
    supabase.from("supervisor_visits").select("id", { count: "exact", head: true }).eq("status", "needs_followup"),
    supabase.from("media_posts").select("id", { count: "exact", head: true }).in("status", ["draft", "ready_for_review"]).is("archived_at", null),
  ]);
  const teacherRows = teachers.data ?? [];
  const meetingRows = meetings.data ?? [];
  const today = new Date().toISOString().slice(0, 10);

  return {
    activeTeachers: teacherRows.filter((item) => item.status === "active").length,
    missingDocument: teacherRows.filter((item) => !item.document_number).length,
    missingIban: teacherRows.filter((item) => !!item.document_number && (!item.iban || !item.bank_name)).length,
    completeTeacherPayrollData: teacherRows.filter((item) => item.document_number && item.iban && item.bank_name && item.payroll_data_status === "complete").length,
    activeHalaqat: halaqat.count ?? 0,
    upcomingMeetings: meetingRows.filter((item) => String(item.meeting_date ?? "") >= today).length,
    draftMeetings: meetingRows.filter((item) => item.status === "draft").length,
    needsUpdateGovernance: (governance.data ?? []).filter((item) => item.status === "needs_update").length,
    weekEntries: (lessons.data?.length ?? 0) + (sessions.data?.length ?? 0),
    entryTrend: groupLastSevenDays(lessons.data ?? [], "lesson_date", sessions.data ?? [], "session_date"),
    pendingLetters: letters.count ?? 0,
    followUpVisits: visits.count ?? 0,
    pendingMediaPosts: mediaPosts.count ?? 0,
  };
}

function groupLastSevenDays(
  firstRows: Array<Record<string, unknown>>,
  firstDateKey: string,
  secondRows: Array<Record<string, unknown>>,
  secondDateKey: string,
) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return { key: date.toISOString().slice(0, 10), value: 0 };
  });
  const byKey = new Map(days.map((day) => [day.key, day]));
  for (const row of firstRows) {
    const day = byKey.get(String(row[firstDateKey] ?? "").slice(0, 10));
    if (day) day.value += 1;
  }
  for (const row of secondRows) {
    const day = byKey.get(String(row[secondDateKey] ?? "").slice(0, 10));
    if (day) day.value += 1;
  }
  const values = days.map((day) => day.value);
  return values.some((value) => value > 0) ? values : undefined;
}
