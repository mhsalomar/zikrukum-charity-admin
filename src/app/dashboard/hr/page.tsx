import Link from "next/link";
import { BriefcaseBusiness, FileSignature, IdCard, KeyRound, Star, Umbrella, WalletCards } from "lucide-react";

import { requireAnyRole } from "@/lib/auth";
import { hrRoles } from "@/lib/module-access";
import { createClient } from "@/lib/supabase/server";

const hrLinks = [
  { href: "/dashboard/hr/employees", title: "الموظفون", description: "الملفات الوظيفية والحالة الإدارية.", icon: BriefcaseBusiness },
  { href: "/dashboard/hr/contracts", title: "العقود", description: "متابعة العقود وتواريخ الانتهاء.", icon: FileSignature },
  { href: "/dashboard/hr/leaves", title: "الإجازات", description: "طلبات الإجازات وحالات الاعتماد.", icon: Umbrella },
  { href: "/dashboard/hr/assets", title: "العهد", description: "الأدوات والعهد المسلمة للموظفين.", icon: KeyRound },
  { href: "/dashboard/hr/evaluations", title: "التقييمات", description: "تقييمات الأداء والملاحظات الإدارية.", icon: Star },
  { href: "/dashboard/letters", title: "الصادر والخطابات", description: "خطابات رسمية قابلة للطباعة.", icon: FileSignature },
];

export default async function HrPage() {
  await requireAnyRole([...hrRoles]);
  const summary = await getHrSummary();

  return (
    <div className="space-y-5">
      <section className="dashboard-hero luxury-pattern overflow-hidden rounded-[1.8rem] text-white">
        <div className="relative p-5 sm:p-7">
          <p className="text-sm font-semibold text-[var(--gold-soft)]">الموارد البشرية</p>
          <h1 className="mt-2 text-3xl font-bold">لوحة الموارد البشرية</h1>
          <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-[#d9eee5]">
            الموظفون والبيانات والعقود والخطابات الرسمية.
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Stat label="الموظفون النشطون" value={summary.activeEmployees} icon={BriefcaseBusiness} />
        <Stat label="ناقصو الهوية/الإقامة" value={summary.missingDocument} icon={IdCard} warning />
        <Stat label="ناقصو الآيبان" value={summary.missingIban} icon={WalletCards} warning />
        <Stat label="العقود" value={summary.contracts} icon={FileSignature} />
        <Stat label="الإجازات" value={summary.leaves} icon={Umbrella} />
        <Stat label="الخطابات" value={summary.letters} icon={FileSignature} />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {hrLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="app-card group rounded-[1.5rem] p-5 transition hover:-translate-y-0.5 hover:border-[var(--gold)]">
              <span className="grid size-12 place-items-center rounded-2xl bg-[#f8f1df] text-[var(--primary-dark)]">
                <Icon aria-hidden className="size-6" />
              </span>
              <h2 className="mt-4 text-lg font-bold text-[var(--primary-dark)]">{item.title}</h2>
              <p className="mt-2 text-sm font-bold leading-7 text-[var(--muted)]">{item.description}</p>
            </Link>
          );
        })}
      </section>
    </div>
  );
}

async function getHrSummary() {
  const supabase = await createClient();
  const [employees, contracts, leaves, letters, teachers] = await Promise.all([
    safeCount("hr_employees", "status", "active"),
    safeCount("hr_contracts"),
    safeCount("hr_leaves"),
    safeCount("hr_letters"),
    supabase.from("teachers").select("id,document_number,iban,bank_name").is("archived_at", null),
  ]);

  const teacherRows = teachers.data ?? [];
  return {
    activeEmployees: employees,
    contracts,
    leaves,
    letters,
    missingDocument: teacherRows.filter((teacher) => !teacher.document_number).length,
    missingIban: teacherRows.filter((teacher) => !teacher.iban || !teacher.bank_name).length,
  };

  async function safeCount(table: string, column?: string, value?: string) {
    let query = supabase.from(table).select("id", { count: "exact", head: true });
    if (column && value) query = query.eq(column, value);
    const { count } = await query;
    return count ?? 0;
  }
}

function Stat({ label, value, icon: Icon, warning = false }: { label: string; value: number; icon: typeof BriefcaseBusiness; warning?: boolean }) {
  return (
    <div className={`stat-card rounded-[1.5rem] p-4 ${warning ? "border-r-4 border-amber-400" : ""}`}>
      <Icon aria-hidden className="size-6 text-[var(--gold)]" />
      <p className="mt-3 text-xs font-bold text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-3xl font-bold text-[var(--primary-dark)]">{value}</p>
    </div>
  );
}
