import { requireAnyRole } from "@/lib/auth";
import { financeRoles } from "@/lib/module-access";
import { createClient } from "@/lib/supabase/server";
import { money, payrollRunLabel } from "@/lib/format";

export type PayrollEmployee = {
  id: string;
  teacher_id?: string | null;
  employee_name: string;
  employee_type: string;
  iban: string | null;
  bank_name: string | null;
  national_id: string | null;
  phone: string | null;
  base_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number | null;
  notes: string | null;
  status: string;
  created_at?: string;
};

export type PayrollRun = {
  id: string;
  month: string;
  year: number;
  total_employees: number;
  total_amount: number;
  notes: string | null;
  status: string;
  created_at: string;
};

export type PayrollRunItem = {
  id: string;
  run_id: string;
  employee_id: string;
  base_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  payment_status: string;
  notes: string | null;
  employees_payroll?: Pick<PayrollEmployee, "employee_name" | "iban" | "bank_name" | "status"> & { archived_at?: string | null } | null;
};

export type FinanceExpense = {
  id: string;
  expense_date: string;
  amount: number;
  category: string;
  description: string | null;
  payment_method: string | null;
  reference_number: string | null;
  status: string;
  created_at?: string;
};

export type FinanceRevenue = {
  id: string;
  revenue_date: string;
  amount: number;
  source_name: string;
  donor_name: string | null;
  description: string | null;
  reference_number: string | null;
  status: string;
  created_at?: string;
};

export type FinanceBudgetItem = {
  id: string;
  name: string;
  allocated_amount: number;
  spent_amount: number;
  fiscal_year: number;
  notes: string | null;
  status: string;
  created_at?: string;
};

export type Donor = {
  id: string;
  name: string;
  donor_type: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  status: string;
  created_at?: string;
};

export type FinanceReport = {
  id: string;
  title: string;
  report_type: string | null;
  period_start: string | null;
  period_end: string | null;
  summary: string | null;
  status: string;
  created_at?: string;
};

export type FinanceOverview = {
  revenuesTotal: number;
  expensesTotal: number;
  netTotal: number;
  monthlyPayrollTotal: number;
  donationsThisMonthTotal: number;
  pendingReceiptsCount: number;
  payrollRunsInReviewCount: number;
  programExpensesTotal: number;
  duePledgesCount: number;
  latestPayrollRun: PayrollRun | null;
  donorsCount: number;
  budgetItemsCount: number;
  payrollEmployeesCount: number;
  revenuesBySource: Array<{ label: string; value: number }>;
  expensesByCategory: Array<{ label: string; value: number }>;
  payrollRunsTrend: Array<{ label: string; value: number }>;
};

export { money, payrollRunLabel };

