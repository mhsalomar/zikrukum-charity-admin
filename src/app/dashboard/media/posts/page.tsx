import { ManagementRecords } from "@/components/management-records";
import { requireAnyRole } from "@/lib/auth";
import { getManagementRows } from "@/lib/management";
import { managementConfigs } from "@/lib/management-configs";
import { executiveRoles } from "@/lib/module-access";

export default async function MediaPostsPage() {
  await requireAnyRole([...executiveRoles]);
  const config = managementConfigs.mediaPosts;
  const { rows, error } = await getManagementRows(config.table);

  return <ManagementRecords config={config} records={rows} loadError={error} />;
}
