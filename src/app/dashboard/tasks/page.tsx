import { TaskWorkspace } from "@/components/task-workspace";
import { TaskDistributionsList } from "@/components/task-distributions-list";
import { requireAnyRole } from "@/lib/auth";
import { getTaskPeople, getTaskWorkspaceData } from "@/lib/internal-tasks";
import { getTaskDistributions } from "@/lib/task-distributions";

export default async function TasksPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAnyRole(["admin", "demo_admin", "hr"]);
  const filters = await searchParams;
  const data = await getTaskWorkspaceData(filters);
  const groups = data.isAdmin ? await getTaskDistributions() : [];
  const people = data.isAdmin ? await getTaskPeople() : [];
  return <div className="space-y-5"><TaskWorkspace data={data} people={people} basePath="/dashboard/tasks" title={data.isAdmin ? "إدارة المهام" : "مهامي"} currentTab={filters.tab ?? ""} />{data.isAdmin ? <TaskDistributionsList groups={groups} basePath="/dashboard/tasks/distributions" canCreate /> : null}</div>;
}
