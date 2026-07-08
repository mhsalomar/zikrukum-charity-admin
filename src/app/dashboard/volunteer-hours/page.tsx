import { renderLaunchPage } from "@/app/dashboard/launch-page";

export default function VolunteerHoursPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return renderLaunchPage("volunteer_hours", searchParams);
}
