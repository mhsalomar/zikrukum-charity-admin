import { TaskDistributionDetail } from "@/components/task-distribution-detail";
import { requireAnyRole } from "@/lib/auth";
import { getTaskDistribution } from "@/lib/task-distributions";

export default async function TaskDistributionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAnyRole(["admin", "demo_admin"]);
  const data = await getTaskDistribution((await params).id);
  return <TaskDistributionDetail group={data.group} tasks={data.tasks} admin />;
}
