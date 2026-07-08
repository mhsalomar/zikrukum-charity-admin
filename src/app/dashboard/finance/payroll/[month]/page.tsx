import Link from "next/link";

import { PayrollRunDetail } from "@/components/payroll-run-detail";
import { getCurrentUserRoles } from "@/lib/auth";
import { getPayrollRun } from "@/lib/finance";

export default async function PayrollMonthPage({
  params,
}: {
  params: Promise<{ month: string }>;
}) {
  const { month } = await params;
  const [{ run, items }, roles] = await Promise.all([
    getPayrollRun(month),
    getCurrentUserRoles(),
  ]);

  if (!run) {
    return (
      <div className="app-card rounded-[1.6rem] p-8 text-center">
        <h1 className="text-xl font-bold text-[var(--primary-dark)]">لم يتم العثور على المسير</h1>
        <p className="mt-2 text-sm font-semibold text-[var(--muted)]">قد يكون الشهر غير موجود أو لم يتم إنشاؤه بعد.</p>
        <Link href="/dashboard/finance/payroll" className="gold-button mt-5 inline-flex min-h-11 items-center rounded-2xl px-5 text-sm font-semibold text-white">
          العودة لمسير الرواتب
        </Link>
      </div>
    );
  }

  return <PayrollRunDetail run={run} items={items} canDelete={roles.includes("admin")} />;
}
