"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { createTaskDistributionAction } from "@/app/dashboard/tasks/distributions/actions";
import type { TaskPerson } from "@/lib/internal-tasks";

type Row = { key: number; assignee: string; temporaryName: string; title: string; priority: string; dueDate: string; note: string };

type BoardMember = { id: string; name: string };

export function TaskDistributionForm({ people, boardMembers = [] }: { people: TaskPerson[]; boardMembers?: BoardMember[] }) {
  const [rows, setRows] = useState<Row[]>([blankRow(1), blankRow(2), blankRow(3)]);
  const payload = useMemo(() => rows.map((row) => {
    const isBoardMember = row.assignee.startsWith("bm:");
    const isTemporary = row.assignee === "temporary";
    return {
      assignedUserId: isBoardMember || isTemporary ? "" : row.assignee,
      temporaryName: isBoardMember
        ? (boardMembers.find((m) => `bm:${m.id}` === row.assignee)?.name ?? "")
        : isTemporary ? row.temporaryName : "",
      title: row.title, priority: row.priority, dueDate: row.dueDate, note: row.note,
    };
  }), [rows, boardMembers]);
  function update(key: number, field: keyof Row, value: string) { setRows((current) => current.map((row) => row.key === key ? { ...row, [field]: value } : row)); }
  return (
    <form action={createTaskDistributionAction} className="grid gap-5">
      <section className="app-card grid gap-3 rounded-2xl p-5 md:grid-cols-2">
        <Field label="عنوان التوزيع"><input name="title" required className={inputClass} placeholder="مثال: الدورة الصيفية" /></Field>
        <Field label="التاريخ"><input type="date" name="event_date" className={inputClass} /></Field>
        <Field label="المناسبة أو البرنامج"><input name="program_name" className={inputClass} placeholder="اختياري" /></Field>
        <Field label="ملاحظات عامة"><input name="general_notes" className={inputClass} placeholder="اختياري" /></Field>
      </section>
      <section className="app-card rounded-2xl p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-lg font-bold text-[var(--primary-dark)]">جدول توزيع المهام</h2><p className="mt-1 text-sm font-bold text-[var(--muted)]">كل صف سيُحفظ كمهمة مستقلة باسم المسؤول.</p></div>
          <button type="button" onClick={() => setRows((current) => [...current, blankRow(Date.now())])} className="secondary-button inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold"><Plus className="size-4" />إضافة مهمة</button>
        </div>
        <div className="grid gap-3">
          {rows.map((row, index) => (
            <article key={row.key} className="grid gap-3 rounded-2xl border border-[var(--border)] bg-white p-4 lg:grid-cols-[1.1fr_1.3fr_0.65fr_0.8fr_1fr_auto]">
              <Field label={`المسؤول ${index + 1}`}><select value={row.assignee} onChange={(e) => update(row.key, "assignee", e.target.value)} className={inputClass}><option value="">اختر المسؤول</option>{people.length > 0 && <optgroup label="مستخدمو النظام">{people.map((person) => <option key={person.userId} value={person.userId}>{person.name}</option>)}</optgroup>}{boardMembers.length > 0 && <optgroup label="أعضاء مجلس الإدارة">{boardMembers.map((m) => <option key={m.id} value={`bm:${m.id}`}>{m.name}</option>)}</optgroup>}<option value="temporary">إضافة اسم مؤقت</option></select>{row.assignee === "temporary" ? <input value={row.temporaryName} onChange={(e) => update(row.key, "temporaryName", e.target.value)} className={inputClass} placeholder="الاسم المؤقت" /> : null}</Field>
              <Field label="المهمة"><input value={row.title} onChange={(e) => update(row.key, "title", e.target.value)} className={inputClass} placeholder="وصف المهمة المختصر" /></Field>
              <Field label="الأولوية"><select value={row.priority} onChange={(e) => update(row.key, "priority", e.target.value)} className={inputClass}><option value="normal">عادية</option><option value="important">مهمة</option><option value="urgent">عاجلة</option></select></Field>
              <Field label="الاستحقاق"><input type="date" value={row.dueDate} onChange={(e) => update(row.key, "dueDate", e.target.value)} className={inputClass} /></Field>
              <Field label="ملاحظة"><input value={row.note} onChange={(e) => update(row.key, "note", e.target.value)} className={inputClass} /></Field>
              <button type="button" aria-label="حذف الصف" onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))} className="mt-6 grid size-11 place-items-center rounded-xl border border-red-200 text-red-700"><Trash2 className="size-4" /></button>
            </article>
          ))}
        </div>
      </section>
      <input type="hidden" name="rows" value={JSON.stringify(payload)} />
      <button className="primary-button min-h-12 rounded-xl px-6 text-sm font-semibold">حفظ توزيع المهام</button>
    </form>
  );
}
const inputClass = "mt-1 min-h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-bold outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-emerald-100";
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="text-xs font-semibold text-[var(--primary-dark)]">{label}{children}</label>; }
function blankRow(key: number): Row { return { key, assignee: "", temporaryName: "", title: "", priority: "normal", dueDate: "", note: "" }; }
