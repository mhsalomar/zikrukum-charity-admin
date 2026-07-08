import { renderLaunchPage } from "@/app/dashboard/launch-page";

export default function MinistryReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return renderLaunchPage("ministry_reports", searchParams);
}
