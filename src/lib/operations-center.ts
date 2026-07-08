import {
  getFollowupAlertsData,
  getLaunchReadinessData,
  type Severity,
} from "@/lib/launch-readiness";
import { getPendingStudentRequestCount } from "@/lib/student-requests";
import { getTaskOperationsSummary } from "@/lib/internal-tasks";
import { createClient } from "@/lib/supabase/server";

export type OperationsTask = {
  key: string;
  title: string;
  count: number;
  severity: Severity;
  href: string;
  description: string;
  area: string;
};

export type OperationsCenterData = {
  criticalCount: number;
  warningCount: number;
  stableCount: number;
  tasks: OperationsTask[];
  quickWins: OperationsTask[];
  internalTasks: {
    newCount: number;
    overdueCount: number;
    completedTodayCount: number;
    notCompletedCount: number;
  };
};

export async function getOperationsCenterData(): Promise<OperationsCenterData> {
  const supabase = await createClient();
  const [readiness, followups, invitations, payroll, winners, pendingStudentRequests, internalTasks] = await Promise.all([
    getLaunchReadinessData(),
    getFollowupAlertsData(),
    getInvitationTasks(supabase),
    getPayrollTasks(supabase),
    getWinnerTasks(supabase),
    getPendingStudentRequestCount(),
    getTaskOperationsSummary(),
  ]);

  const tasks = [
    ...readiness.readinessItems.map((item) => ({
      ...item,
      area: "جاهزية التشغيل",
    })),
    ...followups.followups.map((item) => ({
      ...item,
      area: "متابعة التعليم",
    })),
    ...invitations,
    ...payroll,
    ...winners,
    task(
      "student-change-requests",
      "طلبات طلاب بانتظار الاعتماد",
      pendingStudentRequests,
      "high",
      "/dashboard/student-requests",
      "طلبات إضافة أو تعديل أو نقل أرسلها المعلمون وتحتاج قرارًا واضحًا.",
      "الحلقات والطلاب",
    ),
    {
      key: "donor-upcoming-actions",
      title: "متابعات مانحين خلال 7 أيام",
      count: readiness.donorPipeline.upcomingActions,
      severity: "medium" as const,
      href: "/dashboard/donors",
      description: "إجراءات قادمة تحتاج ترتيب التواصل مع المانحين.",
      area: "المانحون",
    },
    {
      key: "donor-open-pledges",
      title: "تعهدات تحتاج متابعة",
      count: readiness.donorPipeline.openPledges,
      severity: "medium" as const,
      href: "/dashboard/pledges",
      description: "تعهدات مفتوحة أو متأخرة تحتاج متابعة تحصيل.",
      area: "المانحون",
    },
  ];

  const deduped = dedupeTasks(tasks)
    .filter((task) => task.count > 0)
    .sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity) || b.count - a.count);

  const criticalCount = deduped.filter((task) => task.severity === "high").length;
  const warningCount = deduped.filter((task) => task.severity === "medium").length;
  const stableCount = deduped.filter((task) => task.severity === "low").length;

  return {
    criticalCount,
    warningCount,
    stableCount,
    tasks: deduped,
    quickWins: deduped.filter((task) => task.severity !== "high").slice(0, 6),
    internalTasks,
  };
}

async function getInvitationTasks(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase
    .from("user_onboarding_requests")
    .select("id,email,auth_status,invited_at,archived_at")
    .is("archived_at", null)
    .limit(500);

  if (error) return [];

  const rows = data ?? [];
  const missingEmail = rows.filter((row) => !row.email).length;
  const pendingPassword = rows.filter((row) => row.auth_status === "auth_created" && row.email).length;
  const needsLinking = rows.filter((row) => row.auth_status && !["linked", "auth_created", "manual_auth_required"].includes(String(row.auth_status))).length;
  const notInvited = rows.filter((row) => row.email && !row.invited_at && row.auth_status !== "linked").length;

  return [
    task("users-missing-email", "مستخدمون ناقصو البريد", missingEmail, "high", "/dashboard/users", "لا يمكن إرسال دعوة قبل إكمال البريد.", "المستخدمون"),
    task("users-pending-password", "دعوات بانتظار إنشاء كلمة المرور", pendingPassword, "medium", "/dashboard/settings/invitations", "حسابات أُرسلت لها الدعوة ولم تستكمل الدخول بعد.", "المستخدمون"),
    task("users-not-invited", "مستخدمون جاهزون بلا دعوة", notInvited, "medium", "/dashboard/settings/invitations", "سجلات لها بريد ولم ترسل لها دعوة بعد.", "المستخدمون"),
    task("users-needs-linking", "حسابات تحتاج ربط داخلي", needsLinking, "high", "/dashboard/settings/invitations", "حساب الدخول موجود لكن يحتاج ربطًا بسجل الشخص ودوره.", "المستخدمون"),
  ];
}

