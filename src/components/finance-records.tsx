"use client";

import { Edit3, Plus, Search, Trash2, X } from "lucide-react";
import { CsvExportButton } from "@/components/csv-export-button";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { deleteFinanceRecord, saveFinanceRecord } from "@/app/dashboard/finance/actions";
import { paginate, PaginationControls } from "@/components/pagination-controls";
import { money } from "@/lib/format";

type Column = {
  key: string;
  label: string;
  kind?: "money" | "date" | "status" | "text";
};

type Field = {
  name: string;
  label: string;
  kind?: "text" | "date" | "number" | "email" | "tel" | "select" | "textarea";
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
};

type RecordRow = Record<string, unknown> & { id: string; status?: string | null };

export type FinanceRecordConfig = {
  table: "finance_expenses" | "finance_revenues" | "finance_budget_items" | "donors" | "finance_reports";
  title: string;
  description?: string;
  addLabel: string;
  returnTo: string;
  columns: Column[];
  fields: Field[];
  statusOptions: Array<{ value: string; label: string }>;
};

export function FinanceRecords({
  config,
  records,
}: {
  config: FinanceRecordConfig;
  records: RecordRow[];
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editing, setEditing] = useState<RecordRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<RecordRow | null>(null);
  const searchParams = useSearchParams();

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return records.filter((record) => {
      const haystack = Object.values(record).join(" ").toLowerCase();
      return (!normalized || haystack.includes(normalized)) && (!status || record.status === status);
    });
  }, [query, records, status]);
  const paginated = paginate(filtered, page, pageSize);

  function resetPage() {
    setPage(1);
  }

  return (
      <section className="space-y-5">
      <StatusNotice code={readStatus(searchParams)} />
      <div className="app-card luxury-pattern overflow-hidden rounded-[1.7rem]">
        <div className="relative border-r-4 border-[var(--gold)] p-5 sm:p-7">
          <p className="text-sm font-semibold text-[var(--gold)]">المالية</p>
          <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--primary-dark)] sm:text-4xl">{config.title}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">{config.description}</p>
            </div>
            <div className="flex gap-2">
              <CsvExportButton
                filename={config.title}
                data={records.map((r) =>
                  Object.fromEntries(
                    config.columns.map(({ key, label }) => [label, String((r as Record<string, unknown>)[key] ?? "—")])
                  )
                )}
              />
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="gold-button inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white"
              >
                <Plus aria-hidden className="size-5" />
                {config.addLabel}
              </button>
            </div>
          </div>
        </div>
      </div>

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
              placeholder={`بحث في ${config.title}...`}
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
            {config.statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {records.length === 0 ? (
          <EmptyState title="لا توجد بيانات محفوظة" description="ابدأ بإضافة أول سجل، وستظهر القائمة هنا بدون بيانات وهمية." />
        ) : filtered.length === 0 ? (
          <EmptyState title="لا توجد نتائج مطابقة" description="غيّر كلمات البحث أو خيار تصفية الحالة." />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[820px] text-right text-sm">
                <thead className="bg-[#f4f0e6] text-[#31564d]">
                  <tr>
                    {config.columns.map((column) => (
                      <th key={column.key} className="px-5 py-4 font-semibold">{column.label}</th>
                    ))}
                    <th className="px-5 py-4 font-semibold">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {paginated.items.map((record) => (
                    <tr key={record.id} className="transition hover:bg-[#fbf6ea]">
                      {config.columns.map((column) => (
                        <td key={column.key} className="px-5 py-4 text-[#475467]">
                          {renderValue(record[column.key], column.kind, config.statusOptions)}
                        </td>
                      ))}
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <EditButton onClick={() => setEditing(record)} />
                          <DeleteButton onClick={() => setDeleting(record)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 p-4 md:hidden">
              {paginated.items.map((record) => (
                <article key={record.id} className="resource-mobile-card p-4">
                  {config.columns.map((column) => (
                    <div key={column.key} className="py-2">
                      <p className="text-xs font-bold text-[#81928b]">{column.label}</p>
                      <div className="mt-1 break-words text-sm font-semibold text-[var(--text)]">
                        {renderValue(record[column.key], column.kind, config.statusOptions)}
                      </div>
                    </div>
                  ))}
                  <div className="mt-3 border-t border-[var(--line)] pt-3">
                    <div className="flex gap-2">
                      <EditButton onClick={() => setEditing(record)} />
                      <DeleteButton onClick={() => setDeleting(record)} />
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

      {adding ? (
        <FinanceModal config={config} title={config.addLabel} onClose={() => setAdding(false)} />
      ) : null}
      {editing ? (
        <FinanceModal config={config} title="تعديل السجل" record={editing} onClose={() => setEditing(null)} />
      ) : null}
      {deleting ? (
        <DeleteFinanceModal config={config} record={deleting} onClose={() => setDeleting(null)} />
      ) : null}
    </section>
  );
}

function StatusNotice({ code }: { code: string }) {
  if (!code) return null;
  const success = code === "created" || code === "updated" || code === "deleted";
  const text = success
    ? code === "created"
      ? "تم حفظ السجل بنجاح."
      : code === "updated"
        ? "تم تحديث السجل بنجاح."
        : "تم حذف السجل المالي نهائيًا."
    : code === "missing"
      ? "يرجى تعبئة الحقول المطلوبة."
      : code === "delete-constrained"
        ? "تعذر حذف السجل لأنه مرتبط بسجل آخر مثل برنامج أو تقرير. افصل العلاقة أولًا أو عدّل السجل بدل حذفه."
        : code === "delete"
          ? "تعذر حذف السجل. غالبًا تحتاج تشغيل سياسة حذف المالية أو التحقق من الصلاحيات."
      : "تعذر حفظ السجل. تأكد من الصلاحيات والبيانات.";

  return (
    <p className={`rounded-2xl border p-4 text-sm font-bold ${success ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>
      {text}
    </p>
  );
}

function readStatus(params: ReturnType<typeof useSearchParams>) {
  if (params.get("created")) return "created";
  if (params.get("updated")) return "updated";
  if (params.get("deleted")) return "deleted";
  return params.get("error") ?? "";
}

function FinanceModal({
  config,
  title,
  record,
  onClose,
}: {
  config: FinanceRecordConfig;
  title: string;
  record?: RecordRow;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/45 p-3 sm:place-items-center">
      <section className="app-card max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[1.5rem] p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[var(--gold)]">إدخال آمن</p>
            <h2 className="mt-1 text-xl font-bold text-[var(--primary-dark)]">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-2xl border border-[var(--line)] bg-[#fffdf8]" aria-label="إغلاق">
            <X aria-hidden className="size-5" />
          </button>
        </div>

        <form action={saveFinanceRecord} className="mt-5 grid gap-4 md:grid-cols-2">
          <input type="hidden" name="table" value={config.table} />
          <input type="hidden" name="return_to" value={config.returnTo} />
          {record?.id ? <input type="hidden" name="id" value={record.id} /> : null}
          {config.fields.map((field) => (
            <FormField key={field.name} field={field} value={record?.[field.name]} />
          ))}
          <div className="md:col-span-2">
            <button className="gold-button h-12 rounded-2xl px-7 text-sm font-semibold text-white">حفظ</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function FormField({ field, value }: { field: Field; value: unknown }) {
  const baseClass =
    "mt-2 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 text-sm font-semibold text-[var(--text)] outline-none transition focus:border-[var(--gold)] focus:bg-white focus:ring-4 focus:ring-[var(--gold)]/15";

  return (
    <label className={`block text-sm font-bold text-[var(--text)] ${field.kind === "textarea" ? "md:col-span-2" : ""}`}>
      {field.label}
      {field.required ? <span className="text-[var(--danger)]"> *</span> : null}
      {field.kind === "select" ? (
        <select name={field.name} defaultValue={String(value ?? "")} required={field.required} className={`${baseClass} h-12`}>
          <option value="">اختر</option>
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      ) : field.kind === "textarea" ? (
        <textarea name={field.name} defaultValue={String(value ?? "")} rows={4} className={`${baseClass} py-3`} />
      ) : (
        <input
          name={field.name}
          type={field.kind ?? "text"}
          defaultValue={String(value ?? "")}
          required={field.required}
          step={field.kind === "number" ? "0.01" : undefined}
          className={`${baseClass} h-12`}
        />
      )}
    </label>
  );
}

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[#fffdf8] px-3 text-xs font-semibold text-[var(--primary-dark)] hover:border-[var(--gold)]"
    >
      <Edit3 aria-hidden className="size-4" />
      تعديل
    </button>
  );
}

function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 text-xs font-semibold text-red-700 hover:border-red-200"
    >
      <Trash2 aria-hidden className="size-4" />
      حذف
    </button>
  );
}

function DeleteFinanceModal({
  config,
  record,
  onClose,
}: {
  config: FinanceRecordConfig;
  record: RecordRow;
  onClose: () => void;
}) {
  const details = getDeleteDetails(config, record);

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/45 p-3 sm:place-items-center">
      <section className="app-card w-full max-w-lg rounded-[1.5rem] p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[var(--danger)]">تأكيد حذف نهائي</p>
            <h2 className="mt-1 text-xl font-bold text-[var(--primary-dark)]">حذف سجل مالي</h2>
          </div>
          <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-2xl border border-[var(--line)] bg-[#fffdf8]" aria-label="إغلاق">
            <X aria-hidden className="size-5" />
          </button>
        </div>

        <div className="mt-5 space-y-2 rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-4 text-sm">
          <Detail label="نوع العملية" value={details.type} />
          <Detail label="اسم البند أو الوصف" value={details.title} />
          <Detail label="المبلغ" value={details.amount} />
          <Detail label="التاريخ" value={details.date} />
        </div>

        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold leading-7 text-red-800">
          سيتم حذف هذا السجل نهائيًا ولا يمكن التراجع عن العملية.
        </p>

        <form action={deleteFinanceRecord} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input type="hidden" name="table" value={config.table} />
          <input type="hidden" name="return_to" value={config.returnTo} />
          <input type="hidden" name="id" value={record.id} />
          <button className="rounded-2xl bg-red-700 px-5 py-3 text-sm font-semibold text-white">حذف نهائي</button>
          <button type="button" onClick={onClose} className="rounded-2xl border border-[var(--line)] bg-white px-5 py-3 text-sm font-semibold text-[var(--primary-dark)]">إلغاء</button>
        </form>
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="font-bold text-[var(--muted)]">{label}</span>
      <span className="text-left font-semibold text-[var(--primary-dark)]">{value}</span>
    </div>
  );
}

function getDeleteDetails(config: FinanceRecordConfig, record: RecordRow) {
  const amount = Number(record.amount ?? record.allocated_amount ?? record.spent_amount ?? 0);
  const date = String(record.expense_date ?? record.revenue_date ?? record.period_start ?? record.created_at ?? "");
  const rawTitle =
    record.description ??
    record.category ??
    record.source_name ??
    record.name ??
    record.title ??
    record.donor_name ??
    "سجل مالي";

  return {
    type: config.title,
    title: String(rawTitle || "سجل مالي"),
    amount: amount ? money(amount) : "غير محدد",
    date: date ? new Intl.DateTimeFormat("ar-SA").format(new Date(date)) : "غير محدد",
  };
}

function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="p-8 text-center">
      <p className="text-base font-semibold text-[var(--primary-dark)]">{title}</p>
      {description ? <p className="mt-2 text-sm font-semibold text-[var(--muted)]">{description}</p> : null}
    </div>
  );
}

function renderValue(value: unknown, kind: Column["kind"], statuses: Array<{ value: string; label: string }>) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-[#98a69f]">غير محدد</span>;
  }

  if (kind === "money") {
    return <span className="font-semibold text-[var(--primary-dark)]">{money(Number(value))}</span>;
  }

  if (kind === "date") {
    return new Intl.DateTimeFormat("ar-SA").format(new Date(String(value)));
  }

  if (kind === "status") {
    const label = statuses.find((status) => status.value === value)?.label ?? String(value);
    return <span className="inline-flex rounded-full bg-[#e8f5ee] px-3 py-1 text-xs font-semibold text-[var(--primary-dark)]">{label}</span>;
  }

  return String(value);
}
