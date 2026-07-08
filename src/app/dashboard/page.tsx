import {
  Activity,
  BookOpen,
  BriefcaseBusiness,
  CalendarCheck,
  ChartColumn,
  ClipboardList,
  Building2,
  GraduationCap,
  ShieldCheck,
  UserRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import Link from "next/link";

import { FollowupAlertsPanel } from "@/components/followup-alerts-panel";
import { PageHero, QuickActionLink, SectionCard } from "@/components/dashboard-ui";
import { GoalCircleGrid, HorizontalBarChart, KpiCard, ReadinessChecklist } from "@/components/report-charts";
import { MonthlyBarChart } from "@/components/monthly-bar-chart";
import { getCurrentUserProfile, getCurrentUserRoles, requireAuth } from "@/lib/auth";
import { getFollowupAlertsData } from "@/lib/launch-readiness";
import { formatRoleList, hasAnyRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

type DashboardStat = {
  label: string;
  value: number;
  description: string;
  icon: LucideIcon;
  tone: "emerald" | "gold" | "sage" | "warning";
};

type RecentActivity = {
  type: string;
  title: string;
  subtitle: string;
  date: string;
};

export default async function DashboardPage() {
  const user = await requireAuth();
  const [profile, roles] = await Promise.all([
    getCurrentUserProfile(user),
    getCurrentUserRoles(user),
  ]);
  const canManageHalaqat = hasAnyRole(roles, ["admin", "demo_admin", "executive_director", "executive_manager", "halaqat_manager"]);
  const canManagePrograms = hasAnyRole(roles, ["admin", "demo_admin", "executive_director", "executive_manager", "halaqat_manager"]);
  const canViewFinance = hasAnyRole(roles, ["admin", "demo_admin", "executive_director", "executive_manager", "finance_viewer"]);
  const canManageHr = hasAnyRole(roles, ["admin", "demo_admin", "executive_director", "executive_manager", "hr"]);
  const canViewReports = hasAnyRole(roles, ["admin", "demo_admin", "executive_director", "executive_manager"]);
  const [dashboard, alerts, finance, followups] = canManageHalaqat
    ? await Promise.all([getDashboardInsights(), getAdminAlerts(), canViewFinance ? getFinanceSummary() : Promise.resolve(null), getFollowupAlertsData()])
    : [null, null, null, null];
  const stats = dashboard?.stats ?? [];
  const activityTrend = buildCombinedTrend(
    dashboard?.monthlyData?.sessions ?? [],
    dashboard?.monthlyData?.lessons ?? [],
    dashboard?.monthlyData?.reviews ?? [],
  );

  const displayName = profile?.full_name?.split(" ")[0] ?? profile?.full_name ?? "مدير النظام";
  const hijriDate = new Intl.DateTimeFormat("ar-SA-u-ca-islamic", { day: "numeric", month: "long", year: "numeric" }).format(new Date());

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={`لوحة التحكم — ${hijriDate}`}
        title={`السلام عليكم، ${displayName}`}
        actions={
          <div className="rounded-[1.4rem] border border-[var(--line)] bg-white/85 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-2xl bg-[#fff4d9] text-[var(--primary-dark)]">
                <UserRound aria-hidden="true" className="size-6" />
              </span>
              <div>
                <p className="text-xs font-bold text-[var(--muted)]">حساب الدخول</p>
                <p className="mt-1 text-lg font-bold text-[var(--primary-dark)]">{profile?.full_name ?? user.email}</p>
              </div>
            </div>
            <p className="mt-1 text-sm font-bold text-[#765514]">
              {formatRoleList(roles)}
            </p>
          </div>
        }
      />

      {stats.length > 0 ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {stats.map((stat) => (
            <KpiCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              description={stat.description}
              icon={stat.icon}
              tone={stat.tone}
              trend={activityTrend}
            />
          ))}
        </section>
      ) : null}

      {finance ? (
        finance.revenues === 0 && finance.expenses === 0 ? (
          <Link
            href="/dashboard/finance"
            className="block rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-sunken)]/50 px-5 py-4 text-sm font-semibold text-[var(--muted)] transition hover:border-[var(--gold)] hover:text-[var(--primary-dark)]"
          >
            لا توجد بيانات مالية مسجلة بعد لهذا الشهر — انتقال لتسجيل الإيرادات والمصروفات ←
          </Link>
        ) : (
          <section className="grid gap-4 sm:grid-cols-3">
            <KpiCard label="إيرادات الشهر" value={finance.revenuesFormatted} icon={Wallet} tone="emerald" />
            <KpiCard label="مصروفات الشهر" value={finance.expensesFormatted} icon={Wallet} tone={finance.net < 0 ? "warning" : "gold"} />
            <KpiCard label="الصافي" value={finance.netFormatted} icon={Wallet} tone={finance.net >= 0 ? "sage" : "warning"} />
          </section>
        )
      ) : null}

      {stats.length > 0 ? (
        <nav aria-label="إجراءات سريعة">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {canManageHalaqat && <QuickActionLink href="/dashboard/students" icon={GraduationCap} label="إضافة طالب" color="gold" />}
            {canViewReports && <QuickActionLink href="/dashboard/operations" icon={Activity} label="مركز التشغيل" color="emerald" />}
            {canManageHr && <QuickActionLink href="/dashboard/teachers" icon={UserRound} label="تسجيل معلم" color="emerald" />}
            <QuickActionLink href="/dashboard/letters/new" icon={ClipboardList} label="إنشاء خطاب" color="sage" />
          </div>
        </nav>
      ) : null}

      {alerts && alerts.length > 0 ? (
        <section className="rounded-[1.4rem] border border-amber-200 bg-amber-50 p-4">
          <p className="mb-3 text-xs font-semibold text-amber-700">تنبيهات تحتاج انتباهك</p>
          <div className="flex flex-wrap gap-2">
            {alerts.map((alert) => (
              <a key={alert.label} href={alert.href} className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-white px-4 py-2 text-sm font-bold text-amber-800 shadow-sm transition hover:border-amber-400 hover:bg-amber-50">
                <span className="grid size-5 place-items-center rounded-full bg-amber-400 text-[10px] font-semibold text-white">{alert.count}</span>
                {alert.label}
              </a>
            ))}
          </div>
        </section>
      ) : null}

      {followups ? (
        <FollowupAlertsPanel
          title="طلاب ومعلمون يحتاجون متابعة"
          description="تنبيهات مركزة على آخر 7 أيام، الغياب المتكرر، والحلقات غير المزارة."
          items={followups.followups}
          limit={6}
          emptyText="لا توجد تنبيهات متابعة تعليمية حاليًا."
        />
      ) : null}

      {stats.length > 0 ? (
        <section className="grid gap-4 xl:grid-cols-[1.65fr_1fr]">
          {stats.length > 0 && (dashboard?.monthlyData?.sessions?.length ?? 0) > 0 ? (
            <MonthlyBarChart
              title="أداء الحفظ الشهري"
              sessions={dashboard?.monthlyData?.sessions ?? []}
              lessons={dashboard?.monthlyData?.lessons ?? []}
              reviews={dashboard?.monthlyData?.reviews ?? []}
            />
          ) : (
            <HorizontalBarChart
              title="نظرة تشغيلية عامة"
              data={dashboard?.operationalChart ?? []}
              source="المصدر: أعداد فعلية من جداول التشغيل"
            />
          )}
          <GoalCircleGrid
            title="أهداف العام"
            items={dashboard?.readiness ?? []}
          />
        </section>
      ) : null}

      {stats.length > 0 ? (
        <section className="grid gap-4 xl:grid-cols-2">
          <ReadinessChecklist
            title="جاهزية بيانات الحلقات"
            items={dashboard?.readiness ?? []}
            source="المصدر: جداول الحلقات والروابط التعليمية"
          />
          <HorizontalBarChart
            title="عدد الطلاب حسب الحلقة"
            data={dashboard?.studentsByHalaqa ?? []}
            source="المصدر: روابط الطلاب بالحلقات"
          />
        </section>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="ملخص اليوم" icon={CalendarCheck}>
          <SummaryRow label="الحلقات المسجلة" value={readStat(stats, "الحلقات")} />
          <SummaryRow label="الطلاب المسجلون" value={readStat(stats, "الطلاب")} />
          <SummaryRow label="المساجد النشطة" value={readStat(stats, "المساجد")} />
        </Panel>

        <Panel title="الأنشطة الأخيرة" icon={Activity}>
          {dashboard && dashboard.recentActivities.length > 0 ? (
            dashboard.recentActivities.map((activity) => (
              <ActivityLine key={`${activity.type}-${activity.title}-${activity.date}`} activity={activity} />
            ))
          ) : (
            <EmptyLine text="لا توجد أنشطة تشغيلية حديثة مسجلة في النظام حاليًا." />
          )}
        </Panel>

      </section>

      <SectionCard title="الانتقال للأقسام" icon={ClipboardList}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <DashboardCard title="المساجد" href="/dashboard/mosques" enabled={canManageHalaqat} icon={Building2} />
        <DashboardCard title="الحلقات" href="/dashboard/halaqat" enabled={canManageHalaqat} icon={BookOpen} />
        <DashboardCard title="المعلمون" href="/dashboard/teachers" enabled={canManageHalaqat} icon={UserRound} />
        <DashboardCard title="المشرفون" href="/dashboard/supervisors" enabled={canManageHalaqat} icon={ShieldCheck} />
        <DashboardCard title="الطلاب" href="/dashboard/students" enabled={canManageHalaqat} icon={GraduationCap} />
        <DashboardCard title="البرامج والمسابقات" href="/dashboard/programs" enabled={canManagePrograms} icon={ClipboardList} />
        <DashboardCard title="المالية والرواتب" href="/dashboard/finance" enabled={canViewFinance} icon={Wallet} />
        <DashboardCard title="الموارد البشرية" href="/dashboard/hr" enabled={canManageHr} icon={BriefcaseBusiness} />
        <DashboardCard title="مركز التشغيل" href="/dashboard/operations" enabled={canViewReports} icon={Activity} />
        <DashboardCard title="جاهزية التشغيل" href="/dashboard/launch-readiness" enabled={canViewReports} icon={ShieldCheck} />
        <DashboardCard title="التقارير" href="/dashboard/reports" enabled={canViewReports} icon={ChartColumn} />
      </div>
      </SectionCard>
    </div>
  );
}

function DashboardCard({
  title,
  href,
  enabled,
  icon: Icon,
  description,
}: {
  title: string;
  href: string;
  enabled: boolean;
  icon: LucideIcon;
  description?: string;
}) {
  if (!enabled) {
    return (
      <div className="rounded-2xl border border-[var(--line)] bg-white p-5 opacity-70 shadow-sm">
        <h2 className="text-lg font-bold text-[var(--primary-dark)]">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          غير متاح لهذا الدور حاليًا.
        </p>
      </div>
    );
  }

  return (
    <a
      href={href}
      className="app-card group rounded-[1.5rem] p-5 transition hover:-translate-y-0.5 hover:border-[var(--gold)] hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl border border-[var(--line)] bg-[var(--gold-soft)] text-[var(--primary-dark)] transition group-hover:bg-[var(--gold)]">
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <h2 className="text-lg font-bold text-[var(--primary-dark)]">{title}</h2>
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
        {description}
      </p>
    </a>
  );
}


async function getFinanceSummary() {
  const supabase = await createClient();
  const monthStart = new Date();
  monthStart.setDate(1);
  const since = monthStart.toISOString().slice(0, 10);
  const [rev, exp] = await Promise.all([
    supabase.from("finance_revenues").select("amount").gte("revenue_date", since).is("archived_at", null),
    supabase.from("finance_expenses").select("amount").gte("expense_date", since).is("archived_at", null),
  ]);
  const revenues = (rev.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const expenses = (exp.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const net = revenues - expenses;
  const fmt = (n: number) => new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 0 }).format(n);
  return { revenues, expenses, net, revenuesFormatted: fmt(revenues), expensesFormatted: fmt(expenses), netFormatted: fmt(net) };
}

async function getAdminAlerts() {
  const supabase = await createClient();
  const cutoff14 = new Date();
  cutoff14.setDate(cutoff14.getDate() - 14);
  const since14 = cutoff14.toISOString().slice(0, 10);

  const [teachers, meetings, letters, visits, recentSessions, recentLessons] = await Promise.all([
    supabase.from("teachers").select("id,document_number,iban,bank_name").is("archived_at", null).eq("status", "active").eq("is_test_account", false).limit(1000),
    supabase.from("meetings").select("id", { count: "exact", head: true }).eq("status", "draft").is("archived_at", null),
    supabase.from("hr_letters").select("id", { count: "exact", head: true }).in("status", ["draft", "ready"]).is("archived_at", null),
    supabase.from("supervisor_visits").select("id", { count: "exact", head: true }).eq("status", "needs_followup"),
    supabase.from("teacher_session_entries").select("teacher_id").gte("session_date", since14).is("archived_at", null).limit(2000),
    supabase.from("teacher_circle_lessons").select("teacher_id").gte("lesson_date", since14).is("archived_at", null).limit(2000),
  ]);
  const teacherRows = teachers.data ?? [];
  const missingDoc = teacherRows.filter((t) => !t.document_number).length;
  const missingIban = teacherRows.filter((t) => !t.iban || !t.bank_name).length;

  const activeTeacherIds = new Set(teacherRows.map((t) => t.id));
  const recentTeacherIds = new Set([
    ...(recentSessions.data ?? []).map((r: Record<string, unknown>) => String(r.teacher_id ?? "")),
    ...(recentLessons.data ?? []).map((r: Record<string, unknown>) => String(r.teacher_id ?? "")),
  ]);
  const inactiveCount = [...activeTeacherIds].filter((id) => !recentTeacherIds.has(id)).length;

  const result: { label: string; count: number; href: string }[] = [];
  if (missingDoc > 0) result.push({ label: "معلمون ناقصو الهوية/الإقامة", count: missingDoc, href: "/dashboard/teachers" });
  if (missingIban > 0) result.push({ label: "معلمون ناقصو الآيبان", count: missingIban, href: "/dashboard/teachers" });
  if ((meetings.count ?? 0) > 0) result.push({ label: "محاضر قيد الاعتماد", count: meetings.count ?? 0, href: "/dashboard/meetings" });
  if ((letters.count ?? 0) > 0) result.push({ label: "خطابات قيد المعالجة", count: letters.count ?? 0, href: "/dashboard/letters" });
  if ((visits.count ?? 0) > 0) result.push({ label: "زيارات تحتاج متابعة", count: visits.count ?? 0, href: "/dashboard/supervisor" });
  if (inactiveCount > 0) result.push({ label: "معلمون بدون إدخال (14 يوم)", count: inactiveCount, href: "/dashboard/teachers" });
  return result;
}

async function getDashboardInsights() {
  const supabase = await createClient();
  const tables = [
    ["المساجد", "mosques", Building2, "مواقع الحلقات", "emerald"],
    ["الحلقات", "halaqat", BookOpen, "حلقات مسجلة", "gold"],
    ["المعلمون", "teachers", UserRound, "معلمون نشطون", "sage"],
    ["المشرفون", "supervisors", ShieldCheck, "مشرفون ميدانيون", "emerald"],
    ["الطلاب", "students", GraduationCap, "طلاب مسجلون", "gold"],
  ] as const;

  const [
    counts,
    halaqatResult,
    enrollmentsResult,
    recentSessionsResult,
    recentLessonsResult,
    sessionDatesResult,
    lessonDatesResult,
    reviewDatesResult,
    recentVisitsResult,
    recentLettersResult,
    recentMeetingsResult,
  ] = await Promise.all([
    Promise.all(
      tables.map(async ([label, table, icon, description, tone]) => {
        let countQuery = supabase
          .from(table)
          .select("id", { count: "exact", head: true })
          .is("archived_at", null);
        if (["halaqat", "teachers", "students"].includes(table)) {
          countQuery = countQuery.eq("is_test_account", false);
        }
        const { count, error } = await countQuery;

        return { label, icon, description, tone, value: error ? 0 : count ?? 0 } satisfies DashboardStat;
      }),
    ),
    supabase
      .from("halaqat")
      .select("id,name,teacher_id,mosque_id")
      .is("archived_at", null)
      .eq("is_test_account", false)
      .limit(500),
    supabase
      .from("student_enrollments")
      .select("halaqa_id,status,archived_at")
      .eq("status", "active")
      .is("archived_at", null)
      .limit(5000),
    supabase
      .from("teacher_session_entries")
      .select("id,halaqa_id,session_date,created_at,students!teacher_session_entries_student_id_fkey(full_name),halaqat!teacher_session_entries_halaqa_id_fkey(name)")
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("teacher_circle_lessons")
      .select("id,halaqa_id,lesson_date,lesson_title,created_at,halaqat!teacher_circle_lessons_halaqa_id_fkey(name)")
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("teacher_session_entries")
      .select("session_date")
      .is("archived_at", null)
      .gte("session_date", monthsAgo(6))
      .limit(2000),
    supabase
      .from("teacher_circle_lessons")
      .select("lesson_date")
      .is("archived_at", null)
      .gte("lesson_date", monthsAgo(6))
      .limit(2000),
    supabase
      .from("teacher_session_entries")
      .select("session_date")
      .is("archived_at", null)
      .not("review_surah_name", "is", null)
      .gte("session_date", monthsAgo(6))
      .limit(2000),
    supabase
      .from("supervisor_visits")
      .select("id,visit_date,created_at,halaqat:circle_id(name)")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("hr_letters")
      .select("id,letter_date,subject,status,created_at")
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("meetings")
      .select("id,title,meeting_date,status,created_at")
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  const halaqat = (halaqatResult.data ?? []) as Array<Record<string, unknown>>;
  const enrollmentCounts = countEnrollmentsByHalaqa(enrollmentsResult.data ?? []);
  const halaqaIdsWithEntries = new Set([
    ...((recentSessionsResult.data ?? []) as Array<Record<string, unknown>>).map((row) => String(row.halaqa_id ?? "")).filter(Boolean),
    ...((recentLessonsResult.data ?? []) as Array<Record<string, unknown>>).map((row) => String(row.halaqa_id ?? "")).filter(Boolean),
  ]);
  const totalHalaqat = halaqat.length;

  return {
    stats: counts,
    operationalChart: counts
      .filter((item) => item.label !== "الطلاب")
      .map((item) => ({ label: item.label, value: item.value })),
    studentsByHalaqa: halaqat
      .map((halaqa) => ({ label: text(halaqa.name) || "حلقة غير محددة", value: enrollmentCounts.get(text(halaqa.id)) ?? 0 }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5),
    readiness: [
      {
        label: "مرتبطة بمعلم",
        value: halaqat.filter((halaqa) => Boolean(halaqa.teacher_id)).length,
        total: totalHalaqat,
        meta: "الحلقات التي يظهر لها معلم أساسي",
      },
      {
        label: "مرتبطة بمسجد",
        value: halaqat.filter((halaqa) => Boolean(halaqa.mosque_id)).length,
        total: totalHalaqat,
        meta: "الحلقات التي يظهر لها مسجد أو موقع",
      },
      {
        label: "لديها طلاب",
        value: halaqat.filter((halaqa) => (enrollmentCounts.get(text(halaqa.id)) ?? 0) > 0).length,
        total: totalHalaqat,
        meta: "الحلقات التي لديها رابط طالب نشط على الأقل",
      },
      {
        label: "لديها إدخال حديث",
        value: halaqat.filter((halaqa) => halaqaIdsWithEntries.has(String(halaqa.id))).length,
        total: totalHalaqat,
        meta: "حسب آخر إدخالات المعلمين المحملة",
      },
    ],
    recentActivities: buildRecentActivities(
      recentSessionsResult.data,
      recentLessonsResult.data,
      recentVisitsResult.data,
      recentLettersResult.data,
      recentMeetingsResult.data,
    ),
    monthlyData: buildMonthlySeries(
      sessionDatesResult.data ?? [],
      lessonDatesResult.data ?? [],
      reviewDatesResult.data ?? [],
    ),
  };
}

function monthsAgo(n: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
}

function buildMonthlySeries(
  sessionRows: Array<Record<string, unknown>>,
  lessonRows: Array<Record<string, unknown>>,
  reviewRows: Array<Record<string, unknown>>,
) {
  const countByMonth = (rows: Array<Record<string, unknown>>, dateKey: string) => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const month = String(row[dateKey] ?? "").slice(0, 7);
      if (month) counts.set(month, (counts.get(month) ?? 0) + 1);
    }
    return counts;
  };

  const sessionCounts = countByMonth(sessionRows, "session_date");
  const lessonCounts = countByMonth(lessonRows, "lesson_date");
  const reviewCounts = countByMonth(reviewRows, "session_date");

  const months = Array.from(new Set([...sessionCounts.keys(), ...lessonCounts.keys(), ...reviewCounts.keys()])).sort(
    (a, b) => a.localeCompare(b),
  );

  const toSeries = (counts: Map<string, number>) =>
    months.map((month) => ({
      label: new Intl.DateTimeFormat("ar-SA", { month: "short", year: "2-digit" }).format(new Date(`${month}-01`)),
      value: counts.get(month) ?? 0,
    }));

  return {
    sessions: toSeries(sessionCounts),
    lessons: toSeries(lessonCounts),
    reviews: toSeries(reviewCounts),
  };
}

function buildRecentActivities(
  sessions: unknown,
  lessons: unknown,
  visits: unknown,
  letters: unknown,
  meetings: unknown,
): RecentActivity[] {
  const activities: RecentActivity[] = [
    ...arrayRows(sessions).map((row) => ({
      type: "تسميع",
      title: text(readObject(row.students).full_name) || "جلسة طالب",
      subtitle: text(readObject(row.halaqat).name) || "حلقة غير محددة",
      date: text(row.session_date || row.created_at),
    })),
    ...arrayRows(lessons).map((row) => ({
      type: "حصة عامة",
      title: text(row.lesson_title) || "حصة حلقة",
      subtitle: text(readObject(row.halaqat).name) || "حلقة غير محددة",
      date: text(row.lesson_date || row.created_at),
    })),
    ...arrayRows(visits).map((row) => ({
      type: "زيارة مشرف",
      title: text(readObject(row.halaqat).name) || "زيارة إشرافية",
      subtitle: "الإشراف الميداني",
      date: text(row.visit_date || row.created_at),
    })),
    ...arrayRows(letters).map((row) => ({
      type: "خطاب",
      title: text(row.subject) || "خطاب رسمي",
      subtitle: "الصادر والخطابات",
      date: text(row.letter_date || row.created_at),
    })),
    ...arrayRows(meetings).map((row) => ({
      type: "اجتماع",
      title: text(row.title) || "اجتماع",
      subtitle: "الاجتماعات",
      date: text(row.meeting_date || row.created_at),
    })),
  ];

  return activities
    .filter((activity) => activity.date)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);
}

function countEnrollmentsByHalaqa(rows: unknown) {
  const counts = new Map<string, number>();
  for (const row of arrayRows(rows)) {
    const halaqaId = text(row.halaqa_id);
    if (halaqaId) counts.set(halaqaId, (counts.get(halaqaId) ?? 0) + 1);
  }
  return counts;
}

function ActivityLine({ activity }: { activity: RecentActivity }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--primary-dark)]">{activity.title}</p>
          <p className="mt-1 text-xs font-bold text-[var(--muted)]">{activity.subtitle}</p>
        </div>
        <span className="shrink-0 rounded-full bg-[#fff4d9] px-3 py-1 text-xs font-semibold text-[#755715]">
          {activity.type}
        </span>
      </div>
      <p className="mt-2 text-xs font-bold text-[var(--muted)]">{formatDate(activity.date)}</p>
    </div>
  );
}

