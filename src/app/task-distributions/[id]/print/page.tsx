import { OfficialPrintPage } from "@/components/official-print-layout";
import { taskPriorityLabels, taskStatusLabels } from "@/lib/internal-tasks";
import { getTaskDistribution } from "@/lib/task-distributions";

export default async function TaskDistributionPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const data = await getTaskDistribution((await params).id);
  return <OfficialPrintPage title="تقرير توزيع المهام" subtitle={data.group.title} documentDate={data.group.eventDate} variant="report"><p className="mb-4 text-sm font-bold">{data.group.programName || ""} {data.group.generalNotes ? `— ${data.group.generalNotes}` : ""}</p><table className="w-full border-collapse text-right text-xs"><thead><tr className="bg-[#f4efe3]"><th className="border p-2">م</th><th className="border p-2">المسؤول</th><th className="border p-2">المهمة</th><th className="border p-2">الأولوية</th><th className="border p-2">الحالة</th><th className="border p-2">وقت الإنجاز</th><th className="border p-2">الملاحظات</th></tr></thead><tbody>{data.tasks.map((task, index) => <tr key={task.id}><td className="border p-2">{index + 1}</td><td className="border p-2 font-bold">{task.assigneeName}</td><td className="border p-2">{task.title}</td><td className="border p-2">{taskPriorityLabels[task.priority]}</td><td className="border p-2">{task.overdue ? "متأخرة" : taskStatusLabels[task.status]}</td><td className="border p-2">{formatDate(task.completedAt)}</td><td className="border p-2">{task.executorNote || task.adminNote || "—"}</td></tr>)}</tbody></table></OfficialPrintPage>;
}
function formatDate(value: string) { return value ? new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—"; }
