import { createClient } from "@/lib/supabase/server";

export async function getSimpleRows(table: string, columns: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  return {
    rows: (data ?? []) as unknown as Array<Record<string, unknown>>,
    error: error?.message ?? "",
  };
}
