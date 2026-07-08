import Image from "next/image";

import { PrintButton } from "@/components/print-button";
import { ReportPrintOptions } from "@/components/report-print-options";

const LETTERHEAD = "/letterhead-official.jpg";

export function OfficialPrintPage({
  title,
  documentNumber,
  documentDate,
  attachments,
  subtitle,
  footer,
  variant = "official",
  showHeading = true,
  children,
}: {
  title: string;
  documentNumber?: string | null;
  documentDate?: string | null;
  attachments?: string | string[] | null;
  subtitle?: string | null;
  footer?: React.ReactNode;
  variant?: "official" | "report";
  showHeading?: boolean;
  children: React.ReactNode;
}) {
  const dateFormatted = formatDate(documentDate);
  const attachmentsText = formatAttachments(attachments);

  if (variant === "report") {
    return (
      <main className="min-h-screen bg-[#f3f0e8] p-4 text-[#111827] print:bg-white print:p-0" dir="rtl">
        <style>{`
          @page { size: A4; margin: 10mm 12mm; }
          @media print {
            body { background: #fff !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .no-print { display: none !important; }
            nav, aside, header { display: none !important; }
            table, tr { break-inside: avoid; page-break-inside: avoid; }
            img { object-fit: contain; }
            .report-print-page { min-height: auto !important; }
          }
          .report-controlled-footer { display: none; }
          html[data-report-stamp="1"] .report-controlled-footer,
          html[data-report-signature="1"] .report-controlled-footer { display: block; }
          .report-controlled.print-stamp-slot,
          .report-controlled.print-signature-slot { display: none; }
          html[data-report-stamp="1"] .report-controlled.print-stamp-slot { display: block; }
          html[data-report-signature="1"] .report-controlled.print-signature-slot { display: block; }
        `}</style>
        <ReportPrintOptions />

        <section
          className="report-print-page mx-auto bg-white px-9 pb-10 pt-5 shadow-2xl print:w-auto print:max-w-none print:px-0 print:pb-0 print:pt-0 print:shadow-none"
          style={{ width: "794px", minHeight: "1123px", maxWidth: "100%" }}
        >
          <ReportPrintHeader title={title} subtitle={subtitle} documentDate={dateFormatted} showHeading={showHeading} />
          {children}
          {footer === undefined ? <OfficialSignatureFooter controlled /> : footer}
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-300 p-4 text-[#111827] print:bg-white print:p-0" dir="rtl">
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { background: #fff !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .no-print { display: none !important; }
          /* إخفاء عناصر واجهة المنصة عند الطباعة */
          nav, aside, header { display: none !important; }
          /* إزالة الهوامش والإزاحات من الحاوية الرئيسية للمنصة */
          .lg\\:mr-\\[252px\\] { margin: 0 !important; padding: 0 !important; }
          .max-w-\\[1180px\\] { max-width: none !important; padding: 0 !important; margin: 0 !important; }
          .mt-5 { margin: 0 !important; }
        }
      `}</style>
      <div className="no-print mx-auto mb-4 flex max-w-[794px] justify-end">
        <PrintButton />
      </div>

      {/* A4 page with letterhead as full background */}
      <section
        className="relative mx-auto overflow-hidden bg-white shadow-2xl print:shadow-none print:max-w-none"
        style={{ width: "794px", minHeight: "1123px", maxWidth: "100%" }}
      >
        {/* Full letterhead background image */}
        <Image
          src={LETTERHEAD}
          alt=""
          aria-hidden="true"
          fill
          priority
          unoptimized
          sizes="794px"
          className="pointer-events-none object-fill"
          style={{ WebkitPrintColorAdjust: "exact" } as React.CSSProperties}
        />

        {/* Dynamic reference fields overlaid on the letterhead field area (top-left) */}
        <div
          className="absolute z-10 space-y-[13px] text-[12px] font-bold text-[#374151]"
          style={{ top: "65px", left: "18px", width: "230px" }}
        >
          <FieldOverlay label="الرقم" value={documentNumber ?? ""} />
          {attachmentsText ? <FieldOverlay label="المرفقات" value={attachmentsText} /> : null}
          <FieldOverlay label="التاريخ" value={dateFormatted} />
        </div>

        {/* Content area: padded to stay inside letterhead safe zone */}
        <div className="relative z-10" style={{ padding: "190px 48px 145px" }}>
          {showHeading ? (
            <>
              <h1 className="mb-2 text-center text-2xl font-bold text-[#131a16]">{title}</h1>
              {subtitle ? <p className="mb-4 text-center text-sm font-bold text-[#68746d]">{subtitle}</p> : null}
              <div className="mb-8 flex h-[3px]">
                <div className="flex-1 bg-[#0d6f4f]" />
                <div className="w-10 bg-[#b58a3a]" />
              </div>
            </>
          ) : null}
          {children}
          {footer === undefined ? <OfficialSignatureFooter /> : footer}
        </div>
      </section>
    </main>
  );
}

function ReportPrintHeader({
  title,
  subtitle,
  documentDate,
  showHeading,
}: {
  title: string;
  subtitle?: string | null;
  documentDate: string;
  showHeading: boolean;
}) {
  return (
    <div className="mb-6">
      <div className="relative min-h-[86px] border-b-2 border-[#0b5d42] pb-4">
        <Image
          src="/logo-zikrukum-transparent.png"
          alt="شعار جمعية ذكركم"
          width={220}
          height={90}
          priority
          unoptimized
          className="absolute right-0 top-0 h-20 w-auto object-contain"
        />
        <div className="pr-48 pt-2 text-right">
          <p className="text-base font-semibold text-[#0b5d42]">جمعية ذكركم لتحفيظ القرآن الكريم بالعيون</p>
          {documentDate ? <p className="mt-1 text-xs font-bold text-[#5f6b63]">تاريخ التقرير: {documentDate}</p> : null}
        </div>
      </div>

      {showHeading ? (
        <div className="mt-5 text-center">
          <h1 className="text-2xl font-bold text-[#0b5d42]">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm font-semibold text-[#8a6420]">{subtitle}</p> : null}
          <div className="mx-auto mt-3 flex h-[3px] w-40 overflow-hidden rounded-full">
            <span className="flex-1 bg-[#0b5d42]" />
            <span className="w-12 bg-[#b58a3a]" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function OfficialLetterhead({
  title,
  subtitle,
  documentNumber,
  documentDate,
  attachments,
}: {
  title: string;
  subtitle?: string | null;
  documentNumber?: string | null;
  documentDate?: string | null;
  attachments?: string | string[] | null;
}) {
  const dateFormatted = formatDate(documentDate);
  const attachmentsText = formatAttachments(attachments);

  return (
    <header className="mb-6">
      {/* Header strip: top portion of the official letterhead image */}
      <div className="relative overflow-hidden" style={{ height: "158px" }}>
        <Image
          src={LETTERHEAD}
          alt="ترويسة جمعية ذكركم الرسمية"
          width={794}
          height={1123}
          priority
          unoptimized
          className="absolute left-0 top-0 w-full object-fill"
          style={{ height: "1123px" }}
        />
        {/* Dynamic fields overlay */}
        <div
          className="absolute z-10 space-y-[13px] text-[12px] font-bold text-[#374151]"
          style={{ top: "62px", left: "16px", width: "225px" }}
        >
          <FieldOverlay label="الرقم" value={documentNumber ?? ""} />
          {attachmentsText ? <FieldOverlay label="المرفقات" value={attachmentsText} /> : null}
          <FieldOverlay label="التاريخ" value={dateFormatted} />
        </div>
      </div>

      <h1 className="mt-6 text-center text-2xl font-bold text-[#131a16]">{title}</h1>
      {subtitle ? <p className="mt-2 text-center text-sm font-bold text-[#68746d]">{subtitle}</p> : null}
    </header>
  );
}

export function OfficialSignatureFooter({ controlled = false }: { controlled?: boolean }) {
  return (
    <footer className={`mt-10 break-inside-avoid border-t border-[#e3decf] pt-6 print:mt-8 ${controlled ? "report-controlled-footer" : ""}`}>
      <div className="flex min-h-36 items-center justify-between gap-8 text-sm font-bold text-[#131a16]">
        <div className={`print-stamp-slot flex w-[240px] justify-start ${controlled ? "report-controlled" : ""}`}>
          {/* The protected asset route requires the user's session cookies. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/api/official-assets/stamp"
            alt="الختم الرسمي"
            className="h-32 w-32 object-contain"
          />
        </div>
        <div className={`print-signature-slot w-[320px] text-center ${controlled ? "report-controlled" : ""}`}>
          <p className="text-base font-semibold">رئيس مجلس الإدارة</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/api/official-assets/signature"
            alt="توقيع رئيس مجلس الإدارة"
            className="mx-auto mt-3 h-16 w-52 object-contain"
          />
          <p className="mt-2 text-sm font-semibold">عبدالله بن سعد عبدالله القرناس</p>
        </div>
      </div>
    </footer>
  );
}

export function OfficialLetterApprovalFooter() {
  return (
    <OfficialSignatureFooter />
  );
}

/** Footer strip — shows only the bottom bar of the official letterhead image */
export function OfficialFooterBar() {
  return (
    <div className="relative mt-6 overflow-hidden" style={{ height: "86px" }}>
      <Image
        src={LETTERHEAD}
        alt=""
        aria-hidden="true"
        width={794}
        height={1123}
        unoptimized
        className="absolute bottom-0 left-0 w-full object-fill"
        style={{ height: "1123px" }}
      />
    </div>
  );
}

function FieldOverlay({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center">
      <span className="sr-only">{label}</span>
      <span className="block w-[145px] pb-0.5 text-center text-[#111827]">
        {value || "\u00A0"}
      </span>
    </div>
  );
}

function formatAttachments(attachments?: string | string[] | null) {
  if (!attachments) return "";
  if (Array.isArray(attachments)) {
    return attachments.filter(Boolean).join("، ");
  }
  return attachments;
}

function formatDate(date?: string | null) {
  if (!date) return "";
  try {
    return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(date));
  } catch {
    return date;
  }
}
