import { TaskWorkspace } from "@/components/task-workspace";
import { getTaskWorkspaceData } from "@/lib/internal-tasks";

export default async function TeacherTasksPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  return <TaskWorkspace data={await getTaskWorkspaceData(filters)} basePath="/teacher/tasks" title="مهامي" currentTab={filters.tab ?? ""} />;
}
