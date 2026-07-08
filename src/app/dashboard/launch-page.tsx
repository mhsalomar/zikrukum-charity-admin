import { LaunchRecordsPage } from "@/components/launch-records-page";
import { getLaunchRows, launchConfigs } from "@/lib/launch-core";

export async function renderLaunchPage(
  key: keyof typeof launchConfigs,
  searchParams?: Promise<Record<string, string | undefined>>,
  returnTo?: string,
) {
  const params = searchParams ? await searchParams : {};
  const config = launchConfigs[key];
  const { rows, error } = await getLaunchRows(config, 100, params);
  const message = params.created ? "created" : params.error ? "error" : undefined;

  return <LaunchRecordsPage config={config} rows={rows} error={error} message={message} returnTo={returnTo} filters={params} />;
}