export async function getFinanceOverview(): Promise<FinanceOverview> {
  await requireAnyRole([...financeRoles]);
  const supabase = await createClient();
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartKey = monthStart.toISOString().slice(0, 10);
  const todayKey = new Date().toISOString().slice(0, 10);

  const [
    revenues,
    expenses,
    payrollEmployees,
    latestRun,
    payrollRuns,
    donors,
    budgetItems,
    donations,
    pledges,
  ] = await Promise.all([
    supabase.from("finance_revenues").select("amount,source_name").is("archived_at", null).eq("status", "approved").limit(1000),
    supabase.from("finance_expenses").select("amount,category").is("archived_at", null).eq("status", "approved").limit(1000),
    supabase
      .from("employees_payroll")
      .select("id,net_salary,base_salary,allowances,deductions")
      .eq("status", "active")
      .is("archived_at", null)
      .limit(1000),
    supabase
      .from("payroll_runs")
      .select("id,month,year,total_employees,total_amount,notes,status,created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("payroll_runs")
      .select("month,year,total_amount,status,created_at")
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(12),
    supabase.from("donors").select("id", { count: "exact", head: true }).is("archived_at", null),
    supabase
      .from("finance_budget_items")
      .select("id", { count: "exact", head: true })
      .is("archived_at", null),
    supabase
      .from("donations")
      .select("amount,receipt_status,donation_date")
      .is("archived_at", null)
      .limit(3000),
    supabase
      .from("pledges")
      .select("id,status,due_date")
      .is("archived_at", null)
      .limit(3000),
  ]);

  if (revenues.error || expenses.error || payrollEmployees.error || latestRun.error || payrollRuns.error || donors.error || budgetItems.error) {
    throw revenues.error ?? expenses.error ?? payrollEmployees.error ?? latestRun.error ?? payrollRuns.error ?? donors.error ?? budgetItems.error;
  }

  const revenuesTotal = sumAmounts(revenues.data);
  const expensesTotal = sumAmounts(expenses.data);
  const donationRows = donations.error ? [] : donations.data ?? [];
  const pledgeRows = pledges.error ? [] : pledges.data ?? [];
  const pendingReceiptsCount = donationRows.filter((row) => !["issued", "sent"].includes(String(row.receipt_status ?? ""))).length;
  const programExpensesTotal = (expenses.data ?? [])
    .filter((row) => String(row.category ?? "").includes("برنامج") || String(row.category ?? "").toLowerCase().includes("program"))
    .reduce((total, row) => total + Number(row.amount ?? 0), 0);
  const payrollRunsWithTotals = await hydratePayrollRunTotals(supabase, (payrollRuns.data ?? []) as PayrollRun[]);
  const latestRunWithTotals = latestRun.data
    ? (await hydratePayrollRunTotals(supabase, [latestRun.data as PayrollRun]))[0] ?? (latestRun.data as PayrollRun)
    : null;
  const monthlyPayrollTotal = (payrollEmployees.data ?? []).reduce((total, employee) => {
    const net =
      typeof employee.net_salary === "number"
        ? employee.net_salary
        : Number(employee.base_salary ?? 0) + Number(employee.allowances ?? 0) - Number(employee.deductions ?? 0);
    return total + net;
  }, 0);

  return {
    revenuesTotal,
    expensesTotal,
    netTotal: revenuesTotal - expensesTotal,
    monthlyPayrollTotal,
    donationsThisMonthTotal: donationRows
      .filter((row) => String(row.donation_date ?? "") >= monthStartKey)
      .reduce((total, row) => total + Number(row.amount ?? 0), 0),
    pendingReceiptsCount,
    payrollRunsInReviewCount: (payrollRuns.data ?? []).filter((run) => ["draft", "pending", "pending_review", "ready"].includes(String(run.status ?? ""))).length,
    programExpensesTotal,
    duePledgesCount: pledgeRows.filter((row) => ["open", "partially_collected", "overdue"].includes(String(row.status ?? "")) || (!!row.due_date && String(row.due_date) <= todayKey && row.status !== "collected")).length,
    latestPayrollRun: latestRunWithTotals,
    donorsCount: donors.count ?? 0,
    budgetItemsCount: budgetItems.count ?? 0,
    payrollEmployeesCount: payrollEmployees.data?.length ?? 0,
    revenuesBySource: groupMoney(revenues.data, "source_name"),
    expensesByCategory: groupMoney(expenses.data, "category"),
    payrollRunsTrend: payrollRunsWithTotals
      .slice()
      .reverse()
      .map((run) => ({ label: `${run.month}/${run.year}`, value: Number(run.total_amount ?? 0) })),
  };
}

export async function getPayrollData() {
  await requireAnyRole([...financeRoles]);
  const supabase = await createClient();
  const [employees, runs] = await Promise.all([
    supabase
      .from("employees_payroll")
      .select("id,teacher_id,employee_name,employee_type,iban,bank_name,national_id,phone,base_salary,allowances,deductions,net_salary,notes,status,created_at")
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(120),
    supabase
      .from("payroll_runs")
      .select("id,month,year,total_employees,total_amount,notes,status,created_at")
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  if (employees.error || runs.error) {
    throw employees.error ?? runs.error;
  }

  const runsWithComputedTotals = await hydratePayrollRunTotals(supabase, ((runs.data ?? []) as PayrollRun[]));

  return {
    employees: (employees.data ?? []) as PayrollEmployee[],
    runs: runsWithComputedTotals,
  };
}

export async function getPayrollRun(monthParam: string) {
  await requireAnyRole([...financeRoles]);
  const [yearText, monthText] = monthParam.split("-");
  const year = Number(yearText);
  const month = String(Number(monthText || "0")).padStart(2, "0");

  if (!year || !monthText) {
    return { run: null, items: [] as PayrollRunItem[] };
  }

  const supabase = await createClient();
  const { data: run, error: runError } = await supabase
    .from("payroll_runs")
    .select("id,month,year,total_employees,total_amount,notes,status,created_at")
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();

  if (runError || !run) {
    if (runError) throw runError;
    return { run: null, items: [] as PayrollRunItem[] };
  }

  const { data: items, error: itemsError } = await supabase
    .from("payroll_run_items")
    .select("id,run_id,employee_id,base_salary,allowances,deductions,net_salary,payment_status,notes,employees_payroll(employee_name,iban,bank_name,status,archived_at)")
    .eq("run_id", run.id)
    .order("created_at", { ascending: true });

  if (itemsError) {
    throw itemsError;
  }

  const normalizedItems = ((items ?? []) as unknown as Array<PayrollRunItem & { employees_payroll?: PayrollRunItem["employees_payroll"] | PayrollRunItem["employees_payroll"][] }>).map((item) => ({
      ...item,
      employees_payroll: Array.isArray(item.employees_payroll)
        ? item.employees_payroll[0] ?? null
        : item.employees_payroll ?? null,
    }));
  const computed = computePayrollRunTotals(normalizedItems);

  return {
    run: {
      ...(run as PayrollRun),
      total_employees: computed.totalEmployees,
      total_amount: computed.totalAmount,
    },
    items: normalizedItems,
  };
}

async function hydratePayrollRunTotals(
  supabase: Awaited<ReturnType<typeof createClient>>,
  runs: PayrollRun[],
) {
  if (runs.length === 0) return runs;
  const runIds = runs.map((run) => run.id);
  const { data } = await supabase
    .from("payroll_run_items")
    .select("run_id,net_salary,payment_status,employees_payroll(status,archived_at)")
    .in("run_id", runIds);

  const totals = new Map<string, { totalEmployees: number; totalAmount: number }>();
  for (const item of (data ?? []) as unknown as Array<PayrollRunItem & { employees_payroll?: PayrollRunItem["employees_payroll"] | PayrollRunItem["employees_payroll"][] }>) {
    const employee = Array.isArray(item.employees_payroll) ? item.employees_payroll[0] ?? null : item.employees_payroll ?? null;
    if (!isPayablePayrollRunItem(item.payment_status, employee)) continue;
    const current = totals.get(item.run_id) ?? { totalEmployees: 0, totalAmount: 0 };
    current.totalEmployees += 1;
    current.totalAmount += Number(item.net_salary ?? 0);
    totals.set(item.run_id, current);
  }

  return runs.map((run) => {
    const total = totals.get(run.id);
    return total ? { ...run, total_employees: total.totalEmployees, total_amount: total.totalAmount } : { ...run, total_employees: 0, total_amount: 0 };
  });
}

function computePayrollRunTotals(items: PayrollRunItem[]) {
  return items.reduce(
    (total, item) => {
      if (!isPayablePayrollRunItem(item.payment_status, item.employees_payroll ?? null)) return total;
      total.totalEmployees += 1;
      total.totalAmount += Number(item.net_salary ?? 0);
      return total;
    },
    { totalEmployees: 0, totalAmount: 0 },
  );
}

function isPayablePayrollRunItem(
  paymentStatus: string | null | undefined,
  employee: (Pick<PayrollEmployee, "status"> & { archived_at?: string | null }) | null,
) {
  return paymentStatus !== "failed" && Boolean(employee) && employee?.status !== "inactive" && !employee?.archived_at;
}

export async function getFinanceRows(table: "finance_expenses" | "finance_revenues" | "finance_budget_items" | "donors" | "finance_reports") {
  await requireAnyRole([...financeRoles]);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    throw error;
  }

  return data ?? [];
}

export type MonthlyCloseStatus = "complete" | "incomplete" | "review";

export type MonthlyCloseItem = {
  key: string;
  label: string;
  status: MonthlyCloseStatus;
  detail: string;
  href: string;
};

export type MonthlyCloseData = {
  year: number;
  month: number;
  items: MonthlyCloseItem[];
};

export async function getMonthlyCloseData(year: number, month: number): Promise<MonthlyCloseData> {
  await requireAnyRole([...financeRoles]);
  const supabase = await createClient();

  const monthStr = String(month).padStart(2, "0");
  const monthStart = `${year}-${monthStr}-01`;
  const nextMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;

  const [revenues, expensesNoRef, expensesDraft, payrollRun, pledges, reports] = await Promise.all([
    supabase.from("finance_revenues").select("id", { count: "exact", head: true })
      .is("archived_at", null).gte("revenue_date", monthStart).lt("revenue_date", nextMonth),
    supabase.from("finance_expenses").select("id", { count: "exact", head: true })
      .is("archived_at", null).is("reference_number", null).gte("expense_date", monthStart).lt("expense_date", nextMonth),
    supabase.from("finance_expenses").select("id", { count: "exact", head: true })
      .is("archived_at", null).eq("status", "draft").gte("expense_date", monthStart).lt("expense_date", nextMonth),
    supabase.from("payroll_runs").select("id,status").eq("year", year).eq("month", monthStr).maybeSingle(),
    supabase.from("pledges").select("id", { count: "exact", head: true })
      .is("archived_at", null).not("status", "eq", "collected"),
    supabase.from("finance_reports").select("id,status", { count: "exact" })
      .is("archived_at", null).gte("period_start", monthStart).lt("period_start", nextMonth),
  ]);

  const revenueCount = revenues.count ?? 0;
  const noRefCount = expensesNoRef.count ?? 0;
  const draftCount = expensesDraft.count ?? 0;
  const run = payrollRun.data;
  const openPledges = pledges.count ?? 0;
  const reportExists = (reports.count ?? 0) > 0;
  const reportApproved = reportExists && (reports.data ?? []).some((r) => r.status === "approved");

  const items: MonthlyCloseItem[] = [
    {
      key: "bank_import",
      label: "استيراد كشف البنك",
      status: revenueCount > 0 ? "review" : "incomplete",
      detail: revenueCount > 0 ? `${revenueCount} إيراد مسجّل؛ لا يثبت ذلك استيراد كشف البنك أو مطابقته` : "لم يُسجَّل أي إيراد للشهر",
      href: "/dashboard/finance/revenues",
    },
    {
      key: "expenses_attachments",
      label: "مصروفات بدون مرجع",
      status: noRefCount === 0 ? "complete" : noRefCount <= 3 ? "review" : "incomplete",
      detail: noRefCount === 0 ? "جميع المصروفات مكتملة" : `${noRefCount} مصروف بدون رقم مرجع`,
      href: "/dashboard/finance/expenses",
    },
    {
      key: "unclassified",
      label: "قيود مالية غير مصنفة",
      status: draftCount === 0 ? "complete" : draftCount <= 3 ? "review" : "incomplete",
      detail: draftCount === 0 ? "لا توجد مسودات معلقة" : `${draftCount} قيد بحالة مسودة`,
      href: "/dashboard/finance/expenses",
    },
    {
      key: "payroll_ready",
      label: "جاهزية مسير الرواتب",
      status: run ? "complete" : "incomplete",
      detail: run ? `مسير موجود (${run.status})` : "لم يُنشأ مسير لهذا الشهر",
      href: "/dashboard/finance/payroll",
    },
    {
      key: "payroll_approved",
      label: "اعتماد مسير الرواتب",
      status: !run ? "incomplete" : ["approved", "confirmed", "exported"].includes(run.status) ? "complete" : "review",
      detail: !run ? "لا يوجد مسير" : ["approved", "confirmed", "exported"].includes(run.status) ? "مسير معتمد" : "بانتظار الاعتماد",
      href: "/dashboard/finance/payroll",
    },
    {
      key: "bank_export",
      label: "تصدير ملف البنك",
      status: !run ? "incomplete" : run.status === "exported" ? "complete" : "review",
      detail: !run ? "لا يوجد مسير" : run.status === "exported" ? "تم التصدير" : "لم يُصدَّر بعد",
      href: "/dashboard/finance/payroll",
    },
    {
      key: "open_pledges",
      label: "تعهدات غير محصلة",
      status: openPledges === 0 ? "complete" : openPledges <= 5 ? "review" : "incomplete",
      detail: openPledges === 0 ? "لا توجد تعهدات غير محصلة" : `${openPledges} تعهدًا غير محصل`,
      href: "/dashboard/pledges",
    },
    {
      key: "monthly_report",
      label: "جاهزية التقرير المالي الشهري",
      status: reportApproved ? "complete" : reportExists ? "review" : "incomplete",
      detail: reportApproved ? "تقرير معتمد" : reportExists ? "تقرير موجود غير معتمد" : "لم يُنشأ تقرير للشهر",
      href: "/dashboard/finance/reports",
    },
  ];

  return { year, month, items };
}

function sumAmounts(rows: Array<{ amount: number | string | null }> | null) {
  return (rows ?? []).reduce((total, row) => total + Number(row.amount ?? 0), 0);
}

function groupMoney(rows: Array<Record<string, unknown>> | null, key: string) {
  const totals = new Map<string, number>();
  for (const row of rows ?? []) {
    const label = String(row[key] ?? "غير محدد") || "غير محدد";
    totals.set(label, (totals.get(label) ?? 0) + Number(row.amount ?? 0));
  }
  return [...totals.entries()]
    .map(([label, value]) => ({ label, value }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}
