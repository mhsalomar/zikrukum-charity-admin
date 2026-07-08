import { SimpleAdminTable } from "@/components/simple-admin-table";
import { requireAnyRole } from "@/lib/auth";
import { executiveRoles } from "@/lib/module-access";
import { createClient } from "@/lib/supabase/server";

export default async function GovernanceDisclosuresPage() {
  await requireAnyRole([...executiveRoles]);
  const { rows, error } = await getGovernanceRows("disclosure");

  return (
    <SimpleAdminTable
      eyebrow="الحوكمة"
      title="الإفصاحات"
      loadError={error}
      rows={rows}
      columns={[
        { key: "title", label: "العنوان" },
        { key: "item_date", label: "التاريخ" },
        { key: "responsible_person", label: "المسؤول" },
        { key: "status", label: "الحالة" },
        { key: "notes", label: "ملاحظات" },
      ]}
    />
  );
}

async function getGovernanceRows(itemType: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("governance_items")
    .select("id,title,item_date,responsible_person,status,notes,created_at")
    .eq("item_type", itemType)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  return { rows: (data ?? []) as Array<Record<string, unknown>>, error: error?.message ?? "" };
}
