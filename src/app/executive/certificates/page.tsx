import { renderLaunchPage } from "@/app/dashboard/launch-page";

export default function ExecutiveCertificatesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return renderLaunchPage("certificates", searchParams, "/executive/certificates");
}
