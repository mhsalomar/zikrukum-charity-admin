import { ClipboardCheck } from "lucide-react";

import { decideStudentRequestAction } from "@/app/dashboard/student-requests/actions";
import { EmptyState, PageHero, SectionCard, StatusChip } from "@/components/dashboard-ui";
import {
  studentRequestStatusLabels,
  studentRequestTypeLabels,
  type StudentRequestRow,
} from "@/lib/student-requests";

export function StudentRequestsReview({
  rows,
  returnTo,
  title = "طلبات الطلاب والتصحيح",
  description = "اعتماد طلبات المعلمين للإضافة أو التصحيح أو النقل، بدل تكرار السجلات عند حدوث خطأ.",
}: {
  rows: StudentRequestRow[];
  returnTo: string;
  title?: string;
  description?: string;
}) {
  const pending = rows.filter((row) => row.status === "pending");

  return (
    <div className="space-y-5">
      <PageHero
        eyebrow="سير اعتماد خفيف"
        title={title}
        description={description}
      />

      <section className="grid gap-4 md:grid-cols-3">
        <Metric label="بانتظار الاعتماد" value={pending.length} />
        <Metric label="إجمالي الطلبات" value={rows.length} />
        <Metric label="تم البت فيها" value={rows.length - pending.length} />
      </section>

      <SectionCard title="قائمة الطلبات" icon={ClipboardCheck}>
        {rows.length === 0 ? (
          <EmptyState title="لا توجد طلبات حالية" description="ستظهر طلبات المعلمين هنا عند إرسالها من لوحة المعلم." />
        ) : (
          <div className="grid gap-3">
            {rows.map((row) => (
              <RequestRow key={row.id} row={row} returnTo={returnTo} />
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function RequestRow({ row, returnTo }: { row: StudentRequestRow; returnTo: string }) {
  const isPending = row.status === "pending";

  return (
    <article className="rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip tone={isPending ? "warning" : row.status === "approved" ? "success" : "default"}>
              {studentRequestStatusLabels[row.status] ?? row.status}
            </StatusChip>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--primary-dark)]">
              {studentRequestTypeLabels[row.requestType] ?? row.requestType}
            </span>
          </div>
          <h2 className="mt-3 text-lg font-bold text-[var(--primary-dark)]">
            {row.studentName || row.requestedStudentName || "طالب غير محدد"}
          </h2>
          <p className="mt-2 text-sm font-bold leading-7 text-[var(--muted)]">
            المعلم: {row.requesterName || "غير محدد"} · الحلقة: {row.currentHalaqaName || "غير محددة"}
          </p>
          <p className="mt-2 text-sm font-semibold leading-7 text-[var(--muted)]">
            {row.reason || payloadSummary(row.payload) || "لا توجد تفاصيل إضافية."}
          </p>
          {row.decisionNotes ? (
            <p className="mt-2 rounded-2xl border border-[var(--line)] bg-white p-3 text-xs font-bold text-[var(--gold)]">
              ملاحظة القرار: {row.decisionNotes}
            </p>
          ) : null}
        </div>
        {isPending ? (
          <form action={decideStudentRequestAction} className="grid min-w-[260px] gap-2">
            <input type="hidden" name="id" value={row.id} />
            <input type="hidden" name="return_to" value={returnTo} />
            <textarea
              name="decision_notes"
              rows={2}
              placeholder="ملاحظة الاعتماد أو الرفض"
              className="rounded-2xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[var(--gold)]"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                name="decision"
                value="approved"
                className="min-h-11 rounded-2xl bg-[var(--primary)] px-4 text-sm font-semibold text-white"
              >
                اعتماد
              </button>
              <button
                name="decision"
                value="rejected"
                className="min-h-11 rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700"
              >
                رفض
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <article className="app-card rounded-2xl p-5">
      <p className="text-sm font-bold text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-3xl font-bold text-[var(--primary-dark)]">{new Intl.NumberFormat("ar-SA").format(value)}</p>
    </article>
  );
}

function payloadSummary(payload: Record<string, unknown>) {
  const parts = [
    text(payload.requested_attendance_status) ? `الحالة المطلوبة: ${text(payload.requested_attendance_status)}` : "",
    text(payload.correction_notes),
    text(payload.target_halaqa_name) ? `الحلقة المطلوبة: ${text(payload.target_halaqa_name)}` : "",
  ].filter(Boolean);
  return parts.join(" — ");
}

function text(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}
