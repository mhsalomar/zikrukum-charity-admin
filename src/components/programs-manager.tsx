"use client";

import Link from "next/link";
import { Edit3, Eye, Plus, Search, X } from "lucide-react";
import { CsvExportButton } from "@/components/csv-export-button";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { saveProgram } from "@/app/dashboard/programs/actions";
import { paginate, PaginationControls } from "@/components/pagination-controls";
import { money } from "@/lib/format";
import { programStatusLabels, programTypeLabels } from "@/lib/program-labels";
import type { Program } from "@/lib/programs";

const tabs = [
  { value: "", label: "جميع البرامج" },
  { value: "competition", label: "المسابقات" },
  { value: "summer_course", label: "الدورات" },
  { value: "initiative", label: "المبادرات" },
  { value: "project", label: "المشاريع" },
  { value: "reports", label: "التقارير" },
];

export function ProgramsManager({
  programs,
  initialType = "",
  heroTitle = "برامج الجمعية",
  heroDescription = "إدارة المسابقات والدورات والمبادرات والمشاريع من صفحة واحدة، بدون فصل مربك في القائمة الجانبية.",
}: {
  programs: Program[];
  initialType?: string;
  heroTitle?: string;
  heroDescription?: string;
}) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState(initialType);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Program | null>(null);
  const searchParams = useSearchParams();

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return programs.filter((program) => {
      const haystack = Object.values(program).join(" ").toLowerCase();
      const matchesType = !type || (type === "reports" ? false : program.type === type);
      return (!normalized || haystack.includes(normalized)) && matchesType && (!status || program.status === status);
    });
  }, [programs, query, status, type]);
  const paginated = paginate(filtered, page, pageSize);

  function resetPage() {
    setPage(1);
  }

  return (
    <div className="space-y-5">
      <StatusNotice code={readStatus(searchParams)} />
      <section className="app-card luxury-pattern overflow-hidden rounded-[1.7rem]">
        <div className="relative border-r-4 border-[var(--gold)] p-5 sm:p-7">
          <p className="text-sm font-semibold text-[var(--gold)]">البرامج والمسابقات</p>
          <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--primary-dark)] sm:text-4xl">{heroTitle}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
                {heroDescription}
              </p>
            </div>
            <div className="flex gap-2">
              <CsvExportButton
                filename="البرامج-والمسابقات"
                data={programs.map((p) => ({
                  "الاسم": p.name,
                  "النوع": programTypeLabels[p.type] ?? p.type,
                  "الحالة": programStatusLabels[p.status] ?? p.status,
                  "تاريخ البداية": p.start_date ?? "—",
                  "تاريخ النهاية": p.end_date ?? "—",
                  "الراعي": p.sponsor_name ?? "—",
                  "الميزانية التقديرية": p.estimated_budget ?? 0,
                }))}
              />
              <button type="button" onClick={() => setAdding(true)} className="gold-button inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white">
                <Plus aria-hidden className="size-5" />
                إضافة برنامج
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="app-card overflow-hidden rounded-[1.6rem]">
        <div className="flex gap-2 overflow-x-auto border-b border-[var(--line)] p-3">
          {tabs.map((tab) => (
            <button
              key={tab.value || "all"}
              type="button"
              onClick={() => {
                setType(tab.value);
                resetPage();
              }}
              className={`min-h-11 shrink-0 rounded-2xl px-4 text-xs font-semibold ${
                type === tab.value
                  ? "bg-[var(--primary-dark)] text-white"
                  : "border border-[var(--line)] bg-[#fffdf8] text-[var(--primary-dark)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {type === "reports" ? (
          <div className="p-8 text-center">
            <p className="font-semibold text-[var(--primary-dark)]">تقارير البرامج قيد التفعيل التشغيلي</p>
            <p className="mt-2 text-sm font-semibold text-[var(--muted)]">الجداول موجودة، وسيتم ربط تقارير البرنامج في مرحلة لاحقة بدون ملف قابل للطباعة الآن.</p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 border-b border-[var(--line)] bg-white/72 p-4 lg:grid-cols-[1fr_auto_auto]">
              <label className="relative block">
                <span className="sr-only">بحث</span>
                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    resetPage();
                  }}
                  placeholder="ابحث باسم البرنامج أو الداعم..."
                  className="h-12 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 pl-11 text-sm font-semibold outline-none focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--gold)]/15"
                />
                <Search aria-hidden className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--gold)]" />
              </label>
              <select value={status} onChange={(event) => { setStatus(event.target.value); resetPage(); }} className="h-12 rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 text-sm font-bold text-[var(--primary-dark)] outline-none">
                <option value="">كل الحالات</option>
                {Object.entries(programStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <select value={type} onChange={(event) => { setType(event.target.value); resetPage(); }} className="h-12 rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 text-sm font-bold text-[var(--primary-dark)] outline-none">
                <option value="">كل الأنواع</option>
                {Object.entries(programTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>

            {programs.length === 0 ? (
              <EmptyState title="لا توجد برامج محفوظة" description="أضف مسابقة الشهيد عبدالله الحربي أو دورة المهنا الصيفية عندما تكون جاهزة." />
            ) : filtered.length === 0 ? (
              <EmptyState title="لا توجد نتائج مطابقة" description="غيّر البحث أو خيارات التصفية الحالية." />
            ) : (
              <>
                <div className="hidden overflow-x-auto lg:block">
                  <table className="w-full min-w-[980px] text-right text-sm">
                    <thead className="bg-[#f4f0e6] text-[#31564d]">
                      <tr>
                        <th className="px-5 py-4 font-semibold">البرنامج</th>
                        <th className="px-5 py-4 font-semibold">النوع</th>
                        <th className="px-5 py-4 font-semibold">الفترة</th>
                        <th className="px-5 py-4 font-semibold">الداعم</th>
                        <th className="px-5 py-4 font-semibold">الميزانية</th>
                        <th className="px-5 py-4 font-semibold">الحالة</th>
                        <th className="px-5 py-4 font-semibold">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--line)]">
                      {paginated.items.map((program) => (
                        <tr key={program.id} className="transition hover:bg-[#fbf6ea]">
                          <td className="px-5 py-4">
                            <p className="font-semibold text-[var(--primary-dark)]">{program.name}</p>
                            <p className="mt-1 max-w-md truncate text-xs font-bold text-[var(--muted)]">{program.description ?? "بدون وصف"}</p>
                          </td>
                          <td className="px-5 py-4">{programTypeLabels[program.type] ?? program.type}</td>
                          <td className="px-5 py-4">{dateRange(program)}</td>
                          <td className="px-5 py-4">{program.sponsor_name ?? "غير محدد"}</td>
                          <td className="px-5 py-4">{money(program.estimated_budget)}</td>
                          <td className="px-5 py-4"><StatusBadge value={program.status} /></td>
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-2">
                              <DetailsLink id={program.id} />
                              <EditButton onClick={() => setEditing(program)} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-3 p-4 lg:hidden">
                  {paginated.items.map((program) => (
                    <article key={program.id} className="resource-mobile-card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-[var(--primary-dark)]">{program.name}</h3>
                          <p className="mt-1 text-xs font-bold text-[var(--muted)]">{programTypeLabels[program.type] ?? program.type}</p>
                        </div>
                        <StatusBadge value={program.status} />
                      </div>
                      <div className="mt-4 grid gap-2 text-sm">
                        <Info label="الفترة" value={dateRange(program)} />
                        <Info label="الداعم" value={program.sponsor_name ?? "غير محدد"} />
                        <Info label="الميزانية" value={money(program.estimated_budget)} strong />
                      </div>
                      <div className="mt-4 border-t border-[var(--line)] pt-3">
                        <div className="flex flex-wrap gap-2">
                          <DetailsLink id={program.id} />
                          <EditButton onClick={() => setEditing(program)} />
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
          </>
        )}
      </section>

      {adding ? <ProgramModal title="إضافة برنامج" onClose={() => setAdding(false)} /> : null}
      {editing ? <ProgramModal title="تعديل برنامج" program={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}

function StatusNotice({ code }: { code: string }) {
  if (!code) return null;
  const success = code === "created" || code === "updated";
  const text = success
    ? code === "created"
      ? "تم حفظ البرنامج بنجاح."
      : "تم تحديث البرنامج بنجاح."
    : code === "missing"
      ? "يرجى تعبئة اسم البرنامج."
      : "تعذر حفظ البرنامج. تأكد من الصلاحيات والبيانات.";

  return (
    <p className={`rounded-2xl border p-4 text-sm font-bold ${success ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>
      {text}
    </p>
  );
}

function readStatus(params: ReturnType<typeof useSearchParams>) {
  if (params.get("created")) return "created";
  if (params.get("updated")) return "updated";
  return params.get("error") ?? "";
}

function ProgramModal({ title, program, onClose }: { title: string; program?: Program; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/45 p-3 sm:place-items-center">
      <section className="app-card max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[1.5rem] p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[var(--gold)]">برنامج تشغيلي</p>
            <h2 className="mt-1 text-xl font-bold text-[var(--primary-dark)]">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-2xl border border-[var(--line)] bg-[#fffdf8]" aria-label="إغلاق">
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <form action={saveProgram} className="mt-5 grid gap-4 md:grid-cols-2">
          {program?.id ? <input type="hidden" name="id" value={program.id} /> : null}
          <Field name="name" label="اسم البرنامج" value={program?.name} required />
          <Select name="type" label="النوع" value={program?.type ?? "competition"} options={programTypeLabels} />
          <Field name="start_date" label="تاريخ البداية" value={program?.start_date} type="date" />
          <Field name="end_date" label="تاريخ النهاية" value={program?.end_date} type="date" />
          <Field name="sponsor_name" label="الداعم / الكفيل" value={program?.sponsor_name} />
          <Field name="estimated_budget" label="الميزانية التقديرية" value={program?.estimated_budget} type="number" />
          <Select name="status" label="الحالة" value={program?.status ?? "planned"} options={programStatusLabels} />
          <label className="block text-sm font-bold text-[var(--text)] md:col-span-2">
            الوصف
            <textarea name="description" defaultValue={program?.description ?? ""} rows={3} className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 py-3 text-sm font-semibold outline-none focus:border-[var(--gold)]" />
          </label>
          <label className="block text-sm font-bold text-[var(--text)] md:col-span-2">
            ملاحظات
            <textarea name="notes" defaultValue={program?.notes ?? ""} rows={3} className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 py-3 text-sm font-semibold outline-none focus:border-[var(--gold)]" />
          </label>
          <div className="md:col-span-2">
            <button className="gold-button h-12 rounded-2xl px-7 text-sm font-semibold text-white">حفظ</button>
          </div>
        </form>
      </section>
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

function StatusBadge({ value }: { value: string }) {
  return <span className="inline-flex rounded-full bg-[#e8f5ee] px-3 py-1 text-xs font-semibold text-[var(--primary-dark)]">{programStatusLabels[value] ?? value}</span>;
}

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[#fffdf8] px-3 text-xs font-semibold text-[var(--primary-dark)] hover:border-[var(--gold)]">
      <Edit3 aria-hidden className="size-4" />
      تعديل
    </button>
  );
}

function DetailsLink({ id }: { id: string }) {
  return (
    <Link href={`/dashboard/programs/${id}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--gold)] bg-[#fff8e6] px-3 text-xs font-semibold text-[var(--primary-dark)] hover:border-[var(--primary)]">
      <Eye aria-hidden className="size-4" />
      التفاصيل
    </Link>
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

function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="p-8 text-center">
      <p className="text-base font-semibold text-[var(--primary-dark)]">{title}</p>
      {description ? <p className="mt-2 text-sm font-semibold text-[var(--muted)]">{description}</p> : null}
    </div>
  );
}

function dateRange(program: Program) {
  if (!program.start_date && !program.end_date) return "غير محدد";
  return `${program.start_date ?? "غير محدد"} - ${program.end_date ?? "غير محدد"}`;
}
