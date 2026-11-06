import Link from "next/link";
import {
  CircleDollarSign,
  ClipboardCheck,
  FileSpreadsheet,
  FileText,
  HandHeart,
  ReceiptText,
  Wallet,
} from "lucide-react";

import { DonutSummaryChart, HorizontalBarChart, MiniTrendChart, VerticalBarChart } from "@/components/report-charts";
import { getFinanceOverview, money, payrollRunLabel } from "@/lib/finance";

const financeLinks = [
  { href: "/dashboard/finance/payroll", label: "مسير الرواتب", icon: FileSpreadsheet, help: "أنشئ مسيرًا شهريًا، راجع بيانات الموظفين، ثم صدّر ملف البنك عند الاعتماد." },
  { href: "/dashboard/finance/revenues", label: "الإيرادات", icon: CircleDollarSign, help: "سجل التبرعات والإيرادات حسب المصدر والبرنامج والداعم." },
  { href: "/dashboard/finance/expenses", label: "المصروفات", icon: Wallet, help: "سجل الصرف واربطه بالبند والبرنامج مع رقم المرجع عند توفره." },
  { href: "/dashboard/finance/budget-items", label: "بنود الصرف", icon: ReceiptText, help: "عرّف البنود المستخدمة لتصنيف الصرف ومتابعة الميزانية." },
  { href: "/dashboard/finance/donors", label: "الداعمون", icon: HandHeart, help: "سجل بيانات الداعمين وربط دعمهم بالبرامج عند الحاجة." },
  { href: "/dashboard/finance/reports", label: "التقارير المالية", icon: FileText, help: "راقب الإجماليات والفروقات وملخصات الفترة بوضوح." },
  { href: "/dashboard/finance/monthly-close", label: "مركز الإقفال الشهري", icon: ClipboardCheck, help: "تحقق من اكتمال جميع خطوات الإقفال المالي قبل إغلاق الشهر." },
];

const financeSteps = [
  "تعريف البنود والداعمين",
  "تسجيل الإيرادات",
  "تسجيل المصروفات",
  "ربط العمليات بالبرامج",
  "مراجعة الرواتب",
  "تصدير التقارير",
];

export default async function FinancePage() {
  const overview = await getFinanceOverview();

  const primaryCards = [
    { label: "إجمالي الإيرادات", value: money(overview.revenuesTotal), icon: CircleDollarSign },
    { label: "إجمالي المصروفات", value: money(overview.expensesTotal), icon: Wallet },
    { label: "صافي المتابعة", value: money(overview.netTotal), icon: ReceiptText },
    { label: "إجمالي الرواتب الشهرية", value: money(overview.monthlyPayrollTotal), icon: FileSpreadsheet },
  ];

  const secondaryCards = [
    { label: "تبرعات هذا الشهر", value: money(overview.donationsThisMonthTotal), icon: HandHeart },
    { label: "إيصالات غير مصدرة", value: String(overview.pendingReceiptsCount), icon: ReceiptText },
    { label: "مسيرات قيد المراجعة", value: String(overview.payrollRunsInReviewCount), icon: FileSpreadsheet },
    { label: "مصروفات برامج مرشحة (تقديري)", value: money(overview.programExpensesTotal), icon: Wallet },
    { label: "تعهدات مستحقة", value: String(overview.duePledgesCount), icon: FileText },
    {
      label: "آخر مسير رواتب",
      value: overview.latestPayrollRun ? payrollRunLabel(overview.latestPayrollRun) : "لا يوجد",
      icon: FileText,
    },
    { label: "عدد الداعمين", value: String(overview.donorsCount), icon: HandHeart },
    { label: "عدد بنود الصرف", value: String(overview.budgetItemsCount), icon: ReceiptText },
  ];

  return (
    <div className="space-y-5">
      <section className="dashboard-hero overflow-hidden rounded-[1.15rem] shadow-sm">
        <div className="relative p-5 sm:p-7">
          <p className="mb-2 text-sm font-semibold text-[var(--gold)]">المالية والرواتب</p>
          <h1 className="text-2xl font-bold text-[var(--primary-dark)] sm:text-4xl">لوحة المتابعة المالية</h1>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-[var(--muted)] sm:text-base">
            واجهة تشغيلية لإدارة ومراجعة العمليات المالية والتبرعات والرواتب، وتجهيز البيانات والتقارير والمرفقات للنظام المحاسبي المعتمد.
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {primaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="stat-card rounded-[1.5rem] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#6f8179]">{card.label}</p>
                  <p className="mt-3 break-words text-2xl font-bold text-[var(--primary-dark)]">{card.value}</p>
                </div>
                <span className="grid size-13 shrink-0 place-items-center rounded-2xl border border-[var(--line)] bg-[#f8f1df] text-[var(--primary-dark)]">
                  <Icon aria-hidden className="size-6" />
                </span>
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {secondaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="stat-card rounded-2xl p-3.5">
              <div className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-[var(--line)] bg-[#f8f1df] text-[var(--primary-dark)]">
                  <Icon aria-hidden className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-[#6f8179]">{card.label}</p>
                  <p className="mt-0.5 truncate text-base font-bold text-[var(--primary-dark)]">{card.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {overview.revenuesTotal === 0 && overview.expensesTotal === 0 && overview.payrollEmployeesCount === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[#fffdf8] p-5 text-sm font-bold leading-7 text-[var(--muted)]">
          لا توجد بيانات مالية محفوظة حاليًا. استخدم الأقسام أدناه لإضافة بيانات فعلية عند اعتمادها.
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-3">
        <VerticalBarChart
          title="الإيرادات والمصروفات"
          data={[
            { label: "الإيرادات", value: overview.revenuesTotal },
            { label: "المصروفات", value: overview.expensesTotal },
            { label: "الرواتب الشهرية", value: overview.monthlyPayrollTotal },
          ]}
          valueLabel="ريال"
        />
        <HorizontalBarChart
          title="المصروفات حسب التصنيف"
          data={overview.expensesByCategory}
          valueLabel="ريال"
        />
        <DonutSummaryChart
          title="الإيرادات حسب المصدر"
          data={overview.revenuesBySource}
          centerLabel="ريال"
        />
        <MiniTrendChart
          title="مسيرات الرواتب الأخيرة"
          data={overview.payrollRunsTrend}
          source="المصدر: مسيرات الرواتب"
        />
      </section>

      <section className="app-card rounded-[1.6rem] p-5 sm:p-7">
        <p className="text-sm font-semibold text-[var(--gold)]">خطوات العمل المالي</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {financeSteps.map((step, index) => (
            <div key={step} className="rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-4">
              <span className="grid size-8 place-items-center rounded-full bg-[var(--primary-dark)] text-sm font-semibold text-white">{index + 1}</span>
              <p className="mt-3 text-sm font-semibold text-[var(--primary-dark)]">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {financeLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="app-card group rounded-[1.4rem] p-5 transition hover:-translate-y-0.5 hover:border-[var(--gold)]">
              <span className="grid size-12 place-items-center rounded-2xl bg-[#f8f1df] text-[var(--primary-dark)]">
                <Icon aria-hidden className="size-6" />
              </span>
              <h2 className="mt-4 text-lg font-bold text-[var(--primary-dark)]">{item.label}</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--muted)]">{item.help}</p>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
