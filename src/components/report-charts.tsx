import type { ReactNode } from "react";
import { BarChart3, type LucideIcon } from "lucide-react";

export type ChartDatum = {
  label: string;
  value: number;
  secondaryValue?: number;
  meta?: string;
};

type LegendItem = {
  label: string;
  color: string;
};

const chartPalette = ["#0d6f4f", "#b58a3a", "#2d9674", "#8ba196", "#3d4944", "#d5c39a"];

export function SectionHeader({
  eyebrow = "",
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      {eyebrow ? <p className="text-xs font-semibold text-[var(--gold)]">{eyebrow}</p> : null}
      <h2 className="text-xl font-bold text-[var(--primary-dark)]">{title}</h2>
      {description ? <p className="text-sm font-semibold leading-6 text-[var(--muted)]">{description}</p> : null}
    </div>
  );
}

export function EmptyChart({
  title = "لا توجد بيانات كافية لعرض الرسم البياني",
  description = "ستظهر الرسوم عند توفر بيانات فعلية في النظام.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="grid min-h-52 place-items-center rounded-[var(--radius)] border border-dashed border-[var(--border)] bg-[var(--bg-elev)] p-6 text-center">
      <div>
        <span className="mx-auto grid size-12 place-items-center rounded-[var(--radius-sm)] bg-[var(--gold-soft)] text-[var(--gold)]">
          <BarChart3 aria-hidden className="size-6" />
        </span>
        <p className="mt-3 text-sm font-semibold text-[var(--primary-dark)]">{title}</p>
        <p className="mt-1 text-xs font-bold leading-6 text-[var(--muted)]">{description}</p>
      </div>
    </div>
  );
}

