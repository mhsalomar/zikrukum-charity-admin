import { SimpleAdminTable } from "@/components/simple-admin-table";
import { requireAnyRole } from "@/lib/auth";
import { hrRoles } from "@/lib/module-access";
import { getSimpleRows } from "@/lib/simple-table-data";

export default async function HrContractsPage() {
  await requireAnyRole([...hrRoles]);
  const { rows, error } = await getSimpleRows("hr_contracts", "id,title,contract_type,start_date,end_date,status,created_at");
  return (
    <SimpleAdminTable
      eyebrow="الموارد البشرية"
      title="العقود"
      rows={rows}
      loadError={error}
      columns={[
        { key: "title", label: "عنوان العقد" },
        { key: "contract_type", label: "نوع العقد" },
        { key: "start_date", label: "البداية" },
        { key: "end_date", label: "النهاية" },
        { key: "status", label: "الحالة" },
      ]}
    />
  );
}
