import { renderLaunchPage } from "@/app/dashboard/launch-page";

export default function ExecutiveDonorsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return renderLaunchPage("donors", searchParams, "/executive/donors");
}
