import { ResourcePage } from "@/components/resource-page";
import {
  getResourceRecords,
  resourceConfigs,
} from "@/lib/operational-resources";

type PageProps = {
  searchParams: Promise<{ created?: string; updated?: string; error?: string }>;
};

export default async function CentersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const config = resourceConfigs.centers;
  const result = await getResourceRecords(config);

  return (
    <ResourcePage
      config={config}
      records={result.records}
      fields={config.fields}
      setupRequired={result.setupRequired}
      message={resolveMessage(params)}
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
