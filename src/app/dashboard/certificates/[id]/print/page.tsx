import { notFound } from "next/navigation";

import { OfficialPrintPage } from "@/components/official-print-layout";
import { requireAnyRole } from "@/lib/auth";
import { executiveRoles } from "@/lib/module-access";
import { createClient } from "@/lib/supabase/server";

type PageProps = { params: Promise<{ id: string }> };

export default async function CertificatePrintPage({ params }: PageProps) {
  await requireAnyRole([...executiveRoles]);
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("certificates").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();

  return (
    <OfficialPrintPage title={String(data.title ?? "شهادة")} documentNumber={String(data.certificate_number ?? "")} documentDate={String(data.issued_at ?? "")} subtitle="جمعية ذكركم لتحفيظ القرآن الكريم">
      <div className="space-y-8 text-center">
        <p className="text-lg font-bold leading-10 text-[#374151]">تشهد جمعية ذكركم لتحفيظ القرآن الكريم بأن</p>
        <p className="text-4xl font-bold text-[#0b3d33]">{String(data.recipient_name ?? "المستفيد")}</p>
        <p className="mx-auto max-w-2xl text-xl font-bold leading-10 text-[#111827]">{String(data.body ?? "")}</p>
        <div className="mx-auto grid max-w-xl grid-cols-2 gap-4 text-sm font-bold text-[#374151]">
          <Info label="نوع الشهادة" value={label(String(data.certificate_type ?? ""))} />
          <Info label="الحالة" value={label(String(data.status ?? ""))} />
          <Info label="المعتمد" value={String(data.approved_by ?? "غير محدد")} />
          <Info label="تاريخ الإصدار" value={formatDate(String(data.issued_at ?? ""))} />
        </div>
      </div>
    </OfficialPrintPage>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <p className="rounded-xl border border-[#eadfca] bg-white/70 p-3"><span className="block text-[#6b7280]">{label}</span>{value}</p>;
}

function label(value: string) {
  const map: Record<string, string> = { memorization: "حفظ", completion: "اجتياز", participation: "مشاركة", excellence: "تميز", competition: "مسابقة", thanks: "شكر", draft: "مسودة", ready: "جاهزة", approved: "معتمدة", archived: "مؤرشفة" };
  return map[value] ?? value;
}

function formatDate(value: string) {
  return value ? new Intl.DateTimeFormat("ar-SA").format(new Date(value)) : "غير محدد";
}
