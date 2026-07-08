import { FileCheck2 } from "lucide-react";

import { SectionCard } from "@/components/dashboard-ui";
import { ManagementRecords } from "@/components/management-records";
import { requireAnyRole } from "@/lib/auth";
import { getManagementRows } from "@/lib/management";
import { managementConfigs } from "@/lib/management-configs";
import { executiveRoles } from "@/lib/module-access";

export default async function GovernancePage() {
  await requireAnyRole([...executiveRoles]);
  const config = managementConfigs.governance;
  const { rows, error } = await getManagementRows(config.table);
  const active = rows.filter((row) => row.status === "active").length;
  const needsUpdate = rows.filter((row) => row.status === "needs_update").length;
  const incomplete = rows.filter((row) => !row.status || row.status === "draft" || row.status === "inactive").length;

  return (
    <div className="space-y-5">
      <ManagementRecords config={config} records={rows} loadError={error} />
      <SectionCard title="قائمة تحقق الحوكمة" icon={FileCheck2}>
        <div className="grid gap-3 md:grid-cols-3">
          <GovernanceCheck title="مكتمل" count={active} text="بنود حوكمة سارية ويمكن الاعتماد عليها في التقارير." tone="ready" />
          <GovernanceCheck title="يحتاج تحديث" count={needsUpdate} text="سياسات أو إفصاحات تحتاج مراجعة تاريخ أو إصدار." tone="warning" />
          <GovernanceCheck title="غير مكتمل" count={incomplete} text="بنود لم تكتمل بياناتها بعد أو لم تعتمد حالتها." tone="danger" />
        </div>
        <p className="mt-4 rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-4 text-sm font-bold leading-7 text-[var(--muted)]">
          المرفقات تحفظ كبيانات وصفية فقط في هذه المرحلة، ولا يتم تفعيل التخزين أو رفع الملفات حتى اعتماد سياسة الأرشفة.
        </p>
      </SectionCard>
    </div>
  );
}

function GovernanceCheck({ title, count, text, tone }: { title: string; count: number; text: string; tone: "ready" | "warning" | "danger" }) {
  const classes = tone === "ready"
    ? "border-emerald-200 bg-emerald-50"
    : tone === "warning"
      ? "border-amber-200 bg-amber-50"
      : "border-red-100 bg-red-50";
  return (
    <div className={`rounded-2xl border p-4 ${classes}`}>
      <p className="text-sm font-semibold text-[var(--primary-dark)]">{title}</p>
      <p className="mt-2 text-3xl font-bold text-[var(--primary-dark)]">{count}</p>
      <p className="mt-2 text-sm font-bold leading-7 text-[var(--muted)]">{text}</p>
    </div>
  );
}
