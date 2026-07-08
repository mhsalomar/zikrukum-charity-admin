import Link from "next/link";
import { Plus, Printer, ShieldCheck } from "lucide-react";
import { CsvExportButton } from "@/components/csv-export-button";

import { createLaunchRecord } from "@/app/dashboard/launch-core-actions";
import { PageHero, SectionCard } from "@/components/dashboard-ui";
import type { LaunchConfig, LaunchRow } from "@/lib/launch-core";
import { donorRelationshipStages, formatLaunchValue } from "@/lib/launch-core";

export function LaunchRecordsPage({
  config,
  rows,
  error,
  message,
  returnTo,
  filters,
}: {
  config: LaunchConfig;
  rows: LaunchRow[];
  error?: string | null;
  message?: string;
  returnTo?: string;
  filters?: Record<string, string | undefined>;
}) {
  const path = returnTo ?? config.path;
  return (
    <div className="space-y-5">
      <PageHero
        eyebrow={config.eyebrow}
        title={config.title}
        description={config.description}
        actions={
          <div className="flex flex-wrap gap-2">
            {config.printPath ? (
              <Link className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-[var(--line)] bg-white px-5 text-sm font-semibold text-[var(--primary-dark)]" href={config.printPath}>
                <Printer aria-hidden className="size-4" />
                طباعة
              </Link>
            ) : null}
            <CsvExportButton
              filename={config.title}
              data={rows.map((r) =>
                Object.fromEntries(
                  config.columns.map(({ key, label }) => [label, String((r as Record<string, unknown>)[key] ?? "—")])
                )
              )}
            />
            <a className="gold-button inline-flex min-h-12 items-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white" href="#new-record">
              <Plus aria-hidden className="size-4" />
              إضافة
            </a>
          </div>
        }
      />

      {message ? <StatusMessage message={message} /> : null}

      <section className="grid gap-4 md:grid-cols-3">
        <Mini label="عدد السجلات" value={rows.length} />
        <Mini label="حالة الوحدة" value="جاهزة للتشغيل" />
        <Mini label="الحذف" value="أرشفة فقط" />
      </section>

      {config.key === "donors" ? (
        <>
          <DonorPipelineSummary rows={rows} />
          <DonorFilters path={path} filters={filters ?? {}} />
        </>
      ) : null}

      <SectionCard title="السجلات" icon={ShieldCheck}>
        {error ? (
          <Empty text="تعذر تحميل البيانات. تحقق من صلاحياتك أو تواصل مع مدير النظام." />
        ) : rows.length === 0 ? (
          <Empty text="لا توجد بيانات مسجلة حتى الآن. الصفحة جاهزة لاستقبال البيانات الفعلية." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-right text-sm">
              <thead className="bg-[#f4f0e6] text-[#31564d]">
                <tr>
                  {config.columns.map((column) => (
                    <th key={column.key} className="px-5 py-4 font-semibold">{column.label}</th>
                  ))}
                  <th className="px-5 py-4 font-semibold">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-[#fbf6ea]">
                    {config.columns.map((column) => (
                      <td key={column.key} className="px-5 py-4 font-bold text-[var(--text)]">
                        {formatLaunchValue(row[column.key])}
                      </td>
                    ))}
                    <td className="px-5 py-4">
                      {config.printPath ? (
                        <Link className="text-sm font-semibold text-[var(--primary-dark)] underline" href={`${config.path}/${row.id}/print`}>
                          طباعة
                        </Link>
                      ) : config.key === "donors" ? (
                        <Link className="text-sm font-semibold text-[var(--primary-dark)] underline" href={`/dashboard/donors/${row.id}`}>
                          ملف المانح
                        </Link>
                      ) : (
                        <span className="text-xs font-bold text-[var(--muted)]">عرض</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="إضافة سجل" description="إدخال سريع للبيانات الأساسية. يمكن تحسين الربط التفصيلي بعد استقرار التشغيل." action={<span id="new-record" />}>
        <form action={createLaunchRecord} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="config" value={config.key} />
          <input type="hidden" name="returnTo" value={path} />
          {config.fields.map((field) => (
            <Field key={field.name} field={field} />
          ))}
          <div className="md:col-span-2">
            <button className="gold-button min-h-12 rounded-2xl px-7 text-sm font-semibold text-white">
              حفظ السجل
            </button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}

function DonorPipelineSummary({ rows }: { rows: LaunchRow[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekKey = nextWeek.toISOString().slice(0, 10);
  const upcoming = rows.filter((row) => Boolean(row.next_action) && String(row.next_action_date ?? "") >= today && String(row.next_action_date ?? "") <= nextWeekKey);
  const noContact = rows.filter((row) => !row.last_contact_at || (!row.phone && !row.email));
  const followup = rows.filter((row) => row.relationship_stage === "follow_up" || row.relationship_stage === "pledged");

  return (
    <section className="grid gap-3 md:grid-cols-3">
      <Mini label="متابعات خلال 7 أيام" value={upcoming.length} />
      <Mini label="مانحون بلا تواصل" value={noContact.length} />
      <Mini label="مراحل تحتاج متابعة" value={followup.length} />
    </section>
  );
}

function DonorFilters({ path, filters }: { path: string; filters: Record<string, string | undefined> }) {
  return (
    <SectionCard title="خيارات تصفية مسار متابعة المانحين" description="استخدمها لمتابعة المرحلة والإجراء القادم دون تغيير بيانات التبرعات.">
      <form action={path} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <label className="text-sm font-bold text-[var(--text)]">
          مرحلة العلاقة
          <select name="stage" defaultValue={filters.stage ?? ""} className="mt-2 h-12 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 text-sm font-semibold outline-none focus:border-[var(--gold)]">
            <option value="">كل المراحل</option>
            {donorRelationshipStages.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}
          </select>
        </label>
        <label className="text-sm font-bold text-[var(--text)]">
          الإجراء القادم
          <select name="next" defaultValue={filters.next ?? ""} className="mt-2 h-12 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 text-sm font-semibold outline-none focus:border-[var(--gold)]">
            <option value="">الكل</option>
            <option value="upcoming">إجراء خلال 7 أيام</option>
            <option value="missing_contact">بلا آخر تواصل</option>
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button className="gold-button min-h-12 rounded-2xl px-6 text-sm font-semibold text-white">تطبيق التصفية</button>
          <a href={path} className="inline-flex min-h-12 items-center rounded-2xl border border-[var(--line)] bg-white px-5 text-sm font-semibold text-[var(--primary-dark)]">مسح</a>
        </div>
      </form>
    </SectionCard>
  );
}

function Field({ field }: { field: LaunchConfig["fields"][number] }) {
  const base = "mt-2 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 text-sm font-semibold outline-none focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--gold)]/15";
  return (
    <label className={`block text-sm font-bold text-[var(--text)] ${field.type === "textarea" ? "md:col-span-2" : ""}`}>
      {field.label}
      {field.required ? <span className="text-red-600"> *</span> : null}
      {field.type === "textarea" ? (
        <textarea name={field.name} rows={4} required={field.required} className={`${base} py-3`} />
      ) : field.type === "select" ? (
        <select name={field.name} required={field.required} className={`${base} h-12`}>
          <option value="">اختر</option>
          {(field.options ?? []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      ) : (
        <input name={field.name} type={field.type ?? "text"} required={field.required} className={`${base} h-12`} />
      )}
    </label>
  );
}

function Mini({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="app-card rounded-2xl border-r-4 border-[var(--gold)] p-4">
      <p className="text-xs font-bold text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-xl font-bold text-[var(--primary-dark)]">{formatLaunchValue(value)}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-2xl border border-dashed border-[var(--line)] bg-[#fffdf8] p-8 text-center text-sm font-bold text-[var(--muted)]">{text}</p>;
}

function StatusMessage({ message }: { message: string }) {
  const ok = message === "created";
  return (
    <p className={`rounded-2xl border p-4 text-sm font-bold ${ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>
      {ok ? "تم حفظ السجل بنجاح." : "تعذر حفظ السجل. راجع الحقول والصلاحيات."}
    </p>
  );
}
