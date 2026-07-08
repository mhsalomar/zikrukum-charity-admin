"use server";

import { requireAnyRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { executiveRoles } from "@/lib/module-access";

type AgendaInput = {
  tempId: string;
  order_num: number;
  title: string;
  notes: string;
};

type DecisionInput = {
  order_num: number;
  content: string;
  agendaTempId: string | null;
  status: string;
};

type TableRow = { item: string; amount: string; notes: string };
type TableInput = { title: string; rows: TableRow[] };

type SignatureInput = {
  board_member_id: string;
  signature_url: string;
  full_name: string;
  position: string;
};

type CreateMeetingInput = {
  title: string;
  meeting_number?: string | null;
  meeting_type: string;
  meeting_date: string;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  chair_name?: string | null;
  prepared_by?: string | null;
  status: string;
  notes?: string | null;
  attendance: Record<string, boolean>;
  agenda: AgendaInput[];
  decisions: DecisionInput[];
  tables: TableInput[];
  signatures: SignatureInput[];
};

export async function createMeetingWithMinutes(
  data: CreateMeetingInput,
): Promise<{ meetingId: string } | { error: string }> {
  await requireAnyRole([...executiveRoles, "admin", "demo_admin"]);
  const supabase = await createClient();

  const { data: meeting, error: meetingError } = await supabase
    .from("meetings")
    .insert({
      title: data.title,
      meeting_number: data.meeting_number || null,
      meeting_type: data.meeting_type,
      meeting_date: data.meeting_date,
      start_time: data.start_time || null,
      end_time: data.end_time || null,
      location: data.location || null,
      chair_name: data.chair_name || null,
      prepared_by: data.prepared_by || null,
      status: data.status || "draft",
      notes: data.notes || null,
    })
    .select("id")
    .single();

  if (meetingError || !meeting) {
    return { error: meetingError?.message ?? "فشل في إنشاء الاجتماع" };
  }

  const meetingId: string = meeting.id;

  // Attendance
  const attendanceRows = Object.entries(data.attendance).map(
    ([board_member_id, is_present]) => ({ meeting_id: meetingId, board_member_id, is_present }),
  );
  if (attendanceRows.length > 0) {
    const { error } = await supabase.from("meeting_attendance").insert(attendanceRows);
    if (error) return { error: `حضور: ${error.message}` };
  }

  // Agenda — insert and collect real IDs by order_num
  const tempToReal: Record<string, string> = {};
  const agendaToInsert = data.agenda.filter((a) => a.title.trim());
  if (agendaToInsert.length > 0) {
    const { data: inserted, error } = await supabase
      .from("meeting_agenda_items")
      .insert(
        agendaToInsert.map((a) => ({
          meeting_id: meetingId,
          order_num: a.order_num,
          title: a.title,
          notes: a.notes || null,
        })),
      )
      .select("id,order_num");
    if (error) return { error: `محاور: ${error.message}` };
    agendaToInsert.forEach((a) => {
      const real = (inserted ?? []).find((r: { id: string; order_num: number }) => r.order_num === a.order_num);
      if (real) tempToReal[a.tempId] = real.id;
    });
  }

  // Decisions
  const decisionsToInsert = data.decisions.filter((d) => d.content.trim());
  if (decisionsToInsert.length > 0) {
    const { error } = await supabase.from("meeting_decisions_structured").insert(
      decisionsToInsert.map((d) => ({
        meeting_id: meetingId,
        order_num: d.order_num,
        content: d.content,
        agenda_item_id: d.agendaTempId ? (tempToReal[d.agendaTempId] ?? null) : null,
        status: d.status || "approved",
      })),
    );
    if (error) return { error: `قرارات: ${error.message}` };
  }

  // Attached tables
  const tablesToInsert = data.tables.filter((t) => t.title.trim());
  if (tablesToInsert.length > 0) {
    const { error } = await supabase.from("meeting_attached_tables").insert(
      tablesToInsert.map((t) => ({ meeting_id: meetingId, title: t.title, rows: t.rows })),
    );
    if (error) return { error: `جداول: ${error.message}` };
  }

  // Signatures
  if (data.signatures.length > 0) {
    const { error } = await supabase.from("meeting_signatures").insert(
      data.signatures.map((s) => ({
        meeting_id: meetingId,
        board_member_id: s.board_member_id,
        signature_image_url: s.signature_url,
        signer_name: s.full_name,
        signer_title: s.position,
        signature_type: "member",
        signature_status: "signed",
      })),
    );
    if (error) return { error: `تواقيع: ${error.message}` };
  }

  return { meetingId };
}
