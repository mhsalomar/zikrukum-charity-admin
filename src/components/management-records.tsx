"use client";

import { Archive, BriefcaseBusiness, ChartColumn, Edit3, Eye, FileCheck2, MailCheck, MessagesSquare, Newspaper, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { CsvExportButton } from "@/components/csv-export-button";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { archiveManagementRecord, saveManagementRecord } from "@/app/dashboard/management-actions";
import { paginate, PaginationControls } from "@/components/pagination-controls";
import type { ManagementConfig, ManagementField } from "@/lib/management-configs";
import type { ManagementRow } from "@/lib/management";
import { money } from "@/lib/format";

export function ManagementRecords({
  config,
  records,
  loadError,
}: {
  config: ManagementConfig;
  records: ManagementRow[];
  loadError?: string;
}) {
  const Icon = iconMap[config.iconName];
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editing, setEditing] = useState<ManagementRow | null>(null);
  const [viewing, setViewing] = useState<ManagementRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [archiving, setArchiving] = useState<ManagementRow | null>(null);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const typeKey =
      config.table === "meetings"
        ? "meeting_type"
        : config.table === "governance_items"
          ? "item_type"
          : config.table === "hr_letters"
            ? "letter_type"
            : config.table === "media_posts"
              ? "content_type"
              : "report_type";

    return records.filter((record) => {
      const haystack = Object.values(record).join(" ").toLowerCase();
      const matchesType = !config.typeOptions || !typeFilter || record[typeKey] === typeFilter;
      return (!normalized || haystack.includes(normalized)) && (!status || record.status === status) && matchesType;
    });
  }, [config.table, config.typeOptions, query, records, status, typeFilter]);
  const paginated = paginate(filtered, page, pageSize);

  return (
    <section className="space-y-5">
      <StatusNotice code={readStatus(searchParams)} />

      <section className="dashboard-hero luxury-pattern overflow-hidden rounded-[1.8rem] text-white shadow-2xl shadow-[#053828]/15">
        <div className="relative grid gap-5 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="mb-2 text-sm font-semibold text-[var(--gold-soft)]">{config.eyebrow}</p>
            <h1 className="text-2xl font-bold sm:text-4xl">{config.title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#d9eee5] sm:text-base">{config.description}</p>
          </div>
          <span className="grid size-20 place-items-center rounded-[1.4rem] border border-[var(--gold)]/45 bg-white/12 text-[var(--gold-soft)] shadow-lg shadow-black/10 backdrop-blur">
            <Icon aria-hidden className="size-10" />
          </span>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-3">
        {config.sections.map((section) => (
          <article key={section.title} className="app-card rounded-[1.4rem] p-4">
            <p className="text-sm font-semibold text-[var(--primary-dark)]">{section.title}</p>
            <p className="mt-2 text-xs font-semibold leading-6 text-[var(--muted)]">{section.description}</p>
          </article>
        ))}
      </div>

      <section className="app-card overflow-hidden rounded-[1.6rem]">
        <div className="grid gap-3 border-b border-[var(--line)] bg-white/72 p-4 lg:grid-cols-[1fr_auto_auto_auto]">
          <label className="relative block">
            <span className="sr-only">بحث</span>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder={`بحث في ${config.title}...`}
              className="h-12 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 pl-11 text-sm font-semibold outline-none focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--gold)]/15"
            />
            <Search aria-hidden className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--gold)]" />
          </label>
          {config.typeOptions ? (
            <select
              value={typeFilter}
              onChange={(event) => {
                setTypeFilter(event.target.value);
                setPage(1);
              }}
              className="h-12 rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 text-sm font-bold text-[var(--primary-dark)] outline-none"
            >
              <option value="">كل الأنواع</option>
              {config.typeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          ) : null}
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            className="h-12 rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 text-sm font-bold text-[var(--primary-dark)] outline-none"
          >
            <option value="">كل الحالات</option>
            {config.statusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <CsvExportButton
            filename={config.title}
            data={records.map((r) =>
              Object.fromEntries(
                config.columns.map(({ key, label }) => [label, String((r as Record<string, unknown>)[key] ?? "—")])
              )
            )}
          />
          {config.addUrl ? (
            <Link
              href={config.addUrl}
              className="gold-button inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white"
            >
              <Plus aria-hidden className="size-5" />
              {config.addLabel}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="gold-button inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white"
            >
              <Plus aria-hidden className="size-5" />
              {config.addLabel}
            </button>
          )}
        </div>

        {loadError ? (
          <EmptyState
            title="تعذر تحميل بيانات هذا القسم"
            description="حاول مرة أخرى، أو تواصل مع الإدارة إذا استمرت المشكلة."
          />
        ) : records.length === 0 ? (
          <EmptyState title="لا توجد بيانات محفوظة" description="ابدأ بإضافة أول سجل عند جاهزية بيانات هذا القسم." />
        ) : filtered.length === 0 ? (
          <EmptyState title="لا توجد نتائج مطابقة" description="غيّر كلمات البحث أو خيارات التصفية." />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[880px] text-right text-sm">
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
                          {renderValue(record[column.key], column.kind, config)}
                        </td>
                      ))}
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <ViewButton onClick={() => setViewing(record)} />
                          {config.table === "meetings" ? <OpenLink href={`${config.returnTo}/${record.id}`} label="تفاصيل" /> : null}
                          {config.table === "hr_letters" ? <OpenLink href={`${config.returnTo}/${record.id}`} label="تفاصيل" /> : null}
                          {config.table === "media_posts" ? <OpenLink href={`${config.returnTo}/${record.id}`} label="تفاصيل" /> : null}
                          {config.table === "board_members" ? <OpenLink href={`${config.returnTo}/${record.id}`} label="التوقيع" /> : null}
                          <EditButton onClick={() => setEditing(record)} />
                          <ArchiveButton onClick={() => setArchiving(record)} />
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
                        {renderValue(record[column.key], column.kind, config)}
                      </div>
                    </div>
                  ))}
                  <div className="mt-3 flex gap-2 border-t border-[var(--line)] pt-3">
                    <ViewButton onClick={() => setViewing(record)} />
                    {config.table === "meetings" ? <OpenLink href={`${config.returnTo}/${record.id}`} label="تفاصيل" /> : null}
                    {config.table === "hr_letters" ? <OpenLink href={`${config.returnTo}/${record.id}`} label="تفاصيل" /> : null}
                    {config.table === "media_posts" ? <OpenLink href={`${config.returnTo}/${record.id}`} label="تفاصيل" /> : null}
                    {config.table === "board_members" ? <OpenLink href={`${config.returnTo}/${record.id}`} label="التوقيع" /> : null}
                    <EditButton onClick={() => setEditing(record)} />
                    <ArchiveButton onClick={() => setArchiving(record)} />
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

      {adding ? <RecordModal config={config} title={config.addLabel} onClose={() => setAdding(false)} /> : null}
      {viewing ? <DetailsModal config={config} record={viewing} onClose={() => setViewing(null)} /> : null}
      {editing ? <RecordModal config={config} title="تعديل السجل" record={editing} onClose={() => setEditing(null)} /> : null}
      {archiving ? <ArchiveModal config={config} record={archiving} onClose={() => setArchiving(null)} /> : null}
    </section>
  );
}

