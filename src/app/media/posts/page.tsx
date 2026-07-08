import { ManagementRecords } from "@/components/management-records";
import { requireAnyRole } from "@/lib/auth";
import { getManagementRows } from "@/lib/management";
import { managementConfigs } from "@/lib/management-configs";
import { mediaRoles } from "@/lib/module-access";

export default async function MediaPostsPage() {
  await requireAnyRole([...mediaRoles]);
  const config = {
    ...managementConfigs.mediaPosts,
    eyebrow: "بوابة الإعلامي",
    returnTo: "/media/posts",
  };
  const { rows, error } = await getManagementRows(config.table);
  return <ManagementRecords config={config} records={rows} loadError={error} />;
}
