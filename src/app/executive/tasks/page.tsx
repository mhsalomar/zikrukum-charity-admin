import { TaskWorkspace } from "@/components/task-workspace";
import { TaskDistributionsList } from "@/components/task-distributions-list";
import { getTaskWorkspaceData } from "@/lib/internal-tasks";
import { getTaskDistributions } from "@/lib/task-distributions";

export default async function ExecutiveTasksPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const [data, groups] = await Promise.all([getTaskWorkspaceData(await searchParams), getTaskDistributions()]);
  return <div className="space-y-5"><TaskWorkspace data={data} basePath="/executive/tasks" title="المهام والمتابعة التنفيذية" /><TaskDistributionsList groups={groups} basePath="/executive/task-distributions" /></div>;
}