function arrayRows(value: unknown) {
  return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];
}

function readObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function text(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function formatDate(value: string) {
  if (!value) return "غير محدد";
  return new Intl.DateTimeFormat("ar-SA").format(new Date(value));
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section className="app-card rounded-[1.6rem] p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-[var(--primary-dark)]">{title}</h2>
        <span className="grid size-9 place-items-center rounded-xl border border-[var(--line)] bg-[var(--gold-soft)] text-sm font-semibold text-[var(--primary-dark)]">
          <Icon aria-hidden="true" className="size-4" />
        </span>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 py-3">
      <span className="text-sm font-bold text-[var(--muted)]">{label}</span>
      <span className="text-lg font-bold text-[var(--primary-dark)]">{value}</span>
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return (
    <p className="rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 py-3 text-sm font-semibold leading-6 text-[var(--muted)]">
      {text}
    </p>
  );
}

function readStat(
  stats: DashboardStat[],
  label: string,
) {
  return stats.find((stat) => stat.label === label)?.value ?? "غير متاح";
}

function buildCombinedTrend(
  sessions: Array<{ value: number }>,
  lessons: Array<{ value: number }>,
  reviews: Array<{ value: number }>,
) {
  const length = Math.max(sessions.length, lessons.length, reviews.length);
  const values = Array.from(
    { length },
    (_, index) => Number(sessions[index]?.value ?? 0) + Number(lessons[index]?.value ?? 0) + Number(reviews[index]?.value ?? 0),
  );
  return values.some((value) => value > 0) ? values : undefined;
}
