import Link from "next/link";
import { BriefcaseBusiness, CalendarCheck, ClipboardPenLine, FileSignature, KeyRound, ListTodo, Star, Umbrella, WalletCards } from "lucide-react";

import { requireAnyRole } from "@/lib/auth";
import { hrRoles } from "@/lib/module-access";
import { createClient } from "@/lib/supabase/server";

const quickLinks = [
  { href: "/hr/employees", icon: BriefcaseBusiness, label: "الموظفون" },
  { href: "/hr/attendance", icon: CalendarCheck, label: "الحضور والانصراف" },
  { href: "/hr/leaves", icon: Umbrella, label: "الإجازات" },
  { href: "/hr/payroll", icon: WalletCards, label: "الرواتب" },
  { href: "/hr/letters", icon: ClipboardPenLine, label: "الخطابات" },
  { href: "/hr/contracts", icon: FileSignature, label: "العقود" },
  { href: "/hr/assets", icon: KeyRound, label: "العهد" },
  { href: "/hr/evaluations", icon: Star, label: "التقييمات" },
  { href: "/hr/tasks", icon: ListTodo, label: "المهام" },
];

export default async function HrDashboardPage() {
  await requireAnyRole([...hrRoles]);
  const stats = await getHrStats();

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <section className="dashboard-hero luxury-pattern overflow-hidden rounded-[1.8rem] text-white">
        <div className="relative p-5 sm:p-7">
          <p className="text-sm font-semibold text-[var(--gold-soft)]">شؤون الموظفين</p>
          <h1 className="mt-2 text-3xl font-bold">لوحة شؤون الموظفين</h1>
          <p className="mt-3 max-w-2xl text-sm font-bold leading-7 text-[#d9eee5]">
            متابعة الموظفين، الحضور والانصراف، الإجازات، الرواتب، والخطابات الإدارية.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="الموظفون النشطون" value={stats.activeEmployees} />
        <StatCard label="الإجازات" value={stats.leaves} />
        <StatCard label="العقود" value={stats.contracts} />
        <StatCard label="الخطابات" value={stats.letters} />
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {quickLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="app-card group flex items-center gap-3 rounded-[1.3rem] p-4 transition hover:-translate-y-0.5 hover:border-[var(--gold)]"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#f8f1df] text-[var(--primary-dark)]">
                <Icon aria-hidden className="size-5" />
              </span>
              <span className="text-sm font-semibold text-[var(--primary-dark)]">{item.label}</span>
            </Link>
          );
        })}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-card rounded-[1.3rem] p-4">
      <p className="text-xs font-bold text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-3xl font-bold text-[var(--primary-dark)]">{value}</p>
    </div>
  );
}

async function getHrStats() {
  const supabase = await createClient();
  const run = async (table: string, col?: string, val?: string) => {
    const q = supabase.from(table).select("id", { count: "exact", head: true });
    const { count } = await (col && val ? q.eq(col, val) : q);
    return count ?? 0;
  };
  const [activeEmployees, leaves, contracts, letters] = await Promise.all([
    run("hr_employees", "status", "active"),
    run("hr_leaves"),
    run("hr_contracts"),
    run("hr_letters"),
  ]);
  return { activeEmployees, leaves, contracts, letters };
}
