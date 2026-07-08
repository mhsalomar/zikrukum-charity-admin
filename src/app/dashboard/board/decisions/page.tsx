import { SimpleAdminTable } from "@/components/simple-admin-table";
import { requireAnyRole } from "@/lib/auth";
import { executiveRoles } from "@/lib/module-access";
import { getSimpleRows } from "@/lib/simple-table-data";

export default async function BoardDecisionsPage() {
  await requireAnyRole([...executiveRoles]);
  const { rows, error } = await getSimpleRows("board_decisions", "id,decision_number,decision_date,title,responsible_person,due_date,status,created_at");

  return (
    <SimpleAdminTable
      eyebrow="مجلس الإدارة"
      title="قرارات مجلس الإدارة"
      loadError={error}
      rows={rows}
      columns={[
        { key: "decision_number", label: "رقم القرار" },
        { key: "decision_date", label: "التاريخ" },
        { key: "title", label: "العنوان" },
        { key: "responsible_person", label: "المسؤول" },
        { key: "due_date", label: "تاريخ الاستحقاق" },
        { key: "status", label: "الحالة" },
      ]}
    />
  );
}
