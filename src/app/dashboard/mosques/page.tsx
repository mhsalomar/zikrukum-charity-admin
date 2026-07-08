import { ResourcePage } from "@/components/resource-page";
import {
  getResourceOptions,
  getResourceRecords,
  resourceConfigs,
} from "@/lib/operational-resources";

type PageProps = {
  searchParams: Promise<{ created?: string; updated?: string; error?: string }>;
};

export default async function MosquesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const config = resourceConfigs.mosques;
  const [result, options] = await Promise.all([
    getResourceRecords(config),
    getResourceOptions(),
  ]);
  const fields = config.fields.map((field) =>
    field.name === "center_id" ? { ...field, options: options.centers } : field,
  );

  return (
    <ResourcePage
      config={config}
      records={result.records}
      fields={fields}
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
