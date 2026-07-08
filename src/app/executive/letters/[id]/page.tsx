import { HrLetterDetails } from "@/app/dashboard/hr/letters/[id]/page";

export default function ExecutiveLetterDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  return <HrLetterDetails params={params} basePath="/executive/letters" />;
}
