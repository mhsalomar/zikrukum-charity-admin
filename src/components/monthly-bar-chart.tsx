"use client";

import { useState } from "react";

import { ChartCard, ChartDatum, EmptyChart, SectionHeader } from "@/components/report-charts";

type SeriesKey = "sessions" | "lessons" | "reviews";

const SERIES: Array<{ key: SeriesKey; label: string; color: string }> = [
  { key: "sessions", label: "التسميع", color: "#0d6f4f" },
  { key: "lessons", label: "الحفظ", color: "#b58a3a" },
  { key: "reviews", label: "المراجعة", color: "#3d8bbd" },
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 1 }).format(value);
}

export function MonthlyBarChart({
  title,
  description,
  sessions,
  lessons,
  reviews,
}: {
  title: string;
  description?: string;
  sessions: ChartDatum[];
  lessons: ChartDatum[];
  reviews: ChartDatum[];
}) {
  const [visible, setVisible] = useState<Record<SeriesKey, boolean>>({
    sessions: true,
    lessons: true,
    reviews: true,
  });

  const dataBySeries: Record<SeriesKey, ChartDatum[]> = { sessions, lessons, reviews };
  const labels = sessions.length >= lessons.length && sessions.length >= reviews.length
    ? sessions.map((d) => d.label)
    : lessons.length >= reviews.length
      ? lessons.map((d) => d.label)
      : reviews.map((d) => d.label);

  const hasAnyData = sessions.length > 0 || lessons.length > 0 || reviews.length > 0;

  if (!hasAnyData) {
    return (
      <ChartCard title={title} description={description}>
        <EmptyChart />
      </ChartCard>
    );
  }

  const totals: Record<SeriesKey, number> = {
    sessions: sessions.reduce((sum, item) => sum + item.value, 0),
    lessons: lessons.reduce((sum, item) => sum + item.value, 0),
    reviews: reviews.reduce((sum, item) => sum + item.value, 0),
  };

  const activeSeries = SERIES.filter((series) => visible[series.key]);
  const stackMax = Math.max(
    ...labels.map((_, i) => activeSeries.reduce((sum, series) => sum + (dataBySeries[series.key][i]?.value ?? 0), 0)),
    1,
  );

  function toggleSeries(key: SeriesKey) {
    setVisible((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      // لا تسمح بإخفاء كل السلاسل معًا — يبقى عنصر واحد ظاهرًا على الأقل
      if (!next.sessions && !next.lessons && !next.reviews) return prev;
      return next;
    });
  }

  return (
    <section className="formal-chart-card rounded-[var(--radius)] p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <SectionHeader title={title} description={description ?? "إجمالي الأنشطة المسجلة شهريًا عبر الحلقات"} />
        <div className="flex flex-wrap gap-2" role="group" aria-label="تصفية سلاسل الرسم البياني">
          {SERIES.map((series) => {
            const isActive = visible[series.key];
            return (
              <button
                key={series.key}
                type="button"
                onClick={() => toggleSeries(series.key)}
                aria-pressed={isActive}
                className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? "border-[var(--border)] bg-[var(--bg-elev)] text-[var(--ink)]"
                    : "border-transparent bg-transparent text-[var(--muted)] opacity-50"
                }`}
              >
                <span className="size-2 rounded-full" style={{ background: series.color }} aria-hidden="true" />
                {series.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="chart-gridlines mt-7 flex h-64 items-end gap-1 border-b border-[var(--border)] px-1 pb-0">
        {labels.map((label, i) => {
          let offset = 0;
          const segments = activeSeries.map((series) => {
            const value = dataBySeries[series.key][i]?.value ?? 0;
            const heightPx = value > 0 ? Math.max(4, (value / stackMax) * 190) : 0;
            const segment = { key: series.key, color: series.color, value, heightPx, offset };
            offset += heightPx;
            return segment;
          });
          const combined = segments.reduce((sum, s) => sum + s.value, 0);
          return (
            <div key={label} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2 self-stretch pb-3" title={`${label}: ${formatNumber(combined)}`}>
              <div className="flex w-5 max-w-6 flex-col-reverse gap-[2px]" style={{ height: offset || 8 }}>
                {segments.map((segment) =>
                  segment.heightPx > 0 ? (
                    <div
                      key={segment.key}
                      className="w-full last:rounded-t-[4px]"
                      style={{ height: segment.heightPx, background: segment.color }}
                    />
                  ) : null,
                )}
                {offset === 0 ? <div className="w-full rounded-t-[4px] bg-[var(--border)]" style={{ height: 8 }} /> : null}
              </div>
              <span className="max-w-full truncate text-[11px] font-bold text-[var(--muted)]">{label}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-5 grid gap-4 border-t border-[var(--border)] pt-4 sm:grid-cols-3">
        <SummaryMetric label="جلسات التسميع" value={formatNumber(totals.sessions)} color="#0d6f4f" />
        <SummaryMetric label="دروس التجويد" value={formatNumber(totals.lessons)} color="#b58a3a" />
        <SummaryMetric label="جلسات المراجعة" value={formatNumber(totals.reviews)} color="#3d8bbd" />
      </div>
    </section>
  );
}

function SummaryMetric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-center gap-2 text-center">
      <span className="size-2 rounded-full" style={{ background: color }} />
      <div>
        <p className="text-xs font-bold text-[var(--muted)]">{label}</p>
        <p className="mt-1 text-sm font-semibold text-[var(--ink)]">{value}</p>
      </div>
    </div>
  );
}
