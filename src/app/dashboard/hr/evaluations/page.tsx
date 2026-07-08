import { SimpleAdminTable } from "@/components/simple-admin-table";
import { requireAnyRole } from "@/lib/auth";
import { hrRoles } from "@/lib/module-access";
import { getSimpleRows } from "@/lib/simple-table-data";

export default async function HrEvaluationsPage() {
  await requireAnyRole([...hrRoles]);
  const { rows, error } = await getSimpleRows("hr_evaluations", "id,evaluation_date,rating,evaluator_name,summary,status,created_at");
  return (
    <SimpleAdminTable
      eyebrow="الموارد البشرية"
      title="التقييمات"
      rows={rows}
      loadError={error}
      columns={[
        { key: "evaluation_date", label: "تاريخ التقييم" },
        { key: "rating", label: "الدرجة" },
        { key: "evaluator_name", label: "المقيّم" },
        { key: "summary", label: "الملخص" },
        { key: "status", label: "الحالة" },
      ]}
    />
  );
}
