"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus, Trash2, ChevronUp, ChevronDown, Printer, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type BoardMember = {
  id: string;
  full_name: string;
  position: string | null;
  signature_url: string | null;
};

type AgendaItem = {
  id: string;
  order_num: number;
  title: string;
  notes: string;
  isNew?: boolean;
  isDeleted?: boolean;
};

type Decision = {
  id: string;
  order_num: number;
  content: string;
  agenda_item_id: string | null;
  status: "approved" | "follow_up" | "postponed";
  isNew?: boolean;
  isDeleted?: boolean;
};

type TableRow = { item: string; amount: string; notes: string };
type AttachedTable = {
  id: string;
  title: string;
  rows: TableRow[];
  isNew?: boolean;
  isDeleted?: boolean;
};

type MeetingData = Record<string, unknown> | null;

type Props = {
  meetingId: string;
  meeting: MeetingData;
  boardMembers: BoardMember[];
  initialAgenda: AgendaItem[];
  initialDecisions: Decision[];
  initialTables: AttachedTable[];
  initialAttendance: { board_member_id: string; is_present: boolean }[];
  initialSignatures: { board_member_id: string | null; signature_image_url: string | null }[];
  backHref?: string;
  membersHref?: string | null;
};

const statusLabels: Record<string, string> = {
  approved: "معتمد",
  follow_up: "للمتابعة",
  postponed: "مؤجل",
};

const statusColors: Record<string, string> = {
  approved: "bg-green-50 text-green-800 border-green-200",
  follow_up: "bg-amber-50 text-amber-800 border-amber-200",
  postponed: "bg-[var(--bg-elev)] text-[var(--muted)] border-[var(--border)]",
};

function uid() {
  return `new-${Math.random().toString(36).slice(2)}`;
}

function normalizeMemberSignatureUrl(memberId: string, value?: string | null) {
  if (!value) return null;
  return `/api/board-member-signatures/${memberId}`;
}

