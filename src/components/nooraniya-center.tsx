"use client";

import { useCallback, useRef, useState } from "react";
import { MessageCircle, Pencil, Plus, Save, Send, Trash2, X } from "lucide-react";

export type NooraniStudent = {
  id: string;
  student_name: string;
  form_name: string;
  parent_phone: string;
  group_name: string;
  session_time: string;
  notes: string | null;
  status: string;
};

const DEFAULT_TEMPLATE = `السلام عليكم ورحمة الله وبركاته
ولي أمر الطالب/ *{اسم_الطالب}* حفظه الله،

نود إشعاركم بأنه سيتم استئناف الدورة غدًا بإذن الله.

موعد ابنكم: *{الوقت}*

نأمل منكم التأكد من حضوره في الوقت المحدد، مع تمنياتنا له بدوام التوفيق والنجاح 🌷

شاكرين لكم تعاونكم المستمر`;

const STORAGE_KEY = "nooraniya_msg_template";
const GROUP_COLORS: Record<string, string> = {
  "الأولى": "bg-emerald-100 text-emerald-800",
  "الثانية": "bg-blue-100 text-blue-800",
  "الثالثة": "bg-purple-100 text-purple-800",
};

function saudiWaNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("966")) return digits;
  if (digits.startsWith("0")) return "966" + digits.slice(1);
  return "966" + digits;
}

function isValidPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  // Saudi mobile: 9 digits after stripping country code, or 12 with 966
  if (digits.startsWith("966")) return digits.length === 12;
  if (digits.startsWith("0")) return digits.length === 10;
  return digits.length === 9;
}

function buildWaLink(phone: string, template: string, student: NooraniStudent) {
  const msg = template
    .replace(/\{اسم_الطالب\}/g, student.student_name)
    .replace(/\{الوقت\}/g, student.session_time)
    .replace(/\{المجموعة\}/g, student.group_name);
  return `https://wa.me/${saudiWaNumber(phone)}?text=${encodeURIComponent(msg)}`;
}

type Props = {
  students: NooraniStudent[];
  onAdd: (data: FormData) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCleanup: () => Promise<{ archived: string[]; kept: string[] }>;
  onRestore: () => Promise<number>;
  onDryRun: () => Promise<{ toArchive: string[]; toKeep: string[] }>;
};

