import { requireAnyRole } from "@/lib/auth";
import { hrRoles } from "@/lib/module-access";
import { createClient } from "@/lib/supabase/server";
import { SimpleAdminTable } from "@/components/simple-admin-table";

const PRIORITY: Record<string, string> = { urgent: "عاجلة", important: "مهمة", normal: "عادية" };
const STATUS: Record<string, string> = { new: "جديدة", in_progress: "جارية", done: "منجزة", cancelled: "ملغاة" };

export default async function HrPortalTasksPage() {
  const { user } = await requireAnyRole([...hrRoles]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tasks")
    .select("id,title,priority,status,due_date,temporary_assignee_name,created_at")
    .eq("assigned_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (data ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    assignee: t.temporary_assignee_name ?? "—",
    priority: PRIORITY[t.priority] ?? t.priority,
    status: STATUS[t.status] ?? t.status,
    due_date: t.due_date ?? "—",
  }));

  return (
    <SimpleAdminTable
      eyebrow="شؤون الموظفين"
      title="المهام"
      rows={rows}
      loadError={error?.message}
      columns={[
        { key: "title", label: "المهمة" },
        { key: "priority", label: "الأولوية" },
        { key: "status", label: "الحالة" },
        { key: "due_date", label: "الاستحقاق" },
      ]}
    />
  );
}
