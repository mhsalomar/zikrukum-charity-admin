import { renderLaunchPage } from "@/app/dashboard/launch-page";

export default function ExecutiveMinistryReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return renderLaunchPage("ministry_reports", searchParams, "/executive/ministry-reports");
}
