import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  FileText,
  ListChecks,
  MapPin,
  PenLine,
  Printer,
  Signature,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  EmptyState,
  KpiCard,
  PageHero,
  SectionCard,
  StatusChip,
} from "@/components/dashboard-ui";
import {
  meetingTypeLabels,
  signatureStatusLabels,
  signatureTypeLabels,
  splitLines,
  type MeetingDocument,
} from "@/lib/meeting-documents";

type MeetingDetailsViewProps = {
  meeting: MeetingDocument;
  backHref: string;
  backLabel: string;
  minutesHref: string;
  membersHref?: string;
};

const meetingStatusLabels: Record<string, string> = {
  draft: "مسودة",
  scheduled: "مجدول",
  in_progress: "قيد التنفيذ",
  completed: "مكتمل",
  approved: "معتمد",
  archived: "مؤرشف",
};

const decisionStatusLabels: Record<string, string> = {
  approved: "معتمد",
  follow_up: "للمتابعة",
  postponed: "مؤجل",
};

export function MeetingDetailsView({
  meeting,
  backHref,
  backLabel,
  minutesHref,
  membersHref,
}: MeetingDetailsViewProps) {
  const agenda = mergeAgenda(meeting);
  const decisions = mergeDecisions(meeting);
  const recommendations = splitLines(meeting.recommendations);
  const signatures = meeting.signatures;
  const printHref = `/minutes-print/${meeting.id}`;

  return (
    <div className="space-y-5">
      <PageHero
        eyebrow="تفاصيل الاجتماع"
        title={meeting.title || "اجتماع بدون عنوان"}
        description={summaryText(meeting)}
        actions={
          <>
            <Link href={backHref} className="secondary-button inline-flex min-h-12 items-center gap-2 rounded-xl px-4 text-sm font-semibold">
              <ArrowRight aria-hidden className="size-4" />
              {backLabel}
            </Link>
            <Link href={minutesHref} className="primary-button inline-flex min-h-12 items-center gap-2 rounded-xl px-4 text-sm font-semibold">
              <FileText aria-hidden className="size-4" />
              تحرير المحضر
            </Link>
            <Link href={printHref} target="_blank" rel="noopener noreferrer" className="gold-button inline-flex min-h-12 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white">
              <Printer aria-hidden className="size-4" />
              طباعة المحضر
            </Link>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="نوع الاجتماع" value={meetingTypeLabels[meeting.meetingType] ?? safeValue(meeting.meetingType)} icon={FileText} />
        <KpiCard label="الحالة" value={meetingStatusLabels[meeting.status] ?? safeValue(meeting.status)} icon={ListChecks} />
        <KpiCard label="التاريخ" value={formatDate(meeting.meetingDate)} icon={CalendarDays} />
        <KpiCard label="التواقيع" value={`${signedCount(signatures)} / ${signatures.length}`} icon={Signature} />
      </div>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard title="بيانات الاجتماع" icon={CalendarDays}>
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoItem icon={MapPin} label="المكان" value={meeting.location} />
            <InfoItem icon={Clock3} label="الوقت" value={formatTimeRange(meeting.startTime, meeting.endTime)} />
            <InfoItem icon={UserRound} label="رئيس الاجتماع" value={meeting.chairName} />
            <InfoItem icon={PenLine} label="معد المحضر" value={meeting.preparedBy} />
          </div>
        </SectionCard>

        <SectionCard
          title="إجراءات مباشرة"
          icon={ListChecks}
        >
          <div className="grid gap-3">
            <ActionLink href={minutesHref} title="إدخال الحضور والمحاور والقرارات" />
            <ActionLink href={printHref} title="فتح صفحة الطباعة الرسمية" target />
            {membersHref ? <ActionLink href={membersHref} title="إدارة أعضاء المجلس والتواقيع" /> : null}
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <SectionCard title="محاور الاجتماع" icon={ListChecks}>
          {agenda.length === 0 ? (
            <EmptyState title="لم تُسجل محاور بعد" description="افتح تحرير المحضر وأضف محاور الاجتماع." />
          ) : (
            <OrderedList items={agenda} />
          )}
        </SectionCard>

        <SectionCard title="القرارات والتوصيات" icon={FileText}>
          {decisions.length === 0 && recommendations.length === 0 ? (
            <EmptyState title="لا توجد قرارات أو توصيات" description="أضف القرارات من صفحة تحرير المحضر." />
          ) : (
            <div className="grid gap-4">
              {decisions.length > 0 ? <DecisionList decisions={decisions} /> : null}
              {recommendations.length > 0 ? <OrderedList items={recommendations} /> : null}
            </div>
          )}
        </SectionCard>
      </section>

      <SectionCard title="التواقيع" icon={Signature}>
        {signatures.length === 0 ? (
          <EmptyState title="لا توجد تواقيع محفوظة لهذا الاجتماع" description="أضف توقيع العضو من صفحة أعضاء المجلس ثم اربطه من تحرير المحضر." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full min-w-[680px] text-right text-sm">
              <thead className="bg-[var(--gold-soft)] text-[var(--primary-dark)]">
                <tr>
                  <th className="p-3">الاسم</th>
                  <th className="p-3">الصفة</th>
                  <th className="p-3">نوع التوقيع</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3">ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {signatures.map((signature) => (
                  <tr key={signature.id} className="border-t border-[var(--border)]">
                    <td className="p-3 font-semibold text-[var(--primary-dark)]">{safeValue(signature.signerName)}</td>
                    <td className="p-3">{safeValue(signature.signerTitle)}</td>
                    <td className="p-3">{signatureTypeLabels[signature.signatureType] ?? safeValue(signature.signatureType)}</td>
                    <td className="p-3">
                      <StatusChip tone={signature.signatureStatus === "signed" ? "success" : "default"}>
                        {signatureStatusLabels[signature.signatureStatus] ?? safeValue(signature.signatureStatus)}
                      </StatusChip>
                    </td>
                    <td className="p-3">{safeValue(signature.notes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-[var(--gold)]">
        <Icon aria-hidden className="size-4" />
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold leading-7 text-[var(--primary-dark)]">{safeValue(value)}</p>
    </div>
  );
}

function ActionLink({ href, title, target }: { href: string; title: string; target?: boolean }) {
  return (
    <Link
      href={href}
      target={target ? "_blank" : undefined}
      rel={target ? "noopener noreferrer" : undefined}
      className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-4 py-3 text-sm font-semibold text-[var(--primary-dark)] transition hover:border-[var(--gold)]"
    >
      {title}
    </Link>
  );
}

function OrderedList({ items }: { items: string[] }) {
  return (
    <ol className="grid gap-2 text-sm font-bold leading-7">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] p-3">
          <span className="font-semibold text-[var(--gold)]">{index + 1}. </span>
          {item}
        </li>
      ))}
    </ol>
  );
}

function DecisionList({ decisions }: { decisions: Array<{ text: string; status: string }> }) {
  return (
    <ol className="grid gap-2 text-sm font-bold leading-7">
      {decisions.map((decision, index) => (
        <li key={`${decision.text}-${index}`} className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p>
              <span className="font-semibold text-[var(--gold)]">{index + 1}. </span>
              {decision.text}
            </p>
            <StatusChip>{decisionStatusLabels[decision.status] ?? safeValue(decision.status)}</StatusChip>
          </div>
        </li>
      ))}
    </ol>
  );
}

function mergeAgenda(meeting: MeetingDocument) {
  const structured = meeting.agendaItems.map((item) => item.title || item.notes).filter(Boolean);
  return structured.length > 0 ? structured : splitLines(meeting.agenda);
}

function mergeDecisions(meeting: MeetingDocument) {
  const structured = meeting.structuredDecisions.map((decision) => ({
    text: decision.content,
    status: decision.status,
  })).filter((decision) => decision.text);
  if (structured.length > 0) return structured;
  return splitLines(meeting.decisions).map((text) => ({ text, status: "" }));
}

function signedCount(signatures: MeetingDocument["signatures"]) {
  return signatures.filter((signature) => signature.signatureStatus === "signed").length;
}

function summaryText(meeting: MeetingDocument) {
  return [
    meetingTypeLabels[meeting.meetingType] ?? meeting.meetingType,
    formatDate(meeting.meetingDate),
    meeting.location,
  ].filter(Boolean).join(" · ");
}

function formatDate(value: string) {
  if (!value) return "غير محدد";
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
    dateStyle: "medium",
    timeZone: "Asia/Riyadh",
  }).format(new Date(value));
}

function formatTimeRange(start: string, end: string) {
  const from = start ? start.slice(0, 5) : "";
  const to = end ? end.slice(0, 5) : "";
  if (from && to) return `${from} - ${to}`;
  return from || to || "غير محدد";
}

function safeValue(value: string) {
  return value?.trim() || "غير محدد";
}
