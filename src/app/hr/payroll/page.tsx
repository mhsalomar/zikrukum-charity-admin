import { SimpleAdminTable } from "@/components/simple-admin-table";
import { requireAnyRole } from "@/lib/auth";
import { hrRoles } from "@/lib/module-access";
import { getSimpleRows } from "@/lib/simple-table-data";

export default async function HrPortalPayrollPage() {
  await requireAnyRole([...hrRoles]);
  const { rows, error } = await getSimpleRows("payroll_runs", "id,month,total_net,status,created_at");
  return (
    <SimpleAdminTable
      eyebrow="شؤون الموظفين"
      title="مسيرات الرواتب"
      rows={rows}
      loadError={error}
      columns={[
        { key: "month", label: "الشهر" },
        { key: "total_net", label: "صافي الإجمالي" },
        { key: "status", label: "الحالة" },
        { key: "created_at", label: "تاريخ الإنشاء" },
      ]}
    />
  );
}
