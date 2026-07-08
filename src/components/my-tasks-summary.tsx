import Link from "next/link";
import { ArrowLeft, CheckCircle2, ListTodo } from "lucide-react";

import { EmptyState, SectionCard, StatusChip } from "@/components/dashboard-ui";
import { getTaskWorkspaceData, taskPortalPath, taskPriorityLabels } from "@/lib/internal-tasks";

export async function MyTasksSummary() {
  const data = await getTaskWorkspaceData({ tab: "mine" });
  const href = taskPortalPath(data.roles);
  const tasks = data.tasks.filter((task) => !["completed", "cancelled"].includes(task.status)).slice(0, 4);
  return (
    <SectionCard title="مهامي" description={`${data.summary.newCount} جديدة · ${data.summary.overdueCount} متأخرة`} icon={ListTodo} action={<Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--primary)]">عرض الكل<ArrowLeft className="size-4" /></Link>}>
      {tasks.length === 0 ? <EmptyState title="لا توجد مهام معلقة" description="ستظهر المهام المسندة إليك هنا." /> : <div className="grid gap-2 sm:grid-cols-2">{tasks.map((task) => <Link key={task.id} href={href} className="rounded-xl border border-[var(--border)] bg-white p-3"><div className="flex items-start justify-between gap-2"><p className="font-semibold text-[var(--primary-dark)]">{task.title}</p>{task.overdue ? <StatusChip tone="warning">متأخرة</StatusChip> : <StatusChip>{taskPriorityLabels[task.priority]}</StatusChip>}</div><p className="mt-2 text-xs font-bold text-[var(--muted)]">{task.dueDate ? `الاستحقاق: ${new Intl.DateTimeFormat("ar-SA").format(new Date(task.dueDate))}` : "بدون تاريخ استحقاق"}</p></Link>)}</div>}
      {data.summary.completedCount ? <p className="mt-3 flex items-center gap-2 text-xs font-bold text-[var(--muted)]"><CheckCircle2 className="size-4 text-emerald-600" />لديك {data.summary.completedCount} مهام منجزة في العرض الحالي.</p> : null}
    </SectionCard>
  );
}
