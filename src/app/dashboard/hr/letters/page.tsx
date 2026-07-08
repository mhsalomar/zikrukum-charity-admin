import { ManagementRecords } from "@/components/management-records";
import { requireAnyRole } from "@/lib/auth";
import { getManagementRows } from "@/lib/management";
import { managementConfigs } from "@/lib/management-configs";
import { hrRoles } from "@/lib/module-access";

export default async function HrLettersPage() {
  await requireAnyRole([...hrRoles]);
  const config = managementConfigs.hrLetters;
  const { rows, error } = await getManagementRows(config.table);

  return <ManagementRecords config={config} records={rows} loadError={error} />;
}
