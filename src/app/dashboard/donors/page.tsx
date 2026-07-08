import { renderLaunchPage } from "@/app/dashboard/launch-page";

export default function DonorsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return renderLaunchPage("donors", searchParams);
}
