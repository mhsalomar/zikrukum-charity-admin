import { TaskDistributionsList } from "@/components/task-distributions-list";
import { PageHero } from "@/components/dashboard-ui";
import { requireAnyRole } from "@/lib/auth";
import { getTaskDistributions } from "@/lib/task-distributions";

export default async function TaskDistributionsPage() {
  await requireAnyRole(["admin", "demo_admin"]);
  return <div className="space-y-5"><PageHero eyebrow="المهام الداخلية" title="توزيعات المهام" description="أنشئ عدة مهام مرتبطة بمناسبة واحدة وتابع إنجازها من تقرير موحد." /><TaskDistributionsList groups={await getTaskDistributions()} basePath="/dashboard/tasks/distributions" canCreate /></div>;
}