export default function NooraniaCenter({ students, onAdd, onDelete, onCleanup, onRestore, onDryRun }: Props) {
  const [template, setTemplate] = useState<string>(() =>
    typeof window !== "undefined" ? (localStorage.getItem(STORAGE_KEY) ?? DEFAULT_TEMPLATE) : DEFAULT_TEMPLATE
  );
  const [editingTemplate, setEditingTemplate] = useState(false);
  const [draftTemplate, setDraftTemplate] = useState(DEFAULT_TEMPLATE);
  const [filterGroup, setFilterGroup] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [bulkIndex, setBulkIndex] = useState<number | null>(null);
  const [cleanupResult, setCleanupResult] = useState<{ archived: string[]; kept: string[] } | null>(null);
  const [dryRunResult, setDryRunResult] = useState<{ toArchive: string[]; toKeep: string[] } | null>(null);
  const [cleanupRunning, setCleanupRunning] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const handleCleanup = async () => {
    if (!confirm(`سيتم حذف الطلاب غير الموجودين في القائمة المعتمدة. متأكد؟`)) return;
    setCleanupRunning(true);
    const result = await onCleanup();
    setCleanupResult(result);
    setCleanupRunning(false);
  };

  const handleDryRun = async () => {
    setCleanupRunning(true);
    const result = await onDryRun();
    setDryRunResult(result);
    setCleanupRunning(false);
  };

  const handleRestore = async () => {
    if (!confirm("استعادة جميع الطلاب المحذوفين؟")) return;
    setCleanupRunning(true);
    const count = await onRestore();
    setRestoreMessage(`تمت استعادة ${count} طالب.`);
    setCleanupRunning(false);
  };

  const saveTemplate = useCallback(() => {
    setTemplate(draftTemplate);
    localStorage.setItem(STORAGE_KEY, draftTemplate);
    setEditingTemplate(false);
  }, [draftTemplate]);

  const filtered = filterGroup ? students.filter((s) => s.group_name === filterGroup) : students;
  const groups = ["الأولى", "الثانية", "الثالثة"];

  const handleAdd = async (fd: FormData) => {
    await onAdd(fd);
    formRef.current?.reset();
    setShowAddForm(false);
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Restore message */}
      {restoreMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800" dir="rtl">
          {restoreMessage}
        </div>
      ) : null}

      {/* Dry run preview */}
      {dryRunResult && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm space-y-3" dir="rtl">
          <p className="font-semibold text-blue-800">معاينة — سيُحذف ({dryRunResult.toArchive.length}) / سيُبقى ({dryRunResult.toKeep.length})</p>
          <div>
            <p className="font-bold text-red-700 mb-1">سيُحذف:</p>
            <ul className="list-disc list-inside text-red-600 font-semibold space-y-0.5 text-xs">{dryRunResult.toArchive.map(n => <li key={n}>{n}</li>)}</ul>
          </div>
          <button onClick={() => setDryRunResult(null)} className="text-xs text-blue-400 hover:text-blue-600">إخفاء</button>
        </div>
      )}

      {/* Temporary cleanup result */}
      {cleanupResult && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm" dir="rtl">
          <p className="font-semibold text-red-700 mb-2">تم الحذف — {cleanupResult.archived.length} طالب محذوف:</p>
          <ul className="list-disc list-inside text-red-600 font-semibold space-y-0.5">
            {cleanupResult.archived.map(n => <li key={n}>{n}</li>)}
          </ul>
          <button onClick={() => setCleanupResult(null)} className="mt-3 text-xs text-red-400 hover:text-red-600">إخفاء</button>
        </div>
      )}

      {bulkIndex !== null && (
        <BulkSendModal
          students={filtered}
          index={bulkIndex}
          template={template}
          onNext={() => setBulkIndex((i) => (i !== null ? i + 1 : null))}
          onClose={() => setBulkIndex(null)}
        />
      )}
      {/* Message Template Editor */}
      <div className="app-card rounded-[1.4rem] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-[var(--gold)]">قالب الرسالة</p>
            <p className="mt-0.5 text-sm font-semibold text-[var(--muted)]">
              متغيرات: {"{اسم_الطالب}"} · {"{الوقت}"} · {"{المجموعة}"}
            </p>
          </div>
          {!editingTemplate ? (
            <button
              onClick={() => { setDraftTemplate(template); setEditingTemplate(true); }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] px-3 py-1.5 text-sm font-semibold text-[var(--primary-dark)] transition hover:bg-[var(--line)]"
            >
              <Pencil className="size-4" aria-hidden />
              تعديل الرسالة
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={saveTemplate}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--primary-dark)] px-3 py-1.5 text-sm font-semibold text-white transition hover:opacity-80"
              >
                <Save className="size-4" aria-hidden />
                حفظ
              </button>
              <button
                onClick={() => setEditingTemplate(false)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] px-3 py-1.5 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--line)]"
              >
                <X className="size-4" aria-hidden />
                إلغاء
              </button>
            </div>
          )}
        </div>

        {editingTemplate ? (
          <textarea
            value={draftTemplate}
            onChange={(e) => setDraftTemplate(e.target.value)}
            rows={8}
            className="mt-4 w-full rounded-xl border border-[var(--line)] bg-[#fffdf8] p-3 text-sm font-semibold leading-7 text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-dark)]"
          />
        ) : (
          <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-[#f8f4ea] p-4 text-sm leading-7 text-[var(--text)] font-semibold">{template}</pre>
        )}
      </div>

      {/* Filters + Add */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setFilterGroup("")}
            className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${!filterGroup ? "bg-[var(--primary-dark)] text-white" : "border border-[var(--line)] text-[var(--muted)] hover:bg-[var(--line)]"}`}
          >
            الكل ({students.length})
          </button>
          {groups.map((g) => {
            const count = students.filter((s) => s.group_name === g).length;
            return (
              <button
                key={g}
                onClick={() => setFilterGroup(g === filterGroup ? "" : g)}
                className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${filterGroup === g ? "bg-[var(--primary-dark)] text-white" : "border border-[var(--line)] text-[var(--muted)] hover:bg-[var(--line)]"}`}
              >
                {g} ({count})
              </button>
            );
          })}
        </div>
        <div className="mr-auto flex gap-2">
          {filtered.length > 0 && (
            <button
              onClick={() => setBulkIndex(0)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#25d366] px-4 py-1.5 text-sm font-semibold text-white transition hover:opacity-80"
            >
              <Send className="size-4" aria-hidden />
              إرسال للجميع ({filtered.length})
            </button>
          )}
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--primary-dark)] px-4 py-1.5 text-sm font-semibold text-white transition hover:opacity-80"
          >
            <Plus className="size-4" aria-hidden />
            إضافة طالب
          </button>
          <button
            onClick={handleDryRun}
            disabled={cleanupRunning}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:opacity-80 disabled:opacity-50"
          >
            {cleanupRunning ? "جاري..." : "🔍 معاينة"}
          </button>
          <button
            onClick={handleRestore}
            disabled={cleanupRunning}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-1.5 text-sm font-semibold text-white transition hover:opacity-80 disabled:opacity-50"
          >
            {cleanupRunning ? "جاري..." : "↩ استعادة المحذوفين"}
          </button>
          <button
            onClick={handleCleanup}
            disabled={cleanupRunning}
            className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:opacity-80 disabled:opacity-50"
          >
            <Trash2 className="size-4" aria-hidden />
            {cleanupRunning ? "جاري..." : "حذف غير الموجودين"}
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="app-card rounded-[1.4rem] p-5">
          <p className="mb-4 text-sm font-semibold text-[var(--primary-dark)]">إضافة طالب جديد</p>
          <form ref={formRef} action={handleAdd} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-[var(--muted)]">اسم الطالب *</label>
              <input name="student_name" required placeholder="محمد أحمد" className="form-input" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-[var(--muted)]">الاسم الرباعي *</label>
              <input name="form_name" required placeholder="كما في نموذج التسجيل" className="form-input" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-[var(--muted)]">جوال ولي الأمر *</label>
              <input name="parent_phone" required placeholder="05XXXXXXXX" dir="ltr" className="form-input" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-[var(--muted)]">المجموعة *</label>
              <select name="group_name" required className="form-input">
                {groups.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-[var(--muted)]">وقت الحصة *</label>
              <input name="session_time" required placeholder="3:50 - 4:50" dir="ltr" className="form-input" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-[var(--muted)]">ملاحظات</label>
              <input name="notes" placeholder="اختياري" className="form-input" />
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex gap-2">
              <button type="submit" className="rounded-xl bg-[var(--primary-dark)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-80">
                حفظ
              </button>
              <button type="button" onClick={() => setShowAddForm(false)} className="rounded-xl border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--line)]">
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Students Table */}
      <section className="app-card overflow-hidden rounded-[1.6rem]">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm font-semibold text-[var(--muted)]">
            لا يوجد طلاب{filterGroup ? ` في المجموعة ${filterGroup}` : ""}
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[700px] text-right text-sm">
                <thead className="bg-[#f4f0e6] text-[#31564d]">
                  <tr>
                    {["الطالب", "الاسم الرباعي", "المجموعة", "الوقت", "الإجراءات"].map((h) => (
                      <th key={h} className="px-4 py-3 text-xs font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {filtered.map((s) => (
                    <StudentRow key={s.id} student={s} template={template} onDelete={onDelete} />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 p-4 lg:hidden">
              {filtered.map((s) => (
                <StudentCard key={s.id} student={s} template={template} onDelete={onDelete} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function GroupBadge({ group }: { group: string }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${GROUP_COLORS[group] ?? "bg-[var(--bg-elev)] text-[var(--muted)]"}`}>
      {group}
    </span>
  );
}

function WaButton({ student, template }: { student: NooraniStudent; template: string }) {
  return (
    <a
      href={buildWaLink(student.parent_phone, template, student)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-xl bg-[#25d366] px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-80"
    >
      <MessageCircle className="size-3.5" aria-hidden />
      واتساب
    </a>
  );
}

function DeleteButton({ id, onDelete }: { id: string; onDelete: (id: string) => Promise<void> }) {
  return (
    <button
      onClick={() => { if (confirm("تأكيد الحذف؟")) onDelete(id); }}
      className="inline-flex items-center gap-1 rounded-xl border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
    >
      <Trash2 className="size-3.5" aria-hidden />
    </button>
  );
}

function StudentRow({ student, template, onDelete }: { student: NooraniStudent; template: string; onDelete: (id: string) => Promise<void> }) {
  return (
    <tr className="transition hover:bg-[#fbf6ea]">
      <td className="px-4 py-3 font-bold text-[var(--primary-dark)]">{student.student_name}</td>
      <td className="px-4 py-3 text-[var(--muted)] text-xs">{student.form_name}</td>
      <td className="px-4 py-3"><GroupBadge group={student.group_name} /></td>
      <td className="px-4 py-3 font-semibold text-[var(--text)]" dir="ltr">{student.session_time}</td>
      <td className="px-4 py-3">
        <div className="flex gap-2">
          <WaButton student={student} template={template} />
          <DeleteButton id={student.id} onDelete={onDelete} />
        </div>
      </td>
    </tr>
  );
}

function StudentCard({ student, template, onDelete }: { student: NooraniStudent; template: string; onDelete: (id: string) => Promise<void> }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-[var(--primary-dark)]">{student.student_name}</p>
          <p className="mt-0.5 text-xs font-semibold text-[var(--muted)]">{student.form_name}</p>
        </div>
        <GroupBadge group={student.group_name} />
      </div>
      <p className="text-sm font-semibold text-[var(--muted)]" dir="ltr">{student.session_time}</p>
      <div className="flex gap-2">
        <WaButton student={student} template={template} />
        <DeleteButton id={student.id} onDelete={onDelete} />
      </div>
    </div>
  );
}

type BulkSendModalProps = {
  students: NooraniStudent[];
  index: number;
  template: string;
  onNext: () => void;
  onClose: () => void;
};

function BulkSendModal({ students, index, template, onNext, onClose }: BulkSendModalProps) {
  const total = students.length;
  const isDone = index >= total;
  const student = isDone ? null : students[index];
  const progress = Math.min((index / total) * 100, 100);
  const phoneValid = student ? isValidPhone(student.parent_phone) : false;

  const handleSend = () => {
    if (!student || !phoneValid) return;
    window.open(buildWaLink(student.parent_phone, template, student), "_blank", "noopener,noreferrer");
    onNext();
  };

  const handleSkip = () => onNext();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" dir="rtl">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between bg-[#25d366] px-5 py-4">
          <div className="flex items-center gap-2 text-white">
            <Send className="size-5" aria-hidden />
            <span className="font-semibold text-base">إرسال جماعي — النورانية</span>
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-white/80 hover:text-white hover:bg-white/20 transition">
            <X className="size-5" aria-hidden />
          </button>
        </div>

        {/* Progress */}
        <div className="px-5 pt-4 pb-2">
          <div className="flex justify-between text-xs font-bold text-[var(--muted)] mb-1.5">
            <span>{isDone ? "اكتمل الإرسال" : `الطالب ${index + 1} من ${total}`}</span>
            <span>{isDone ? total : index} / {total}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-[var(--border)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#25d366] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {isDone ? (
          <div className="px-5 py-8 text-center space-y-3">
            <div className="text-4xl">✅</div>
            <p className="font-bold text-lg text-[var(--primary-dark)]">تم الإرسال لجميع الطلاب!</p>
            <p className="text-sm text-[var(--muted)] font-semibold">أُرسلت {total} رسالة بنجاح</p>
            <button
              onClick={onClose}
              className="mt-4 rounded-xl bg-[var(--primary-dark)] px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-80"
            >
              إغلاق
            </button>
          </div>
        ) : (
          student && (
            <div className="px-5 pb-5 space-y-4">
              {/* Student info */}
              <div className="mt-3 rounded-xl bg-[#f8f4ea] p-3.5 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-[var(--primary-dark)]">{student.student_name}</p>
                  <GroupBadge group={student.group_name} />
                </div>
                <p className="text-xs font-semibold text-[var(--muted)]">ولي الأمر: <span dir="ltr">{student.parent_phone}</span></p>
                <p className="text-xs font-semibold text-[var(--muted)]">الوقت: <span dir="ltr">{student.session_time}</span></p>
              </div>

              {/* Phone warning */}
              {!phoneValid && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs font-bold text-red-700">
                  ⚠️ رقم الجوال غير صحيح — سيتم التخطي تلقائياً
                </div>
              )}

              {/* Message preview */}
              <details className="group">
                <summary className="cursor-pointer text-xs font-bold text-[var(--muted)] hover:text-[var(--primary-dark)] select-none">
                  معاينة الرسالة ▾
                </summary>
                <pre className="mt-2 whitespace-pre-wrap rounded-xl border border-[var(--line)] p-3 text-xs leading-6 text-[var(--text)] font-semibold max-h-40 overflow-y-auto">
                  {template
                    .replace(/\{اسم_الطالب\}/g, student.student_name)
                    .replace(/\{الوقت\}/g, student.session_time)
                    .replace(/\{المجموعة\}/g, student.group_name)}
                </pre>
              </details>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                {phoneValid ? (
                  <button
                    onClick={handleSend}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#25d366] py-2.5 text-sm font-semibold text-white transition hover:opacity-80"
                  >
                    <MessageCircle className="size-4" aria-hidden />
                    فتح واتساب + التالي
                  </button>
                ) : (
                  <button
                    onClick={handleSkip}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-100 py-2.5 text-sm font-semibold text-red-700 transition hover:opacity-80"
                  >
                    تخطي (رقم غير صالح)
                  </button>
                )}
                {phoneValid && (
                  <button
                    onClick={handleSkip}
                    className="rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--line)]"
                  >
                    تخطي
                  </button>
                )}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