export function MinutesClient({
  meetingId,
  meeting,
  boardMembers,
  initialAgenda,
  initialDecisions,
  initialTables,
  initialAttendance,
  initialSignatures,
  backHref = `/dashboard/board/meetings/${meetingId}`,
  membersHref,
}: Props) {
  const supabase = createClient();
  const memberManagementHref = membersHref === undefined ? "/dashboard/board/members" : membersHref;

  // Attendance: default all members present if no saved attendance
  const buildInitialAttendance = () => {
    if (initialAttendance.length > 0) {
      const map: Record<string, boolean> = {};
      initialAttendance.forEach((a) => { map[a.board_member_id] = a.is_present; });
      return map;
    }
    const map: Record<string, boolean> = {};
    boardMembers.forEach((m) => { map[m.id] = true; });
    return map;
  };

  const buildInitialSigs = () => {
    const map: Record<string, string | null> = {};
    initialSignatures.forEach((s) => {
      if (s.board_member_id) map[s.board_member_id] = normalizeMemberSignatureUrl(s.board_member_id, s.signature_image_url);
    });
    return map;
  };

  const [attendance, setAttendance] = useState<Record<string, boolean>>(buildInitialAttendance);
  const [agenda, setAgenda] = useState<AgendaItem[]>(initialAgenda);
  const [decisions, setDecisions] = useState<Decision[]>(initialDecisions);
  const [tables, setTables] = useState<AttachedTable[]>(initialTables);
  const [signatures, setSignatures] = useState<Record<string, string | null>>(buildInitialSigs);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const meetingTitle = String(meeting?.title ?? "");
  const meetingNumber = String(meeting?.meeting_number ?? "");

  // --- Attendance ---
  const toggleAttendance = (memberId: string) => {
    setAttendance((prev) => ({ ...prev, [memberId]: !prev[memberId] }));
  };

  // --- Agenda ---
  const addAgendaItem = () => {
    const maxOrder = agenda.length > 0 ? Math.max(...agenda.map((a) => a.order_num)) : 0;
    setAgenda((prev) => [...prev, { id: uid(), order_num: maxOrder + 1, title: "", notes: "", isNew: true }]);
  };

  const updateAgenda = (id: string, field: keyof AgendaItem, value: string) => {
    setAgenda((prev) => prev.map((a) => a.id === id ? { ...a, [field]: value } : a));
  };

  const deleteAgenda = (id: string) => {
    if (id.startsWith("new-")) {
      setAgenda((prev) => prev.filter((a) => a.id !== id));
    } else {
      setAgenda((prev) => prev.map((a) => a.id === id ? { ...a, isDeleted: true } : a));
    }
  };

  const moveAgenda = (id: string, dir: -1 | 1) => {
    const visible = agenda.filter((a) => !a.isDeleted);
    const idx = visible.findIndex((a) => a.id === id);
    if (idx + dir < 0 || idx + dir >= visible.length) return;
    const reordered = [...visible];
    [reordered[idx], reordered[idx + dir]] = [reordered[idx + dir], reordered[idx]];
    const reindexed = reordered.map((a, i) => ({ ...a, order_num: i + 1 }));
    setAgenda(reindexed);
  };

  // --- Decisions ---
  const addDecision = () => {
    const maxOrder = decisions.length > 0 ? Math.max(...decisions.map((d) => d.order_num)) : 0;
    setDecisions((prev) => [...prev, { id: uid(), order_num: maxOrder + 1, content: "", agenda_item_id: null, status: "approved", isNew: true }]);
  };

  const updateDecision = (id: string, field: keyof Decision, value: string | null) => {
    setDecisions((prev) => prev.map((d) => d.id === id ? { ...d, [field]: value } : d));
  };

  const deleteDecision = (id: string) => {
    if (id.startsWith("new-")) {
      setDecisions((prev) => prev.filter((d) => d.id !== id));
    } else {
      setDecisions((prev) => prev.map((d) => d.id === id ? { ...d, isDeleted: true } : d));
    }
  };

  // --- Tables ---
  const addTable = () => {
    setTables((prev) => [...prev, { id: uid(), title: "جدول مرفق", rows: [{ item: "", amount: "", notes: "" }], isNew: true }]);
  };

  const updateTableTitle = (id: string, title: string) => {
    setTables((prev) => prev.map((t) => t.id === id ? { ...t, title } : t));
  };

  const addTableRow = (tableId: string) => {
    setTables((prev) => prev.map((t) => t.id === tableId ? { ...t, rows: [...t.rows, { item: "", amount: "", notes: "" }] } : t));
  };

  const updateTableRow = (tableId: string, rowIdx: number, field: keyof TableRow, value: string) => {
    setTables((prev) => prev.map((t) => {
      if (t.id !== tableId) return t;
      const rows = t.rows.map((r, i) => i === rowIdx ? { ...r, [field]: value } : r);
      return { ...t, rows };
    }));
  };

  const deleteTableRow = (tableId: string, rowIdx: number) => {
    setTables((prev) => prev.map((t) => t.id !== tableId ? t : { ...t, rows: t.rows.filter((_, i) => i !== rowIdx) }));
  };

  const deleteTable = (id: string) => {
    if (id.startsWith("new-")) {
      setTables((prev) => prev.filter((t) => t.id !== id));
    } else {
      setTables((prev) => prev.map((t) => t.id === id ? { ...t, isDeleted: true } : t));
    }
  };

  const tableTotal = (rows: TableRow[]) => {
    return rows.reduce((sum, r) => {
      const n = parseFloat(r.amount.replace(/,/g, ""));
      return sum + (isNaN(n) ? 0 : n);
    }, 0);
  };

  // --- Signatures ---
  const addSignature = (memberId: string) => {
    const member = boardMembers.find((m) => m.id === memberId);
    if (!member?.signature_url) return;
    setSignatures((prev) => ({ ...prev, [memberId]: normalizeMemberSignatureUrl(memberId, member.signature_url) }));
  };

  const addAllSignatures = () => {
    const updates: Record<string, string | null> = { ...signatures };
    boardMembers.forEach((m) => {
      if (attendance[m.id] !== false && m.signature_url) {
        updates[m.id] = normalizeMemberSignatureUrl(m.id, m.signature_url);
      }
    });
    setSignatures(updates);
  };

  const removeSignature = (memberId: string) => {
    setSignatures((prev) => ({ ...prev, [memberId]: null }));
  };

  // --- Save ---
  const handleSave = async () => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      // Attendance: upsert
      const attendancePayload = boardMembers.map((m) => ({
        meeting_id: meetingId,
        board_member_id: m.id,
        is_present: attendance[m.id] !== false,
      }));
      const { error: attErr } = await supabase
        .from("meeting_attendance")
        .upsert(attendancePayload, { onConflict: "meeting_id,board_member_id" });
      if (attErr) throw new Error(`حضور: ${attErr.message}`);

      // Agenda: delete removed, upsert rest
      const deletedAgenda = agenda.filter((a) => a.isDeleted && !a.isNew);
      if (deletedAgenda.length) {
        await supabase.from("meeting_agenda_items").delete().in("id", deletedAgenda.map((a) => a.id));
      }
      const agendaToSave = agenda.filter((a) => !a.isDeleted && a.title.trim());
      if (agendaToSave.length) {
        const payload = agendaToSave.map((a) => ({
          ...(a.isNew ? {} : { id: a.id }),
          meeting_id: meetingId,
          order_num: a.order_num,
          title: a.title,
          notes: a.notes ?? "",
        }));
        const { data: savedAgenda, error: agErr } = await supabase
          .from("meeting_agenda_items")
          .upsert(payload, { onConflict: "id" })
          .select();
        if (agErr) throw new Error(`محاور: ${agErr.message}`);
        // Update local ids
        if (savedAgenda) {
          setAgenda((prev) => {
            const newItems = [...prev];
            savedAgenda.forEach((saved) => {
              const localIdx = newItems.findIndex((a) => a.title === saved.title && a.isNew);
              if (localIdx !== -1) {
                newItems[localIdx] = { ...newItems[localIdx], id: saved.id, isNew: false };
              }
            });
            return newItems;
          });
        }
      }

      // Decisions: delete removed, upsert rest
      const deletedDecisions = decisions.filter((d) => d.isDeleted && !d.isNew);
      if (deletedDecisions.length) {
        await supabase.from("meeting_decisions_structured").delete().in("id", deletedDecisions.map((d) => d.id));
      }
      const decisionsToSave = decisions.filter((d) => !d.isDeleted && d.content.trim());
      if (decisionsToSave.length) {
        const payload = decisionsToSave.map((d) => ({
          ...(d.isNew ? {} : { id: d.id }),
          meeting_id: meetingId,
          order_num: d.order_num,
          content: d.content,
          agenda_item_id: d.agenda_item_id || null,
          status: d.status,
        }));
        const { error: decErr } = await supabase
          .from("meeting_decisions_structured")
          .upsert(payload, { onConflict: "id" });
        if (decErr) throw new Error(`قرارات: ${decErr.message}`);
      }

      // Tables
      const deletedTables = tables.filter((t) => t.isDeleted && !t.isNew);
      if (deletedTables.length) {
        await supabase.from("meeting_attached_tables").delete().in("id", deletedTables.map((t) => t.id));
      }
      const tablesToSave = tables.filter((t) => !t.isDeleted);
      if (tablesToSave.length) {
        const payload = tablesToSave.map((t) => ({
          ...(t.isNew ? {} : { id: t.id }),
          meeting_id: meetingId,
          title: t.title,
          rows: t.rows,
        }));
        const { error: tblErr } = await supabase
          .from("meeting_attached_tables")
          .upsert(payload, { onConflict: "id" });
        if (tblErr) throw new Error(`جداول: ${tblErr.message}`);
      }

      // Signatures: upsert for present members with signatures
      for (const member of boardMembers) {
        if (attendance[member.id] === false) continue;
        const sigUrl = signatures[member.id];
        if (sigUrl) {
          await supabase.from("meeting_signatures").upsert(
            {
              meeting_id: meetingId,
              board_member_id: member.id,
              signer_name: member.full_name,
              signer_title: member.position ?? "",
              signature_type: "member",
              signature_status: "signed",
              signature_image_url: sigUrl,
            },
            { onConflict: "meeting_id,board_member_id" }
          );
        }
      }

      setNotice("✓ تم الحفظ بنجاح");
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const visibleAgenda = agenda.filter((a) => !a.isDeleted);
  const visibleDecisions = decisions.filter((d) => !d.isDeleted);
  const visibleTables = tables.filter((t) => !t.isDeleted);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 py-2 text-xs font-semibold text-[#075f4d]"
        >
          <ArrowRight className="size-4" aria-hidden />
          العودة
        </Link>
        <Link
          href={`/minutes-print/${meetingId}`}
          className="inline-flex items-center gap-2 rounded-2xl border border-[var(--gold)]/50 bg-[#fff8e6] px-4 py-2 text-xs font-semibold text-[#765514]"
          target="_blank"
        >
          <Printer className="size-4" aria-hidden />
          طباعة المحضر
        </Link>
        <h1 className="text-lg font-bold text-[#075f4d]">
          محضر اجتماع {meetingNumber ? `رقم ${meetingNumber}` : ""} {meetingTitle ? `— ${meetingTitle}` : ""}
        </h1>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}
      {notice && <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-bold text-green-700">{notice}</div>}

      {/* Section 1: Meeting info (read-only from meetings table) */}
      <Section title="بيانات الاجتماع">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <InfoBox label="العنوان" value={String(meeting?.title ?? "—")} />
          <InfoBox label="رقم الاجتماع" value={String(meeting?.meeting_number ?? "—")} />
          <InfoBox label="التاريخ" value={String(meeting?.meeting_date ?? "—")} />
          <InfoBox label="وقت البداية" value={String(meeting?.start_time ?? "—").slice(0, 5)} />
          <InfoBox label="وقت النهاية" value={String(meeting?.end_time ?? "—").slice(0, 5) || "—"} />
          <InfoBox label="المكان" value={String(meeting?.location ?? "—")} />
          {!!meeting?.meeting_type && <InfoBox label="النوع" value={String(meeting.meeting_type)} />}
          {!!meeting?.chair_name && <InfoBox label="رئيس الاجتماع" value={String(meeting.chair_name)} />}
        </div>
        <p className="mt-2 text-xs text-[#667c74]">لتعديل بيانات الاجتماع الأساسية، استخدم صفحة تعديل الاجتماع.</p>
      </Section>

      {/* Section 2: Attendance */}
      <Section title="الحضور">
        {boardMembers.length === 0 ? (
          <p className="text-sm text-[#667c74]">لا يوجد أعضاء مجلس إدارة مسجلون.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {boardMembers.map((member) => {
              const present = attendance[member.id] !== false;
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => toggleAttendance(member.id)}
                  className={`flex items-center justify-between rounded-xl border p-3 text-right text-sm transition-colors ${
                    present
                      ? "border-green-200 bg-green-50 text-green-800"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  <span>
                    <span className="block font-semibold">{member.full_name}</span>
                    {member.position && <span className="block text-xs opacity-70">{member.position}</span>}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${present ? "bg-green-200 text-green-900" : "bg-red-200 text-red-900"}`}>
                    {present ? "حاضر" : "غائب"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Section>

      {/* Section 3: Agenda */}
      <Section title="محاور الاجتماع" action={<button type="button" onClick={addAgendaItem} className="btn-add"><Plus className="size-3.5" /> إضافة محور</button>}>
        {visibleAgenda.length === 0 && <p className="text-sm text-[#667c74]">لا توجد محاور بعد.</p>}
        <div className="space-y-3">
          {visibleAgenda.map((item, idx) => (
            <div key={item.id} className="rounded-xl border border-[#dbe7dd] bg-[#fffdf8] p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="flex size-6 items-center justify-center rounded-full bg-[#075f4d] text-xs font-semibold text-white">{idx + 1}</span>
                <div className="flex gap-1 mr-auto">
                  <button type="button" onClick={() => moveAgenda(item.id, -1)} disabled={idx === 0} className="icon-btn disabled:opacity-30"><ChevronUp className="size-3.5" /></button>
                  <button type="button" onClick={() => moveAgenda(item.id, 1)} disabled={idx === visibleAgenda.length - 1} className="icon-btn disabled:opacity-30"><ChevronDown className="size-3.5" /></button>
                  <button type="button" onClick={() => deleteAgenda(item.id)} className="icon-btn text-red-500"><Trash2 className="size-3.5" /></button>
                </div>
              </div>
              <input
                type="text"
                value={item.title}
                onChange={(e) => updateAgenda(item.id, "title", e.target.value)}
                placeholder="عنوان المحور"
                className="field-input mb-2"
              />
              <textarea
                value={item.notes ?? ""}
                onChange={(e) => updateAgenda(item.id, "notes", e.target.value)}
                placeholder="ملاحظات (اختياري)"
                rows={2}
                className="field-input resize-none"
              />
            </div>
          ))}
        </div>
      </Section>

      {/* Section 4: Decisions */}
      <Section title="القرارات والتوصيات" action={<button type="button" onClick={addDecision} className="btn-add"><Plus className="size-3.5" /> إضافة قرار</button>}>
        {visibleDecisions.length === 0 && <p className="text-sm text-[#667c74]">لا توجد قرارات بعد.</p>}
        <div className="space-y-3">
          {visibleDecisions.map((dec, idx) => (
            <div key={dec.id} className="rounded-xl border border-[#dbe7dd] bg-[#fffdf8] p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="flex size-6 items-center justify-center rounded-full bg-[#c8a45d] text-xs font-semibold text-white">{idx + 1}</span>
                <button type="button" onClick={() => deleteDecision(dec.id)} className="icon-btn text-red-500 mr-auto"><Trash2 className="size-3.5" /></button>
              </div>
              <textarea
                value={dec.content}
                onChange={(e) => updateDecision(dec.id, "content", e.target.value)}
                placeholder="نص القرار"
                rows={3}
                className="field-input resize-none mb-2"
              />
              <div className="flex flex-wrap gap-2">
                {visibleAgenda.length > 0 && (
                  <select
                    value={dec.agenda_item_id ?? ""}
                    onChange={(e) => updateDecision(dec.id, "agenda_item_id", e.target.value || null)}
                    className="field-select"
                  >
                    <option value="">بدون ربط بمحور</option>
                    {visibleAgenda.map((a, i) => (
                      <option key={a.id} value={a.id}>المحور {i + 1}: {a.title}</option>
                    ))}
                  </select>
                )}
                <select
                  value={dec.status}
                  onChange={(e) => updateDecision(dec.id, "status", e.target.value)}
                  className="field-select"
                >
                  <option value="approved">معتمد</option>
                  <option value="follow_up">للمتابعة</option>
                  <option value="postponed">مؤجل</option>
                </select>
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusColors[dec.status]}`}>
                  {statusLabels[dec.status]}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Section 5: Attached tables */}
      <Section title="الجداول المرفقة (اختياري)" action={<button type="button" onClick={addTable} className="btn-add"><Plus className="size-3.5" /> إضافة جدول</button>}>
        {visibleTables.length === 0 && <p className="text-sm text-[#667c74]">لا توجد جداول مرفقة.</p>}
        <div className="space-y-5">
          {visibleTables.map((tbl) => (
            <div key={tbl.id} className="rounded-xl border border-[#dbe7dd] bg-[#fffdf8] p-4">
              <div className="flex items-center gap-3 mb-3">
                <input
                  type="text"
                  value={tbl.title}
                  onChange={(e) => updateTableTitle(tbl.id, e.target.value)}
                  className="field-input flex-1"
                  placeholder="عنوان الجدول"
                />
                <button type="button" onClick={() => deleteTable(tbl.id)} className="icon-btn text-red-500"><Trash2 className="size-4" /></button>
              </div>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-right text-xs text-[#667c74]">
                    <th className="p-2 border border-[#dbe7dd] bg-[#f5f0e8]">البند</th>
                    <th className="p-2 border border-[#dbe7dd] bg-[#f5f0e8]">المبلغ</th>
                    <th className="p-2 border border-[#dbe7dd] bg-[#f5f0e8]">الملاحظات</th>
                    <th className="p-2 border border-[#dbe7dd] bg-[#f5f0e8] w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {tbl.rows.map((row, rIdx) => (
                    <tr key={rIdx}>
                      <td className="p-1 border border-[#dbe7dd]"><input type="text" value={row.item} onChange={(e) => updateTableRow(tbl.id, rIdx, "item", e.target.value)} className="w-full bg-transparent outline-none px-1" placeholder="البند" /></td>
                      <td className="p-1 border border-[#dbe7dd]"><input type="text" value={row.amount} onChange={(e) => updateTableRow(tbl.id, rIdx, "amount", e.target.value)} className="w-full bg-transparent outline-none px-1 text-left" placeholder="0.00" /></td>
                      <td className="p-1 border border-[#dbe7dd]"><input type="text" value={row.notes} onChange={(e) => updateTableRow(tbl.id, rIdx, "notes", e.target.value)} className="w-full bg-transparent outline-none px-1" placeholder="ملاحظات" /></td>
                      <td className="p-1 border border-[#dbe7dd] text-center">
                        <button type="button" onClick={() => deleteTableRow(tbl.id, rIdx)} className="icon-btn text-red-400"><Trash2 className="size-3" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} className="p-2 border-t border-[#dbe7dd]">
                      <div className="flex items-center justify-between">
                        <button type="button" onClick={() => addTableRow(tbl.id)} className="btn-add text-xs"><Plus className="size-3" /> إضافة صف</button>
                        <span className="font-semibold text-[#075f4d]">
                          الإجمالي: {tableTotal(tbl.rows).toLocaleString("ar-SA")} ر.س
                        </span>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ))}
        </div>
      </Section>

      {/* Section 6: Signatures */}
      <Section title="اعتماد المحضر (التواقيع)">
        <div className="flex justify-end mb-3">
          <button type="button" onClick={addAllSignatures} className="btn-add">
            <Plus className="size-3.5" />
            إضافة جميع التواقيع المحفوظة
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-right text-xs text-[#667c74] bg-[#f5f0e8]">
                <th className="p-2 border border-[#dbe7dd]">م</th>
                <th className="p-2 border border-[#dbe7dd]">الاسم</th>
                <th className="p-2 border border-[#dbe7dd]">المنصب</th>
                <th className="p-2 border border-[#dbe7dd]">الحالة</th>
                <th className="p-2 border border-[#dbe7dd]">التوقيع</th>
              </tr>
            </thead>
            <tbody>
              {boardMembers.map((member, idx) => {
                const present = attendance[member.id] !== false;
                const sig = signatures[member.id];
                return (
                  <tr key={member.id} className={present ? "" : "opacity-50"}>
                    <td className="p-2 border border-[#dbe7dd] text-center text-xs font-bold">{idx + 1}</td>
                    <td className="p-2 border border-[#dbe7dd] font-semibold text-[#075f4d]">{member.full_name}</td>
                    <td className="p-2 border border-[#dbe7dd] text-xs text-[#667c74]">{member.position ?? "—"}</td>
                    <td className="p-2 border border-[#dbe7dd] text-center">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${present ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>
                        {present ? "حاضر" : "غائب"}
                      </span>
                    </td>
                    <td className="p-2 border border-[#dbe7dd]">
                      {!present ? (
                        <span className="text-xs text-[#9ca3af]">غائب</span>
                      ) : sig ? (
                        <div className="flex items-center gap-2">
                          <img src={sig} alt="توقيع" className="h-10 max-w-[120px] object-contain" />
                          <button type="button" onClick={() => removeSignature(member.id)} className="text-xs text-red-500 hover:underline">حذف</button>
                        </div>
                      ) : member.signature_url ? (
                        <button
                          type="button"
                          onClick={() => addSignature(member.id)}
                          className="text-xs font-bold text-[#075f4d] hover:underline"
                        >
                          + إضافة التوقيع
                        </button>
                      ) : memberManagementHref ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#9ca3af]">لا يوجد توقيع محفوظ</span>
                          <Link
                            href={`${memberManagementHref}/${member.id}`}
                            target="_blank"
                            className="text-xs font-bold text-[#075f4d] hover:underline"
                          >
                            إدارة توقيع العضو
                          </Link>
                        </div>
                      ) : (
                        <span className="text-xs text-[#9ca3af]">لا يوجد توقيع محفوظ</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {memberManagementHref ? (
          <p className="mt-2 text-xs text-[#667c74]">لرفع توقيع عضو، انتقل إلى <Link href={memberManagementHref} className="underline">صفحة الأعضاء</Link> واختر العضو.</p>
        ) : null}
      </Section>

      {/* Save button */}
      <div className="flex justify-start pb-8">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-2xl bg-[#075f4d] px-6 py-3 text-sm font-semibold text-white hover:bg-[#054f40] disabled:opacity-60 transition-colors"
        >
          <Save className="size-4" />
          {saving ? "جارٍ الحفظ..." : "حفظ المحضر"}
        </button>
      </div>

      <style>{`
        .btn-add { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 999px; border: 1px dashed #c8a45d; background: #fffdf8; font-size: 12px; font-weight: 800; color: #765514; cursor: pointer; }
        .btn-add:hover { background: #fff8e6; }
        .icon-btn { display: inline-flex; padding: 4px; border-radius: 6px; cursor: pointer; color: #667c74; }
        .icon-btn:hover { background: #f3f4f6; }
        .field-input { width: 100%; padding: 6px 10px; border: 1px solid #dbe7dd; border-radius: 8px; font-size: 14px; background: white; outline: none; font-family: inherit; }
        .field-input:focus { border-color: #075f4d; }
        .field-select { padding: 4px 8px; border: 1px solid #dbe7dd; border-radius: 8px; font-size: 13px; background: white; outline: none; font-family: inherit; color: #075f4d; }
      `}</style>
    </div>
  );
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-[1.4rem] border border-[var(--line,#e5e7eb)] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="border-r-4 border-[#075f4d] pr-3 text-base font-semibold text-[#075f4d]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#dbe7dd] bg-[#fffdf8] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#667c74]">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-[#075f4d]">{value || "—"}</p>
    </div>
  );
}
