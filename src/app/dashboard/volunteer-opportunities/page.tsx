import { renderLaunchPage } from "@/app/dashboard/launch-page";

export default function VolunteerOpportunitiesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return renderLaunchPage("volunteer_opportunities", searchParams);
}