const iconMap = {
  briefcase: BriefcaseBusiness,
  chart: ChartColumn,
  "file-check": FileCheck2,
  "mail-check": MailCheck,
  messages: MessagesSquare,
  newspaper: Newspaper,
} satisfies Record<ManagementConfig["iconName"], typeof MessagesSquare>;

function StatusNotice({ code }: { code: string }) {
  if (!code) return null;
  const success = ["created", "updated", "archived"].includes(code);
  const text = success
    ? code === "created"
      ? "تم حفظ السجل بنجاح."
      : code === "updated"
        ? "تم تحديث السجل بنجاح."
        : "تم حذف السجل من العرض عبر أرشفته."
    : code === "missing"
      ? "يرجى تعبئة الحقول المطلوبة."
      : code === "archive"
        ? "تعذر أرشفة السجل. تحقق من الصلاحيات أو العلاقات المرتبطة."
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
  if (params.get("archived")) return "archived";
  return params.get("error") ?? "";
}

function RecordModal({
  config,
  title,
  record,
  onClose,
}: {
  config: ManagementConfig;
  title: string;
  record?: ManagementRow;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/45 p-3 sm:place-items-center">
      <section className="app-card max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[1.5rem] p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[var(--gold)]">إدخال إداري</p>
            <h2 className="mt-1 text-xl font-bold text-[var(--primary-dark)]">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-2xl border border-[var(--line)] bg-[#fffdf8]" aria-label="إغلاق">
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <form action={saveManagementRecord} className="mt-5 grid gap-4 md:grid-cols-2">
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

function ArchiveModal({
  config,
  record,
  onClose,
}: {
  config: ManagementConfig;
  record: ManagementRow;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/45 p-3 sm:place-items-center">
      <section className="app-card w-full max-w-lg rounded-[1.5rem] p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[var(--danger)]">تأكيد حذف من العرض</p>
            <h2 className="mt-1 text-xl font-bold text-[var(--primary-dark)]">هل تريد حذف هذا السجل؟</h2>
          </div>
          <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-2xl border border-[var(--line)] bg-[#fffdf8]" aria-label="إغلاق">
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <p className="mt-4 text-sm font-semibold leading-7 text-[var(--muted)]">
          سيتم أرشفة السجل وإخفاؤه من القوائم النشطة دون حذف نهائي من قاعدة البيانات.
        </p>
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
          {String(record.title ?? record.full_name ?? "سجل إداري")}
        </div>
        <form action={archiveManagementRecord} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input type="hidden" name="table" value={config.table} />
          <input type="hidden" name="return_to" value={config.returnTo} />
          <input type="hidden" name="id" value={record.id} />
          <button className="rounded-2xl bg-red-700 px-5 py-3 text-sm font-semibold text-white">حذف من العرض</button>
          <button type="button" onClick={onClose} className="rounded-2xl border border-[var(--line)] bg-white px-5 py-3 text-sm font-semibold text-[var(--primary-dark)]">إلغاء</button>
        </form>
      </section>
    </div>
  );
}

function DetailsModal({
  config,
  record,
  onClose,
}: {
  config: ManagementConfig;
  record: ManagementRow;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/45 p-3 sm:place-items-center">
      <section className="app-card max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[1.5rem] p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[var(--gold)]">تفاصيل السجل</p>
            <h2 className="mt-1 text-xl font-bold text-[var(--primary-dark)]">
              {String(record.title ?? record.full_name ?? config.title)}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-2xl border border-[var(--line)] bg-[#fffdf8]" aria-label="إغلاق">
            <X aria-hidden className="size-5" />
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {config.fields.map((field) => (
            <div key={field.name} className={field.kind === "textarea" ? "md:col-span-2" : ""}>
              <p className="text-xs font-bold text-[#81928b]">{field.label}</p>
              <div className="mt-1 min-h-11 rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 py-3 text-sm font-semibold leading-7 text-[var(--text)]">
                {renderValue(
                  record[field.name],
                  field.name === "status"
                    ? "status"
                    : field.kind === "date"
                      ? "date"
                      : field.kind === "time"
                        ? "time"
                        : field.kind === "number"
                          ? "money"
                          : "text",
                  config,
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function FormField({ field, value }: { field: ManagementField; value: unknown }) {
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
    <button type="button" onClick={onClick} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[#fffdf8] px-3 text-xs font-semibold text-[var(--primary-dark)] hover:border-[var(--gold)]">
      <Edit3 aria-hidden className="size-4" />
      تعديل
    </button>
  );
}

function ViewButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-white px-3 text-xs font-semibold text-[var(--primary-dark)] hover:border-[var(--gold)]">
      <Eye aria-hidden className="size-4" />
      عرض
    </button>
  );
}

function OpenLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--gold)]/50 bg-[#fff8e6] px-3 text-xs font-semibold text-[#765514] hover:border-[var(--gold)]">
      {label}
    </a>
  );
}

function ArchiveButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 text-xs font-semibold text-red-700 hover:border-red-200">
      <Archive aria-hidden className="size-4" />
      حذف
    </button>
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

function renderValue(value: unknown, kind: ManagementConfig["columns"][number]["kind"], config: ManagementConfig) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-[#98a69f]">غير محدد</span>;
  }
  if (kind === "money") return <span className="font-semibold text-[var(--primary-dark)]">{money(Number(value))}</span>;
  if (kind === "date") return new Intl.DateTimeFormat("ar-SA").format(new Date(String(value)));
  if (kind === "time") return String(value).slice(0, 5);
  if (kind === "status") {
    const allOptions = [...config.statusOptions, ...(config.typeOptions ?? [])];
    const label = allOptions.find((option) => option.value === value)?.label ?? cleanDisplayText(value);
    return <span className="inline-flex rounded-full bg-[#e8f5ee] px-3 py-1 text-xs font-semibold text-[var(--primary-dark)]">{label}</span>;
  }
  return cleanDisplayText(value);
}

function cleanDisplayText(value: unknown) {
  return String(value)
    .replace(/\s*-\s*Codex\b/gi, "")
    .replace(/\bCodex\b/gi, "النظام")
    .replace(/\bdraft\b/gi, "مسودة")
    .replace(/\bapproved\b/gi, "معتمد")
    .replace(/\barchived\b/gi, "مؤرشف")
    .replace(/\bpending\b/gi, "قيد المراجعة")
    .trim();
}
