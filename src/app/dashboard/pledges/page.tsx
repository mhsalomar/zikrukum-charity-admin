import { renderLaunchPage } from "@/app/dashboard/launch-page";

export default function PledgesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return renderLaunchPage("pledges", searchParams);
}
