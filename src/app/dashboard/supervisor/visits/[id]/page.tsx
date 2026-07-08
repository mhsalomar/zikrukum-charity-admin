import { redirect } from "next/navigation";

export default async function DashboardSupervisorVisitCompatibilityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/supervisor/visits/${id}`);
}
