import { requireAnyRole } from "@/lib/auth";
import { programsRoles } from "@/lib/module-access";
import { programStatusLabels, programTypeLabels } from "@/lib/program-labels";
import { createClient } from "@/lib/supabase/server";

export type Program = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  sponsor_name: string | null;
  estimated_budget: number | null;
  notes: string | null;
  created_at: string;
};

export type ProgramParticipant = {
  id: string;
  program_id: string;
  participant_type: string;
  participant_name: string;
  related_student_id: string | null;
  related_teacher_id: string | null;
  related_mosque_id: string | null;
  status: string;
  notes: string | null;
  created_at: string;
};

export type ProgramCommittee = {
  id: string;
  program_id: string;
  name: string;
  member_name: string;
  role: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
};

export type ProgramTask = {
  id: string;
  program_id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  due_date: string | null;
  status: string;
  priority: string;
  created_at: string;
};

export type ProgramExpense = {
  id: string;
  program_id: string;
  expense_date: string | null;
  amount: number;
  category: string | null;
  description: string | null;
  payment_method: string | null;
  reference_number: string | null;
  status: string;
  created_at: string;
};

export type ProgramReport = {
  id: string;
  program_id: string;
  title: string;
  report_type: string | null;
  summary: string | null;
  created_at: string;
};

export type ProgramAttachmentMetadata = {
  id: string;
  program_id: string;
  related_table: string | null;
  related_id: string | null;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  storage_path: string | null;
  notes: string | null;
  created_at: string;
};

export type ProgramRound = {
  id: string;
  program_id: string;
  name: string;
  round_order: number;
  start_date: string | null;
  end_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
};

export type ProgramJudgingCriterion = {
  id: string;
  program_id: string;
  name: string;
  max_score: number;
  weight: number;
  notes: string | null;
  created_at: string;
};

export type ProgramScore = {
  id: string;
  program_id: string;
  round_id: string | null;
  participant_id: string;
  criterion_id: string;
  judge_name: string | null;
  score: number;
  notes: string | null;
  created_at: string;
};

export type ProgramAward = {
  id: string;
  program_id: string;
  name: string;
  rank: number | null;
  prize_amount: number | null;
  prize_description: string | null;
  created_at: string;
};

export type ProgramWinner = {
  id: string;
  program_id: string;
  participant_id: string;
  award_id: string | null;
  final_score: number | null;
  rank: number | null;
  attendance_no: string | null;
  winner_name: string | null;
  rank_level: string | null;
  iban: string | null;
  bank_name: string | null;
  national_id: string | null;
  prize_amount: number | null;
  transfer_status: string;
  transfer_exported_at: string | null;
  notes: string | null;
  created_at: string;
};

export type ProgramDetails = {
  program: Program | null;
  participants: ProgramParticipant[];
  committees: ProgramCommittee[];
  tasks: ProgramTask[];
  expenses: ProgramExpense[];
  reports: ProgramReport[];
  attachments: ProgramAttachmentMetadata[];
  linkedFinanceExpenses: ProgramExpense[];
  rounds: ProgramRound[];
  criteria: ProgramJudgingCriterion[];
  scores: ProgramScore[];
  awards: ProgramAward[];
  winners: ProgramWinner[];
};

export { programStatusLabels, programTypeLabels };

export async function getPrograms() {
  await requireAnyRole([...programsRoles]);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("programs")
    .select("id,name,type,description,start_date,end_date,status,sponsor_name,estimated_budget,notes,created_at")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as Program[];
}

export async function getProgramDetails(id: string): Promise<ProgramDetails> {
  await requireAnyRole([...programsRoles]);
  const supabase = await createClient();

  const [
    program,
    participants,
    committees,
    tasks,
    expenses,
    reports,
    attachments,
    linkedFinanceExpenses,
    rounds,
    criteria,
    scores,
    awards,
    winners,
  ] = await Promise.all([
    supabase
      .from("programs")
      .select("id,name,type,description,start_date,end_date,status,sponsor_name,estimated_budget,notes,created_at")
      .eq("id", id)
      .is("archived_at", null)
      .maybeSingle(),
    supabase
      .from("program_participants")
      .select("id,program_id,participant_type,participant_name,related_student_id,related_teacher_id,related_mosque_id,status,notes,created_at")
      .eq("program_id", id)
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("program_committees")
      .select("id,program_id,name,member_name,role,phone,notes,created_at")
      .eq("program_id", id)
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("program_tasks")
      .select("id,program_id,title,description,assigned_to,due_date,status,priority,created_at")
      .eq("program_id", id)
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("program_expenses")
      .select("id,program_id,expense_date,amount,category,description,payment_method,reference_number,status,created_at")
      .eq("program_id", id)
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("program_reports")
      .select("id,program_id,title,report_type,summary,created_at")
      .eq("program_id", id)
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("program_attachments_metadata")
      .select("id,program_id,related_table,related_id,file_name,file_type,file_size,storage_path,notes,created_at")
      .eq("program_id", id)
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("finance_expenses")
      .select("id,program_id,expense_date,amount,category,description,payment_method,reference_number,status,created_at")
      .eq("program_id", id)
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("program_rounds")
      .select("id,program_id,name,round_order,start_date,end_date,status,notes,created_at")
      .eq("program_id", id)
      .is("archived_at", null)
      .order("round_order", { ascending: true }),
    supabase
      .from("program_judging_criteria")
      .select("id,program_id,name,max_score,weight,notes,created_at")
      .eq("program_id", id)
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("program_scores")
      .select("id,program_id,round_id,participant_id,criterion_id,judge_name,score,notes,created_at")
      .eq("program_id", id)
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("program_awards")
      .select("id,program_id,name,rank,prize_amount,prize_description,created_at")
      .eq("program_id", id)
      .is("archived_at", null)
      .order("rank", { ascending: true }),
    supabase
      .from("program_winners")
      .select("id,program_id,participant_id,award_id,final_score,rank,attendance_no,winner_name,rank_level,iban,bank_name,national_id,prize_amount,transfer_status,transfer_exported_at,notes,created_at")
      .eq("program_id", id)
      .is("archived_at", null)
      .order("rank", { ascending: true }),
  ]);

  const error =
    program.error ??
    participants.error ??
    committees.error ??
    tasks.error ??
    expenses.error ??
    reports.error ??
    attachments.error ??
    linkedFinanceExpenses.error ??
    rounds.error ??
    criteria.error ??
    scores.error ??
    awards.error ??
    winners.error;

  if (error) {
    throw error;
  }

  return {
    program: (program.data as Program | null) ?? null,
    participants: (participants.data ?? []) as ProgramParticipant[],
    committees: (committees.data ?? []) as ProgramCommittee[],
    tasks: (tasks.data ?? []) as ProgramTask[],
    expenses: (expenses.data ?? []) as ProgramExpense[],
    reports: (reports.data ?? []) as ProgramReport[],
    attachments: (attachments.data ?? []) as ProgramAttachmentMetadata[],
    linkedFinanceExpenses: (linkedFinanceExpenses.data ?? []) as ProgramExpense[],
    rounds: (rounds.data ?? []) as ProgramRound[],
    criteria: (criteria.data ?? []) as ProgramJudgingCriterion[],
    scores: (scores.data ?? []) as ProgramScore[],
    awards: (awards.data ?? []) as ProgramAward[],
    winners: (winners.data ?? []) as ProgramWinner[],
  };
}
