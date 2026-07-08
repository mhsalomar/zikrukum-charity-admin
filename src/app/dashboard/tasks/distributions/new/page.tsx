import Link from "next/link";

import { PageHero } from "@/components/dashboard-ui";
import { TaskDistributionForm } from "@/components/task-distribution-form";
import { requireAnyRole } from "@/lib/auth";
import { getTaskPeople } from "@/lib/internal-tasks";
import { createClient } from "@/lib/supabase/server";

export default async function NewTaskDistributionPage() {
  await requireAnyRole(["admin", "demo_admin"]);
  const supabase = await createClient();
  const { data: boardRows } = await supabase
    .from("board_members")
    .select("id,full_name,position")
    .eq("status", "active")
    .is("archived_at", null)
    .order("full_name");

  const boardMembers = (boardRows ?? []).map((m) => ({
    id: m.id as string,
    name: `${m.full_name}${m.position ? ` — ${positionLabel(m.position)}` : ""}`,
  }));

  return (
    <div className="space-y-5">
      <PageHero
        eyebrow="توزيع المهام"
        title="توزيع مهام جديد"
        description="اكتب عدة مسؤولين ومهام في شاشة واحدة، وسيحفظ النظام مهمة مستقلة لكل صف."
        actions={<Link href="/dashboard/tasks/distributions" className="secondary-button inline-flex min-h-12 items-center rounded-xl px-4 text-sm font-semibold">العودة للتوزيعات</Link>}
      />
      <TaskDistributionForm people={await getTaskPeople()} boardMembers={boardMembers} />
    </div>
  );
}

function positionLabel(position: string) {
  const map: Record<string, string> = {
    chairman: "رئيس المجلس",
    vice_chairman: "نائب الرئيس",
    secretary: "أمين السر",
    treasurer: "أمين الصندوق",
    member: "عضو",
  };
  return map[position] ?? position;
}
