"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import {
  relinkInvitedUserAction,
  sendBulkInvitesAction,
  sendInviteAction,
  sendTestInviteAction,
} from "./actions";

export type InvitationRow = {
  id: string;
  full_name: string;
  email: string | null;
  requested_role: string;
  auth_status: string | null;
  invited_at: string | null;
};

type AccountState =
  | "not_sent"
  | "invited"
  | "pending_password"
  | "active"
  | "needs_linking"
  | "missing_email";

const ROLE_LABELS: Record<string, string> = {
  teacher: "معلم",
  supervisor: "مشرف",
  hr_employee: "موظف موارد بشرية",
  executive_director: "مدير تنفيذي",
  media_officer: "مسؤول إعلام",
  admin: "مدير النظام",
};

function accountState(row: InvitationRow): AccountState {
  if (!row.email?.trim()) return "missing_email";
  if (row.auth_status === "linked") return "active";
  if (row.auth_status === "auth_created") return "pending_password";
  if (row.auth_status && row.auth_status !== "manual_auth_required") return "needs_linking";
  if (row.invited_at) return "pending_password";
  return "not_sent";
}

const STATE_BADGE: Record<AccountState, { label: string; className: string }> = {
  not_sent: { label: "غير مرسل", className: "bg-[#fff4e0] text-[#9a6a00]" },
  invited: { label: "دعوة مرسلة", className: "bg-[#e4f0ff] text-[#1f5fa8]" },
  pending_password: { label: "بانتظار إنشاء كلمة المرور", className: "bg-[#e4f0ff] text-[#1f5fa8]" },
  active: { label: "حساب مفعّل", className: "bg-[#e3f6ea] text-[#1f7a45]" },
  needs_linking: { label: "يحتاج ربط داخلي", className: "bg-[#fff4e0] text-[#9a6a00]" },
  missing_email: { label: "ناقص بريد", className: "bg-[#fde4e4] text-[#a33]" },
};

function canInvite(row: InvitationRow) {
  const state = accountState(row);
  return state === "not_sent" || state === "invited" || state === "pending_password";
}

