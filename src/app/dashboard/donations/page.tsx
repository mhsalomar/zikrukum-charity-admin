import { renderLaunchPage } from "@/app/dashboard/launch-page";

export default function DonationsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return renderLaunchPage("donations", searchParams);
}
