import { OfficialLetterhead, OfficialFooterBar } from "@/components/official-print-layout";
import { PrintButton } from "@/components/print-button";
import { meetingTypeLabels, signatureStatusLabels, signatureTypeLabels, splitLines, type MeetingDocument } from "@/lib/meeting-documents";

export function MeetingPrintDocument({ meeting }: { meeting: MeetingDocument }) {
  const fallbackSignatures = meeting.signatures.length > 0
    ? meeting.signatures
    : splitLines(meeting.attendees).map((name, index) => ({
        id: `attendee-${index}`,
        signerName: name,
        signerTitle: "",
        signatureType: index === 0 ? "chair" : "member",
        signatureStatus: "required",
        signatureDate: "",
        notes: "",
      }));

  return (
    <main className="min-h-screen bg-[#f7faf7] p-4 text-[#111827] print:bg-white print:p-0" dir="rtl">
      <style>{`
        @media print {
          body { background: #fff !important; }
          .no-print { display: none !important; }
          @page { size: A4; margin: 12mm 14mm; }
        }
      `}</style>
      <div className="no-print mx-auto mb-4 flex max-w-[840px] justify-end">
        <PrintButton />
      </div>

      <section className="mx-auto min-h-[1120px] max-w-[840px] rounded-[1.2rem] border border-[#eadfca] bg-white p-8 shadow-xl shadow-black/5 print:min-h-0 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <OfficialLetterhead
          title="محضر اجتماع"
          subtitle={meeting.title || undefined}
          documentNumber={meeting.meetingNumber || undefined}
          documentDate={meeting.meetingDate || undefined}
        />

        {/* Meeting metadata grid */}
        <section className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <InfoBox label="نوع الاجتماع" value={meetingTypeLabels[meeting.meetingType] ?? meeting.meetingType} />
          <InfoBox label="التاريخ" value={meeting.meetingDate || "غير محدد"} />
          <InfoBox label="وقت البداية" value={meeting.startTime?.slice(0, 5) || "غير محدد"} />
          <InfoBox label="وقت النهاية" value={meeting.endTime?.slice(0, 5) || "غير محدد"} />
          <InfoBox label="المكان" value={meeting.location || "غير محدد"} />
          <InfoBox label="رئيس الاجتماع" value={meeting.chairName || "غير محدد"} />
          <InfoBox label="معد المحضر" value={meeting.preparedBy || "غير محدد"} />
        </section>

        {/* Sections */}
        <MeetingSection title="الحضور" text={meeting.attendees} />
        {meeting.absentees && <MeetingSection title="الغائبون" text={meeting.absentees} />}
        {meeting.excused && <MeetingSection title="المعتذرون" text={meeting.excused} />}
        <MeetingSection title="جدول الأعمال" text={meeting.agenda} />
        <MeetingSection title="محضر الاجتماع" text={meeting.minutes} />

        {/* Decisions and recommendations */}
        <section className="mt-6">
          <h2 className="mb-3 border-r-4 border-[#c8a45d] pr-3 text-base font-semibold text-[#075f4d]">القرارات والتوصيات</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[#dbe7dd] bg-[#fffdf8] p-4">
              <p className="mb-2 text-xs font-semibold text-[#667c74]">القرارات</p>
              <p className="whitespace-pre-wrap text-sm leading-7">{meeting.decisions || "لا يوجد"}</p>
              {meeting.decisionOwner && (
                <p className="mt-3 text-xs font-bold text-[#667c74]">المسؤول: <span className="text-[#111827]">{meeting.decisionOwner}</span></p>
              )}
              {meeting.decisionDueDate && (
                <p className="mt-1 text-xs font-bold text-[#667c74]">الاستحقاق: <span className="text-[#111827]">{meeting.decisionDueDate}</span></p>
              )}
            </div>
            <div className="rounded-xl border border-[#dbe7dd] bg-[#fffdf8] p-4">
              <p className="mb-2 text-xs font-semibold text-[#667c74]">التوصيات</p>
              <p className="whitespace-pre-wrap text-sm leading-7">{meeting.recommendations || "لا يوجد"}</p>
            </div>
          </div>
        </section>

        {/* Signatures */}
        <section className="mt-8 break-inside-avoid">
          <h2 className="mb-3 border-r-4 border-[#c8a45d] pr-3 text-base font-semibold text-[#075f4d]">توقيعات الحضور والأعضاء</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {fallbackSignatures.map((sig) => (
              <div key={sig.id} className="min-h-28 rounded-xl border border-[#eadfca] p-4">
                <p className="font-semibold text-[#075f4d]">{sig.signerName}</p>
                <p className="mt-1 text-xs font-bold text-[#667c74]">{sig.signerTitle || signatureTypeLabels[sig.signatureType] || "عضو"}</p>
                <p className="mt-0.5 text-xs font-bold text-[#9ca3af]">{signatureStatusLabels[sig.signatureStatus] ?? sig.signatureStatus}</p>
                <div className="mt-6 border-t border-dotted border-[#c8a45d] pt-2 text-xs font-bold text-[#667c74]">التوقيع: ____________________</div>
                <div className="mt-1.5 text-xs font-bold text-[#667c74]">التاريخ: ____________________</div>
              </div>
            ))}
          </div>
        </section>

        <OfficialFooterBar />
      </section>
    </main>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#dbe7dd] bg-[#fffdf8] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#667c74]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#075f4d]">{value}</p>
    </div>
  );
}

function MeetingSection({ title, text }: { title: string; text: string }) {
  if (!text) return null;
  return (
    <section className="mt-5">
      <h2 className="mb-2 border-r-4 border-[#075f4d] pr-3 text-base font-semibold text-[#075f4d]">{title}</h2>
      <div className="min-h-14 whitespace-pre-wrap rounded-xl border border-[#dbe7dd] bg-[#fffdf8] p-4 text-sm leading-8">{text}</div>
    </section>
  );
}

