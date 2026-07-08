import { createOperationalRecord } from "@/app/dashboard/operational-actions";
import { CsvExportButton } from "@/components/csv-export-button";
import { ResourceList } from "@/components/resource-list";
import type {
  FieldConfig,
  ResourceConfig,
  ResourceRecord,
} from "@/lib/operational-resources";
import type { ReactNode } from "react";

export function ResourcePage({
  config,
  records,
  fields,
  setupRequired,
  message,
  extraActions,
}: {
  config: ResourceConfig;
  records: ResourceRecord[];
  fields: FieldConfig[];
  setupRequired: boolean;
  message?: "created" | "updated" | "missing" | "save";
  extraActions?: ReactNode;
}) {
  return (
    <div className="space-y-5">
      <section className="app-card luxury-pattern overflow-hidden rounded-[1.7rem]">
        <div className="relative border-r-4 border-[var(--gold)] p-5 sm:p-7">
          <p className="mb-2 text-sm font-semibold text-[var(--gold)]">وحدة الحلقات</p>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--primary-dark)] sm:text-4xl">
                {config.title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
                {config.description}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
              <div className="rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 py-3 shadow-sm">
                <p className="text-xs font-bold text-[#6c8178]">السجلات</p>
                <p className="mt-1 text-2xl font-bold text-[var(--primary-dark)]">
                  {records.length}
                </p>
              </div>
              <CsvExportButton
                filename={config.title}
                data={records.map((r) =>
                  Object.fromEntries(
                    config.columns.map(({ key, label }) => [label, String(r[key] ?? "—")])
                  )
                )}
              />
              {extraActions}
              <a
                href="#add-form"
                className="gold-button inline-flex min-h-14 items-center justify-center rounded-2xl px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-[var(--gold)]/25"
              >
                إضافة
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <MiniStat label="الحالة" value={setupRequired ? "بانتظار التهيئة" : "جاهز"} />
        <MiniStat label="العرض" value="جدول وبطاقات" />
        <MiniStat label="الصلاحية" value="إدارة الحلقات" />
      </section>

      {message ? <StatusMessage message={message} /> : null}

      {setupRequired ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-800">
          هذه الوحدة تحتاج تهيئة إدارية قبل استقبال البيانات. تواصل مع مدير
          النظام لإكمال الإعداد دون التأثير على البيانات الحالية.
        </div>
      ) : null}

      <section
        id="add-form"
        className="app-card rounded-[1.6rem] p-5 sm:p-7"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-[var(--gold)]">إدخال سريع</p>
            <h2 className="mt-1 text-lg font-bold text-[var(--primary-dark)]">
              إضافة سجل
            </h2>
          </div>
        </div>
        <form action={createOperationalRecord} className="mt-5 grid gap-4 md:grid-cols-2">
          <input type="hidden" name="resource" value={config.name} />
          {fields.map((field) => (
            <FormField key={field.name} field={field} />
          ))}
          <div className="md:col-span-2">
            <button className="gold-button h-12 rounded-2xl px-7 text-sm font-semibold text-white transition hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-[var(--primary-light)]/20">
              حفظ
            </button>
          </div>
        </form>
      </section>

      {!setupRequired ? <ResourceList config={config} records={records} /> : null}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="app-card rounded-2xl border-r-4 border-[var(--gold)] p-4">
      <p className="text-xs font-bold text-[#809189]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[var(--primary-dark)]">
        {value}
      </p>
    </div>
  );
}

function FormField({ field }: { field: FieldConfig }) {
  const kind = field.kind ?? "text";
  const baseClass =
    "mt-2 h-12 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 text-sm font-semibold text-[var(--text)] outline-none transition focus:border-[var(--gold)] focus:bg-white focus:ring-4 focus:ring-[var(--gold)]/15";

  return (
    <label className="block text-sm font-bold text-[var(--text)]">
      {field.label}
      {field.required ? <span className="text-[var(--danger)]"> *</span> : null}
      {kind === "select" ? (
        <select
          name={field.name}
          className={baseClass}
          defaultValue=""
          required={field.required}
        >
          <option value="">{field.required ? "اختر" : "بدون"}</option>
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          name={field.name}
          type={kind}
          required={field.required}
          placeholder={field.placeholder}
          className={baseClass}
        />
      )}
    </label>
  );
}

function StatusMessage({ message }: { message: "created" | "updated" | "missing" | "save" }) {
  const messages = {
    created: {
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
      text: "تم حفظ السجل بنجاح.",
    },
    updated: {
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
      text: "تم تحديث السجل بنجاح.",
    },
    missing: {
      className: "border-amber-200 bg-amber-50 text-amber-800",
      text: "يرجى تعبئة الحقول المطلوبة.",
    },
    save: {
      className: "border-red-200 bg-red-50 text-red-700",
      text: "تعذر حفظ السجل. تأكد من الصلاحيات أو تواصل مع مدير النظام.",
    },
  };

  const current = messages[message];

  return (
    <p className={`rounded-2xl border p-4 text-sm font-semibold ${current.className}`}>
      {current.text}
    </p>
  );
}
