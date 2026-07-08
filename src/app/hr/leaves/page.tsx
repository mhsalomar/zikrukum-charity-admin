import { SimpleAdminTable } from "@/components/simple-admin-table";
import { requireAnyRole } from "@/lib/auth";
import { hrRoles } from "@/lib/module-access";
import { getSimpleRows } from "@/lib/simple-table-data";

export default async function HrPortalLeavesPage() {
  await requireAnyRole([...hrRoles]);
  const { rows, error } = await getSimpleRows("hr_leaves", "id,leave_type,start_date,end_date,status,notes,created_at");
  return (
    <SimpleAdminTable
      eyebrow="شؤون الموظفين"
      title="الإجازات"
      rows={rows}
      loadError={error}
      columns={[
        { key: "leave_type", label: "نوع الإجازة" },
        { key: "start_date", label: "من" },
        { key: "end_date", label: "إلى" },
        { key: "status", label: "الحالة" },
        { key: "notes", label: "ملاحظات" },
      ]}
    />
  );
}