export function InvitationsClient({ rows }: { rows: InvitationRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkTarget, setBulkTarget] = useState<"selected" | "all">("selected");
  const [testEmail, setTestEmail] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [pending, startTransition] = useTransition();

  const invitable = useMemo(() => rows.filter(canInvite), [rows]);

  const eligibleSelected = useMemo(
    () => rows.filter((r) => selected.has(r.id) && canInvite(r)),
    [rows, selected],
  );

  const bulkRows = bulkTarget === "all" ? invitable : eligibleSelected;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === invitable.length ? new Set() : new Set(invitable.map((r) => r.id)),
    );
  }

  function handleSingle(id: string) {
    setFeedback(null);
    startTransition(async () => {
      const result = await sendInviteAction(id);
      setFeedback(
        result.success
          ? { kind: "ok", text: "تم إرسال الدعوة بنجاح" }
          : { kind: "err", text: result.error ?? "فشل الإرسال" },
      );
    });
  }

  function handleRelink(id: string) {
    setFeedback(null);
    startTransition(async () => {
      const result = await relinkInvitedUserAction(id);
      setFeedback(
        result.success
          ? { kind: "ok", text: "تمت إعادة ربط الحساب بسجله الداخلي" }
          : { kind: "err", text: result.error ?? "تعذر إعادة الربط" },
      );
    });
  }

  function handleTest() {
    setFeedback(null);
    startTransition(async () => {
      const result = await sendTestInviteAction(testEmail);
      setFeedback(
        result.success
          ? { kind: "ok", text: "تم إرسال الدعوة التجريبية" }
          : { kind: "err", text: result.error ?? "فشل الإرسال" },
      );
    });
  }

  function handleBulk() {
    setShowBulkModal(false);
    setFeedback(null);
    const ids = bulkRows.map((r) => r.id);
    startTransition(async () => {
      const result = await sendBulkInvitesAction(ids);
      const parts = [`تم الإرسال: ${result.sent}`, `تم التخطي: ${result.skipped}`];
      if (result.errors.length) parts.push(`أخطاء: ${result.errors.length}`);
      setFeedback({
        kind: result.errors.length ? "err" : "ok",
        text: parts.join(" — "),
      });
      setSelected(new Set());
    });
  }

  return (
    <div className="space-y-5">
      {feedback ? (
        <div
          className={`rounded-2xl border p-4 text-sm font-bold ${
            feedback.kind === "ok"
              ? "border-[#bfe6cd] bg-[#eefaf1] text-[#1f7a45]"
              : "border-[#f2c5c5] bg-[#fdeded] text-[#a33]"
          }`}
        >
          {feedback.text}
        </div>
      ) : null}

      <section className="app-card rounded-[1.6rem] p-5 sm:p-7">
        <h2 className="text-lg font-bold text-[var(--primary-dark)]">دعوة تجريبية</h2>
        <p className="mt-2 text-sm font-bold text-[var(--muted)]">
          أرسل دعوة إلى بريدك للتأكد من شكل الرسالة قبل دعوة المستخدمين.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            dir="ltr"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="أدخل البريد الإلكتروني"
            className="flex-1 rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-bold text-[var(--primary-dark)] outline-none focus:border-[var(--gold)]"
          />
          <button
            type="button"
            onClick={handleTest}
            disabled={pending || !testEmail.trim()}
            className="rounded-xl bg-[var(--primary-dark)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            إرسال دعوة تجريبية
          </button>
        </div>
      </section>

      <section className="app-card rounded-[1.6rem] p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-[var(--primary-dark)]">طلبات الانضمام</h2>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/users/new"
              className="rounded-xl border border-[var(--line)] bg-[#fffdf8] px-5 py-2.5 text-sm font-semibold text-[var(--primary-dark)]"
            >
              إضافة مستخدم
            </Link>
            <button
              type="button"
              onClick={() => {
                setBulkTarget("all");
                setShowBulkModal(true);
              }}
              disabled={pending || invitable.length === 0}
              className="rounded-xl bg-[var(--primary-dark)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              إرسال كل الدعوات الجاهزة ({invitable.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setBulkTarget("selected");
                setShowBulkModal(true);
              }}
              disabled={pending || eligibleSelected.length === 0}
              className="rounded-xl bg-[var(--gold)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-dark)] disabled:opacity-50"
            >
              إرسال المحدد ({eligibleSelected.length})
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-right text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-xs font-semibold text-[#81928b]">
                <th className="p-3">
                  <input
                    type="checkbox"
                    aria-label="تحديد الكل"
                    checked={invitable.length > 0 && selected.size >= invitable.length}
                    onChange={toggleAll}
                  />
                </th>
                <th className="p-3">الاسم</th>
                <th className="p-3">البريد</th>
                <th className="p-3">الدور</th>
                <th className="p-3">حالة الحساب</th>
                <th className="p-3">آخر دعوة مرسلة</th>
                <th className="p-3">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center font-bold text-[var(--muted)]">
                    لا توجد طلبات انضمام بعد.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const state = accountState(row);
                  const badge = STATE_BADGE[state];
                  const inviteAllowed = canInvite(row);
                  return (
                    <tr key={row.id} className="border-b border-[var(--line)] last:border-0">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          aria-label={`تحديد ${row.full_name}`}
                          disabled={!inviteAllowed}
                          checked={selected.has(row.id)}
                          onChange={() => toggle(row.id)}
                        />
                      </td>
                      <td className="p-3 font-semibold text-[var(--primary-dark)]">{row.full_name}</td>
                      <td className="p-3 font-bold text-[var(--muted)]" dir="ltr">
                        {row.email?.trim() || "—"}
                      </td>
                      <td className="p-3 font-bold text-[var(--muted)]">
                        {ROLE_LABELS[row.requested_role] ?? row.requested_role}
                      </td>
                      <td className="p-3">
                        <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-[var(--muted)]" dir="ltr">
                        {formatDate(row.invited_at)}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          {state === "needs_linking" ? (
                            <button
                              type="button"
                              onClick={() => handleRelink(row.id)}
                              disabled={pending}
                              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 disabled:opacity-50"
                            >
                              إعادة ربط
                            </button>
                          ) : null}
                          {inviteAllowed ? (
                            <button
                              type="button"
                              onClick={() => handleSingle(row.id)}
                              disabled={pending}
                              className="rounded-lg border border-[var(--gold)] px-3 py-1.5 text-xs font-semibold text-[var(--primary-dark)] disabled:opacity-50"
                            >
                              {state === "invited" || state === "pending_password" ? "إعادة الإرسال" : "إرسال دعوة"}
                            </button>
                          ) : null}
                          {!inviteAllowed && state !== "needs_linking" ? (
                            <span className="text-xs font-bold text-[#9aa]">—</span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showBulkModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-[var(--primary-dark)]">تأكيد إرسال الدعوات</h3>
            <p className="mt-3 text-sm font-bold leading-7 text-[var(--muted)]">
              سيتم إرسال دعوات إلى {bulkRows.length} مستخدمًا، وسيتم تخطي من لا
              يملك بريدًا أو لديه حساب مفعّل أو أُرسلت له دعوة خلال آخر 10 دقائق.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="rounded-xl border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--muted)]"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleBulk}
                className="rounded-xl bg-[var(--gold)] px-5 py-2 text-sm font-semibold text-[var(--primary-dark)]"
              >
                تأكيد الإرسال
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ar-SA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
