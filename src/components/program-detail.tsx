"use client";

import Link from "next/link";
import { Edit3, Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { saveProgramEntity } from "@/app/dashboard/programs/actions";
import { CompetitionWinnersTransferManager } from "@/components/competition-winners-transfer-manager";
import { paginate, PaginationControls } from "@/components/pagination-controls";
import { money } from "@/lib/format";
import { programStatusLabels, programTypeLabels } from "@/lib/program-labels";
import type {
  ProgramDetails,
  ProgramReport,
} from "@/lib/programs";

type Entity =
  | "participants"
  | "committees"
  | "tasks"
  | "expenses"
  | "reports"
  | "attachments"
  | "rounds"
  | "criteria"
  | "scores"
  | "awards"
  | "winners";
type AnyRow = Record<string, unknown> & { id: string };

const tabs = [
  "overview",
  "participants",
  "committees",
  "rounds",
  "judging",
  "winners",
  "expenses",
  "reports",
  "attachments",
] as const;

const tabLabels: Record<(typeof tabs)[number], string> = {
  overview: "نظرة عامة",
  participants: "المشاركون",
  committees: "اللجان",
  rounds: "المراحل والجولات",
  judging: "التحكيم والدرجات",
  winners: "الفائزون والجوائز",
  expenses: "المصروفات",
  reports: "التقارير",
  attachments: "المرفقات",
};

export function ProgramDetail({
  details,
  canManageWinnerTransfers = false,
  canViewWinnerTransferDetails = false,
}: {
  details: ProgramDetails;
  canManageWinnerTransfers?: boolean;
  canViewWinnerTransferDetails?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("overview");
  const { program } = details;

  if (!program) {
    return (
      <div className="app-card rounded-[1.6rem] p-8 text-center">
        <h1 className="text-xl font-bold text-[var(--primary-dark)]">لم يتم العثور على البرنامج</h1>
        <Link href="/dashboard/programs" className="gold-button mt-5 inline-flex min-h-11 items-center rounded-2xl px-5 text-sm font-semibold text-white">
          العودة للبرامج
        </Link>
      </div>
    );
  }

  const allExpenses = [...details.expenses, ...details.linkedFinanceExpenses];
  const totalExpenses = allExpenses.reduce((total, expense) => total + Number(expense.amount ?? 0), 0);

  return (
    <div className="space-y-5">
      <section className="dashboard-hero luxury-pattern overflow-hidden rounded-[1.8rem] text-white shadow-2xl shadow-[#053828]/15">
        <div className="relative p-5 sm:p-7">
          <p className="mb-2 text-sm font-semibold text-[var(--gold-soft)]">
            {programTypeLabels[program.type] ?? program.type}
          </p>
          <h1 className="text-2xl font-bold sm:text-4xl">{program.name}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[#d9eee5]">{program.description ?? "لا يوجد وصف محفوظ لهذا البرنامج."}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <HeroStat label="الحالة" value={programStatusLabels[program.status] ?? program.status} />
            <HeroStat label="الداعم" value={program.sponsor_name ?? "غير محدد"} />
            <HeroStat label="الميزانية" value={money(program.estimated_budget)} />
            <HeroStat label="المصروفات" value={money(totalExpenses)} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat label="المشاركون" value={details.participants.length} />
        <MiniStat label="اللجان" value={details.committees.length} />
        <MiniStat label="المهام" value={details.tasks.length} />
        <MiniStat label="الجولات" value={details.rounds.length} />
        <MiniStat label="الفائزون" value={details.winners.length} />
      </section>

      <section className="app-card overflow-hidden rounded-[1.6rem]">
        <div className="flex gap-2 overflow-x-auto border-b border-[var(--line)] p-3">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`min-h-11 shrink-0 rounded-2xl px-4 text-xs font-semibold ${
                activeTab === tab
                  ? "bg-[var(--primary-dark)] text-white"
                  : "border border-[var(--line)] bg-[#fffdf8] text-[var(--primary-dark)]"
              }`}
            >
              {tabLabels[tab]}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-5">
          {activeTab === "overview" ? (
            <Overview details={details} totalExpenses={totalExpenses} />
          ) : activeTab === "participants" ? (
            <EntityPanel
              entity="participants"
              programId={program.id}
              title="المشاركون"
              rows={details.participants}
              columns={[
                ["participant_name", "الاسم"],
                ["participant_type", "النوع"],
                ["status", "الحالة"],
                ["notes", "ملاحظات"],
              ]}
              fields={participantFields}
            />
          ) : activeTab === "committees" ? (
            <EntityPanel
              entity="committees"
              programId={program.id}
              title="اللجان"
              rows={details.committees}
              columns={[
                ["name", "اللجنة"],
                ["member_name", "العضو"],
                ["role", "الدور"],
                ["phone", "الجوال"],
              ]}
              fields={committeeFields}
            />
          ) : activeTab === "expenses" ? (
            <EntityPanel
              entity="expenses"
              programId={program.id}
              title="مصروفات البرنامج"
              rows={details.expenses}
              columns={[
                ["expense_date", "التاريخ"],
                ["category", "التصنيف"],
                ["amount", "المبلغ"],
                ["status", "الحالة"],
              ]}
              fields={expenseFields}
            />
          ) : activeTab === "reports" ? (
            <ReportsPanel programId={program.id} reports={details.reports} details={details} totalExpenses={totalExpenses} />
          ) : activeTab === "attachments" ? (
            <EntityPanel
              entity="attachments"
              programId={program.id}
              title="Metadata المرفقات"
              rows={details.attachments}
              columns={[
                ["file_name", "اسم الملف"],
                ["file_type", "النوع"],
                ["file_size", "الحجم"],
                ["notes", "ملاحظات"],
              ]}
              fields={attachmentFields}
            />
          ) : activeTab === "rounds" ? (
            <EntityPanel
              entity="rounds"
              programId={program.id}
              title="المراحل والجولات"
              rows={details.rounds}
              columns={[
                ["name", "الجولة"],
                ["round_order", "الترتيب"],
                ["start_date", "البداية"],
                ["end_date", "النهاية"],
                ["status", "الحالة"],
              ]}
              fields={roundFields}
            />
          ) : activeTab === "judging" ? (
            <JudgingPanel details={details} />
          ) : activeTab === "winners" ? (
            <WinnersPanel
              details={details}
              canManageWinnerTransfers={canManageWinnerTransfers}
              canViewWinnerTransferDetails={canViewWinnerTransferDetails}
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}

function JudgingPanel({ details }: { details: ProgramDetails }) {
  const participantOptions = toOptions(details.participants, "participant_name");
  const roundOptions = toOptions(details.rounds, "name");
  const criteriaOptions = toOptions(details.criteria, "name");
  const ranked = details.participants
    .map((participant) => {
      const total = details.scores
        .filter((score) => score.participant_id === participant.id)
        .reduce((sum, score) => {
          const criterion = details.criteria.find((item) => item.id === score.criterion_id);
          return sum + Number(score.score ?? 0) * Number(criterion?.weight ?? 1);
        }, 0);
      return { participant, total };
    })
    .sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-4">
      <EntityPanel
        entity="criteria"
        programId={details.program!.id}
        title="معايير التقييم"
        rows={details.criteria}
        columns={[
          ["name", "المعيار"],
          ["max_score", "الدرجة العظمى"],
          ["weight", "الوزن"],
          ["notes", "ملاحظات"],
        ]}
        fields={criteriaFields}
      />
      <EntityPanel
        entity="scores"
        programId={details.program!.id}
        title="إدخال الدرجات"
        rows={details.scores}
        columns={[
          ["participant_id", "المشارك"],
          ["round_id", "الجولة"],
          ["criterion_id", "المعيار"],
          ["judge_name", "المحكم"],
          ["score", "الدرجة"],
        ]}
        fields={scoreFields(participantOptions, roundOptions, criteriaOptions)}
        valueLabels={{ ...participantOptions, ...roundOptions, ...criteriaOptions }}
      />
      <section className="rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-5">
        <h2 className="text-lg font-bold text-[var(--primary-dark)]">الترتيب حسب مجموع الدرجات</h2>
        <div className="mt-4 grid gap-2">
          {ranked.length === 0 ? (
            <p className="text-sm font-bold text-[var(--muted)]">لا توجد درجات بعد.</p>
          ) : (
            ranked.map((item, index) => (
              <div key={item.participant.id} className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-white p-3 text-sm font-bold">
                <span>{index + 1}. {item.participant.participant_name}</span>
                <span className="text-[var(--primary-dark)]">{item.total.toFixed(2)}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function WinnersPanel({
  details,
  canManageWinnerTransfers,
  canViewWinnerTransferDetails,
}: {
  details: ProgramDetails;
  canManageWinnerTransfers: boolean;
  canViewWinnerTransferDetails: boolean;
}) {
  const participantOptions = toOptions(details.participants, "participant_name");
  const awardOptions = toOptions(details.awards, "name");
  return (
    <div className="space-y-4">
      {details.program ? (
        <CompetitionWinnersTransferManager
          program={details.program}
          winners={details.winners}
          canManage={canManageWinnerTransfers}
          canViewSensitive={canViewWinnerTransferDetails}
        />
      ) : null}
      <EntityPanel
        entity="awards"
        programId={details.program!.id}
        title="الجوائز"
        rows={details.awards}
        columns={[
          ["name", "الجائزة"],
          ["rank", "الترتيب"],
          ["prize_amount", "المبلغ"],
          ["prize_description", "الوصف"],
        ]}
        fields={awardFields}
      />
      <EntityPanel
        entity="winners"
        programId={details.program!.id}
        title="الفائزون"
        rows={details.winners}
        columns={[
          ["winner_name", "الفائز"],
          ["rank_level", "المركز والمستوى"],
          ["prize_amount", "مبلغ الجائزة"],
          ["transfer_status", "حالة التحويل"],
          ["notes", "ملاحظات"],
        ]}
        fields={winnerFields(participantOptions, awardOptions)}
        valueLabels={{ ...participantOptions, ...awardOptions, ...winnerTransferStatusLabels }}
      />
    </div>
  );
}

function Overview({ details, totalExpenses }: { details: ProgramDetails; totalExpenses: number }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
      <div className="rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-5">
        <h2 className="text-lg font-bold text-[var(--primary-dark)]">ملخص البرنامج</h2>
        <div className="mt-4 grid gap-3 text-sm font-bold text-[var(--muted)]">
          <p>عدد المشاركين: {details.participants.length}</p>
          <p>عدد اللجان: {details.committees.length}</p>
          <p>عدد المهام: {details.tasks.length}</p>
          <p>إجمالي المصروفات: {money(totalExpenses)}</p>
        </div>
      </div>
      <EntityPanel
        entity="tasks"
        programId={details.program!.id}
        title="المهام"
        rows={details.tasks}
        compact
        columns={[
          ["title", "المهمة"],
          ["assigned_to", "المسؤول"],
          ["due_date", "الاستحقاق"],
          ["status", "الحالة"],
        ]}
        fields={taskFields}
      />
    </div>
  );
}

function ReportsPanel({
  programId,
  reports,
  details,
  totalExpenses,
}: {
  programId: string;
  reports: ProgramReport[];
  details: ProgramDetails;
  totalExpenses: number;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-5">
        <h2 className="text-lg font-bold text-[var(--primary-dark)]">تقرير مبدئي للعرض</h2>
        <div className="mt-4 grid gap-2 text-sm font-bold text-[var(--muted)] sm:grid-cols-2">
          <p>المشاركون: {details.participants.length}</p>
          <p>اللجان: {details.committees.length}</p>
          <p>المهام: {details.tasks.length}</p>
          <p>المصروفات: {money(totalExpenses)}</p>
        </div>
        <p className="mt-4 rounded-2xl border border-dashed border-[var(--line)] bg-white p-3 text-xs font-bold text-[var(--muted)]">
          هذا تقرير عرض داخل النظام فقط. لا توجد ملفات قابلة للطباعة في هذه المرحلة.
        </p>
      </div>
      <EntityPanel
        entity="reports"
        programId={programId}
        title="التقارير المحفوظة"
        rows={reports}
        columns={[
          ["title", "العنوان"],
          ["report_type", "النوع"],
          ["summary", "الملخص"],
        ]}
        fields={reportFields}
      />
    </div>
  );
}

function EntityPanel<T extends AnyRow>({
  entity,
  programId,
  title,
  rows,
  columns,
  fields,
  compact = false,
  valueLabels = {},
}: {
  entity: Entity;
  programId: string;
  title: string;
  rows: T[];
  columns: Array<[string, string]>;
  fields: FieldConfig[];
  compact?: boolean;
  valueLabels?: Record<string, string>;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editing, setEditing] = useState<T | null>(null);
  const [adding, setAdding] = useState(false);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return rows.filter((row) => {
      const haystack = Object.values(row).join(" ").toLowerCase();
      return (!normalized || haystack.includes(normalized)) && (!status || row.status === status);
    });
  }, [query, rows, status]);
  const paginated = paginate(filtered, page, pageSize);

  return (
    <section className={`rounded-2xl border border-[var(--line)] bg-white ${compact ? "p-4" : "overflow-hidden"}`}>
      <div className="flex flex-col gap-3 border-b border-[var(--line)] p-4 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-lg font-bold text-[var(--primary-dark)]">{title}</h2>
        <button type="button" onClick={() => setAdding(true)} className="gold-button inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-xs font-semibold text-white">
          <Plus aria-hidden className="size-4" />
          إضافة
        </button>
      </div>

      <div className="grid gap-3 border-b border-[var(--line)] bg-white/72 p-4 md:grid-cols-[1fr_auto]">
        <label className="relative block">
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder={`بحث في ${title}...`}
            className="h-11 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 pl-10 text-sm font-semibold outline-none focus:border-[var(--gold)]"
          />
          <Search aria-hidden className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--gold)]" />
        </label>
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          className="h-11 rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 text-sm font-bold text-[var(--primary-dark)]"
        >
          <option value="">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="inactive">غير نشط</option>
          <option value="completed">مكتمل</option>
          <option value="draft">مسودة</option>
          <option value="approved">معتمد</option>
        </select>
      </div>

      {rows.length === 0 ? (
        <p className="p-6 text-center text-sm font-bold text-[var(--muted)]">لا توجد بيانات محفوظة في هذا التبويب.</p>
      ) : (
        <>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[820px] text-right text-sm">
              <thead className="bg-[#f4f0e6] text-[#31564d]">
                <tr>
                  {columns.map(([key, label]) => <th key={key} className="px-5 py-4 font-semibold">{label}</th>)}
                  <th className="px-5 py-4 font-semibold">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {paginated.items.map((row) => (
                  <tr key={row.id} className="transition hover:bg-[#fbf6ea]">
                    {columns.map(([key]) => <td key={key} className="px-5 py-4">{renderValue(row[key], valueLabels)}</td>)}
                    <td className="px-5 py-4"><EditButton onClick={() => setEditing(row)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 p-4 lg:hidden">
            {paginated.items.map((row) => (
              <article key={row.id} className="resource-mobile-card p-4">
                {columns.map(([key, label]) => (
                  <div key={key} className="py-2">
                    <p className="text-xs font-bold text-[#81928b]">{label}</p>
                    <p className="mt-1 break-words text-sm font-semibold text-[var(--text)]">{renderValue(row[key], valueLabels)}</p>
                  </div>
                ))}
                <div className="mt-3 border-t border-[var(--line)] pt-3">
                  <EditButton onClick={() => setEditing(row)} />
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

      {adding ? <EntityModal entity={entity} programId={programId} fields={fields} title={`إضافة ${title}`} onClose={() => setAdding(false)} /> : null}
      {editing ? <EntityModal entity={entity} programId={programId} fields={fields} record={editing} title={`تعديل ${title}`} onClose={() => setEditing(null)} /> : null}
    </section>
  );
}

function EntityModal({
  entity,
  programId,
  fields,
  record,
  title,
  onClose,
}: {
  entity: Entity;
  programId: string;
  fields: FieldConfig[];
  record?: AnyRow;
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/45 p-3 sm:place-items-center">
      <section className="app-card max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[1.5rem] p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[var(--gold)]">إدخال آمن</p>
            <h2 className="mt-1 text-xl font-bold text-[var(--primary-dark)]">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-2xl border border-[var(--line)] bg-[#fffdf8]" aria-label="إغلاق">
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <form action={saveProgramEntity} className="mt-5 grid gap-4 md:grid-cols-2">
          <input type="hidden" name="entity" value={entity} />
          <input type="hidden" name="program_id" value={programId} />
          {record?.id ? <input type="hidden" name="id" value={record.id} /> : null}
          {fields.map((field) => <FormField key={field.name} field={field} value={record?.[field.name]} />)}
          <div className="md:col-span-2">
            <button className="gold-button h-12 rounded-2xl px-7 text-sm font-semibold text-white">حفظ</button>
          </div>
        </form>
      </section>
    </div>
  );
}

type FieldConfig = {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: Record<string, string>;
  textarea?: boolean;
};

function FormField({ field, value }: { field: FieldConfig; value: unknown }) {
  const baseClass = "mt-2 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 text-sm font-semibold outline-none focus:border-[var(--gold)]";
  return (
    <label className={`block text-sm font-bold text-[var(--text)] ${field.textarea ? "md:col-span-2" : ""}`}>
      {field.label}
      {field.required ? <span className="text-[var(--danger)]"> *</span> : null}
      {field.options ? (
        <select name={field.name} defaultValue={String(value ?? "")} className={`${baseClass} h-12`}>
          <option value="">اختر</option>
          {Object.entries(field.options).map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}
        </select>
      ) : field.textarea ? (
        <textarea name={field.name} defaultValue={String(value ?? "")} rows={3} className={`${baseClass} py-3`} />
      ) : (
        <input name={field.name} type={field.type ?? "text"} defaultValue={String(value ?? "")} required={field.required} step={field.type === "number" ? "0.01" : undefined} className={`${baseClass} h-12`} />
      )}
    </label>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
      <p className="text-xs font-bold text-[#d9eee5]">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-card rounded-[1.5rem] p-5">
      <p className="text-sm font-semibold text-[#6f8179]">{label}</p>
      <p className="mt-3 text-3xl font-bold text-[var(--primary-dark)]">{value}</p>
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

function renderValue(value: unknown, valueLabels: Record<string, string> = {}) {
  if (value === null || value === undefined || value === "") return "غير محدد";
  if (typeof value === "string" && valueLabels[value]) return valueLabels[value];
  if (typeof value === "number") return money(value);
  return String(value);
}

function toOptions<T extends { id: string }>(rows: T[], key: keyof T) {
  return Object.fromEntries(rows.map((row) => [row.id, String(row[key] ?? row.id)]));
}

const participantFields: FieldConfig[] = [
  { name: "participant_type", label: "نوع المشارك", options: { student: "طالب", teacher: "معلم", school: "مدرسة", mosque: "مسجد", external: "خارجي" } },
  { name: "participant_name", label: "اسم المشارك", required: true },
  { name: "related_student_id", label: "معرف الطالب المرتبط" },
  { name: "related_teacher_id", label: "معرف المعلم المرتبط" },
  { name: "related_mosque_id", label: "معرف المسجد المرتبط" },
  { name: "status", label: "الحالة", options: { active: "نشط", inactive: "غير نشط", withdrawn: "منسحب", completed: "مكتمل" } },
  { name: "notes", label: "ملاحظات", textarea: true },
];

const committeeFields: FieldConfig[] = [
  { name: "name", label: "اسم اللجنة", required: true },
  { name: "member_name", label: "اسم العضو", required: true },
  { name: "role", label: "الدور", options: { "رئيس اللجنة": "رئيس اللجنة", "عضو": "عضو", "محكم": "محكم", "منسق": "منسق", "إداري": "إداري" } },
  { name: "phone", label: "الجوال" },
  { name: "notes", label: "ملاحظات", textarea: true },
];

const taskFields: FieldConfig[] = [
  { name: "title", label: "المهمة", required: true },
  { name: "assigned_to", label: "المسؤول" },
  { name: "due_date", label: "تاريخ الاستحقاق", type: "date" },
  { name: "status", label: "الحالة", options: { pending: "بانتظار", in_progress: "قيد التنفيذ", completed: "مكتمل", cancelled: "ملغى" } },
  { name: "priority", label: "الأولوية", options: { low: "منخفضة", medium: "متوسطة", high: "عالية" } },
  { name: "description", label: "الوصف", textarea: true },
];

const expenseFields: FieldConfig[] = [
  { name: "expense_date", label: "التاريخ", type: "date" },
  { name: "amount", label: "المبلغ", type: "number", required: true },
  { name: "category", label: "التصنيف" },
  { name: "payment_method", label: "طريقة الدفع" },
  { name: "reference_number", label: "رقم المرجع" },
  { name: "status", label: "الحالة", options: { draft: "مسودة", approved: "معتمد", rejected: "مرفوض" } },
  { name: "description", label: "الوصف", textarea: true },
];

const reportFields: FieldConfig[] = [
  { name: "title", label: "عنوان التقرير", required: true },
  { name: "report_type", label: "نوع التقرير" },
  { name: "summary", label: "الملخص", textarea: true },
];

const attachmentFields: FieldConfig[] = [
  { name: "file_name", label: "اسم الملف", required: true },
  { name: "file_type", label: "نوع الملف" },
  { name: "file_size", label: "حجم الملف", type: "number" },
  { name: "related_table", label: "الجدول المرتبط" },
  { name: "related_id", label: "معرف السجل المرتبط" },
  { name: "storage_path", label: "مسار التخزين المستقبلي" },
  { name: "notes", label: "ملاحظات", textarea: true },
];

const roundFields: FieldConfig[] = [
  { name: "name", label: "اسم الجولة", required: true },
  { name: "round_order", label: "ترتيب الجولة", type: "number" },
  { name: "start_date", label: "تاريخ البداية", type: "date" },
  { name: "end_date", label: "تاريخ النهاية", type: "date" },
  { name: "status", label: "الحالة", options: { planned: "مخططة", active: "نشطة", completed: "مكتملة", cancelled: "ملغاة" } },
  { name: "notes", label: "ملاحظات", textarea: true },
];

const criteriaFields: FieldConfig[] = [
  { name: "name", label: "اسم المعيار", required: true },
  { name: "max_score", label: "الدرجة العظمى", type: "number" },
  { name: "weight", label: "الوزن", type: "number" },
  { name: "notes", label: "ملاحظات", textarea: true },
];

function scoreFields(participants: Record<string, string>, rounds: Record<string, string>, criteria: Record<string, string>): FieldConfig[] {
  return [
    { name: "participant_id", label: "المشارك", required: true, options: participants },
    { name: "round_id", label: "الجولة", options: rounds },
    { name: "criterion_id", label: "المعيار", required: true, options: criteria },
    { name: "judge_name", label: "اسم المحكم" },
    { name: "score", label: "الدرجة", type: "number", required: true },
    { name: "notes", label: "ملاحظات", textarea: true },
  ];
}

const awardFields: FieldConfig[] = [
  { name: "name", label: "اسم الجائزة", required: true },
  { name: "rank", label: "الترتيب", type: "number" },
  { name: "prize_amount", label: "مبلغ الجائزة", type: "number" },
  { name: "prize_description", label: "وصف الجائزة", textarea: true },
];

function winnerFields(participants: Record<string, string>, awards: Record<string, string>): FieldConfig[] {
  return [
    { name: "participant_id", label: "المشارك", required: true, options: participants },
    { name: "award_id", label: "الجائزة", options: awards },
    { name: "rank", label: "الترتيب", type: "number" },
    { name: "final_score", label: "الدرجة النهائية", type: "number" },
    { name: "attendance_no", label: "رقم الحضور" },
    { name: "winner_name", label: "اسم الفائز" },
    { name: "rank_level", label: "المركز والمستوى" },
    { name: "iban", label: "الآيبان" },
    { name: "bank_name", label: "البنك" },
    { name: "national_id", label: "الهوية أو الإقامة" },
    { name: "prize_amount", label: "مبلغ الجائزة", type: "number" },
    { name: "transfer_status", label: "حالة التحويل", options: winnerTransferStatusLabels },
    { name: "notes", label: "ملاحظات", textarea: true },
  ];
}

const winnerTransferStatusLabels: Record<string, string> = {
  draft: "مسودة",
  ready: "جاهز للتحويل",
  exported: "تم التصدير",
  paid: "تم التحويل",
};
