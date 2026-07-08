import { HrLetterDetails } from "@/app/dashboard/hr/letters/[id]/page";

export default function LetterDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  return <HrLetterDetails params={params} basePath="/dashboard/letters" />;
}