async function getPayrollTasks(supabase: Awaited<ReturnType<typeof createClient>>) {
  const [employees, runs] = await Promise.all([
    supabase
      .from("employees_payroll")
      .select("id,iban,bank_name,status")
      .is("archived_at", null)
      .limit(1000),
    supabase
      .from("payroll_runs")
      .select("id,status,total_amount,total_employees")
      .neq("status", "cancelled")
      .limit(100),
  ]);

  const employeeRows = employees.data ?? [];
  const runRows = runs.data ?? [];
  const missingBank = employeeRows.filter((row) => row.status !== "inactive" && (!row.iban || !row.bank_name)).length;
  const draftRuns = runRows.filter((row) => row.status === "draft").length;
  const smallDraftRuns = runRows.filter((row) => row.status === "draft" && Number(row.total_employees ?? 0) > 0 && Number(row.total_employees ?? 0) < 10).length;

  return [
    task("payroll-missing-bank", "مستفيدو رواتب ناقصو الآيبان", missingBank, "high", "/dashboard/finance/payroll", "لا يمكن تجهيز ملف التحويل قبل إكمال الآيبان والبنك.", "الرواتب"),
    task("payroll-draft-runs", "مسيرات رواتب مسودة", draftRuns, "medium", "/dashboard/finance/payroll", "مسيرات تحتاج مراجعة واعتماد قبل التصدير البنكي.", "الرواتب"),
    task("payroll-small-drafts", "مسيرات مسودة تبدو ناقصة", smallDraftRuns, "high", "/dashboard/finance/payroll", "عدد البنود قليل مقارنة بالمسيرات المعتادة ويحتاج مراجعة.", "الرواتب"),
  ];
}

async function getWinnerTasks(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase
    .from("program_winners")
    .select("id,prize_amount,transfer_status,iban,national_id")
    .is("archived_at", null)
    .limit(1000);

  if (error) return [];

  const rows = data ?? [];
  const missingAmounts = rows.filter((row) => Number(row.prize_amount ?? 0) <= 0).length;
  const readyNotPaid = rows.filter((row) => ["ready", "exported"].includes(String(row.transfer_status ?? ""))).length;
  const missingTransferData = rows.filter((row) => Number(row.prize_amount ?? 0) > 0 && (!row.iban || !row.national_id)).length;

  return [
    task("winners-missing-amounts", "فائزون ناقصو المبالغ", missingAmounts, "high", "/dashboard/programs", "لا يمكن تجهيز التحويل قبل إدخال مبالغ الجوائز.", "الفائزون"),
    task("winners-ready-not-paid", "جوائز جاهزة لم تكتمل", readyNotPaid, "medium", "/dashboard/programs", "التصدير لا يعني التحويل؛ راجع الحالة بعد التنفيذ.", "الفائزون"),
    task("winners-missing-transfer-data", "فائزون ناقصو بيانات التحويل", missingTransferData, "medium", "/dashboard/programs", "تأكد من الآيبان والهوية قبل تجهيز ملف التحويل.", "الفائزون"),
  ];
}

function task(
  key: string,
  title: string,
  count: number,
  severity: Severity,
  href: string,
  description: string,
  area: string,
): OperationsTask {
  return { key, title, count, severity, href, description, area };
}

function dedupeTasks(tasks: OperationsTask[]) {
  const seen = new Map<string, OperationsTask>();
  for (const task of tasks) {
    const current = seen.get(task.key);
    if (!current || task.count > current.count) {
      seen.set(task.key, task);
    }
  }
  return [...seen.values()];
}

function severityWeight(severity: Severity) {
  return { high: 3, medium: 2, low: 1 }[severity];
}
