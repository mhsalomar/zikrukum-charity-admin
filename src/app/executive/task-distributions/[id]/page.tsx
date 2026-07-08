import { TaskDistributionDetail } from "@/components/task-distribution-detail";
import { getTaskDistribution } from "@/lib/task-distributions";

export default async function ExecutiveTaskDistributionPage({ params }: { params: Promise<{ id: string }> }) {
  const data = await getTaskDistribution((await params).id);
  return <TaskDistributionDetail group={data.group} tasks={data.tasks} />;
}
