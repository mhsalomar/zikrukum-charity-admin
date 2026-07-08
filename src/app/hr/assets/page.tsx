import { SimpleAdminTable } from "@/components/simple-admin-table";
import { requireAnyRole } from "@/lib/auth";
import { hrRoles } from "@/lib/module-access";
import { getSimpleRows } from "@/lib/simple-table-data";

export default async function HrPortalAssetsPage() {
  await requireAnyRole([...hrRoles]);
  const { rows, error } = await getSimpleRows("hr_assets", "id,asset_name,asset_code,assigned_at,returned_at,status,notes,created_at");
  return (
    <SimpleAdminTable
      eyebrow="شؤون الموظفين"
      title="العهد"
      rows={rows}
      loadError={error}
      columns={[
        { key: "asset_name", label: "اسم العهدة" },
        { key: "asset_code", label: "الكود" },
        { key: "assigned_at", label: "تاريخ التسليم" },
        { key: "returned_at", label: "تاريخ الإرجاع" },
        { key: "status", label: "الحالة" },
      ]}
    />
  );
}
