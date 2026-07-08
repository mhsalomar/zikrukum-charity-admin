"use client";

import Link from "next/link";
import { CopyPlus, Edit3, FileSpreadsheet, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { CsvExportButton } from "@/components/csv-export-button";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import {
  archivePayrollEmployee,
  cleanupPayrollData,
  cloneLatestPayrollRun,
  createPayrollRun,
  importMonthlyPayrollRun,
  importPayrollWorkbookRuns,
  importPayrollEmployees,
  savePayrollEmployee,
} from "@/app/dashboard/finance/actions";
import { paginate, PaginationControls } from "@/components/pagination-controls";
import type { PayrollEmployee, PayrollRun } from "@/lib/finance";
import { money, payrollRunLabel } from "@/lib/format";

const employeeTypeLabels: Record<string, string> = {
  employee: "موظف",
  teacher: "معلم",
  female_teacher: "معلمة",
  staff: "موظف",
  female_staff: "موظفة",
  supervisor: "مشرف",
};

const statusLabels: Record<string, string> = {
  active: "نشط",
  inactive: "غير نشط",
  on_leave: "إجازة",
  draft: "مسودة",
  approved: "معتمد",
  paid: "مدفوع",
  cancelled: "ملغى",
};

const requiredCsvColumns = [
  "employee_name",
];

const optionalCsvColumns = [
  "employee_type",
  "iban",
  "bank_name",
  "national_id",
  "phone",
  "base_salary",
  "allowances",
  "deductions",
  "notes",
];

export function PayrollManager({
  employees,
  runs,
  canCleanup = false,
}: {
  employees: PayrollEmployee[];
  runs: PayrollRun[];
  canCleanup?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editing, setEditing] = useState<PayrollEmployee | null>(null);
  const [adding, setAdding] = useState(false);
  const [createRunOpen, setCreateRunOpen] = useState(false);
  const [cloneRunOpen, setCloneRunOpen] = useState(false);
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const searchParams = useSearchParams();

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return employees.filter((employee) => {
      const haystack = Object.values(employee).join(" ").toLowerCase();
      return (!normalized || haystack.includes(normalized)) && (!status || status === "all" || employee.status === status);
    });
  }, [employees, query, status]);
  const paginated = paginate(filtered, page, pageSize);
  const missingPayrollData = employees.filter(
    (employee) =>
      employee.status === "active" &&
      (!employee.national_id || !employee.iban || !employee.bank_name || !employee.teacher_id),
  );

  function resetPage() {
    setPage(1);
  }

  return (
    <div className="space-y-5">
      <StatusNotice code={readStatus(searchParams)} />
      <section className="app-card luxury-pattern overflow-hidden rounded-[1.7rem]">
        <div className="relative border-r-4 border-[var(--gold)] p-5 sm:p-7">
          <p className="text-sm font-semibold text-[var(--gold)]">الرواتب</p>
          <div className="mt-2 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--primary-dark)] sm:text-4xl">مسير الرواتب</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
                تجهيز رواتب الموظفين ومسيرات شهرية للمتابعة فقط. لا يوجد تحويل بنكي أو دفع فعلي من داخل النظام.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <CsvExportButton
                filename="كشف-الرواتب"
                label="تصدير كشف الرواتب"
                data={employees.map((e) => ({
                  "الاسم": e.employee_name,
                  "النوع": employeeTypeLabels[e.employee_type] ?? e.employee_type,
                  "الراتب الأساسي": e.base_salary,
                  "البدلات": e.allowances,
                  "الاستقطاعات": e.deductions,
                  "الصافي": e.net_salary ?? e.base_salary + e.allowances - e.deductions,
                  "الآيبان": e.iban ?? "—",
                  "البنك": e.bank_name ?? "—",
                  "الحالة": e.status,
                }))}
              />
              <button type="button" onClick={() => setAdding(true)} className="gold-button inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white">
                <Plus aria-hidden className="size-5" />
                إضافة موظف/معلم للرواتب
              </button>
              <button type="button" onClick={() => setCreateRunOpen(true)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--gold)] bg-[#fff8e6] px-5 text-sm font-semibold text-[var(--primary-dark)]">
                <FileSpreadsheet aria-hidden className="size-5" />
                إنشاء مسير شهر جديد
              </button>
              <button type="button" onClick={() => setCloneRunOpen(true)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--line)] bg-white px-5 text-sm font-semibold text-[var(--primary-dark)]">
                <CopyPlus aria-hidden className="size-5" />
                إنشاء من آخر شهر
              </button>
              {canCleanup ? (
                <button type="button" onClick={() => setCleanupOpen(true)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 text-sm font-semibold text-red-700 hover:border-red-300">
                  <Trash2 aria-hidden className="size-5" />
                  تنظيف بيانات الرواتب التجريبية
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="app-card rounded-[1.5rem] p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-[var(--primary-dark)]">آخر المسيرات</h2>
            <span className="rounded-full bg-[var(--gold-soft)] px-3 py-1 text-xs font-semibold text-[#765514]">{runs.length}</span>
          </div>
          {runs.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-[var(--line)] bg-[#fffdf8] p-4 text-sm font-bold text-[var(--muted)]">
              لا توجد مسيرات رواتب محفوظة بعد.
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              {runs.map((run) => (
                <Link key={run.id} href={`/dashboard/finance/payroll/${payrollRunLabel(run)}`} className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-4 transition hover:border-[var(--gold)]">
                  <div>
                    <p className="font-semibold text-[var(--primary-dark)]">{payrollRunLabel(run)}</p>
                    <p className="mt-1 text-xs font-bold text-[var(--muted)]">{run.total_employees} عملية</p>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-[var(--primary-dark)]">{money(run.total_amount)}</p>
                    <StatusBadge value={run.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="grid gap-4">
          <CsvImportPanel />
          <MonthlyPayrollImportPanel employees={employees} runs={runs} />
        </div>
      </section>

      {missingPayrollData.length > 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-7 text-amber-800">
          يوجد {missingPayrollData.length} سجل رواتب يحتاج مراجعة بيانات:
          {" "}
          {missingPayrollData.slice(0, 5).map((employee) => employee.employee_name).join("، ")}
          {missingPayrollData.length > 5 ? "..." : ""}.
          المطلوب غالبًا: رقم هوية/إقامة، آيبان، بنك، أو ربط بسجل معلم.
        </section>
      ) : null}

      <section className="app-card overflow-hidden rounded-[1.6rem]">
        <div className="grid gap-3 border-b border-[var(--line)] bg-white/72 p-4 md:grid-cols-[1fr_auto]">
          <label className="relative block">
            <span className="sr-only">بحث</span>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                resetPage();
              }}
              placeholder="ابحث باسم الموظف أو الآيبان أو البنك..."
              className="h-12 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 pl-11 text-sm font-semibold outline-none focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--gold)]/15"
            />
            <Search aria-hidden className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--gold)]" />
          </label>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              resetPage();
            }}
            className="h-12 rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 text-sm font-bold text-[var(--primary-dark)] outline-none"
          >
            <option value="">كل الحالات</option>
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
            <option value="all">الكل</option>
            <option value="on_leave">إجازة</option>
          </select>
        </div>

        {employees.length === 0 ? (
          <EmptyState title="لا يوجد موظفو رواتب" description="أضف موظفًا أو استورد ملف البيانات بعد مراجعته." />
        ) : filtered.length === 0 ? (
          <EmptyState title="لا توجد نتائج مطابقة" description="غيّر البحث أو خيار تصفية الحالة." />
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1040px] text-right text-sm">
                <thead className="bg-[#f4f0e6] text-[#31564d]">
                  <tr>
                    <th className="px-5 py-4 font-semibold">الموظف</th>
                    <th className="px-5 py-4 font-semibold">النوع</th>
                    <th className="px-5 py-4 font-semibold">الآيبان</th>
                    <th className="px-5 py-4 font-semibold">البنك</th>
                    <th className="px-5 py-4 font-semibold">الأساسي</th>
                    <th className="px-5 py-4 font-semibold">البدلات</th>
                    <th className="px-5 py-4 font-semibold">الخصومات</th>
                    <th className="px-5 py-4 font-semibold">الصافي</th>
                    <th className="px-5 py-4 font-semibold">الحالة</th>
                    <th className="px-5 py-4 font-semibold">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {paginated.items.map((employee) => (
                    <tr key={employee.id} className="transition hover:bg-[#fbf6ea]">
                      <td className="px-5 py-4 font-semibold text-[var(--primary-dark)]">{employee.employee_name}</td>
                      <td className="px-5 py-4">{employeeTypeLabels[employee.employee_type] ?? employee.employee_type}</td>
                      <td className="px-5 py-4">
                        <div className="grid gap-1">
                          <span>{employee.iban || "—"}</span>
                          <BankReadinessBadge employee={employee} />
                        </div>
                      </td>
                      <td className="px-5 py-4">{employee.bank_name || "غير محدد"}</td>
                      <td className="px-5 py-4">{money(employee.base_salary)}</td>
                      <td className="px-5 py-4">{money(employee.allowances)}</td>
                      <td className="px-5 py-4">{money(employee.deductions)}</td>
                      <td className="px-5 py-4 font-semibold text-[var(--primary-dark)]">{money(computeNet(employee))}</td>
                      <td className="px-5 py-4"><StatusBadge value={employee.status} /></td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <EditButton onClick={() => setEditing(employee)} />
                          {employee.status !== "inactive" ? <ArchiveEmployeeButton employee={employee} /> : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 p-4 lg:hidden">
              {paginated.items.map((employee) => (
                <article key={employee.id} className="resource-mobile-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-[var(--primary-dark)]">{employee.employee_name}</h3>
                      <p className="mt-1 text-xs font-bold text-[var(--muted)]">{employeeTypeLabels[employee.employee_type] ?? employee.employee_type}</p>
                    </div>
                    <StatusBadge value={employee.status} />
                  </div>
                  <div className="mt-4 grid gap-2 text-sm">
                    <Info label="الآيبان" value={employee.iban || "—"} />
                    <Info label="جاهزية البنك" value={bankReadinessLabel(employee)} />
                    <Info label="البنك" value={employee.bank_name || "غير محدد"} />
                    <Info label="الصافي" value={money(computeNet(employee))} strong />
                  </div>
                  <div className="mt-4 border-t border-[var(--line)] pt-3">
                    <div className="flex flex-wrap gap-2">
                      <EditButton onClick={() => setEditing(employee)} />
                      {employee.status !== "inactive" ? <ArchiveEmployeeButton employee={employee} /> : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <PaginationControls
              page={paginated.page}
              pageCount={paginated.pageCount}
              pageSize={pageSize}
              total={filtered.length}
              start={paginated.start}
              end={paginated.end}
              onPageChange={setPage}
              onPageSizeChange={(nextPageSize) => {
                setPageSize(nextPageSize);
                setPage(1);
              }}
            />
          </>
        )}
      </section>

      {adding ? <EmployeeModal title="إضافة موظف/معلم للرواتب" onClose={() => setAdding(false)} /> : null}
      {editing ? <EmployeeModal title="تعديل مستفيد راتب" employee={editing} onClose={() => setEditing(null)} /> : null}
      {createRunOpen ? <CreateRunModal onClose={() => setCreateRunOpen(false)} /> : null}
      {cloneRunOpen ? <CloneRunModal runs={runs} onClose={() => setCloneRunOpen(false)} /> : null}
      {cleanupOpen ? <CleanupPayrollModal employees={employees} runs={runs} onClose={() => setCleanupOpen(false)} /> : null}
    </div>
  );
}

function StatusNotice({ code }: { code: string }) {
  if (!code) return null;
  const messages: Record<string, string> = {
    created: "تم إنشاء السجل بنجاح.",
    updated: "تم تحديث السجل بنجاح.",
    imported: "تم استيراد الموظفين بنجاح.",
    workbook_imported: "تم إنشاء مسيرات ملف المتابعة المالية كمسودات للأشهر غير المكررة.",
    missing: "يرجى تعبئة الحقول المطلوبة.",
    month: "صيغة الشهر غير صحيحة.",
    "no-employees": "لا يوجد موظفون نشطون لإنشاء المسير.",
    "no-run": "لا يوجد مسير سابق صالح للنسخ.",
    "incomplete-run": "آخر المسيرات المحفوظة لا تبدو مكتملة. يرجى استيراد ملف المتابعة المالية أولًا أو اختيار مسير مكتمل.",
    "duplicate-run": "يوجد مسير محفوظ لهذا الشهر مسبقًا.",
    "run-exists": "يوجد مسير لهذا الشهر، راجع صفحة المسير قبل التحديث.",
    "month-import": "يرجى اختيار شهر صحيح لاستيراد المسير.",
    "payroll-import": "تعذر حفظ المسير. راجع أخطاء الصفوف في المعاينة ثم احفظ الصفوف المطابقة فقط.",
    "delete-confirmation": "لم يتم حذف المسير لأن عبارة التأكيد غير صحيحة.",
    "cleanup-confirmation": "لم يتم تنظيف بيانات الرواتب لأن عبارة التأكيد غير صحيحة.",
    "delete-locked": "لا يمكن حذف مسير معتمد أو مدفوع. الحذف متاح للمسودات فقط.",
    delete: "تعذر حذف المسير. تأكد من الصلاحيات وحالة المسير.",
    cleanup: "تعذر تنظيف بيانات الرواتب. تأكد من صلاحية الإدارة وسياسات قاعدة البيانات.",
    csv: "ملف مستفيدي الرواتب يحتاج مراجعة. اسم المستفيد مطلوب، والآيبان اختياري.",
    archived: "تم حذف الموظف من قائمة الرواتب عبر تعطيله دون حذف بياناته.",
    run_deleted: "تم حذف المسير وبنوده بنجاح دون حذف الموظفين أو المعلمين.",
    cleanup_done: "تم تنظيف بيانات الرواتب المحددة فقط دون حذف المعلمين أو الطلاب أو الحلقات أو السجلات المالية.",
    save: "تعذر الحفظ. تأكد من الصلاحيات والبيانات.",
  };
  const success = ["created", "updated", "imported", "workbook_imported", "archived", "run_deleted", "cleanup_done"].includes(code);
  return (
    <p className={`rounded-2xl border p-4 text-sm font-bold ${success ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>
      {messages[code] ?? "حدث خطأ غير متوقع."}
    </p>
  );
}

function readStatus(params: ReturnType<typeof useSearchParams>) {
  if (params.get("created")) return "created";
  if (params.get("updated")) return "updated";
  if (params.get("imported")) return "imported";
  if (params.get("workbook_imported")) return "workbook_imported";
  if (params.get("archived")) return "archived";
  if (params.get("run_deleted")) return "run_deleted";
  if (params.get("cleanup_done")) return "cleanup_done";
  return params.get("error") ?? "";
}

function MonthlyPayrollImportPanel({
  employees,
  runs,
}: {
  employees: PayrollEmployee[];
  runs: PayrollRun[];
}) {
  const [month, setMonth] = useState("");
  const [rows, setRows] = useState<Array<Record<string, string>>>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [readState, setReadState] = useState<"idle" | "reading" | "done" | "error">("idle");
  const [submitError, setSubmitError] = useState("");
  const workbookRows = rows.filter((row) => row.import_source === "followup_workbook");
  const workbookMode = workbookRows.length > 0;
  const summaries = useMemo(() => summarizePayrollRows(workbookRows), [workbookRows]);
  const latestSummary = summaries.at(-1);
  const currentMonth = getCurrentMonthKey();
  const currentDraftRows = latestSummary
    ? rows.filter((row) => row.import_source === "followup_workbook" && row.payroll_month === latestSummary.monthKey)
    : [];
  const monthlySummary = summarizeMonthlyImportRows(rows);
  const previewRows = rows.slice(0, 50);

  async function handleFile(file: File | null) {
    setErrors([]);
    setWarnings([]);
    setSubmitError("");
    setRows([]);
    setFileName(file?.name ?? "");
    setReadState(file ? "reading" : "idle");
    if (!file) return;

    try {
      const parsed =
        file.name.toLowerCase().endsWith(".xlsx") || file.name.toLowerCase().endsWith(".xls")
          ? await parsePayrollWorkbook(file, employees, runs)
          : parsePayrollCsv(await file.text(), employees);

      setErrors(parsed.errors);
      setWarnings(parsed.warnings);
      setRows(parsed.rows);
      setReadState(parsed.errors.length > 0 ? "error" : "done");
    } catch {
      setErrors(["تعذر قراءة الملف. تأكد أن الملف بصيغة جدول صحيحة وغير تالف."]);
      setReadState("error");
    }
  }

  const existingRun = month ? runs.some((run) => payrollRunLabel(run) === month) : false;

  return (
    <div className="app-card rounded-[1.5rem] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--primary-dark)]">استيراد مسير شهري</h2>
          <p className="mt-1 text-xs font-bold text-[var(--muted)]">ملف جدول أو ملف بيانات مع معاينة قبل الحفظ.</p>
        </div>
        <Upload aria-hidden className="size-6 text-[var(--gold)]" />
      </div>
      <div className="mt-4 grid gap-3">
        <label className="block text-sm font-bold text-[var(--text)]">
          الشهر
          <input
            type="month"
            value={month}
            onChange={(event) => {
              setMonth(event.target.value);
              setSubmitError("");
            }}
            className="mt-2 h-12 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 text-sm font-semibold outline-none focus:border-[var(--gold)]"
          />
        </label>
        <FilePicker
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          fileName={fileName}
          readState={readState}
          onFile={(file) => void handleFile(file)}
        />
      </div>
      {warnings.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold leading-6 text-amber-800">
          {warnings.map((warning) => <p key={warning}>{warning}</p>)}
        </div>
      ) : null}
      {errors.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-bold leading-6 text-red-700">
          {errors.map((error) => <p key={error}>{error}</p>)}
        </div>
      ) : null}
      {submitError ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-bold leading-6 text-red-700">
          {submitError}
        </div>
      ) : null}
      {workbookMode && errors.length === 0 ? (
        <div className="mt-4 space-y-4">
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold leading-6 text-emerald-800">
            تمت قراءة شيت الموظفين وشيت المعلمين. لن يتم إنشاء مسير أو موظف جديد إلا من زر الحفظ وبعد مراجعة المطابقة.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {summaries.map((summary) => (
              <div key={summary.monthKey} className="rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-[var(--primary-dark)]">{summary.monthLabel}</p>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${summary.duplicateRows > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-50 text-[var(--primary-dark)]"}`}>
                    {summary.duplicateRows > 0 ? "مكرر" : "جاهز للمراجعة"}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-xs font-bold text-[var(--muted)]">
                  <Info label="المعلمون/المعلمات" value={money(summary.teacherTotal)} />
                  <Info label="الموظفون" value={money(summary.employeeTotal)} />
                  <Info label="إجمالي الشهر" value={money(summary.total)} strong />
                  <Info label="عدد العمليات" value={String(summary.count)} />
                  <Info label="غير المطابقين" value={String(summary.unmatchedRows)} />
                </div>
              </div>
            ))}
          </div>
          <div className="max-h-72 overflow-y-auto rounded-2xl border border-[var(--line)] bg-white">
            <table className="w-full min-w-[780px] text-right text-xs">
              <thead className="sticky top-0 bg-[#f4f0e6] text-[#31564d]">
                <tr>
                  <th className="px-3 py-3 font-semibold">الشهر</th>
                  <th className="px-3 py-3 font-semibold">الاسم</th>
                  <th className="px-3 py-3 font-semibold">المبلغ</th>
                  <th className="px-3 py-3 font-semibold">النوع</th>
                  <th className="px-3 py-3 font-semibold">الملاحظات</th>
                  <th className="px-3 py-3 font-semibold">نتيجة التحويل</th>
                  <th className="px-3 py-3 font-semibold">المطابقة</th>
                  <th className="px-3 py-3 font-semibold">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {rows.map((row, index) => row.import_source === "followup_workbook" ? (
                  <tr key={`${row.payroll_month}-${row.employee_name}-${index}`} className="align-top">
                    <td className="px-3 py-3 font-bold">{row.month_label}</td>
                    <td className="px-3 py-3 font-semibold text-[var(--primary-dark)]">{row.employee_name}</td>
                    <td className="px-3 py-3">{money(Number(row.amount || 0))}</td>
                    <td className="px-3 py-3">{row.person_type_label}</td>
                    <td className="px-3 py-3 text-[var(--muted)]">{row.notes || "—"}</td>
                    <td className="px-3 py-3">{row.transfer_result || "—"}</td>
                    <td className="px-3 py-3"><MatchBadge value={row.match_status} /></td>
                    <td className="px-3 py-3">
                      {row.match_status === "missing" ? (
                        <select
                          value={row.row_action ?? "review"}
                          onChange={(event) => {
                            const nextRows = [...rows];
                            nextRows[index] = { ...nextRows[index], row_action: event.target.value };
                            setRows(nextRows);
                          }}
                          className="h-10 rounded-xl border border-[var(--line)] bg-[#fffdf8] px-3 text-xs font-semibold"
                        >
                          <option value="review">يبقى للمراجعة</option>
                          <option value="add">إضافته بعد الموافقة</option>
                          <option value="ignore">تجاهل الصف</option>
                        </select>
                      ) : row.match_status === "duplicate" ? (
                        <span className="font-bold text-amber-700">لن يتكرر</span>
                      ) : (
                        <span className="font-bold text-emerald-700">يدخل في المسير</span>
                      )}
                    </td>
                  </tr>
                ) : null)}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <form
              action={importPayrollWorkbookRuns}
              onSubmit={(event) => {
                if (!confirm("سيتم إنشاء مسيرات مسودة للأشهر غير الموجودة فقط. الأسماء غير المطابقة تبقى خارج الحفظ إلا إذا اخترت إضافتها صراحة.")) {
                  event.preventDefault();
                }
              }}
            >
              <input type="hidden" name="rows" value={JSON.stringify(rows)} />
              <button className="gold-button min-h-11 w-full rounded-2xl px-5 text-xs font-semibold text-white">
                حفظ المسيرات غير المكررة كمسودة
              </button>
            </form>
            {latestSummary ? (
              <form
                action={importMonthlyPayrollRun}
                onSubmit={(event) => {
                  if (!confirm(`سيتم إنشاء مسير ${formatMonthKey(currentMonth)} كمسودة من آخر شهر في الملف (${latestSummary.monthLabel}).`)) {
                    event.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="payroll_month" value={currentMonth} />
                <input type="hidden" name="rows" value={JSON.stringify(currentDraftRows.map((row) => ({
                  ...row,
                  payroll_month: currentMonth,
                  month_label: formatMonthKey(currentMonth),
                  match_status: row.employee_id ? "matched" : "missing",
                  row_action: row.employee_id ? "match" : "review",
                })))} />
                <input type="hidden" name="update_existing" value="0" />
                <button className="min-h-11 w-full rounded-2xl border border-[var(--gold)] bg-[#fff8e6] px-5 text-xs font-semibold text-[var(--primary-dark)]">
                  إنشاء مسير من آخر شهر
                </button>
              </form>
            ) : null}
          </div>
        </div>
      ) : rows.length > 0 && errors.length === 0 ? (
        <form
          action={importMonthlyPayrollRun}
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            if (!month) {
              event.preventDefault();
              setSubmitError("يرجى اختيار شهر المسير قبل الاستيراد.");
              return;
            }
            setSubmitError("");
            if (existingRun && !confirm("يوجد مسير لهذا الشهر، هل تريد تحديثه؟")) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="payroll_month" value={month} />
          <input type="hidden" name="rows" value={JSON.stringify(rows)} />
          <input type="hidden" name="update_existing" value={existingRun ? "1" : "0"} />
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
            تمت قراءة {rows.length} صف. يمكن حفظ المسير كمسودة حتى لو وُجد مستفيدون ناقصو آيبان، لكن لن يسمح النظام بالتصدير البنكي قبل إكمال الآيبانات.
          </p>
          <div className="grid gap-2 rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-3 text-xs font-bold text-[var(--primary-dark)] sm:grid-cols-3">
            <Info label="الصفوف المقروءة" value={String(monthlySummary.readRows)} />
            <Info label="الصفوف التي ستحفظ" value={String(monthlySummary.savableRows)} />
            <Info label="غير المطابقين" value={String(monthlySummary.unmatchedRows)} />
            <Info label="ناقصو الآيبان" value={String(monthlySummary.missingIbanRows)} />
            <Info label="الإجمالي المتوقع" value={money(monthlySummary.expectedTotal)} strong />
            <Info label="الإجمالي الذي سيحفظ" value={money(monthlySummary.savableTotal)} strong />
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-3 py-2 text-xs font-semibold text-[var(--muted)]">
              <span>معاينة صفوف المسير</span>
              <span>يعرض {previewRows.length} من {rows.length}</span>
            </div>
            <div className="max-h-80 overflow-y-auto">
            {previewRows.map((row, index) => (
              <div key={`${row.employee_name}-${index}`} className="grid gap-2 border-b border-[var(--line)] p-3 text-xs sm:grid-cols-[1fr_auto]">
                <div>
                  <p className="font-semibold text-[var(--primary-dark)]">{row.employee_name}</p>
                  <p className="mt-1 text-[var(--muted)]">{row.iban || "بدون آيبان"} — {money(Number(row.amount || 0))} — {month ? formatMonthKey(month) : "الشهر من اختيارك"}</p>
                  <p className="mt-1 font-semibold text-[var(--primary-dark)]">{payrollImportStatus(row)}</p>
                </div>
                {!row.employee_id ? (
                  <select
                    value={row.row_action ?? "review"}
                    onChange={(event) => {
                      const nextRows = [...rows];
                      nextRows[index] = { ...nextRows[index], row_action: event.target.value };
                      setRows(nextRows);
                    }}
                    className="h-10 rounded-xl border border-[var(--line)] bg-[#fffdf8] px-3 text-xs font-semibold"
                  >
                    <option value="review">يبقى للمراجعة</option>
                    <option value="add">إضافته كمستفيد راتب بعد الموافقة</option>
                    <option value="ignore">تجاهل الصف</option>
                  </select>
                ) : null}
              </div>
            ))}
            </div>
          </div>
          <button className="gold-button h-11 rounded-2xl px-5 text-xs font-semibold text-white">
            حفظ كمسودة
          </button>
        </form>
      ) : null}
    </div>
  );
}

function CsvImportPanel() {
  const [rows, setRows] = useState<Array<Record<string, string>>>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [readState, setReadState] = useState<"idle" | "reading" | "done" | "error">("idle");

  async function handleFile(file: File | null) {
    setErrors([]);
    setWarnings([]);
    setRows([]);
    setFileName(file?.name ?? "");
    setReadState(file ? "reading" : "idle");
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      setErrors(parsed.errors);
      setWarnings(parsed.warnings);
      setRows(parsed.rows);
      setReadState(parsed.errors.length > 0 ? "error" : "done");
    } catch {
      setErrors(["تعذر قراءة الملف. تأكد من صيغة ملف البيانات."]);
      setReadState("error");
    }
  }

  return (
    <div className="app-card rounded-[1.5rem] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--primary-dark)]">استيراد قائمة مستفيدي الرواتب</h2>
          <p className="mt-1 text-xs font-bold text-[var(--muted)]">الآيبان اختياري هنا، ويمكن إكماله لاحقًا قبل التصدير البنكي.</p>
        </div>
        <Upload aria-hidden className="size-6 text-[var(--gold)]" />
      </div>
      <div className="mt-4">
        <FilePicker
          accept=".csv,text/csv"
          fileName={fileName}
          readState={readState}
          onFile={(file) => void handleFile(file)}
        />
      </div>
      <a href="/data/import/employees_payroll.csv" className="mt-3 inline-flex text-xs font-semibold text-[var(--primary-dark)] underline">
        تنزيل قالب ملف البيانات
      </a>
      {warnings.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold leading-6 text-amber-800">
          {warnings.map((warning) => <p key={warning}>{warning}</p>)}
        </div>
      ) : null}
      {errors.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-bold leading-6 text-red-700">
          {errors.map((error) => <p key={error}>{error}</p>)}
        </div>
      ) : null}
      {rows.length > 0 && errors.length === 0 ? (
        <form action={importPayrollEmployees} className="mt-4 space-y-3">
          <input type="hidden" name="rows" value={JSON.stringify(rows)} />
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
            تمت قراءة {rows.length} صف. راجع البيانات ثم احفظها كقائمة مستفيدين.
          </p>
          <div className="grid gap-2 rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-3 text-xs font-bold text-[var(--primary-dark)] sm:grid-cols-3">
            <Info label="الصفوف المقروءة" value={String(rows.length)} />
            <Info label="المعلمون/المعلمات" value={String(rows.filter((row) => ["teacher", "female_teacher"].includes(String(row.employee_type))).length)} />
            <Info label="الموظفون/الموظفات" value={String(rows.filter((row) => ["employee", "staff", "female_staff"].includes(String(row.employee_type))).length)} />
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-3 py-2 text-xs font-semibold text-[var(--muted)]">
              <span>معاينة قائمة المستفيدين</span>
              <span>يعرض {Math.min(rows.length, 50)} من {rows.length}</span>
            </div>
            <div className="max-h-72 overflow-y-auto">
            {rows.slice(0, 50).map((row, index) => (
              <div key={`${row.employee_name}-${index}`} className="border-b border-[var(--line)] p-3 text-xs">
                <p className="font-semibold text-[var(--primary-dark)]">{row.employee_name}</p>
                <p className="mt-1 text-[var(--muted)]">{employeeTypeLabels[row.employee_type] ?? row.employee_type ?? "مستفيد"} — {row.iban || "ناقص آيبان"} — {row.bank_name || "بدون بنك"}</p>
                <p className="mt-1 font-semibold text-[var(--primary-dark)]">{payrollImportStatus(row)}</p>
              </div>
            ))}
            </div>
          </div>
          <button className="gold-button h-11 rounded-2xl px-5 text-xs font-semibold text-white">
            حفظ قائمة المستفيدين
          </button>
        </form>
      ) : null}
    </div>
  );
}

function EmployeeModal({ title, employee, onClose }: { title: string; employee?: PayrollEmployee; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/45 p-3 sm:place-items-center">
      <section className="app-card max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[1.5rem] p-5 sm:p-7">
        <ModalHeader title={title} onClose={onClose} />
        <form action={savePayrollEmployee} className="mt-5 grid gap-4 md:grid-cols-2">
          {employee?.id ? <input type="hidden" name="id" value={employee.id} /> : null}
          <Field name="employee_name" label="اسم المستفيد" value={employee?.employee_name} required />
          <Select name="employee_type" label="نوع المستفيد" value={employee?.employee_type ?? "staff"} options={employeeTypeLabels} />
          <Field name="iban" label="رقم الآيبان" value={employee?.iban} />
          <Field name="bank_name" label="اسم البنك" value={employee?.bank_name} />
          <Field name="national_id" label="رقم الهوية" value={employee?.national_id} />
          <Field name="phone" label="الجوال" value={employee?.phone} />
          <Field name="base_salary" label="الراتب الأساسي" value={employee?.base_salary} type="number" />
          <Field name="allowances" label="البدلات" value={employee?.allowances} type="number" />
          <Field name="deductions" label="الخصومات" value={employee?.deductions} type="number" />
          <Select name="status" label="الحالة" value={employee?.status ?? "active"} options={statusLabels} />
          <label className="block text-sm font-bold text-[var(--text)] md:col-span-2">
            ملاحظات
            <textarea name="notes" defaultValue={employee?.notes ?? ""} rows={3} className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 py-3 text-sm font-semibold outline-none focus:border-[var(--gold)]" />
          </label>
          <div className="md:col-span-2">
            <button className="gold-button h-12 rounded-2xl px-7 text-sm font-semibold text-white">حفظ</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function CreateRunModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/45 p-3 sm:place-items-center">
      <section className="app-card w-full max-w-xl rounded-[1.5rem] p-5 sm:p-7">
        <ModalHeader title="إنشاء مسير شهر جديد" onClose={onClose} />
        <form action={createPayrollRun} className="mt-5 grid gap-4">
          <Field name="payroll_month" label="الشهر" type="month" required />
          <label className="block text-sm font-bold text-[var(--text)]">
            ملاحظات
            <textarea name="notes" rows={3} className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 py-3 text-sm font-semibold outline-none focus:border-[var(--gold)]" />
          </label>
          <p className="rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-3 text-xs font-bold leading-6 text-[var(--muted)]">
            سيتم نسخ رواتب الموظفين النشطين إلى مسير بحالة مسودة، ويمكن تعديل بدلات وخصومات الشهر داخل صفحة المسير.
          </p>
          <button className="gold-button h-12 rounded-2xl px-7 text-sm font-semibold text-white">إنشاء المسير</button>
        </form>
      </section>
    </div>
  );
}

function FilePicker({
  accept,
  fileName,
  readState,
  onFile,
}: {
  accept: string;
  fileName: string;
  readState: "idle" | "reading" | "done" | "error";
  onFile: (file: File | null) => void;
}) {
  const statusText: Record<typeof readState, string> = {
    idle: fileName || "لم يتم اختيار ملف بعد",
    reading: "جارٍ قراءة الملف...",
    done: "تمت قراءة الملف بنجاح",
    error: "تعذر قراءة الملف",
  };

  return (
    <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[#fffdf8] p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--primary-dark)]">{fileName || statusText[readState]}</p>
          {fileName ? <p className="mt-1 text-xs font-bold text-[var(--muted)]">{statusText[readState]}</p> : null}
        </div>
        <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-2xl border border-[var(--gold)] bg-[#fff8e6] px-5 text-sm font-semibold text-[var(--primary-dark)] hover:bg-[#fff2cf]">
          اختيار ملف
          <input
            type="file"
            accept={accept}
            onChange={(event) => onFile(event.target.files?.[0] ?? null)}
            className="sr-only"
          />
        </label>
      </div>
    </div>
  );
}

function CleanupPayrollModal({
  employees,
  runs,
  onClose,
}: {
  employees: PayrollEmployee[];
  runs: PayrollRun[];
  onClose: () => void;
}) {
  const [confirmation, setConfirmation] = useState("");
  const [scope, setScope] = useState("runs_only");
  const itemsCount = runs.reduce((total, run) => total + Number(run.total_employees ?? 0), 0);
  const totalAmount = runs.reduce((total, run) => total + Number(run.total_amount ?? 0), 0);

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/45 p-3 sm:place-items-center">
      <section className="app-card max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[1.5rem] p-5 sm:p-7">
        <ModalHeader title="تنظيف بيانات الرواتب التجريبية" onClose={onClose} />
        <div className="mt-5 grid gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-7 text-red-800">
          <p>سيتم حذف البيانات المحددة من نظام الرواتب فقط.</p>
          <p>لن يتم حذف المعلمين أو الطلاب أو الحلقات أو السجلات المالية العامة أو البرامج أو الفائزين.</p>
          <div className="grid gap-2 rounded-2xl bg-white/75 p-3 text-[var(--primary-dark)] sm:grid-cols-2">
            <Info label="عدد المسيرات" value={String(runs.length)} />
            <Info label="عدد بنود المسيرات" value={String(itemsCount)} />
            <Info label="مستفيدو الرواتب" value={String(employees.length)} />
            <Info label="إجمالي المسيرات" value={money(totalAmount)} />
          </div>
        </div>
        <form action={cleanupPayrollData} className="mt-5 grid gap-4">
          <label className="block text-sm font-bold text-[var(--text)]">
            نطاق التنظيف
            <select
              name="scope"
              value={scope}
              onChange={(event) => setScope(event.target.value)}
              className="mt-2 h-12 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 text-sm font-semibold outline-none focus:border-red-300"
            >
              <option value="runs_only">حذف المسيرات فقط</option>
              <option value="runs_and_employees">حذف المسيرات وقائمة مستفيدي الرواتب</option>
            </select>
          </label>
          <label className="block text-sm font-bold text-[var(--text)]">
            اكتب عبارة التأكيد: حذف بيانات الرواتب
            <input
              name="confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className="mt-2 h-12 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 text-sm font-semibold outline-none focus:border-red-300 focus:ring-4 focus:ring-red-100"
            />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="submit" disabled={confirmation !== "حذف بيانات الرواتب"} className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-red-700 px-7 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">
              تنفيذ التنظيف
            </button>
            <button type="button" onClick={onClose} className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-7 text-sm font-semibold text-[var(--primary-dark)]">
              إلغاء
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function CloneRunModal({ runs, onClose }: { runs: PayrollRun[]; onClose: () => void }) {
  const latestSavedRun = runs[0];
  const latestLooksIncomplete = latestSavedRun
    ? Number(latestSavedRun.total_employees ?? 0) < 10 || Number(latestSavedRun.total_amount ?? 0) < 20000
    : false;
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/45 p-3 sm:place-items-center">
      <section className="app-card w-full max-w-xl rounded-[1.5rem] p-5 sm:p-7">
        <ModalHeader title="إنشاء مسير من آخر شهر" onClose={onClose} />
        <form action={cloneLatestPayrollRun} className="mt-5 grid gap-4">
          <Field name="payroll_month" label="الشهر الجديد" type="month" required />
          <label className="block text-sm font-bold text-[var(--text)]">
            ملاحظات
            <textarea name="notes" rows={3} className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 py-3 text-sm font-semibold outline-none focus:border-[var(--gold)]" />
          </label>
          <p className="rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-3 text-xs font-bold leading-6 text-[var(--muted)]">
            سيتم نسخ آخر مسير مكتمل محفوظ قبل الشهر الجديد بحالة مسودة، دون تكرار إذا كان الشهر موجودًا.
          </p>
          {latestLooksIncomplete ? (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold leading-6 text-amber-800">
              آخر مسير ظاهر لا يبدو مكتملًا. يرجى استيراد ملف المتابعة المالية أولًا أو حذف المسير الناقص ثم إنشاء المسودة من آخر مسير مكتمل.
            </p>
          ) : null}
          <button className="gold-button h-12 rounded-2xl px-7 text-sm font-semibold text-white">إنشاء من آخر شهر</button>
        </form>
      </section>
    </div>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-semibold text-[var(--gold)]">إجراء آمن</p>
        <h2 className="mt-1 text-xl font-bold text-[var(--primary-dark)]">{title}</h2>
      </div>
      <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-2xl border border-[var(--line)] bg-[#fffdf8]" aria-label="إغلاق">
        <X aria-hidden className="size-5" />
      </button>
    </div>
  );
}

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[#fffdf8] px-3 text-xs font-semibold text-[var(--primary-dark)] hover:border-[var(--gold)]">
      <Edit3 aria-hidden className="size-4" />
      تعديل
    </button>
  );
}

function ArchiveEmployeeButton({ employee }: { employee: PayrollEmployee }) {
  return (
    <form
      action={archivePayrollEmployee}
      onSubmit={(event) => {
        if (!confirm("هل أنت متأكد من حذف هذا الموظف من قائمة الرواتب؟ لن يظهر في المسيرات الجديدة، لكن ستبقى بيانات المسيرات السابقة محفوظة.")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={employee.id} />
      <input type="hidden" name="notes" value={employee.notes ?? ""} />
      <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 hover:border-red-300">
        <Trash2 aria-hidden className="size-4" />
        حذف
      </button>
    </form>
  );
}

function StatusBadge({ value }: { value: string }) {
  return <span className="inline-flex rounded-full bg-[#e8f5ee] px-3 py-1 text-xs font-semibold text-[var(--primary-dark)]">{statusLabels[value] ?? value}</span>;
}

function BankReadinessBadge({ employee }: { employee: PayrollEmployee }) {
  const label = bankReadinessLabel(employee);
  const ready = label === "مكتمل";
  const invalid = label === "آيبان غير صحيح";
  return (
    <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold ${ready ? "bg-emerald-50 text-emerald-800" : invalid ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"}`}>
      {label}
    </span>
  );
}

function bankReadinessLabel(employee: PayrollEmployee) {
  if (!employee.iban) return "ناقص آيبان";
  if (!isValidSaudiIban(employee.iban)) return "آيبان غير صحيح";
  if (!employee.bank_name) return "ناقص بنك";
  return "مكتمل";
}

function MatchBadge({ value }: { value?: string }) {
  const labels: Record<string, string> = {
    matched: "مطابق",
    missing: "غير موجود — يحتاج مراجعة",
    duplicate: "مكرر",
  };
  const classes: Record<string, string> = {
    matched: "bg-emerald-50 text-emerald-800",
    missing: "bg-red-50 text-red-700",
    duplicate: "bg-amber-50 text-amber-800",
  };
  const key = value || "missing";
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${classes[key] ?? classes.missing}`}>{labels[key] ?? "غير موجود"}</span>;
}

function Info({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-bold text-[#81928b]">{label}</span>
      <span className={strong ? "font-semibold text-[var(--primary-dark)]" : "font-bold text-[var(--text)]"}>{value}</span>
    </div>
  );
}

function Field({ name, label, value, type = "text", required = false }: { name: string; label: string; value?: unknown; type?: string; required?: boolean }) {
  return (
    <label className="block text-sm font-bold text-[var(--text)]">
      {label}
      {required ? <span className="text-[var(--danger)]"> *</span> : null}
      <input name={name} type={type} defaultValue={String(value ?? "")} required={required} step={type === "number" ? "0.01" : undefined} className="mt-2 h-12 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 text-sm font-semibold outline-none focus:border-[var(--gold)]" />
    </label>
  );
}

function Select({ name, label, value, options }: { name: string; label: string; value: string; options: Record<string, string> }) {
  return (
    <label className="block text-sm font-bold text-[var(--text)]">
      {label}
      <select name={name} defaultValue={value} className="mt-2 h-12 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 text-sm font-semibold outline-none focus:border-[var(--gold)]">
        {Object.entries(options).map(([optionValue, label]) => (
          <option key={optionValue} value={optionValue}>{label}</option>
        ))}
      </select>
    </label>
  );
}

function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="p-8 text-center">
      <p className="text-base font-semibold text-[var(--primary-dark)]">{title}</p>
      {description ? <p className="mt-2 text-sm font-semibold text-[var(--muted)]">{description}</p> : null}
    </div>
  );
}

function computeNet(employee: PayrollEmployee) {
  return Number(employee.net_salary ?? 0) || Number(employee.base_salary ?? 0) + Number(employee.allowances ?? 0) - Number(employee.deductions ?? 0);
}

function normalizeIban(value: string) {
  return value.replace(/\s+/g, "").trim().toUpperCase();
}

function isValidSaudiIban(value: string) {
  return /^SA[A-Z0-9]{22}$/.test(normalizeIban(value));
}

function payrollImportStatus(row: Record<string, string>) {
  if (!row.employee_name) return "يحتاج مراجعة";
  if (!row.employee_id) return "الاسم غير موجود";
  if (!row.iban) return "ناقص آيبان";
  if (!isValidSaudiIban(row.iban)) return "آيبان غير صحيح";
  if (row.match_status === "duplicate") return "مكرر";
  return "جاهز";
}

function summarizeMonthlyImportRows(rows: Array<Record<string, string>>) {
  return rows.reduce(
    (summary, row) => {
      const amount = Number(row.amount || 0);
      const willSave = !["ignore", "review"].includes(String(row.row_action ?? "review"));
      const iban = normalizeIban(row.iban ?? "");
      summary.readRows += 1;
      summary.expectedTotal += Number.isFinite(amount) ? amount : 0;
      if (willSave) {
        summary.savableRows += 1;
        summary.savableTotal += Number.isFinite(amount) ? amount : 0;
      }
      if (!row.employee_id) summary.unmatchedRows += 1;
      if (!iban || !isValidSaudiIban(iban)) summary.missingIbanRows += 1;
      return summary;
    },
    {
      readRows: 0,
      savableRows: 0,
      unmatchedRows: 0,
      missingIbanRows: 0,
      expectedTotal: 0,
      savableTotal: 0,
    },
  );
}

function importColumnLabel(column: string) {
  const labels: Record<string, string> = {
    employee_name: "اسم المستفيد",
    employee_type: "نوع المستفيد",
    iban: "الآيبان",
    bank_name: "اسم البنك",
    national_id: "رقم الهوية",
    phone: "الجوال",
    base_salary: "الراتب الأساسي",
    allowances: "البدلات",
    deductions: "الخصومات",
    notes: "الملاحظات",
  };
  return labels[column] ?? column;
}

function parseCsv(content: string) {
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) {
    return { rows: [] as Array<Record<string, string>>, errors: ["الملف لا يحتوي على بيانات."], warnings: [] as string[] };
  }
  const headers = splitCsvLine(lines[0]).map((header) => header.trim());
  const missing = requiredCsvColumns.filter((column) => !headers.includes(column));
  if (missing.length > 0) {
    return { rows: [] as Array<Record<string, string>>, errors: [`الأعمدة الناقصة: ${missing.map(importColumnLabel).join("، ")}`], warnings: [] as string[] };
  }
  const optionalMissing = optionalCsvColumns.filter((column) => !headers.includes(column));
  const rows = lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index]?.trim() ?? ""]));
  });
  const errors: string[] = [];
  const warnings: string[] = [];
  if (optionalMissing.length > 0) {
    warnings.push(`أعمدة اختيارية غير موجودة وسيتم تجاهلها: ${optionalMissing.map(importColumnLabel).join("، ")}`);
  }
  rows.forEach((row, index) => {
    const iban = normalizeIban(row.iban ?? "");
    if (!row.employee_name) errors.push(`السطر ${index + 2}: اسم المستفيد مطلوب.`);
    if (!iban) warnings.push(`السطر ${index + 2}: ناقص آيبان، ويمكن إكماله لاحقًا.`);
    if (iban && !isValidSaudiIban(iban)) warnings.push(`السطر ${index + 2}: آيبان غير صحيح، لن يُحفظ في بيانات المستفيد.`);
  });
  return { rows, errors, warnings };
}

async function parsePayrollWorkbook(file: File, employees: PayrollEmployee[], runs: PayrollRun[]) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const followupRows = parseFollowupWorkbook(workbook, employees, runs);
  if (followupRows.rows.length > 0 || followupRows.errors.length > 0) {
    return followupRows;
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return { rows: [] as Array<Record<string, string>>, errors: ["لا توجد ورقة عمل داخل الملف."], warnings: [] as string[] };
  }

  const headers = (worksheet.getRow(1).values as unknown[])
    .slice(1)
    .map((value) => String(value ?? "").trim());
  const bodyRows: string[][] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    bodyRows.push((row.values as unknown[]).slice(1).map((value) => String(value ?? "").trim()));
  });

  return mapPayrollRows(headers, bodyRows, employees);
}

function parsePayrollCsv(content: string, employees: PayrollEmployee[]) {
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) {
    return { rows: [] as Array<Record<string, string>>, errors: ["الملف لا يحتوي على بيانات."], warnings: [] as string[] };
  }
  const headers = splitCsvLine(lines[0]).map((header) => header.trim());
  const bodyRows = lines.slice(1).map(splitCsvLine);
  return mapPayrollRows(headers, bodyRows, employees);
}

function mapPayrollRows(headers: string[], bodyRows: string[][], employees: PayrollEmployee[]) {
  const mapping = inferPayrollMapping(headers);
  const errors: string[] = [];
  const warnings: string[] = [`المطابقة المقترحة: الاسم=${mapping.employee_name ? "موجود" : "غير معروف"}، الآيبان=${mapping.iban ? "موجود" : "غير موجود في الملف"}، المبلغ=${mapping.amount ? "موجود" : "غير معروف"}.`];

  if (!mapping.employee_name || !mapping.amount) {
    errors.push("لم أستطع تحديد أعمدة الاسم والمبلغ. عدّل الملف أو استخدم عناوين واضحة مثل: اسم المستفيد، المبلغ.");
  }

  if (!mapping.iban) {
    warnings.push("لم يتم العثور على عمود الآيبان. هذا لا يمنع حفظ المسير كمسودة، لكنه يمنع التصدير البنكي حتى إكمال الآيبانات.");
  }

  const byIban = new Map(employees.filter((employee) => employee.iban).map((employee) => [employee.iban!.toUpperCase(), employee]));
  const byName = new Map(employees.map((employee) => [employee.employee_name.trim(), employee]));
  const rows = bodyRows.map((cells) => {
    const record = Object.fromEntries(headers.map((header, index) => [header, cells[index]?.trim() ?? ""]));
    const employeeName = String(record[mapping.employee_name ?? ""] ?? "").trim();
    const iban = normalizeIban(String(record[mapping.iban ?? ""] ?? ""));
    const amount = String(record[mapping.amount ?? ""] ?? "0").replace(/[^\d.-]/g, "");
    const bankName = String(record[mapping.bank_name ?? ""] ?? "").trim();
    const notes = String(record[mapping.notes ?? ""] ?? "").trim();
    const employee = (iban && isValidSaudiIban(iban) ? byIban.get(iban) : undefined) ?? byName.get(employeeName);
    const rowStatus = !employeeName
      ? "needs_review"
      : !employee
        ? "missing_employee"
        : !iban
          ? "missing_iban"
          : !isValidSaudiIban(iban)
            ? "invalid_iban"
            : "ready";

    return {
      employee_name: employeeName,
      iban,
      bank_name: bankName,
      amount,
      notes,
      employee_id: employee?.id ?? "",
      match_status: employee ? "matched" : "missing",
      row_action: employee ? "match" : "review",
      row_status: rowStatus,
    };
  }).filter((row) => row.employee_name || row.iban || row.amount);

  rows.forEach((row, index) => {
    if (!row.employee_name) warnings.push(`السطر ${index + 2}: اسم المستفيد مطلوب ولن يحفظ حتى يراجع.`);
    if (!row.iban) warnings.push(`السطر ${index + 2}: ناقص آيبان، يمكن حفظ المسير كمسودة فقط.`);
    if (row.iban && !isValidSaudiIban(row.iban)) warnings.push(`السطر ${index + 2}: آيبان غير صحيح، لن يستخدم للتصدير البنكي.`);
    if (Number(row.amount) < 0 || Number.isNaN(Number(row.amount))) errors.push(`السطر ${index + 2}: المبلغ غير صحيح.`);
  });

  return { rows, errors, warnings };
}

function parseFollowupWorkbook(workbook: { worksheets: Array<{ name: string; eachRow: (callback: (row: { values: unknown[] | Record<string, unknown> }, rowNumber: number) => void) => void }> }, employees: PayrollEmployee[], runs: PayrollRun[]) {
  const employeeSheet = workbook.worksheets.find((sheet) => sheet.name.trim() === "حوالات الموظفين");
  const teacherSheet = workbook.worksheets.find((sheet) => sheet.name.trim() === "حوالات المعلمين وكشوفهم");
  const errors: string[] = [];
  const warnings: string[] = [];
  const rows: Array<Record<string, string>> = [];
  if (!employeeSheet && !teacherSheet) {
    return { rows, errors, warnings };
  }
  if (!employeeSheet) errors.push("لم يتم العثور على شيت حوالات الموظفين.");
  if (!teacherSheet) errors.push("لم يتم العثور على شيت حوالات المعلمين وكشوفهم.");

  const employeesByName = new Map(employees.map((employee) => [normalizeArabicName(employee.employee_name), employee]));
  const existingRunMonths = new Set(runs.map((run) => payrollRunLabel(run)));

  if (employeeSheet) {
    employeeSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const values = readRowValues(row.values);
      const monthInfo = parsePayrollMonth(values[0]);
      const name = cleanText(values[1]);
      const amount = parseAmount(values[2]);
      if (!monthInfo || !name || amount <= 0) return;
      const employee = employeesByName.get(normalizeArabicName(name));
      rows.push(buildFollowupRow({
        monthInfo,
        name,
        amount,
        notes: cleanText(values[3]),
        transferResult: cleanText(values[4]),
        employee,
        personType: "staff",
        personTypeLabel: "موظف",
        sourceSheet: "حوالات الموظفين",
        duplicate: existingRunMonths.has(monthInfo.key),
      }));
    });
  }

  if (teacherSheet) {
    teacherSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const values = readRowValues(row.values);
      const monthInfo = parsePayrollMonth(values[1]);
      const name = cleanText(values[2]);
      const amount = parseAmount(values[4]);
      if (!monthInfo || !name || amount <= 0) return;
      const employee = employeesByName.get(normalizeArabicName(name));
      const site = cleanText(values[3]);
      const notes = [site ? `الموقع: ${site}` : "", cleanText(values[6])].filter(Boolean).join(" — ");
      rows.push(buildFollowupRow({
        monthInfo,
        name,
        amount,
        notes,
        transferResult: cleanText(values[7]),
        employee,
        personType: "teacher",
        personTypeLabel: "معلم/معلمة",
        sourceSheet: "حوالات المعلمين وكشوفهم",
        duplicate: existingRunMonths.has(monthInfo.key),
      }));
    });
  }

  if (rows.length === 0 && errors.length === 0) {
    errors.push("تم العثور على الشيتات، لكن لم أجد صفوف رواتب صالحة داخلها.");
  }

  const summaries = summarizePayrollRows(rows);
  const summaryText = summaries.map((summary) => `${summary.monthLabel}: ${money(summary.total)} (${summary.count} عملية)`).join("، ");
  warnings.push(`ملخص الملف: ${summaryText}`);
  const unmatched = rows.filter((row) => row.match_status === "missing").length;
  if (unmatched > 0) {
    warnings.push(`يوجد ${unmatched} اسم غير مطابق؛ سيبقى للمراجعة ولن يُنشأ تلقائيًا إلا إذا اخترت إضافته صراحة.`);
  }

  return { rows, errors, warnings };
}

function buildFollowupRow({
  monthInfo,
  name,
  amount,
  notes,
  transferResult,
  employee,
  personType,
  personTypeLabel,
  sourceSheet,
  duplicate,
}: {
  monthInfo: { key: string; label: string };
  name: string;
  amount: number;
  notes: string;
  transferResult: string;
  employee?: PayrollEmployee;
  personType: string;
  personTypeLabel: string;
  sourceSheet: string;
  duplicate: boolean;
}) {
  const matchStatus = duplicate ? "duplicate" : employee ? "matched" : "missing";
  return {
    import_source: "followup_workbook",
    source_sheet: sourceSheet,
    payroll_month: monthInfo.key,
    month_label: monthInfo.label,
    employee_name: name,
    employee_type: personType,
    person_type_label: personTypeLabel,
    person_kind: personType,
    amount: String(amount),
    bank_name: employee?.bank_name ?? "",
    iban: employee?.iban ?? "",
    notes,
    transfer_result: transferResult,
    employee_id: employee?.id ?? "",
    match_status: matchStatus,
    row_action: matchStatus === "matched" ? "match" : "review",
  };
}

function summarizePayrollRows(rows: Array<Record<string, string>>) {
  const byMonth = new Map<string, {
    monthKey: string;
    monthLabel: string;
    teacherTotal: number;
    employeeTotal: number;
    total: number;
    count: number;
    unmatchedRows: number;
    duplicateRows: number;
  }>();
  for (const row of rows) {
    const monthKey = row.payroll_month;
    if (!monthKey) continue;
    const current = byMonth.get(monthKey) ?? {
      monthKey,
      monthLabel: row.month_label || formatMonthKey(monthKey),
      teacherTotal: 0,
      employeeTotal: 0,
      total: 0,
      count: 0,
      unmatchedRows: 0,
      duplicateRows: 0,
    };
    const amount = Number(row.amount || 0);
    if (row.person_kind === "teacher") current.teacherTotal += amount;
    else current.employeeTotal += amount;
    current.total += amount;
    current.count += 1;
    if (row.match_status === "missing") current.unmatchedRows += 1;
    if (row.match_status === "duplicate") current.duplicateRows += 1;
    byMonth.set(monthKey, current);
  }
  return [...byMonth.values()].sort((a, b) => a.monthKey.localeCompare(b.monthKey));
}

function readRowValues(values: unknown[] | Record<string, unknown>) {
  const rowValues = Array.isArray(values) ? values : Object.values(values);
  return rowValues.slice(1).map(readCellValue);
}

function readCellValue(value: unknown) {
  if (value && typeof value === "object" && "text" in value) return String((value as { text?: unknown }).text ?? "");
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value ?? "").trim();
}

function cleanText(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function parseAmount(value: unknown) {
  const cleaned = String(value ?? "").replace(/[^\d.-]/g, "");
  return Number(cleaned || 0);
}

function parsePayrollMonth(value: unknown) {
  const raw = cleanText(value).replace(/[إأآ]/g, "ا").replace(/ى/g, "ي");
  if (!raw) return null;
  const monthMap: Record<string, number> = {
    اكتوبر: 10,
    أكتوبر: 10,
    نوفمبر: 11,
    ديسمبر: 12,
    يناير: 1,
    فبراير: 2,
    مارس: 3,
    ابريل: 4,
    أبريل: 4,
    مايو: 5,
  };
  const monthName = Object.keys(monthMap).find((name) => raw.includes(name));
  if (!monthName) return null;
  const month = monthMap[monthName];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNumber = now.getMonth() + 1;
  const year = month >= 10 && currentMonthNumber <= 6 ? currentYear - 1 : currentYear;
  const key = `${year}-${String(month).padStart(2, "0")}`;
  return { key, label: `${arabicMonthLabel(month)} ${year}` };
}

function arabicMonthLabel(month: number) {
  const labels: Record<number, string> = {
    1: "يناير",
    2: "فبراير",
    3: "مارس",
    4: "أبريل",
    5: "مايو",
    10: "أكتوبر",
    11: "نوفمبر",
    12: "ديسمبر",
  };
  return labels[month] ?? String(month);
}

function formatMonthKey(monthKey: string) {
  const [year, month] = monthKey.split("-");
  return `${arabicMonthLabel(Number(month))} ${year}`;
}

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function normalizeArabicName(value: string) {
  return value
    .replace(/[إأآا]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/\s+/g, "")
    .trim()
    .toLowerCase();
}

function inferPayrollMapping(headers: string[]) {
  return {
    employee_name: findHeader(headers, ["employee_name", "اسم الموظف", "الموظف", "name"]),
    iban: findHeader(headers, ["iban", "رقم iban", "رقم الآيبان", "رقم الايبان", "رقم IBAN"]),
    amount: findHeader(headers, ["amount", "المبلغ", "الصافي", "net_salary", "الراتب"]),
    bank_name: findHeader(headers, ["bank_name", "اسم البنك", "البنك"]),
    notes: findHeader(headers, ["notes", "ملاحظة", "ملاحظات"]),
  };
}

function findHeader(headers: string[], candidates: string[]) {
  const normalizedCandidates = candidates.map(normalizeHeader);
  return headers.find((header) => normalizedCandidates.includes(normalizeHeader(header)));
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function splitCsvLine(line: string) {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