export function KpiCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "emerald",
  footer,
  trend,
  change,
}: {
  label: string;
  value: number | string;
  description?: string;
  icon: LucideIcon;
  tone?: "emerald" | "gold" | "sage" | "warning";
  footer?: string;
  trend?: number[];
  change?: string;
}) {
  const toneColor = {
    emerald: "#0d6f4f",
    gold: "#b58a3a",
    sage: "#2d9674",
    warning: "#c97a16",
  }[tone];
  const chipClass = tone === "warning"
    ? "border-amber-200 bg-amber-50 text-amber-800"
    : tone === "gold"
      ? "border-[#d9c38d] bg-[#fff5df] text-[#755715]"
      : "border-emerald-200 bg-emerald-50 text-emerald-800";

  const changePositive = change ? !change.startsWith("-") : null;

  return (
    <article className="formal-kpi group relative flex min-h-[158px] flex-col overflow-hidden rounded-[var(--radius)] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-[#68746d]">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-4xl">{formatNumber(value)}</p>
        </div>
        <span className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold ${chipClass}`}>
          {change ? (
            <>
              {change}
              <span aria-hidden>{changePositive ? "↗" : "↘"}</span>
            </>
          ) : (
            <>
              <Icon aria-hidden className="size-3.5" />
              فعلي
            </>
          )}
        </span>
      </div>
      <div className="mt-1 flex min-h-5 items-center gap-2">
        {change ? (
          <span className="sr-only">{changePositive ? "اتجاه إيجابي" : "اتجاه منخفض"}</span>
        ) : null}
        {description ? <p className="line-clamp-1 text-xs font-bold text-[var(--muted)]">{description}</p> : null}
      </div>
      {trend && trend.length >= 2 ? (
        <div className="mt-auto overflow-hidden pt-3">
          <KpiSparkline values={trend} color={toneColor} />
        </div>
      ) : (
        <div className="mt-auto pt-3">
          <div className="h-12 rounded-b-[1rem] bg-gradient-to-t from-[#edf5ef] to-transparent" aria-hidden="true" />
        </div>
      )}
      {footer ? (
        <div className="mt-3 rounded-[1rem] border border-[var(--line)] bg-[#fffdf8] px-3 py-2 text-xs font-bold text-[var(--muted)]">
          {footer}
        </div>
      ) : null}
    </article>
  );
}

function KpiSparkline({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1);
  const w = 260;
  const h = 56;
  const points = values.map((value, index) => {
    const x = (index / Math.max(1, values.length - 1)) * w;
    const y = h - (value / max) * 38 - 8;
    return `${x},${y}`;
  });
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-12 w-full" preserveAspectRatio="none" aria-hidden="true">
      <polygon points={`0,${h} ${points.join(" ")} ${w},${h}`} fill={color} opacity="0.10" />
      <polyline points={points.join(" ")} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChartCard({
  title,
  description,
  source,
  legend,
  children,
}: {
  title: string;
  description?: string;
  source?: string;
  legend?: LegendItem[];
  children: ReactNode;
}) {
  return (
    <section className="formal-chart-card overflow-hidden rounded-[var(--radius)] p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <SectionHeader title={title} description={description} />
        {legend && legend.length > 0 ? (
          <div className="flex flex-wrap gap-2 text-xs font-bold text-[var(--muted)]">
            {legend.map((item) => (
              <span key={item.label} className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-1.5 shadow-[var(--shadow-inset-hi)]">
                <span className="size-2.5 rounded-full" style={{ background: item.color }} />
                {item.label}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="mt-5">{children}</div>
      {source ? <p className="mt-4 text-xs font-bold text-[#8b9892]">{source}</p> : null}
    </section>
  );
}

export function HorizontalBarChart({
  title,
  description,
  data,
  source,
  valueLabel,
}: {
  title: string;
  description?: string;
  data: ChartDatum[];
  source?: string;
  valueLabel?: string;
}) {
  const visible = normalizeData(data).slice(0, 10);
  const max = Math.max(...visible.map((item) => item.value), 0);

  return (
    <ChartCard title={title} description={description} source={source}>
      {visible.length === 0 || max === 0 ? (
        <EmptyChart />
      ) : (
        <div className="grid gap-3.5">
          {visible.map((item, index) => {
            const width = `${Math.max(3, (item.value / max) * 100)}%`;
            const color = index === 1 ? "#b58a3a" : chartPalette[index % chartPalette.length];
            return (
              <div key={`${item.label}-${index}`} title={`${item.label}: ${formatNumber(item.value)}${valueLabel ? ` ${valueLabel}` : ""}`}>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-xs font-semibold">
                  <span className="min-w-0 truncate text-[var(--muted)]">{item.label}</span>
                  <span className="shrink-0 font-bold text-[var(--ink)]">
                    {formatNumber(item.value)}
                    {valueLabel ? ` ${valueLabel}` : ""}
                  </span>
                </div>
                <div className="relative h-2 overflow-hidden rounded-full bg-[var(--bg-sunken)]">
                  <div
                    className="absolute inset-y-0 right-0 rounded-full"
                    style={{ width, background: color }}
                    aria-label={`${item.label}: ${formatNumber(item.value)}`}
                  />
                </div>
                {item.meta ? <p className="mt-1.5 text-xs font-bold text-[var(--muted)]">{item.meta}</p> : null}
              </div>
            );
          })}
        </div>
      )}
    </ChartCard>
  );
}

export function VerticalBarChart({
  title,
  description,
  data,
  valueLabel = "القيمة",
  source,
}: {
  title: string;
  description?: string;
  data: ChartDatum[];
  valueLabel?: string;
  source?: string;
}) {
  const visible = normalizeData(data).slice(0, 8);
  const max = Math.max(...visible.map((item) => item.value), 0);

  return (
    <ChartCard title={title} description={description} source={source}>
      {visible.length === 0 || max === 0 ? (
        <EmptyChart />
      ) : visible.length === 1 ? (
        <div className="flex items-center gap-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-elev)] p-6">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl" style={{ background: chartPalette[0] }}>
            <span className="text-lg font-bold text-white">{formatNumber(visible[0].value)}</span>
          </span>
          <div>
            <p className="text-sm font-bold text-[var(--primary-dark)]">{visible[0].label}</p>
            <p className="mt-1 text-xs font-semibold text-[var(--muted)]">القيمة الوحيدة المسجلة حاليًا لهذه الفترة</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-elev)] p-3 sm:p-4">
          {visible.map((item, index) => {
            const width = `${Math.max(4, (item.value / max) * 100)}%`;
            const color = index === 3 ? "#b58a3a" : chartPalette[index % chartPalette.length];
            return (
              <div
                key={`${item.label}-${index}`}
                className="rounded-[1rem] border border-[var(--line)] bg-white/80 p-3"
                title={`${item.label}: ${formatNumber(item.value)} ${valueLabel}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold leading-6 text-[var(--primary-dark)]">{item.label}</p>
                    {item.meta ? <p className="mt-0.5 text-xs font-bold leading-5 text-[var(--muted)]">{item.meta}</p> : null}
                  </div>
                  <span className="shrink-0 rounded-full bg-[#f4f0e6] px-3 py-1 text-xs font-bold text-[var(--ink)]">
                    {formatNumber(item.value)}
                    {valueLabel ? ` ${valueLabel}` : ""}
                  </span>
                </div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[var(--bg-sunken)]">
                  <div
                    className="h-full rounded-full"
                    style={{ width, background: color }}
                    aria-label={`${item.label}: ${formatNumber(item.value)} ${valueLabel}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ChartCard>
  );
}

export function DonutSummaryChart({
  title,
  description,
  data,
  source,
  centerLabel = "الإجمالي",
}: {
  title: string;
  description?: string;
  data: ChartDatum[];
  source?: string;
  centerLabel?: string;
}) {
  const visible = normalizeData(data).slice(0, 6);
  const total = visible.reduce((sum, item) => sum + item.value, 0);

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const gap = visible.length > 1 ? 3 : 0;
  const rawLengths = visible.map((item) => (item.value / total) * circumference);
  const arcs = visible.map((item, index) => {
    const raw = rawLengths[index];
    const cursor = rawLengths.slice(0, index).reduce((sum, value) => sum + value, 0);
    return { item, color: chartPalette[index % chartPalette.length], arcLength: Math.max(0, raw - gap), dashoffset: -cursor };
  });

  return (
    <ChartCard title={title} description={description} source={source}>
      {visible.length === 0 || total === 0 ? (
        <EmptyChart />
      ) : (
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-center">
          <div className="relative shrink-0" style={{ width: 168, height: 168 }}>
            <svg viewBox="0 0 120 120" width={168} height={168} className="-rotate-90">
              <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--bg-sunken)" strokeWidth="12" />
              {arcs.map(({ item, color, arcLength, dashoffset }) => (
                <circle
                  key={item.label}
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke={color}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${arcLength} ${circumference - arcLength}`}
                  strokeDashoffset={dashoffset}
                >
                  <title>{`${item.label}: ${formatNumber(item.value)}`}</title>
                </circle>
              ))}
            </svg>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <div>
                <p className="text-2xl font-bold text-[var(--ink)]">{formatNumber(total)}</p>
                <p className="text-[11px] font-bold text-[var(--muted)]">{centerLabel}</p>
              </div>
            </div>
          </div>
          <div className="grid w-full min-w-0 gap-2">
            {visible.map((item, index) => (
              <div key={item.label} className="flex items-center justify-between gap-3 text-sm font-semibold">
                <span className="flex min-w-0 items-center gap-2 text-[var(--muted)]">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: chartPalette[index % chartPalette.length] }} />
                  <span className="truncate">{item.label}</span>
                </span>
                <span className="shrink-0 font-bold text-[var(--ink)]">{formatNumber(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </ChartCard>
  );
}

export function MiniTrendChart({
  data,
  title = "اتجاه الفترة",
  description,
  source,
}: {
  data: ChartDatum[];
  title?: string;
  description?: string;
  source?: string;
}) {
  const visible = data.filter((item) => Number.isFinite(item.value)).slice(0, 12);
  const max = Math.max(...visible.map((item) => item.value), 0);

  const W = 560;
  const H = 184;
  const padTop = 34;
  const padBottom = 22;
  const plotH = H - padTop - padBottom;
  const domainMax = max * 1.15 || 1;
  const points = visible.map((item, index) => {
    const x = visible.length === 1 ? W / 2 : W - (index / (visible.length - 1)) * W;
    const y = padTop + plotH - (item.value / domainMax) * plotH;
    return { x, y, item };
  });
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${H} L${points[0].x.toFixed(1)},${H} Z`;
  const gradientId = "trend-fill";

  return (
    <ChartCard title={title} description={description} source={source}>
      {visible.length < 2 || max === 0 ? (
        <EmptyChart />
      ) : (
        <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-elev)] p-4">
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-44 w-full">
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0d6f4f" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#0d6f4f" stopOpacity="0" />
              </linearGradient>
            </defs>
            <line x1="0" y1={padTop} x2={W} y2={padTop} stroke="var(--border)" strokeWidth="1" />
            <line x1="0" y1={padTop + plotH / 2} x2={W} y2={padTop + plotH / 2} stroke="var(--border)" strokeWidth="1" />
            <line x1="0" y1={padTop + plotH} x2={W} y2={padTop + plotH} stroke="var(--border)" strokeWidth="1" />
            <path d={areaPath} fill={`url(#${gradientId})`} />
            <path d={linePath} fill="none" stroke="#0d6f4f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {points.map((p, index) => {
              const isLast = index === points.length - 1;
              return (
                <circle key={`${p.item.label}-${index}`} cx={p.x} cy={p.y} r={isLast ? 5 : 4} fill={isLast ? "#b58a3a" : "#0d6f4f"} stroke="var(--bg-elev)" strokeWidth="2">
                  <title>{`${p.item.label}: ${formatNumber(p.item.value)}`}</title>
                </circle>
              );
            })}
            <text x={points[points.length - 1].x} y={Math.max(14, points[points.length - 1].y - 12)} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--ink)">
              {formatNumber(points[points.length - 1].item.value)}
            </text>
          </svg>
          <div className="mt-3 flex justify-between gap-4 text-[11px] font-bold leading-5 text-[var(--muted)]">
            <span className="max-w-[45%] truncate" title={visible[0]?.label}>{visible[0]?.label}</span>
            <span className="max-w-[45%] truncate text-left" title={visible[visible.length - 1]?.label}>{visible[visible.length - 1]?.label}</span>
          </div>
        </div>
      )}
    </ChartCard>
  );
}

