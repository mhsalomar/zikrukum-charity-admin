import type React from "react";
import Link from "next/link";
import {
  AlertCircle,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  ClipboardPenLine,
  Clock,
  Plus,
  UserRound,
  XCircle,
} from "lucide-react";

import {
  type CircleStatus,
  type DailyMonitorRow,
  formatShortDate,
  getDailyMonitorData,
  statusLabel,
} from "@/lib/daily-monitor";
import { createClient } from "@/lib/supabase/server";
import { num } from "@/lib/format";

type PageProps = {
  searchParams: Promise<{ circle?: string; teacher?: string; status?: string }>;
};

const STATUS_STYLE: Record<CircleStatus, { chip: string; icon: React.ElementType }> = {
  excellent: { chip: "bg-emerald-100 text-emerald-800", icon: CheckCircle2 },
  "needs-followup": { chip: "bg-amber-100 text-amber-800", icon: AlertCircle },
  late: { chip: "bg-red-100 text-red-700", icon: XCircle },
  "no-data": { chip: "bg-[var(--bg-sunken)] text-[var(--muted)]", icon: Clock },
};

export default async function DailyMonitorPage({ searchParams }: PageProps) {
  const filters = await searchParams;
  const data = await getDailyMonitorData({
    circleId: filters.circle,
    teacherId: filters.teacher,
    status: filters.status,
  });

  const { summary, rows, teacherOptions, circleOptions, today } = data;

  // Weekly memorization KPI
  const weeklyKpi = await getWeeklyMemorizationKpi();
  const thisWeekTotal = weeklyKpi.reduce((s, r) => s + r.thisWeek, 0);
  const lastWeekTotal = weeklyKpi.reduce((s, r) => s + r.lastWeek, 0);

  const kpiCards = [
    { label: "الحلقات النشطة", value: summary.activeCount, color: "text-[var(--primary-dark)]", bg: "bg-[#f0f7f4]" },
    { label: "سجّلت اليوم", value: summary.registeredToday, color: "text-emerald-700", bg: "bg-emerald-50" },
    { label: "لم تسجّل اليوم", value: summary.notRegisteredToday, color: "text-red-600", bg: "bg-red-50" },
    { label: "معلمون متأخرون", value: summary.lateTeachers, color: "text-red-600", bg: "bg-red-50" },
    { label: "طلاب غائبون اليوم", value: summary.absentStudentsToday, color: "text-amber-700", bg: "bg-amber-50" },
    { label: "تحتاج زيارة إشرافية", value: summary.needsVisit, color: "text-amber-700", bg: "bg-amber-50" },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="app-card luxury-pattern overflow-hidden rounded-[1.7rem]">
        <div className="relative flex flex-col gap-4 border-r-4 border-[var(--gold)] p-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--gold)]">التشغيل اليومي</p>
            <h1 className="mt-1 text-3xl font-bold text-[var(--primary-dark)]">مركز المتابعة اليومية</h1>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
              {new Date(today).toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <Link
            href="/dashboard/supervisor/visits/new"
            className="gold-button inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white"
          >
            <Plus aria-hidden className="size-4" />
            زيارة إشرافية جديدة
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {kpiCards.map((card) => (
          <div key={card.label} className={`app-card rounded-[1.2rem] p-4 ${card.bg}`}>
            <p className="text-xs font-bold text-[var(--muted)]">{card.label}</p>
            <p className={`mt-1 text-3xl font-bold ${card.color}`}>{num(card.value)}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <form method="GET" className="app-card flex flex-wrap items-end gap-3 rounded-[1.4rem] p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-[var(--muted)]">الحلقة</label>
          <select
            name="circle"
            defaultValue={filters.circle ?? ""}
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-dark)]"
          >
            <option value="">الكل</option>
            {circleOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-[var(--muted)]">المعلم</label>
          <select
            name="teacher"
            defaultValue={filters.teacher ?? ""}
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-dark)]"
          >
            <option value="">الكل</option>
            {teacherOptions.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-[var(--muted)]">الحالة</label>
          <select
            name="status"
            defaultValue={filters.status ?? ""}
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-dark)]"
          >
            <option value="">الكل</option>
            <option value="excellent">ممتازة</option>
            <option value="needs-followup">تحتاج متابعة</option>
            <option value="late">متأخرة</option>
            <option value="no-data">بدون بيانات</option>
          </select>
        </div>

        <button
          type="submit"
          className="rounded-xl bg-[var(--primary-dark)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-80"
        >
          تصفية
        </button>
        {(filters.circle || filters.teacher || filters.status) && (
          <Link
            href="/dashboard/daily-monitor"
            className="rounded-xl border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--line)]"
          >
            إعادة تعيين
          </Link>
        )}
      </form>

      {/* Weekly Memorization KPI */}
      {weeklyKpi.length > 0 && (
        <section className="app-card rounded-[1.6rem] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--primary-dark)]">الحفظ الأسبوعي</h2>
              <p className="text-xs font-bold text-[var(--muted)]">إجمالي الأوجه المحفوظة هذا الأسبوع مقارنة بالأسبوع الماضي</p>
            </div>
            <div className="flex gap-4 text-center">
              <div>
                <p className="text-xs font-bold text-[var(--muted)]">هذا الأسبوع</p>
                <p className="text-2xl font-bold text-[var(--primary-dark)]">{num(thisWeekTotal, 1)}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--muted)]">الأسبوع الماضي</p>
                <p className="text-2xl font-bold text-[var(--muted)]">{num(lastWeekTotal, 1)}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--muted)]">الفرق</p>
                <p className={`text-2xl font-bold ${thisWeekTotal >= lastWeekTotal ? "text-emerald-600" : "text-red-600"}`}>
                  {thisWeekTotal >= lastWeekTotal ? "+" : ""}{num(thisWeekTotal - lastWeekTotal, 1)}
                </p>
              </div>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {weeklyKpi.filter(r => r.thisWeek > 0 || r.lastWeek > 0).slice(0, 9).map((r) => (
              <div key={r.halaqaId} className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-[#fffdf8] px-4 py-3">
                <p className="text-sm font-semibold text-[var(--primary-dark)] truncate">{r.halaqaName}</p>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-semibold text-[var(--primary-dark)]">{num(r.thisWeek, 1)}</span>
                  {r.lastWeek > 0 && (
                    <span className={`text-xs font-bold ${r.thisWeek >= r.lastWeek ? "text-emerald-600" : "text-red-500"}`}>
                      {r.thisWeek >= r.lastWeek ? "▲" : "▼"}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Table */}
      <section className="app-card overflow-hidden rounded-[1.6rem]">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-sm font-semibold text-[var(--muted)]">لا توجد حلقات تطابق الفلتر</div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="formal-table w-full min-w-[900px] text-right text-sm">
                <thead>
                  <tr>
                    {["الحلقة", "المعلم", "آخر إدخال", "إدخال اليوم", "حضور اليوم", "آخر زيارة", "الحالة", "الإجراءات"].map((h) => (
                      <th key={h} className="px-4 py-3 text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <CircleRow key={row.id} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <div className="grid gap-3 p-4 lg:hidden">
              {rows.map((row) => (
                <CircleCard key={row.id} row={row} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function StatusChip({ status }: { status: CircleStatus }) {
  const cfg = STATUS_STYLE[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.chip}`}>
      <Icon className="size-3.5" aria-hidden />
      {statusLabel(status)}
    </span>
  );
}

function CircleRow({ row }: { row: DailyMonitorRow }) {
  return (
    <tr className="transition">
      <td className="px-4 py-3 font-bold text-[var(--primary-dark)]">{row.name}</td>
      <td className="px-4 py-3 text-[var(--text)]">{row.teacherName}</td>
      <td className="px-4 py-3 text-[var(--muted)]">{formatShortDate(row.lastEntry)}</td>
      <td className="px-4 py-3">
        {row.todayEntry ? (
          <span className="text-emerald-600 font-bold">✓ سُجّل</span>
        ) : (
          <span className="text-red-500 font-bold">✗ لم يُسجَّل</span>
        )}
      </td>
      <td className="px-4 py-3 text-[var(--muted)]">{row.todayAttendance ?? "—"}</td>
      <td className="px-4 py-3 text-[var(--muted)]">{formatShortDate(row.lastVisit)}</td>
      <td className="px-4 py-3"><StatusChip status={row.status} /></td>
      <td className="px-4 py-3">
        <ActionButtons row={row} />
      </td>
    </tr>
  );
}

function CircleCard({ row }: { row: DailyMonitorRow }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-[var(--primary-dark)]">{row.name}</p>
          <p className="mt-0.5 text-xs font-semibold text-[var(--muted)]">{row.teacherName}</p>
        </div>
        <StatusChip status={row.status} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-[var(--muted)]">
        <span>آخر إدخال: {formatShortDate(row.lastEntry)}</span>
        <span>آخر زيارة: {formatShortDate(row.lastVisit)}</span>
        <span>
          اليوم:{" "}
          {row.todayEntry ? (
            <span className="text-emerald-600 font-bold">✓ سُجّل</span>
          ) : (
            <span className="text-red-500 font-bold">✗ لم يُسجَّل</span>
          )}
        </span>
        {row.todayAttendance !== null && <span>الحضور: {row.todayAttendance}</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        <ActionButtons row={row} />
      </div>
    </div>
  );
}

async function getWeeklyMemorizationKpi() {
  const supabase = await createClient();
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setDate(now.getDate() - dayOfWeek);
  const startOfLastWeek = new Date(startOfThisWeek);
  startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);

  const thisWeekStart = startOfThisWeek.toISOString().slice(0, 10);
  const lastWeekStart = startOfLastWeek.toISOString().slice(0, 10);
  const lastWeekEnd = startOfThisWeek.toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);

  const [thisWeekData, lastWeekData, halaqatData] = await Promise.all([
    supabase.from("teacher_session_entries").select("halaqa_id,memorization_pages,review_pages").gte("session_date", thisWeekStart).lte("session_date", today).is("archived_at", null),
    supabase.from("teacher_session_entries").select("halaqa_id,memorization_pages,review_pages").gte("session_date", lastWeekStart).lt("session_date", lastWeekEnd).is("archived_at", null),
    supabase.from("halaqat").select("id,name").is("archived_at", null).order("name"),
  ]);

  const sum = (rows: Array<{ halaqa_id: string | null; memorization_pages: number | null; review_pages: number | null }>, halaqaId: string) =>
    rows.filter(r => r.halaqa_id === halaqaId).reduce((s, r) => s + Number(r.memorization_pages ?? 0) + Number(r.review_pages ?? 0), 0);

  const thisWeekRows = thisWeekData.data ?? [];
  const lastWeekRows = lastWeekData.data ?? [];

  return (halaqatData.data ?? []).map(h => ({
    halaqaId: h.id,
    halaqaName: h.name,
    thisWeek: sum(thisWeekRows, h.id),
    lastWeek: sum(lastWeekRows, h.id),
  })).sort((a, b) => b.thisWeek - a.thisWeek);
}

function ActionButtons({ row }: { row: DailyMonitorRow }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Link
        href={`/dashboard/halaqat?circle=${row.id}`}
        className="inline-flex items-center gap-1 rounded-lg bg-[#f0f7f4] px-2.5 py-1 text-xs font-semibold text-[var(--primary-dark)] transition hover:bg-[#daf0e6]"
      >
        <BookOpen className="size-3" aria-hidden />
        الحلقة
      </Link>
      <Link
        href={`/teacher/progress?teacher=${row.teacherId}`}
        className="inline-flex items-center gap-1 rounded-lg bg-[#f0f7f4] px-2.5 py-1 text-xs font-semibold text-[var(--primary-dark)] transition hover:bg-[#daf0e6]"
      >
        <UserRound className="size-3" aria-hidden />
        إدخالات المعلم
      </Link>
      <Link
        href={`/dashboard/supervisor/visits?circle=${row.id}`}
        className="inline-flex items-center gap-1 rounded-lg bg-[#f0f7f4] px-2.5 py-1 text-xs font-semibold text-[var(--primary-dark)] transition hover:bg-[#daf0e6]"
      >
        <ClipboardPenLine className="size-3" aria-hidden />
        الزيارات
      </Link>
      <Link
        href={`/dashboard/supervisor/visits/new?circle=${row.id}`}
        className="inline-flex items-center gap-1 rounded-lg bg-[var(--primary-dark)] px-2.5 py-1 text-xs font-semibold text-white transition hover:opacity-80"
      >
        <CalendarCheck className="size-3" aria-hidden />
        زيارة جديدة
      </Link>
    </div>
  );
}
