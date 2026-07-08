import { TaskDistributionsList } from "@/components/task-distributions-list";
import { PageHero } from "@/components/dashboard-ui";
import { getTaskDistributions } from "@/lib/task-distributions";

export default async function ExecutiveTaskDistributionsPage() {
  return <div className="space-y-5"><PageHero eyebrow="المتابعة التنفيذية" title="توزيعات المهام" description="متابعة توزيعات المناسبات والبرامج وحالة الإنجاز دون أدوات تعديل خطرة." /><TaskDistributionsList groups={await getTaskDistributions()} basePath="/executive/task-distributions" /></div>;
}
