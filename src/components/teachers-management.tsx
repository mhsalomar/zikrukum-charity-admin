"use client";

import Link from "next/link";
import { Archive, Download, Eye, Pencil, Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { archiveTeacherRecord, saveTeacherRecord } from "@/app/dashboard/teachers/actions";
import { paginate, PaginationControls } from "@/components/pagination-controls";
import { maskDocument, maskIban } from "@/lib/masking";

export type TeacherAdminRecord = {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  documentType: string;
  documentNumber: string;
  nationality: string;
  teacherRole: string;
  status: string;
  startDate: string;
  payrollEmployeeId: string;
  bankName: string;
  iban: string;
  accountHolderName: string;
  salaryAmount: number | null;
  payrollDataStatus: string;
  payrollNotes: string;
  notes: string;
  halaqat: string[];
  linkedPayroll: boolean;
};

export type PayrollOption = {
  id: string;
  label: string;
};

const statusLabels: Record<string, string> = {
  active: "نشط",
  inactive: "غير نشط",
  archived: "مؤرشف",
};

const documentTypeLabels: Record<string, string> = {
  national_id: "هوية وطنية",
  iqama: "إقامة",
  other: "أخرى",
};

const teacherRoleLabels: Record<string, string> = {
  teacher: "معلم",
  supervisor: "مشرف",
  assistant_teacher: "مساعد معلم",
  admin: "إداري",
};

const payrollStatusLabels: Record<string, string> = {
  complete: "مكتملة",
  incomplete: "ناقصة",
  needs_review: "تحتاج مراجعة",
};

export function TeachersManagement({
  records,
  payrollOptions,
}: {
  records: TeacherAdminRecord[];
  payrollOptions: PayrollOption[];
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [payrollLinked, setPayrollLinked] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editing, setEditing] = useState<TeacherAdminRecord | null>(null);
  const [adding, setAdding] = useState(false);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return records.filter((record) => {
      const haystack = [
        record.fullName,
        record.phone,
        record.email,
        record.documentNumber,
        record.halaqat.join(" "),
        record.bankName,
      ].join(" ").toLowerCase();
      const statusValue = record.status === "inactive" && record.notes.includes("archived")
        ? "archived"
        : record.status;
      return (
        (!normalized || haystack.includes(normalized)) &&
        (!status || statusValue === status) &&
        (!documentType || record.documentType === documentType) &&
        (!payrollLinked ||
          (payrollLinked === "linked" ? record.linkedPayroll : !record.linkedPayroll))
      );
    });
  }, [documentType, payrollLinked, query, records, status]);

  const paginated = paginate(filtered, page, pageSize);
  const summary = useMemo(() => buildSummary(records), [records]);

  function exportCsv() {
    const headers = [
      "الاسم",
      "الجوال",
      "البريد",
      "نوع الوثيقة",
      "رقم الهوية/الإقامة",
      "الجنسية",
      "الدور",
      "الحالة",
      "البنك",
      "الآيبان",
      "حالة بيانات التحويل",
      "الحلقات",
    ];
    const rows = filtered.map((record) => [
      record.fullName,
      record.phone,
      record.email,
      documentTypeLabels[record.documentType] ?? record.documentType,
      record.documentNumber,
      record.nationality,
      teacherRoleLabels[record.teacherRole] ?? record.teacherRole,
      statusLabels[record.status] ?? record.status,
      record.bankName,
      record.iban,
      payrollStatusLabels[record.payrollDataStatus] ?? record.payrollDataStatus,
      record.halaqat.join(" | "),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "teachers_official_export.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat label="إجمالي المعلمين" value={String(summary.total)} />
        <MiniStat label="النشطون" value={String(summary.active)} />
        <MiniStat label="مرتبطون بالرواتب" value={String(summary.linkedPayroll)} />
        <MiniStat label="ناقصو بيانات التحويل" value={String(summary.incompletePayroll)} warning />
      </section>

      <section className="app-card overflow-hidden rounded-[1.6rem]">
        <div className="grid gap-3 border-b border-[var(--line)] bg-white/72 p-4 xl:grid-cols-[1fr_auto_auto_auto_auto]">
          <label className="relative block">
            <span className="sr-only">بحث</span>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="ابحث بالاسم أو الجوال أو الإيميل أو الهوية أو الحلقة..."
              className="h-12 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 pl-11 text-sm font-semibold outline-none focus:border-[var(--gold)]"
            />
            <Search aria-hidden className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--gold)]" />
          </label>
          <Filter value={status} onChange={setStatus} options={{ active: "نشط", inactive: "غير نشط", archived: "مؤرشف" }} placeholder="كل الحالات" />
          <Filter value={documentType} onChange={setDocumentType} options={documentTypeLabels} placeholder="كل الوثائق" />
          <Filter value={payrollLinked} onChange={setPayrollLinked} options={{ linked: "مرتبط بالرواتب", unlinked: "غير مرتبط" }} placeholder="كل الرواتب" />
          <div className="flex gap-2">
            <button type="button" onClick={() => setAdding(true)} className="gold-button inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-4 text-xs font-semibold text-white">
              <Plus aria-hidden className="size-4" />
              إضافة
            </button>
            <button type="button" onClick={exportCsv} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 text-xs font-semibold text-[var(--primary-dark)]">
              <Download aria-hidden className="size-4" />
              ملف البيانات
            </button>
          </div>
        </div>

        {records.length === 0 ? (
          <EmptyState text="لا توجد سجلات معلمين بعد." />
        ) : filtered.length === 0 ? (
          <EmptyState text="لا توجد نتائج مطابقة لخيارات التصفية الحالية." />
        ) : (
          <>
            <div className="hidden overflow-x-auto xl:block">
              <table className="w-full min-w-[1180px] text-right text-sm">
                <thead className="bg-[#f4f0e6] text-[#31564d]">
                  <tr>
                    <th className="px-5 py-4 font-semibold">المعلم</th>
                    <th className="px-5 py-4 font-semibold">التواصل</th>
                    <th className="px-5 py-4 font-semibold">الوثيقة</th>
                    <th className="px-5 py-4 font-semibold">الحلقات</th>
                    <th className="px-5 py-4 font-semibold">الرواتب</th>
                    <th className="px-5 py-4 font-semibold">الحالة</th>
                    <th className="px-5 py-4 font-semibold">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {paginated.items.map((record) => (
                    <tr key={record.id} className="transition hover:bg-[#fbf6ea]">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-[var(--primary-dark)]">{record.fullName}</p>
                        <p className="mt-1 text-xs font-bold text-[var(--muted)]">{teacherRoleLabels[record.teacherRole] ?? record.teacherRole}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p>{record.phone || "غير محدد"}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">{record.email || "بدون بريد"}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p>{documentTypeLabels[record.documentType] ?? record.documentType}</p>
                        <p className="mt-1 text-xs font-bold text-[var(--muted)]">{maskDocument(record.documentNumber)}</p>
                      </td>
                      <td className="px-5 py-4">{record.halaqat.length ? record.halaqat.join("، ") : "غير مرتبط"}</td>
                      <td className="px-5 py-4">
                        <p>{payrollStatusLabels[record.payrollDataStatus] ?? record.payrollDataStatus}</p>
                        <p className="mt-1 text-xs font-bold text-[var(--muted)]">{maskIban(record.iban)}</p>
                      </td>
                      <td className="px-5 py-4"><StatusBadge value={record.status} /></td>
                      <td className="px-5 py-4">
                        <Actions record={record} setEditing={setEditing} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 p-4 xl:hidden">
              {paginated.items.map((record) => (
                <article key={record.id} className="resource-mobile-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-[var(--primary-dark)]">{record.fullName}</h3>
                      <p className="mt-1 text-xs font-bold text-[var(--muted)]">{record.email || record.phone || "بدون تواصل"}</p>
                    </div>
                    <StatusBadge value={record.status} />
                  </div>
                  <div className="mt-4 grid gap-2 text-sm">
                    <Info label="الوثيقة" value={`${documentTypeLabels[record.documentType] ?? record.documentType} — ${maskDocument(record.documentNumber)}`} />
                    <Info label="الآيبان" value={maskIban(record.iban)} />
                    <Info label="الحلقات" value={record.halaqat.join("، ") || "غير مرتبط"} />
                    <Info label="بيانات التحويل" value={payrollStatusLabels[record.payrollDataStatus] ?? record.payrollDataStatus} />
                  </div>
                  <div className="mt-4 border-t border-[var(--line)] pt-3">
                    <Actions record={record} setEditing={setEditing} />
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
              onPageSizeChange={(next) => {
                setPageSize(next);
                setPage(1);
              }}
            />
          </>
        )}
      </section>

      {adding ? <TeacherModal title="إضافة معلم" payrollOptions={payrollOptions} onClose={() => setAdding(false)} /> : null}
      {editing ? <TeacherModal title="تعديل معلم" record={editing} payrollOptions={payrollOptions} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}

function Actions({
  record,
  setEditing,
}: {
  record: TeacherAdminRecord;
  setEditing: (record: TeacherAdminRecord) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link href={`/dashboard/teachers/${record.id}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-white px-3 text-xs font-semibold text-[var(--primary-dark)]">
        <Eye aria-hidden className="size-4" />
        تفاصيل
      </Link>
      <button type="button" onClick={() => setEditing(record)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--gold)]/45 bg-[#fff8e6] px-3 text-xs font-semibold text-[#765514]">
        <Pencil aria-hidden className="size-4" />
        تعديل
      </button>
      <form
        action={archiveTeacherRecord}
        onSubmit={(event) => {
          if (!confirm(`هل تريد أرشفة المعلم ${record.fullName}؟ لن يتم حذف سجلات الرواتب أو الجلسات السابقة.`)) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="id" value={record.id} />
        <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-800">
          <Archive aria-hidden className="size-4" />
          أرشفة
        </button>
      </form>
    </div>
  );
}

function TeacherModal({
  title,
  record,
  payrollOptions,
  onClose,
}: {
  title: string;
  record?: TeacherAdminRecord;
  payrollOptions: PayrollOption[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/45 p-3 sm:place-items-center">
      <section className="app-card max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[1.5rem] p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[var(--gold)]">بيانات رسمية وحساسة</p>
            <h2 className="mt-1 text-xl font-bold text-[var(--primary-dark)]">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-2xl border border-[var(--line)] bg-[#fffdf8]" aria-label="إغلاق">
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <form action={saveTeacherRecord} className="mt-5 grid gap-4 md:grid-cols-2">
          {record?.id ? <input type="hidden" name="id" value={record.id} /> : null}
          <Field name="full_name" label="الاسم الكامل" value={record?.fullName} required />
          <Field name="phone" label="رقم الجوال" value={record?.phone} />
          <Field name="email" label="بريد تسجيل الدخول" value={record?.email} type="email" />
          <Select name="document_type" label="نوع الوثيقة" value={record?.documentType ?? "other"} options={documentTypeLabels} />
          <Field name="document_number" label="رقم الهوية / الإقامة" value={record?.documentNumber} />
          <Field name="nationality" label="الجنسية" value={record?.nationality} />
          <Select name="teacher_role" label="الدور" value={record?.teacherRole ?? "teacher"} options={teacherRoleLabels} />
          <Select name="status" label="الحالة" value={record?.status ?? "active"} options={{ active: "نشط", inactive: "غير نشط" }} />
          <Field name="start_date" label="تاريخ المباشرة" value={record?.startDate} type="date" />
          <Select name="payroll_employee_id" label="ربط سجل الرواتب" value={record?.payrollEmployeeId ?? ""} options={Object.fromEntries(payrollOptions.map((option) => [option.id, option.label]))} includeEmpty />
          <Field name="bank_name" label="البنك" value={record?.bankName} />
          <Field name="iban" label="الآيبان" value={record?.iban} />
          <Field name="account_holder_name" label="اسم صاحب الحساب" value={record?.accountHolderName} />
          <Field name="salary_amount" label="الراتب الشهري" value={record?.salaryAmount ?? ""} type="number" />
          <Select name="payroll_data_status" label="حالة بيانات التحويل" value={record?.payrollDataStatus ?? "incomplete"} options={payrollStatusLabels} />
          <label className="block text-sm font-bold text-[var(--text)] md:col-span-2">
            ملاحظات الرواتب
            <textarea name="payroll_notes" defaultValue={record?.payrollNotes ?? ""} rows={2} className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 py-3 text-sm font-semibold outline-none focus:border-[var(--gold)]" />
          </label>
          <label className="block text-sm font-bold text-[var(--text)] md:col-span-2">
            ملاحظات عامة
            <textarea name="notes" defaultValue={record?.notes ?? ""} rows={3} className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 py-3 text-sm font-semibold outline-none focus:border-[var(--gold)]" />
          </label>
          <div className="md:col-span-2">
            <button className="gold-button h-12 rounded-2xl px-7 text-sm font-semibold text-white">حفظ</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Filter({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Record<string, string>;
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-12 rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 text-sm font-bold text-[var(--primary-dark)] outline-none focus:border-[var(--gold)]"
    >
      <option value="">{placeholder}</option>
      {Object.entries(options).map(([optionValue, label]) => (
        <option key={optionValue} value={optionValue}>{label}</option>
      ))}
    </select>
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

function Select({
  name,
  label,
  value,
  options,
  includeEmpty = false,
}: {
  name: string;
  label: string;
  value: string;
  options: Record<string, string>;
  includeEmpty?: boolean;
}) {
  return (
    <label className="block text-sm font-bold text-[var(--text)]">
      {label}
      <select name={name} defaultValue={value} className="mt-2 h-12 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 text-sm font-semibold outline-none focus:border-[var(--gold)]">
        {includeEmpty ? <option value="">بدون</option> : null}
        {Object.entries(options).map(([optionValue, labelText]) => (
          <option key={optionValue} value={optionValue}>{labelText}</option>
        ))}
      </select>
    </label>
  );
}

function StatusBadge({ value }: { value: string }) {
  const active = value === "active";
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${active ? "bg-[#e8f5ee] text-[var(--primary-dark)]" : "bg-[#f4f1eb] text-[#6b7280]"}`}>
      {statusLabels[value] ?? value}
    </span>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-bold text-[#81928b]">{label}</span>
      <span className="text-left font-semibold text-[var(--text)]">{value || "غير محدد"}</span>
    </div>
  );
}

function MiniStat({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) {
  return (
    <div className={`app-card rounded-2xl border-r-4 p-4 ${warning ? "border-amber-400" : "border-[var(--gold)]"}`}>
      <p className="text-xs font-bold text-[#809189]">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[var(--primary-dark)]">{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="p-8 text-center text-sm font-bold text-[var(--muted)]">{text}</p>;
}

function buildSummary(records: TeacherAdminRecord[]) {
  return {
    total: records.length,
    active: records.filter((record) => record.status === "active").length,
    linkedPayroll: records.filter((record) => record.linkedPayroll).length,
    incompletePayroll: records.filter(
      (record) =>
        !record.documentNumber ||
        !record.iban ||
        !record.bankName ||
        record.payrollDataStatus !== "complete",
    ).length,
  };
}
