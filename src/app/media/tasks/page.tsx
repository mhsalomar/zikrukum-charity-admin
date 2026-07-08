import { TaskWorkspace } from "@/components/task-workspace";
import { getTaskWorkspaceData } from "@/lib/internal-tasks";

export default async function MediaTasksPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <TaskWorkspace data={await getTaskWorkspaceData(await searchParams)} basePath="/media/tasks" title="مهام الإعلام" />;
}
