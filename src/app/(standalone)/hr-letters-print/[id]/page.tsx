import { notFound } from "next/navigation";

import { OfficialLetterApprovalFooter, OfficialPrintPage } from "@/components/official-print-layout";
import { requireAnyRole } from "@/lib/auth";
import { hrRoles } from "@/lib/module-access";
import { createClient } from "@/lib/supabase/server";

export default async function PrintHrLetterPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAnyRole([...hrRoles]);
  const { id } = await params;
  const letter = await getLetter(id);
  if (!letter) notFound();

  return (
    <OfficialPrintPage
      title="خطاب رسمي"
      documentNumber={letter.letter_number}
      documentDate={letter.letter_date}
      footer={<OfficialLetterApprovalFooter />}
      showHeading={false}
    >
      <article className="text-[15px] font-semibold leading-9 text-[#111827]">
        <div className="mb-7 space-y-4 text-base">
          <p>
            <span className="font-semibold">إلى: </span>
            <span>{displayValue(letter.recipient_name)}</span>
          </p>
          <p>
            <span className="font-semibold">الموضوع: </span>
            <span>{displayValue(letter.subject)}</span>
          </p>
        </div>
        <p className="mb-6 text-base font-semibold">السلام عليكم ورحمة الله وبركاته،</p>
        <div className="min-h-[390px] whitespace-pre-line text-base leading-10">
          {letter.body || "لم يتم إدخال نص الخطاب."}
        </div>
      </article>
    </OfficialPrintPage>
  );
}

function displayValue(value?: string | null) {
  return value?.trim() || "—";
}

async function getLetter(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("hr_letters").select("*").eq("id", id).maybeSingle();
  return data as Record<string, string | null> | null;
}
