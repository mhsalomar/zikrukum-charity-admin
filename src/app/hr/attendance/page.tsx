import { SimpleAdminTable } from "@/components/simple-admin-table";
import { requireAnyRole } from "@/lib/auth";
import { hrRoles } from "@/lib/module-access";
import { createClient } from "@/lib/supabase/server";

const STATUS_LABELS: Record<string, string> = {
  present: "حاضر",
  absent: "غائب",
  leave: "إجازة",
  excused: "معذور",
  holiday: "إجازة رسمية",
  weekend: "إجازة أسبوعية",
  remote: "عمل عن بُعد",
};

export default async function HrPortalAttendancePage() {
  await requireAnyRole([...hrRoles]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("employee_attendance")
    .select(`
      id,
      work_date,
      status,
      check_in,
      check_out,
      late_minutes,
      excuse_reason,
      hr_employees ( full_name )
    `)
    .order("work_date", { ascending: false })
    .limit(200);

  const rows = (data ?? []).map((row) => ({
    id: row.id,
    employee_name: (row.hr_employees as { full_name?: string } | null)?.full_name ?? "—",
    work_date: row.work_date,
    status: STATUS_LABELS[row.status] ?? row.status,
    check_in: row.check_in ? new Date(row.check_in).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }) : "—",
    check_out: row.check_out ? new Date(row.check_out).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }) : "—",
    late_minutes: row.late_minutes > 0 ? `${row.late_minutes} د` : "—",
    excuse_reason: row.excuse_reason ?? "—",
  }));

  return (
    <SimpleAdminTable
      eyebrow="شؤون الموظفين"
      title="الحضور والانصراف"
      rows={rows}
      loadError={error?.message}
      columns={[
        { key: "employee_name", label: "الموظف" },
        { key: "work_date", label: "التاريخ" },
        { key: "status", label: "الحالة" },
        { key: "check_in", label: "الحضور" },
        { key: "check_out", label: "الانصراف" },
        { key: "late_minutes", label: "التأخير" },
        { key: "excuse_reason", label: "سبب الاستئذان" },
      ]}
    />
  );
}
