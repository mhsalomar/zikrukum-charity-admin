import { ResourcePage } from "@/components/resource-page";
import { StaffBulkImporter } from "@/components/staff-bulk-importer";
import { requireAnyRole } from "@/lib/auth";
import {
  getResourceRecords,
  operationalRoles,
  resourceConfigs,
} from "@/lib/operational-resources";

type PageProps = {
  searchParams: Promise<{ created?: string; updated?: string; error?: string }>;
};

export default async function SupervisorsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { roles } = await requireAnyRole([...operationalRoles]);
  const config = resourceConfigs.supervisors;
  const result = await getResourceRecords(config);
  const canImport = roles.some((role) =>
    ["admin", "demo_admin", "executive_director", "executive_manager", "halaqat_manager"].includes(role),
  );

  return (
    <ResourcePage
      config={config}
      records={result.records}
      fields={config.fields}
      setupRequired={result.setupRequired}
      message={resolveMessage(params)}
      extraActions={canImport ? <StaffBulkImporter kind="supervisor" /> : null}
    />
  );
}

function resolveMessage(params: { created?: string; updated?: string; error?: string }) {
  if (params.created) return "created";
  if (params.updated) return "updated";
  if (params.error === "missing") return "missing";
  if (params.error) return "save";
  return undefined;
}