export function ReadinessChecklist({
  title,
  description,
  items,
  source,
}: {
  title: string;
  description?: string;
  items: Array<{ label: string; value: number; total: number; meta?: string }>;
  source?: string;
}) {
  const visible = items.filter((item) => item.total > 0);

  return (
    <ChartCard title={title} description={description} source={source}>
      {visible.length === 0 ? (
        <EmptyChart title="لا توجد بيانات جاهزية كافية" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {visible.map((item) => {
            const percent = clampPercent(Math.round((item.value / item.total) * 100));
            const color = percent >= 80 ? "#0d6f4f" : percent >= 50 ? "#b58a3a" : "#c97a16";
            return (
              <div key={item.label} className="rounded-[var(--radius)] border border-[var(--border)] bg-[#f1ede3] p-4">
                <div className="flex items-center gap-4">
                  <div
                    className="relative grid size-16 shrink-0 place-items-center rounded-full"
                    style={{ background: `conic-gradient(${color} ${percent * 3.6}deg, #ded6c7 0deg)` }}
                    aria-label={`${item.label}: ${formatPercent(percent)}`}
                  >
                    <div className="absolute inset-[8px] rounded-full bg-[#f1ede3]" />
                    <span className="relative text-sm font-semibold text-[var(--ink)]">{formatPercent(percent)}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--primary-dark)]">{item.label}</p>
                    {item.meta ? <p className="mt-1 text-xs font-bold text-[var(--muted)]">{item.meta}</p> : null}
                    <p className="mt-2 text-xs font-semibold text-[var(--muted)]">
                      {formatNumber(item.value)} من {formatNumber(item.total)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ChartCard>
  );
}

export function GoalCircleGrid({
  title,
  description,
  items,
}: {
  title: string;
  description?: string;
  items: Array<{ label: string; value: number; total: number; meta?: string }>;
}) {
  return (
    <section className="formal-chart-card rounded-[var(--radius)] p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <SectionHeader title={title} description={description ?? "تقدم المؤشرات مقابل الهدف العام"} />
        <span className="shrink-0 text-sm font-bold text-[var(--primary-dark)]">عرض الكل</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {items.slice(0, 4).map((item) => {
          const pct = item.total > 0 ? clampPercent(Math.round((item.value / item.total) * 100)) : 0;
          const color = pct >= 80 ? "#0d6f4f" : pct >= 50 ? "#b58a3a" : "#e5a55c";
          return (
            <div key={item.label} className="grid min-h-[155px] place-items-center rounded-[var(--radius)] bg-[#f1ede3] p-4 text-center">
              <div
                className="relative grid size-20 place-items-center rounded-full"
                style={{ background: `conic-gradient(${color} ${pct * 3.6}deg, #ded6c7 0deg)` }}
                aria-label={`${item.label}: ${formatPercent(pct)}`}
              >
                <div className="absolute inset-[10px] rounded-full bg-[#f1ede3]" />
                <span className="relative text-xl font-bold text-[var(--ink)]">{formatPercent(pct)}</span>
              </div>
              <p className="mt-3 text-sm font-semibold leading-6 text-[var(--ink)]">{item.label}</p>
              <p className="mt-1 text-xs font-bold text-[var(--muted)]">{formatNumber(item.total)} هدف</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function normalizeData(data: ChartDatum[]) {
  return data
    .map((item) => ({ ...item, value: Number(item.value ?? 0) }))
    .filter((item) => Number.isFinite(item.value) && item.value > 0);
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("ar-SA", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(value / 100);
}

function formatNumber(value: number | string) {
  return typeof value === "number" ? new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 1 }).format(value) : value;
}
