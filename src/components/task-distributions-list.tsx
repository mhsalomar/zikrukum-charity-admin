import Link from "next/link";
import { ArrowLeft, ClipboardList, Plus } from "lucide-react";

import { EmptyState, SectionCard, StatusChip } from "@/components/dashboard-ui";
import type { TaskDistribution } from "@/lib/task-distributions";

export function TaskDistributionsList({ groups, basePath, canCreate = false }: { groups: TaskDistribution[]; basePath: string; canCreate?: boolean }) {
  return (
    <SectionCard title="توزيعات المهام" description="كل توزيع يجمع مهام مناسبة أو برنامج في تقرير واحد." icon={ClipboardList} action={canCreate ? <Link href="/dashboard/tasks/distributions/new" className="primary-button inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold"><Plus className="size-4" />توزيع مهام جديد</Link> : undefined}>
      {groups.length === 0 ? <EmptyState title="لا توجد توزيعات مهام" description="أنشئ توزيعًا جديدًا لتسجيل عدة مهام دفعة واحدة." /> : <div className="grid gap-3 md:grid-cols-2">{groups.map((group) => <Link key={group.id} href={`${basePath}/${group.id}`} className="rounded-2xl border border-[var(--border)] bg-white p-4 transition hover:border-[var(--gold)]"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-[var(--primary-dark)]">{group.title}</h3><p className="mt-1 text-xs font-bold text-[var(--muted)]">{group.programName || "بدون برنامج محدد"} · {formatDate(group.eventDate)}</p></div><StatusChip tone={group.status === "closed" ? "success" : "default"}>{group.status === "closed" ? "مغلق" : "مفتوح"}</StatusChip></div><div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs font-bold"><Metric label="المهام" value={group.taskCount} /><Metric label="المنجزة" value={group.completedCount} /><Metric label="غير المنجزة" value={group.notCompletedCount} /><Metric label="المتأخرة" value={group.overdueCount} /></div><p className="mt-3 flex items-center gap-1 text-sm font-semibold text-[var(--primary)]">فتح التوزيع<ArrowLeft className="size-4" /></p></Link>)}</div>}
    </SectionCard>
  );
}
function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-xl bg-[var(--bg)] p-2"><p>{label}</p><p className="mt-1 text-lg font-bold">{value}</p></div>; }
function formatDate(value: string) { return value ? new Intl.DateTimeFormat("ar-SA").format(new Date(value)) : "بدون تاريخ"; }
