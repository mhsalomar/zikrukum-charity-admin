import { renderLaunchPage } from "@/app/dashboard/launch-page";

export default function ExecutiveVolunteersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return renderLaunchPage("volunteers", searchParams, "/executive/volunteers");
}
