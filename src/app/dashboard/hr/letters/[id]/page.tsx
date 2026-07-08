import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";

import { requireAnyRole } from "@/lib/auth";
import { hrRoles } from "@/lib/module-access";
import { createClient } from "@/lib/supabase/server";

export default async function HrLetterDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  return <HrLetterDetails params={params} basePath="/dashboard/hr/letters" />;
}

export async function HrLetterDetails({ params, basePath }: { params: Promise<{ id: string }>; basePath: string }) {
  await requireAnyRole([...hrRoles]);
  const { id } = await params;
  const letter = await getLetter(id);
  if (!letter) notFound();

  return (
    <div className="space-y-5">
      <section className="app-card luxury-pattern overflow-hidden rounded-[1.7rem]">
        <div className="relative border-r-4 border-[var(--gold)] p-5 sm:p-7">
          <p className="text-sm font-semibold text-[var(--gold)]">الصادر والخطابات</p>
          <h1 className="mt-2 text-2xl font-bold text-[var(--primary-dark)] sm:text-4xl">{letter.subject}</h1>
          <p className="mt-3 text-sm font-bold text-[var(--muted)]">
            رقم الخطاب: {letter.letter_number || "غير محدد"} · التاريخ: {formatDate(letter.letter_date)}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={`/hr-letters-print/${letter.id}`} target="_blank" rel="noopener noreferrer" className="gold-button inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white">
              <Printer aria-hidden className="size-4" />
              صفحة الطباعة
            </Link>
            <Link href={basePath} className="inline-flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-white px-5 py-3 text-sm font-semibold text-[var(--primary-dark)]">
              العودة
              <ArrowLeft aria-hidden className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="app-card rounded-[1.6rem] p-5 sm:p-7">
        <dl className="grid gap-4 md:grid-cols-2">
          <Field label="المرسل إليه" value={letter.recipient_name} />
          <Field label="الشخص المرتبط" value={letter.related_person_name} />
          <Field label="معد الخطاب" value={letter.prepared_by} />
          <Field label="المعتمد" value={letter.approved_by} />
          <Field label="الحالة" value={letter.status} />
          <Field label="ملاحظات" value={letter.notes} />
        </dl>
        <div className="mt-5 rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-5">
          <p className="text-xs font-semibold text-[var(--gold)]">نص الخطاب</p>
          <p className="mt-3 whitespace-pre-line text-sm font-bold leading-8 text-[var(--text)]">{letter.body || "لم يتم إدخال نص الخطاب بعد."}</p>
        </div>
      </section>
    </div>
  );
}

async function getLetter(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("hr_letters").select("*").eq("id", id).maybeSingle();
  return data as Record<string, string | null> | null;
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-4">
      <dt className="text-xs font-bold text-[var(--muted)]">{label}</dt>
      <dd className="mt-2 text-sm font-semibold text-[var(--primary-dark)]">{value || "غير محدد"}</dd>
    </div>
  );
}

function formatDate(value?: string | null) {
  return value ? new Intl.DateTimeFormat("ar-SA").format(new Date(value)) : "غير محدد";
}
