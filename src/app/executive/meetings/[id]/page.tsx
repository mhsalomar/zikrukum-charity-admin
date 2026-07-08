import { MeetingDetailsView } from "@/components/meeting-details-view";
import { requireAnyRole } from "@/lib/auth";
import { getMeetingDocument } from "@/lib/meeting-documents";
import { executiveRoles } from "@/lib/module-access";

type PageProps = { params: Promise<{ id: string }> };

export default async function ExecutiveMeetingDetailsPage({ params }: PageProps) {
  await requireAnyRole([...executiveRoles]);
  const { id } = await params;
  const meeting = await getMeetingDocument(id);

  if (!meeting) {
    return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold text-amber-800">لم يتم العثور على الاجتماع.</div>;
  }

  return (
    <MeetingDetailsView
      meeting={meeting}
      backHref="/executive/meetings"
      backLabel="العودة للاجتماعات"
      minutesHref={`/executive/meetings/${meeting.id}/minutes`}
    />
  );
}
