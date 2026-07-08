import { TaskWorkspace } from "@/components/task-workspace";
import { getTaskWorkspaceData } from "@/lib/internal-tasks";

export default async function SupervisorTasksPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <TaskWorkspace data={await getTaskWorkspaceData(await searchParams)} basePath="/supervisor/tasks" title="مهام الإشراف" />;
}
