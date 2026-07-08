import { ManagementRecords } from "@/components/management-records";
import { requireAnyRole } from "@/lib/auth";
import { getManagementRows } from "@/lib/management";
import { managementConfigs } from "@/lib/management-configs";
import { executiveRoles } from "@/lib/module-access";

export default async function ExecutiveMeetingsPage() {
  await requireAnyRole([...executiveRoles]);
  const config = {
    ...managementConfigs.meetings,
    returnTo: "/executive/meetings",
    addLabel: "إضافة اجتماع ومحضر",
    addUrl: "/executive/meetings/new",
  };
  const { rows, error } = await getManagementRows(config.table);

  return <ManagementRecords config={config} records={rows} loadError={error} />;
}
