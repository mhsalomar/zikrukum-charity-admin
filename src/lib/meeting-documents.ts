import { createClient } from "@/lib/supabase/server";

export type MeetingDocument = {
  id: string;
  title: string;
  meetingType: string;
  meetingNumber: string;
  meetingDate: string;
  startTime: string;
  endTime: string;
  location: string;
  chairName: string;
  preparedBy: string;
  attendees: string;
  absentees: string;
  excused: string;
  agenda: string;
  minutes: string;
  decisions: string;
  recommendations: string;
  decisionOwner: string;
  decisionDueDate: string;
  status: string;
  agendaItems: MeetingAgendaItem[];
  structuredDecisions: MeetingDecisionItem[];
  signatures: SignatureRow[];
};

export type MeetingAgendaItem = {
  id: string;
  orderNum: number;
  title: string;
  notes: string;
};

export type MeetingDecisionItem = {
  id: string;
  orderNum: number;
  content: string;
  status: string;
};

export type SignatureRow = {
  id: string;
  signerName: string;
  signerTitle: string;
  signatureType: string;
  signatureStatus: string;
  signatureDate: string;
  notes: string;
};

type RelatedObject = Record<string, unknown>;

export async function getMeetingDocument(id: string): Promise<MeetingDocument | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  const [{ data: signatures }, { data: agendaItems }, { data: structuredDecisions }] = await Promise.all([
    supabase
      .from("meeting_signatures")
      .select("id,signer_name,signer_title,signature_type,signature_status,signature_date,notes")
      .eq("meeting_id", id)
      .is("archived_at", null)
      .order("created_at"),
    supabase
      .from("meeting_agenda_items")
      .select("id,order_num,title,notes")
      .eq("meeting_id", id)
      .order("order_num"),
    supabase
      .from("meeting_decisions_structured")
      .select("id,order_num,content,status")
      .eq("meeting_id", id)
      .order("order_num"),
  ]);

  const row = data as RelatedObject;
  return {
    id: readString(row.id),
    title: readString(row.title),
    meetingType: readString(row.meeting_type),
    meetingNumber: readString(row.meeting_number),
    meetingDate: readString(row.meeting_date),
    startTime: readString(row.start_time),
    endTime: readString(row.end_time),
    location: readString(row.location),
    chairName: readString(row.chair_name),
    preparedBy: readString(row.prepared_by),
    attendees: readString(row.attendees),
    absentees: readString(row.absentees),
    excused: readString(row.excused),
    agenda: readString(row.agenda),
    minutes: readString(row.minutes),
    decisions: readString(row.decisions),
    recommendations: readString(row.recommendations),
    decisionOwner: readString(row.decision_owner),
    decisionDueDate: readString(row.decision_due_date),
    status: readString(row.status),
    agendaItems: ((agendaItems ?? []) as unknown as RelatedObject[]).map((item) => ({
      id: readString(item.id),
      orderNum: readNumber(item.order_num),
      title: readString(item.title),
      notes: readString(item.notes),
    })),
    structuredDecisions: ((structuredDecisions ?? []) as unknown as RelatedObject[]).map((decision) => ({
      id: readString(decision.id),
      orderNum: readNumber(decision.order_num),
      content: readString(decision.content),
      status: readString(decision.status),
    })),
    signatures: ((signatures ?? []) as unknown as RelatedObject[]).map((signature) => ({
      id: readString(signature.id),
      signerName: readString(signature.signer_name),
      signerTitle: readString(signature.signer_title),
      signatureType: readString(signature.signature_type),
      signatureStatus: readString(signature.signature_status),
      signatureDate: readString(signature.signature_date),
      notes: readString(signature.notes),
    })),
  };
}

export function splitLines(value: string) {
  return value
    .split(/\r?\n|،|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export const meetingTypeLabels: Record<string, string> = {
  board: "مجلس الإدارة",
  committee: "لجنة",
  work_team: "فريق عمل",
  general_assembly: "جمعية عمومية",
  other: "أخرى",
};

export const signatureTypeLabels: Record<string, string> = {
  chair: "رئيس الاجتماع",
  member: "عضو",
  rapporteur: "مقرر",
  attendee: "شاهد/حاضر",
  approval: "اعتماد",
};

export const signatureStatusLabels: Record<string, string> = {
  required: "مطلوب",
  signed: "تم التوقيع",
  not_required: "غير مطلوب",
};

function readString(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function readNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}
