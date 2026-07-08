import { renderLaunchPage } from "@/app/dashboard/launch-page";

export default function ReceiptsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return renderLaunchPage("donation_receipts", searchParams);
}
