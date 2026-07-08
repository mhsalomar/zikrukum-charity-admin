import { requireAnyRole } from "@/lib/auth";
import { executiveRoles } from "@/lib/module-access";
import { createClient } from "@/lib/supabase/server";
import { MinutesClient } from "@/app/dashboard/board/meetings/[id]/minutes/MinutesClient";

type PageProps = { params: Promise<{ id: string }> };

export default async function ExecutiveMeetingMinutesPage({ params }: PageProps) {
  await requireAnyRole([...executiveRoles]);
  const { id } = await params;

  const supabase = await createClient();

  const [
    { data: meeting },
    { data: boardMembers },
    { data: agendaItems },
    { data: decisionsData },
    { data: tablesData },
    { data: attendanceData },
    { data: signaturesData },
  ] = await Promise.all([
    supabase.from("meetings").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("board_members")
      .select("id,full_name,position,signature_url,status")
      .eq("status", "active")
      .is("archived_at", null)
      .order("full_name"),
    supabase
      .from("meeting_agenda_items")
      .select("*")
      .eq("meeting_id", id)
      .order("order_num"),
    supabase
      .from("meeting_decisions_structured")
      .select("*")
      .eq("meeting_id", id)
      .order("order_num"),
    supabase
      .from("meeting_attached_tables")
      .select("*")
      .eq("meeting_id", id)
      .order("created_at"),
    supabase
      .from("meeting_attendance")
      .select("board_member_id,is_present")
      .eq("meeting_id", id),
    supabase
      .from("meeting_signatures")
      .select("board_member_id,signature_image_url")
      .eq("meeting_id", id)
      .is("archived_at", null),
  ]);

  if (!meeting) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold text-amber-800" dir="rtl">
        لم يتم العثور على الاجتماع.
      </div>
    );
  }

  return (
    <MinutesClient
      meetingId={id}
      meeting={meeting as Record<string, unknown>}
      boardMembers={(boardMembers ?? []) as { id: string; full_name: string; position: string | null; signature_url: string | null }[]}
      initialAgenda={(agendaItems ?? []) as never}
      initialDecisions={(decisionsData ?? []) as never}
      initialTables={(tablesData ?? []) as never}
      initialAttendance={(attendanceData ?? []) as { board_member_id: string; is_present: boolean }[]}
      initialSignatures={(signaturesData ?? []) as { board_member_id: string | null; signature_image_url: string | null }[]}
      backHref={`/executive/meetings/${id}`}
      membersHref={null}
    />
  );
}
