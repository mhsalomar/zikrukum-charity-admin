import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2 } from "lucide-react";

import type { FollowupItem, ReadinessItem, Severity } from "@/lib/launch-readiness";

type AlertItem = FollowupItem | ReadinessItem;

export function FollowupAlertsPanel({
  title = "تنبيهات تحتاج متابعة",
  description = "ملاحظات تشغيلية مبنية على البيانات الفعلية داخل النظام.",
  items,
  limit,
  emptyText = "لا توجد ملاحظات متابعة حاليًا.",
}: {
  title?: string;
  description?: string;
  items: AlertItem[];
  limit?: number;
  emptyText?: string;
}) {
  const severityRank: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
  const visible = items
    .filter((item) => item.count > 0)
    .sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || b.count - a.count)
    .slice(0, limit ?? items.length);

  return (
    <section className="app-card rounded-[1.5rem] p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-[var(--gold)]">متابعة التشغيل</p>
          <h2 className="mt-1 text-xl font-bold text-[var(--primary-dark)]">{title}</h2>
          <p className="mt-2 text-sm font-semibold leading-7 text-[var(--muted)]">{description}</p>
        </div>
        {visible.length === 0 ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800">
            <CheckCircle2 aria-hidden className="size-4" />
            مستقر
          </span>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-sm font-bold text-emerald-900">
          {emptyText}
        </div>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`group rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${toneClasses(item.severity)} ${item.severity === "high" ? "ring-1 ring-inset ring-red-300/70" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className={`grid shrink-0 place-items-center rounded-2xl bg-white/80 ${item.severity === "high" ? "size-11" : item.severity === "medium" ? "size-10" : "size-9"}`}>
                  <AlertTriangle aria-hidden className={item.severity === "high" ? "size-6" : "size-5"} />
                </span>
                <span className="rounded-full bg-white/75 px-3 py-1 text-xs font-semibold">
                  {severityLabel(item.severity)}
                </span>
              </div>
              <p className={`mt-4 font-bold ${item.severity === "high" ? "text-4xl" : item.severity === "medium" ? "text-3xl" : "text-2xl"}`}>{new Intl.NumberFormat("ar-SA").format(item.count)}</p>
              <h3 className="mt-1 text-base font-semibold">{item.title}</h3>
              <p className="mt-2 min-h-10 text-sm font-semibold leading-6 opacity-85">{item.description}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold">
                انتقال للمعالجة
                <ArrowLeft aria-hidden className="size-4 transition group-hover:-translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function severityLabel(severity: Severity) {
  return { high: "عالي", medium: "متوسط", low: "منخفض" }[severity];
}

function toneClasses(severity: Severity) {
  if (severity === "high") return "border-red-200 bg-red-50 text-red-900";
  if (severity === "medium") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-emerald-100 bg-emerald-50 text-emerald-900";
}
