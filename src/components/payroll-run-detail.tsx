"use client";

import { CheckCircle2, Download, Edit3, ShieldCheck, Trash2, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import {
  approvePayrollRun,
  auditPayrollRun,
  deletePayrollRun,
  removePayrollRunItem,
  updatePayrollRunItem,
} from "@/app/dashboard/finance/actions";
import type { PayrollRun, PayrollRunItem } from "@/lib/finance";
import { money, payrollRunLabel } from "@/lib/format";

const paymentStatusLabels: Record<string, string> = {
  pending: "بانتظار",
  paid: "مدفوع",
  failed: "متعثر",
};

const runStatusLabels: Record<string, string> = {
  draft: "مسودة",
  approved: "معتمد",
  paid: "مدفوع",
  cancelled: "ملغى",
};

export function PayrollRunDetail({ run, items, canDelete = false }: { run: PayrollRun; items: PayrollRunItem[]; canDelete?: boolean }) {
  const [editing, setEditing] = useState<PayrollRunItem | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [exportError, setExportError] = useState("");
  const searchParams = useSearchParams();
  const monthLabel = payrollRunLabel(run);
  const imported = searchParams.get("imported") === "1";
  const activeItems = items.filter((item) => item.payment_status !== "failed" && item.employees_payroll);
  const importStats = imported
    ? {
        read: searchParams.get("read") ?? String(items.length),
        expected: searchParams.get("expected") ?? String(items.length),
        saved: searchParams.get("saved") ?? String(items.length),
        unmatched: searchParams.get("unmatched") ?? "0",
        missingIban: searchParams.get("missing_iban") ?? "0",
        expectedTotal: Number(searchParams.get("expected_total") ?? run.total_amount ?? 0),
        savedTotal: Number(searchParams.get("saved_total") ?? run.total_amount ?? 0),
      }
    : null;
  const bankExportIssues = activeItems.filter((item) => !isValidSaudiIban(item.employees_payroll?.iban ?? ""));
  const canExportBankFile = activeItems.length > 0 && bankExportIssues.length === 0;

  async function exportRajhi() {
    if (!canExportBankFile) {
      setExportError("لا يمكن تجهيز ملف التحويل البنكي قبل إكمال الآيبان الصحيح لكل مستفيد في المسير.");
      return;
    }
    setExportError("");
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("مسير الرواتب", {
      views: [{ rightToLeft: true }],
    });
    worksheet.columns = [
      { header: "رقم م", key: "index", width: 10 },
      { header: "اسم الموظف", key: "employeeName", width: 28 },
      { header: "رقم الآيبان", key: "iban", width: 30 },
      { header: "المبلغ", key: "amount", width: 14 },
      { header: "اسم البنك", key: "bankName", width: 20 },
      { header: "ملاحظة", key: "notes", width: 28 },
    ];
    activeItems.forEach((item, index) => {
      worksheet.addRow({
        index: index + 1,
        employeeName: item.employees_payroll?.employee_name ?? "",
        iban: item.employees_payroll?.iban ?? "",
        amount: Number(item.net_salary ?? 0),
        bankName: item.employees_payroll?.bank_name ?? "",
        notes: item.notes ?? "",
      });
    });
    worksheet.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `مسير_الرواتب_${monthLabel.replace("-", "_")}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <section className="app-card luxury-pattern overflow-hidden rounded-[1.7rem]">
        <div className="relative border-r-4 border-[var(--gold)] p-5 sm:p-7">
          <p className="text-sm font-semibold text-[var(--gold)]">مسير شهري</p>
          <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--primary-dark)] sm:text-4xl">مسير {monthLabel}</h1>
              <p className="mt-3 text-sm font-bold text-[var(--muted)]">
                {run.total_employees} بند نشط — الإجمالي المدقق {money(run.total_amount)} — الحالة {runStatusLabels[run.status] ?? run.status}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <form action={auditPayrollRun}>
                <input type="hidden" name="run_id" value={run.id} />
                <input type="hidden" name="run_month" value={monthLabel} />
                <button type="submit" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100">
                  <ShieldCheck aria-hidden className="size-5" />
                  تدقيق المسير
                </button>
              </form>
              <button type="button" onClick={exportRajhi} disabled={!canExportBankFile} className="gold-button inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">
                <Download aria-hidden className="size-5" />
                تصدير ملف الراجحي
              </button>
              {run.status === "draft" ? (
                <form action={approvePayrollRun}>
                  <input type="hidden" name="run_id" value={run.id} />
                  <input type="hidden" name="return_to" value={`/dashboard/finance/payroll/${run.year}-${run.month}`} />
                  <button type="submit" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 px-5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100">
                    <CheckCircle2 aria-hidden className="size-5" />
                    اعتمد المسير
                  </button>
                </form>
              ) : null}
              {canDelete ? (
                <button type="button" onClick={() => setDeleteOpen(true)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 text-sm font-semibold text-red-700 hover:border-red-300">
                  <Trash2 aria-hidden className="size-5" />
                  حذف المسير
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {importStats ? (
        <section className="app-card rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">
          <p className="font-semibold">تم حفظ المسير بعد المعاينة.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <Info label="الصفوف المقروءة" value={importStats.read} />
            <Info label="المؤهلة للحفظ" value={importStats.expected} />
            <Info label="الصفوف المحفوظة" value={importStats.saved} />
            <Info label="غير المطابقين" value={importStats.unmatched} />
            <Info label="ناقصو الآيبان" value={importStats.missingIban} />
            <Info label="الإجمالي المتوقع" value={money(importStats.expectedTotal)} />
            <Info label="الإجمالي المحفوظ" value={money(importStats.savedTotal)} strong />
          </div>
        </section>
      ) : null}

      {!canExportBankFile ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-7 text-amber-800">
          يوجد {bankExportIssues.length} بند نشط لا يملك آيبان سعودي صحيح. يمكن حفظ المسير ومراجعته، لكن التصدير البنكي متوقف حتى إكمال الآيبانات من قائمة مستفيدي الرواتب.
        </section>
      ) : null}

      {exportError ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-7 text-red-700">
          {exportError}
        </section>
      ) : null}

      <section className="app-card overflow-hidden rounded-[1.6rem]">
        {items.length === 0 ? (
          <div className="p-8 text-center">
            <p className="font-semibold text-[var(--primary-dark)]">لا توجد تفاصيل رواتب في هذا المسير.</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[980px] text-right text-sm">
                <thead className="bg-[#f4f0e6] text-[#31564d]">
                  <tr>
                    <th className="px-5 py-4 font-semibold">الموظف</th>
                    <th className="px-5 py-4 font-semibold">الآيبان</th>
                    <th className="px-5 py-4 font-semibold">الأساسي</th>
                    <th className="px-5 py-4 font-semibold">البدلات</th>
                    <th className="px-5 py-4 font-semibold">الخصومات</th>
                    <th className="px-5 py-4 font-semibold">الصافي</th>
                    <th className="px-5 py-4 font-semibold">الحالة</th>
                    <th className="px-5 py-4 font-semibold">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {items.map((item) => (
                    <tr key={item.id} className="transition hover:bg-[#fbf6ea]">
                      <td className="px-5 py-4 font-semibold text-[var(--primary-dark)]">{item.employees_payroll?.employee_name ?? "غير محدد"}</td>
                      <td className="px-5 py-4">{item.employees_payroll?.iban ?? "غير محدد"}</td>
                      <td className="px-5 py-4">{money(item.base_salary)}</td>
                      <td className="px-5 py-4">{money(item.allowances)}</td>
                      <td className="px-5 py-4">{money(item.deductions)}</td>
                      <td className="px-5 py-4 font-semibold text-[var(--primary-dark)]">{money(item.net_salary)}</td>
                      <td className="px-5 py-4">{paymentStatusLabels[item.payment_status] ?? item.payment_status}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <EditButton onClick={() => setEditing(item)} />
                          <RemoveItemButton item={item} runMonth={monthLabel} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 p-4 lg:hidden">
              {items.map((item) => (
                <article key={item.id} className="resource-mobile-card p-4">
                  <h3 className="font-semibold text-[var(--primary-dark)]">{item.employees_payroll?.employee_name ?? "غير محدد"}</h3>
                  <p className="mt-1 text-xs font-bold text-[var(--muted)]">{item.employees_payroll?.iban ?? "بدون آيبان"}</p>
                  <div className="mt-4 grid gap-2 text-sm">
                    <Info label="البدلات" value={money(item.allowances)} />
                    <Info label="الخصومات" value={money(item.deductions)} />
                    <Info label="الصافي" value={money(item.net_salary)} strong />
                  </div>
                  <div className="mt-4 border-t border-[var(--line)] pt-3">
                    <div className="flex flex-wrap gap-2">
                      <EditButton onClick={() => setEditing(item)} />
                      <RemoveItemButton item={item} runMonth={monthLabel} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {editing ? <RunItemModal item={editing} runMonth={monthLabel} onClose={() => setEditing(null)} /> : null}
      {deleteOpen ? <DeletePayrollRunModal run={run} itemsCount={items.length} onClose={() => setDeleteOpen(false)} /> : null}
    </div>
  );
}

function isValidSaudiIban(value: string) {
  return /^SA[A-Z0-9]{22}$/.test(value.replace(/\s+/g, "").trim().toUpperCase());
}

function DeletePayrollRunModal({ run, itemsCount, onClose }: { run: PayrollRun; itemsCount: number; onClose: () => void }) {
  const [confirmation, setConfirmation] = useState("");
  const monthLabel = payrollRunLabel(run);

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/45 p-3 sm:place-items-center">
      <section className="app-card w-full max-w-2xl rounded-[1.5rem] p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-red-700">إجراء نهائي</p>
            <h2 className="mt-1 text-xl font-bold text-[var(--primary-dark)]">حذف المسير {monthLabel}</h2>
          </div>
          <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-2xl border border-[var(--line)] bg-[#fffdf8]" aria-label="إغلاق">
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <div className="mt-5 grid gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-7 text-red-800">
          <p>سيتم حذف هذا المسير وجميع بنوده من النظام نهائيًا.</p>
          <p>لن يتم حذف الموظفين أو المعلمين أنفسهم، ولن تُمس أي مسيرات أخرى.</p>
          <div className="grid gap-2 rounded-2xl bg-white/70 p-3 text-[var(--primary-dark)] sm:grid-cols-2">
            <Info label="الشهر" value={monthLabel} />
            <Info label="الحالة" value={runStatusLabels[run.status] ?? run.status} />
            <Info label="عدد البنود" value={String(itemsCount)} />
            <Info label="الإجمالي" value={money(run.total_amount)} />
          </div>
        </div>
        <form action={deletePayrollRun} className="mt-5 grid gap-4">
          <input type="hidden" name="run_id" value={run.id} />
          <label className="block text-sm font-bold text-[var(--text)]">
            اكتب عبارة التأكيد: حذف المسير
            <input
              name="confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className="mt-2 h-12 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 text-sm font-semibold outline-none focus:border-red-300 focus:ring-4 focus:ring-red-100"
            />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="submit" disabled={confirmation !== "حذف المسير"} className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-red-700 px-7 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">
              حذف المسير وبنوده فقط
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

function RemoveItemButton({
  item,
  runMonth,
}: {
  item: PayrollRunItem;
  runMonth: string;
}) {
  return (
    <form
      action={removePayrollRunItem}
      onSubmit={(event) => {
        if (!confirm("هل أنت متأكد من إزالة هذا الموظف من هذا المسير فقط؟ ستبقى بيانات الموظف ومسيراته السابقة محفوظة.")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={item.id} />
      <input type="hidden" name="run_month" value={runMonth} />
      <button className="inline-flex min-h-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 hover:border-red-300">
        إزالة من المسير
      </button>
    </form>
  );
}

function RunItemModal({ item, runMonth, onClose }: { item: PayrollRunItem; runMonth: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/45 p-3 sm:place-items-center">
      <section className="app-card w-full max-w-2xl rounded-[1.5rem] p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[var(--gold)]">تعديل شهري فقط</p>
            <h2 className="mt-1 text-xl font-bold text-[var(--primary-dark)]">{item.employees_payroll?.employee_name ?? "موظف"}</h2>
          </div>
          <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-2xl border border-[var(--line)] bg-[#fffdf8]" aria-label="إغلاق">
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <form action={updatePayrollRunItem} className="mt-5 grid gap-4 md:grid-cols-2">
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="run_month" value={runMonth} />
          <Field name="base_salary" label="الراتب الأساسي" value={item.base_salary} />
          <Field name="allowances" label="بدلات هذا الشهر" value={item.allowances} />
          <Field name="deductions" label="خصومات هذا الشهر" value={item.deductions} />
          <label className="block text-sm font-bold text-[var(--text)]">
            حالة الدفع
            <select name="payment_status" defaultValue={item.payment_status} className="mt-2 h-12 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 text-sm font-semibold outline-none focus:border-[var(--gold)]">
              <option value="pending">بانتظار</option>
              <option value="paid">مدفوع</option>
              <option value="failed">متعثر</option>
            </select>
          </label>
          <label className="block text-sm font-bold text-[var(--text)] md:col-span-2">
            ملاحظة
            <textarea name="notes" defaultValue={item.notes ?? ""} rows={3} className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 py-3 text-sm font-semibold outline-none focus:border-[var(--gold)]" />
          </label>
          <div className="md:col-span-2">
            <button className="gold-button h-12 rounded-2xl px-7 text-sm font-semibold text-white">حفظ</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Field({ name, label, value }: { name: string; label: string; value: number }) {
  return (
    <label className="block text-sm font-bold text-[var(--text)]">
      {label}
      <input name={name} type="number" step="0.01" defaultValue={String(value ?? 0)} className="mt-2 h-12 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 text-sm font-semibold outline-none focus:border-[var(--gold)]" />
    </label>
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

function Info({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-bold text-[#81928b]">{label}</span>
      <span className={strong ? "font-semibold text-[var(--primary-dark)]" : "font-bold text-[var(--text)]"}>{value}</span>
    </div>
  );
}
