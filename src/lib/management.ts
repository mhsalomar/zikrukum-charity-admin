import type { ManagementTable } from "@/lib/management-configs";
import { createClient } from "@/lib/supabase/server";

export type ManagementRow = Record<string, unknown> & {
  id: string;
  status?: string | null;
  archived_at?: string | null;
};

export async function getManagementRows(table: ManagementTable, limit = 200) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { rows: [] as ManagementRow[], error: error.message };
  }

  return { rows: (data ?? []) as ManagementRow[], error: "" };
}
