import { SimpleAdminTable } from "@/components/simple-admin-table";
import { requireAnyRole } from "@/lib/auth";
import { executiveRoles } from "@/lib/module-access";
import { getSimpleRows } from "@/lib/simple-table-data";

export default async function MediaCategoriesPage() {
  await requireAnyRole([...executiveRoles]);
  const { rows, error } = await getSimpleRows("media_categories", "id,name,description,status,created_at");
  return (
    <SimpleAdminTable
      eyebrow="المركز الإعلامي"
      title="تصنيفات المحتوى"
      rows={rows}
      loadError={error}
      columns={[
        { key: "name", label: "التصنيف" },
        { key: "description", label: "الوصف" },
        { key: "status", label: "الحالة" },
      ]}
    />
  );
}
