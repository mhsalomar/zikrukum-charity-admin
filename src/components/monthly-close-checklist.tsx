import Link from "next/link";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";

import type { MonthlyCloseItem, MonthlyCloseStatus } from "@/lib/finance";

const SORT_ORDER: Record<MonthlyCloseStatus, number> = { complete: 0, review: 1, incomplete: 2 };

const STATUS_CONFIG: Record<MonthlyCloseStatus, { icon: React.ElementType; iconClass: string; rowClass: string }> = {
  complete: { icon: CheckCircle2, iconClass: "text-green-600", rowClass: "bg-green-50 border-green-100" },
  review: { icon: AlertCircle, iconClass: "text-amber-500", rowClass: "bg-amber-50 border-amber-100" },
  incomplete: { icon: XCircle, iconClass: "text-red-500", rowClass: "bg-red-50 border-red-100" },
};

function monthLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleDateString("ar-SA", { month: "long", year: "numeric" });
}

export default function MonthlyCloseChecklist({
  items,
  year,
  month,
}: {
  items: MonthlyCloseItem[];
  year: number;
  month: number;
}) {
  const sorted = [...items].sort((a, b) => SORT_ORDER[a.status] - SORT_ORDER[b.status]);
  const completedCount = items.filter((i) => i.status === "complete").length;
  const total = items.length;
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="app-card rounded-[1.4rem] p-5 sm:p-7">
        <p className="text-sm font-semibold text-[var(--gold)]">مركز الإقفال الشهري</p>
        <h1 className="mt-1 text-2xl font-bold text-[var(--primary-dark)]">{monthLabel(year, month)}</h1>

        <div className="mt-5 flex items-center gap-4">
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-[var(--line)]">
            <div
              className="h-full rounded-full bg-[var(--primary-dark)] transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="shrink-0 text-sm font-semibold text-[var(--primary-dark)]">
            {completedCount} / {total} مكتمل
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {sorted.map((item) => {
          const cfg = STATUS_CONFIG[item.status];
          const Icon = cfg.icon;
          return (
            <div
              key={item.key}
              className={`flex items-center gap-4 rounded-2xl border p-4 ${cfg.rowClass}`}
            >
              <Icon className={`size-6 shrink-0 ${cfg.iconClass}`} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--primary-dark)]">{item.label}</p>
                <p className="mt-0.5 text-xs font-semibold text-[var(--muted)]">{item.detail}</p>
              </div>
              <Link
                href={item.href}
                className="shrink-0 rounded-xl bg-[var(--primary-dark)] px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-80"
              >
                انتقال
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
