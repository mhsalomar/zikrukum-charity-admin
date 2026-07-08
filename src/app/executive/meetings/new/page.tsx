"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { ArrowRight, ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Check } from "lucide-react";
import Link from "next/link";

type BoardMember = {
  id: string;
  full_name: string;
  position: string;
  signature_url: string | null;
};

type AgendaItem = { id: string; title: string; notes: string };
type Decision = { id: string; content: string; agenda_item_id: string; status: "approved" | "follow_up" | "postponed" };
type TableRow = { item: string; amount: string; notes: string };
type AttachedTable = { id: string; title: string; rows: TableRow[] };

const STEPS = ["بيانات الاجتماع", "الحضور", "المحاور", "القرارات", "الجداول", "التواقيع"];

const MEETING_TYPES = [
  { value: "board", label: "مجلس إدارة" },
  { value: "committee", label: "لجنة" },
  { value: "work_team", label: "فريق عمل" },
  { value: "general_assembly", label: "جمعية عمومية" },
  { value: "other", label: "أخرى" },
];

const STATUS_OPTIONS = [
  { value: "draft", label: "مسودة" },
  { value: "approved", label: "معتمد" },
  { value: "cancelled", label: "ملغي" },
];

const DECISION_STATUS = [
  { value: "approved", label: "معتمد" },
  { value: "follow_up", label: "للمتابعة" },
  { value: "postponed", label: "مؤجل" },
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export default function NewMeetingPage() {
  const supabase = createClient();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [validationMessage, setValidationMessage] = useState("");

  // Step 1
  const [form, setForm] = useState({
    title: "",
    meeting_number: "",
    meeting_type: "board",
    meeting_date: "",
    start_time: "",
    end_time: "",
    location: "",
    chair_name: "",
    status: "draft",
  });

  // Step 2
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});

  // Step 3
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);

  // Step 4
  const [decisions, setDecisions] = useState<Decision[]>([]);

  // Step 5
  const [tables, setTables] = useState<AttachedTable[]>([]);

  // Step 6
  const [signatures, setSignatures] = useState<Record<string, boolean>>({});

  useEffect(() => {
    supabase
      .from("board_members")
      .select("id,full_name,position,signature_url,status")
      .eq("status", "active")
      .is("archived_at", null)
      .order("full_name")
      .then(({ data }) => {
        if (data) {
          setBoardMembers(data);
          const att: Record<string, boolean> = {};
          data.forEach((m) => { att[m.id] = true; });
          setAttendance(att);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const { data: meeting, error } = await supabase
        .from("meetings")
        .insert({ ...form })
        .select("id")
        .single();
      if (error || !meeting) throw error;
      const mid = meeting.id;

      // Attendance
      if (boardMembers.length > 0) {
        await supabase.from("meeting_attendance").insert(
          boardMembers.map((m) => ({ meeting_id: mid, board_member_id: m.id, is_present: attendance[m.id] ?? true }))
        );
      }

      // Agenda
      if (agenda.length > 0) {
        await supabase.from("meeting_agenda_items").insert(
          agenda.map((a, i) => ({ meeting_id: mid, order_num: i + 1, title: a.title, notes: a.notes || null }))
        );
      }

      // Decisions
      if (decisions.length > 0) {
        const { data: savedAgenda } = await supabase
          .from("meeting_agenda_items")
          .select("id,order_num")
          .eq("meeting_id", mid)
          .order("order_num");

        await supabase.from("meeting_decisions_structured").insert(
          decisions.map((d, i) => {
            const agendaIndex = agenda.findIndex((a) => a.id === d.agenda_item_id);
            const savedItem = savedAgenda?.[agendaIndex];
            return {
              meeting_id: mid,
              order_num: i + 1,
              content: d.content,
              status: d.status,
              agenda_item_id: savedItem?.id ?? null,
            };
          })
        );
      }

      // Tables
      for (const t of tables) {
        await supabase.from("meeting_attached_tables").insert({
          meeting_id: mid,
          title: t.title,
          rows: t.rows,
        });
      }

      // Signatures
      const sigMembers = boardMembers.filter((m) => attendance[m.id] && m.signature_url && signatures[m.id]);
      if (sigMembers.length > 0) {
        await supabase.from("meeting_signatures").insert(
          sigMembers.map((m) => ({
            meeting_id: mid,
            board_member_id: m.id,
            signature_image_url: m.signature_url,
          }))
        );
      }

      setSavedId(mid);
    } finally {
      setSaving(false);
    }
  }

  if (savedId) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center" dir="rtl">
        <div className="flex size-20 items-center justify-center rounded-full bg-[#f0f7f5]">
          <Check className="size-10 text-[#075f4d]" />
        </div>
        <h2 className="text-2xl font-bold text-[#075f4d]">تم إنشاء الاجتماع بنجاح</h2>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href={`/executive/meetings/${savedId}/minutes`}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#075f4d] px-6 py-3 text-sm font-semibold text-white"
          >
            فتح محضر الاجتماع
          </Link>
          <Link
            href={`/minutes-print/${savedId}`}
            target="_blank"
            className="inline-flex items-center gap-2 rounded-2xl border border-[var(--gold)]/50 bg-[#fff8e6] px-6 py-3 text-sm font-semibold text-[#765514]"
          >
            طباعة المحضر
          </Link>
          <Link
            href="/executive/meetings"
            className="inline-flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-6 py-3 text-sm font-semibold text-[var(--primary-dark)]"
          >
            العودة للقائمة
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/executive/meetings" className="inline-flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 py-2 text-xs font-semibold text-[var(--primary-dark)]">
          <ArrowRight className="size-4" />
          العودة
        </Link>
        <h1 className="text-xl font-bold text-[var(--primary-dark)]">إضافة اجتماع ومحضر</h1>
      </div>

      {/* Steps indicator */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {STEPS.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => i < step ? setStep(i) : undefined}
            className={`flex-shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
              i === step
                ? "bg-[#075f4d] text-white"
                : i < step
                  ? "bg-[#e8f4f1] text-[#075f4d] cursor-pointer"
                  : "bg-[var(--bg-sunken)] text-[var(--ink-4)]"
            }`}
          >
            {i + 1}. {s}
          </button>
        ))}
      </div>

      {/* Step content */}
      <div className="app-card rounded-[1.4rem] p-6">
        {/* Step 1: بيانات الاجتماع */}
        {step === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <h2 className="col-span-full text-base font-semibold text-[#075f4d]">بيانات الاجتماع</h2>
            {[
              { name: "title", label: "عنوان الاجتماع", required: true, colSpan: true },
              { name: "meeting_number", label: "رقم الاجتماع" },
              { name: "meeting_date", label: "التاريخ", type: "date", required: true },
              { name: "start_time", label: "وقت البداية", type: "time" },
              { name: "end_time", label: "وقت النهاية", type: "time" },
              { name: "location", label: "المكان" },
              { name: "chair_name", label: "رئيس الاجتماع" },
            ].map(({ name, label, required, colSpan, type }) => (
              <div key={name} className={colSpan ? "col-span-full" : ""}>
                <label className="mb-1 block text-xs font-semibold text-[var(--primary-dark)]">
                  {label}{required && <span className="text-red-500"> *</span>}
                </label>
                <input
                  type={type ?? "text"}
                  required={required}
                  value={form[name as keyof typeof form]}
                  onChange={(e) => setForm((p) => ({ ...p, [name]: e.target.value }))}
                  className="h-11 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 text-sm font-semibold outline-none focus:border-[var(--gold)]"
                />
              </div>
            ))}
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--primary-dark)]">نوع الاجتماع</label>
              <select
                value={form.meeting_type}
                onChange={(e) => setForm((p) => ({ ...p, meeting_type: e.target.value }))}
                className="h-11 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 text-sm font-bold outline-none"
              >
                {MEETING_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--primary-dark)]">الحالة</label>
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                className="h-11 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 text-sm font-bold outline-none"
              >
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Step 2: الحضور */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-[#075f4d]">الحضور</h2>
            {boardMembers.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">لا يوجد أعضاء مجلس إدارة نشطون.</p>
            ) : (
              <div className="divide-y divide-[var(--line)] rounded-2xl border border-[var(--line)]">
                {boardMembers.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--primary-dark)]">{m.full_name}</p>
                      <p className="text-xs text-[var(--muted)]">{m.position}</p>
                    </div>
                    <div className="flex gap-2">
                      {(["حاضر", "غائب"] as const).map((label) => {
                        const isPresent = label === "حاضر";
                        const active = (attendance[m.id] ?? true) === isPresent;
                        return (
                          <button
                            key={label}
                            type="button"
                            onClick={() => setAttendance((p) => ({ ...p, [m.id]: isPresent }))}
                            className={`rounded-xl px-3 py-1 text-xs font-semibold transition-colors ${
                              active
                                ? isPresent ? "bg-[#075f4d] text-white" : "bg-red-100 text-red-700"
                                : "border border-[var(--line)] bg-white text-[var(--ink-4)]"
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: المحاور */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#075f4d]">محاور الاجتماع</h2>
              <button
                type="button"
                onClick={() => setAgenda((p) => [...p, { id: uid(), title: "", notes: "" }])}
                className="inline-flex items-center gap-1 rounded-xl border border-[#075f4d]/30 bg-[#f0f7f5] px-3 py-2 text-xs font-semibold text-[#075f4d]"
              >
                <Plus className="size-4" /> إضافة محور
              </button>
            </div>
            {agenda.length === 0 ? (
              <p className="text-sm text-[var(--ink-4)]">لا توجد محاور بعد. اضغط &quot;إضافة محور&quot;.</p>
            ) : (
              <div className="space-y-3">
                {agenda.map((item, i) => (
                  <div key={item.id} className="rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#075f4d]">المحور {i + 1}</span>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => {
                          if (i === 0) return;
                          setAgenda((p) => { const a = [...p]; [a[i-1], a[i]] = [a[i], a[i-1]]; return a; });
                        }} className="rounded-lg border border-[var(--line)] p-1"><ChevronUp className="size-4" /></button>
                        <button type="button" onClick={() => {
                          if (i === agenda.length - 1) return;
                          setAgenda((p) => { const a = [...p]; [a[i], a[i+1]] = [a[i+1], a[i]]; return a; });
                        }} className="rounded-lg border border-[var(--line)] p-1"><ChevronDown className="size-4" /></button>
                        <button type="button" onClick={() => setAgenda((p) => p.filter((_, j) => j !== i))} className="rounded-lg border border-red-100 bg-red-50 p-1 text-red-600"><Trash2 className="size-4" /></button>
                      </div>
                    </div>
                    <input
                      placeholder="عنوان المحور *"
                      value={item.title}
                      onChange={(e) => setAgenda((p) => p.map((a, j) => j === i ? { ...a, title: e.target.value } : a))}
                      className="mb-2 h-10 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm font-semibold outline-none"
                    />
                    <input
                      placeholder="ملاحظات (اختياري)"
                      value={item.notes}
                      onChange={(e) => setAgenda((p) => p.map((a, j) => j === i ? { ...a, notes: e.target.value } : a))}
                      className="h-10 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm outline-none"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 4: القرارات */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#075f4d]">القرارات والتوصيات</h2>
              <button
                type="button"
                onClick={() => setDecisions((p) => [...p, { id: uid(), content: "", agenda_item_id: "", status: "approved" }])}
                className="inline-flex items-center gap-1 rounded-xl border border-[#075f4d]/30 bg-[#f0f7f5] px-3 py-2 text-xs font-semibold text-[#075f4d]"
              >
                <Plus className="size-4" /> إضافة قرار
              </button>
            </div>
            {decisions.length === 0 ? (
              <p className="text-sm text-[var(--ink-4)]">لا توجد قرارات بعد.</p>
            ) : (
              <div className="space-y-3">
                {decisions.map((d, i) => (
                  <div key={d.id} className="rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#075f4d]">القرار {i + 1}</span>
                      <button type="button" onClick={() => setDecisions((p) => p.filter((_, j) => j !== i))} className="rounded-lg border border-red-100 bg-red-50 p-1 text-red-600"><Trash2 className="size-4" /></button>
                    </div>
                    <textarea
                      placeholder="نص القرار أو التوصية *"
                      value={d.content}
                      onChange={(e) => setDecisions((p) => p.map((x, j) => j === i ? { ...x, content: e.target.value } : x))}
                      rows={2}
                      className="mb-2 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold outline-none"
                    />
                    <div className="flex gap-2">
                      <select
                        value={d.agenda_item_id}
                        onChange={(e) => setDecisions((p) => p.map((x, j) => j === i ? { ...x, agenda_item_id: e.target.value } : x))}
                        className="h-9 flex-1 rounded-xl border border-[var(--line)] bg-white px-2 text-xs font-bold outline-none"
                      >
                        <option value="">ربط بمحور (اختياري)</option>
                        {agenda.map((a, ai) => <option key={a.id} value={a.id}>المحور {ai + 1}: {a.title}</option>)}
                      </select>
                      <select
                        value={d.status}
                        onChange={(e) => setDecisions((p) => p.map((x, j) => j === i ? { ...x, status: e.target.value as Decision["status"] } : x))}
                        className="h-9 rounded-xl border border-[var(--line)] bg-white px-2 text-xs font-bold outline-none"
                      >
                        {DECISION_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 5: الجداول */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#075f4d]">الجداول المرفقة (اختياري)</h2>
              <button
                type="button"
                onClick={() => setTables((p) => [...p, {
                  id: uid(),
                  title: "برنامج طلب تبرعات",
                  rows: [{ item: "", amount: "", notes: "" }],
                }])}
                className="inline-flex items-center gap-1 rounded-xl border border-[#075f4d]/30 bg-[#f0f7f5] px-3 py-2 text-xs font-semibold text-[#075f4d]"
              >
                <Plus className="size-4" /> إضافة جدول
              </button>
            </div>
            {tables.map((table, ti) => {
              const total = table.rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
              return (
                <div key={table.id} className="rounded-2xl border border-[var(--line)] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <input
                      value={table.title}
                      onChange={(e) => setTables((p) => p.map((t, j) => j === ti ? { ...t, title: e.target.value } : t))}
                      className="h-9 flex-1 rounded-xl border border-[var(--line)] bg-[#fffdf8] px-3 text-sm font-semibold outline-none"
                    />
                    <button type="button" onClick={() => setTables((p) => p.filter((_, j) => j !== ti))} className="mr-2 rounded-lg border border-red-100 bg-red-50 p-1 text-red-600"><Trash2 className="size-4" /></button>
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-[#f0f7f5] text-right">
                        <th className="rounded-r-lg px-2 py-1 font-semibold text-[#075f4d]">البند</th>
                        <th className="px-2 py-1 font-semibold text-[#075f4d]">المبلغ</th>
                        <th className="px-2 py-1 font-semibold text-[#075f4d]">الملاحظات</th>
                        <th className="rounded-l-lg px-1 py-1" />
                      </tr>
                    </thead>
                    <tbody>
                      {table.rows.map((row, ri) => (
                        <tr key={ri}>
                          <td className="px-1 py-1"><input value={row.item} onChange={(e) => setTables((p) => p.map((t, j) => j === ti ? { ...t, rows: t.rows.map((r, k) => k === ri ? { ...r, item: e.target.value } : r) } : t))} className="h-8 w-full rounded-lg border border-[var(--line)] px-2 text-xs outline-none" /></td>
                          <td className="px-1 py-1"><input type="number" value={row.amount} onChange={(e) => setTables((p) => p.map((t, j) => j === ti ? { ...t, rows: t.rows.map((r, k) => k === ri ? { ...r, amount: e.target.value } : r) } : t))} className="h-8 w-24 rounded-lg border border-[var(--line)] px-2 text-xs outline-none" /></td>
                          <td className="px-1 py-1"><input value={row.notes} onChange={(e) => setTables((p) => p.map((t, j) => j === ti ? { ...t, rows: t.rows.map((r, k) => k === ri ? { ...r, notes: e.target.value } : r) } : t))} className="h-8 w-full rounded-lg border border-[var(--line)] px-2 text-xs outline-none" /></td>
                          <td className="px-1 py-1"><button type="button" onClick={() => setTables((p) => p.map((t, j) => j === ti ? { ...t, rows: t.rows.filter((_, k) => k !== ri) } : t))} className="rounded-lg border border-red-100 bg-red-50 p-1 text-red-500"><Trash2 className="size-3" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-2 flex items-center justify-between">
                    <button type="button" onClick={() => setTables((p) => p.map((t, j) => j === ti ? { ...t, rows: [...t.rows, { item: "", amount: "", notes: "" }] } : t))} className="text-xs font-semibold text-[#075f4d]">+ إضافة صف</button>
                    <span className="text-xs font-semibold text-[#075f4d]">الإجمالي: {total.toLocaleString("ar-SA")} ر.س</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Step 6: التواقيع */}
        {step === 5 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#075f4d]">اعتماد المحضر والتواقيع</h2>
              <button
                type="button"
                onClick={() => {
                  const all: Record<string, boolean> = {};
                  boardMembers.forEach((m) => { if (attendance[m.id] && m.signature_url) all[m.id] = true; });
                  setSignatures(all);
                }}
                className="rounded-xl border border-[#075f4d]/30 bg-[#f0f7f5] px-3 py-2 text-xs font-semibold text-[#075f4d]"
              >
                إضافة جميع التواقيع المحفوظة
              </button>
            </div>
            <div className="overflow-auto rounded-2xl border border-[var(--line)]">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="bg-[#f0f7f5] text-xs font-semibold text-[#075f4d]">
                    <th className="px-3 py-2">م</th>
                    <th className="px-3 py-2">الاسم</th>
                    <th className="px-3 py-2">المنصب</th>
                    <th className="px-3 py-2">الحالة</th>
                    <th className="px-3 py-2">التوقيع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {boardMembers.map((m, i) => {
                    const present = attendance[m.id] ?? true;
                    return (
                      <tr key={m.id} className="bg-white">
                        <td className="px-3 py-2 text-xs text-[var(--muted)]">{i + 1}</td>
                        <td className="px-3 py-2 font-bold">{m.full_name}</td>
                        <td className="px-3 py-2 text-xs text-[var(--muted)]">{m.position}</td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${present ? "bg-[#e8f4f1] text-[#075f4d]" : "bg-red-50 text-red-600"}`}>
                            {present ? "حاضر" : "غائب"}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {!present ? (
                            <span className="text-xs text-[var(--ink-4)]">غائب</span>
                          ) : !m.signature_url ? (
                            <span className="text-xs text-[var(--ink-4)]">لا يوجد توقيع محفوظ</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSignatures((p) => ({ ...p, [m.id]: !p[m.id] }))}
                              className={`rounded-xl px-3 py-1 text-xs font-semibold transition-colors ${
                                signatures[m.id]
                                  ? "bg-[#075f4d] text-white"
                                  : "border border-[#075f4d]/30 bg-[#f0f7f5] text-[#075f4d]"
                              }`}
                            >
                              {signatures[m.id] ? "✓ تم إضافة التوقيع" : "إضافة التوقيع"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      {validationMessage ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          {validationMessage}
        </p>
      ) : null}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="inline-flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-5 py-3 text-sm font-semibold text-[var(--primary-dark)] disabled:opacity-40"
        >
          <ArrowRight className="size-4" />
          السابق
        </button>

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => {
              if (step === 0 && !form.title.trim()) {
                setValidationMessage("عنوان الاجتماع مطلوب.");
                return;
              }
              if (step === 0 && !form.meeting_date) {
                setValidationMessage("تاريخ الاجتماع مطلوب.");
                return;
              }
              setValidationMessage("");
              setStep((s) => s + 1);
            }}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#075f4d] px-5 py-3 text-sm font-semibold text-white"
          >
            التالي
            <ArrowLeft className="size-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#075f4d] px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "جاري الحفظ..." : "حفظ الاجتماع والمحضر"}
          </button>
        )}
      </div>
    </div>
  );
}
