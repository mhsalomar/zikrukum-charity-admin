import Link from "next/link";
import { FileText } from "lucide-react";

import { PageHero, SectionCard } from "@/components/dashboard-ui";
import { requireAnyRole } from "@/lib/auth";
import { executiveRoles } from "@/lib/module-access";
import { createClient } from "@/lib/supabase/server";

const periodLabels: Record<string, string> = {
  fajr: "الفجر",
  asr: "العصر",
  maghrib: "المغرب",
  isha: "العشاء",
};

export async function ParentReportBatchSelector({ basePath }: { basePath: string }) {
  await requireAnyRole([...executiveRoles]);
  const supabase = await createClient();
  const { data: halaqat, error } = await supabase
    .from("halaqat")
    .select("id,name,period")
    .is("archived_at", null)
    .order("name", { ascending: true })
    .limit(500);

  return (
    <div className="space-y-5">
      <PageHero
        eyebrow="تقرير مجمع"
        title="تقارير أولياء الأمور حسب الحلقة"
        description="اختر الحلقة والفترة، ثم اطبع تقارير الطلاب دفعة واحدة عبر المتصفح."
      />

      <SectionCard title="إعداد التقرير" icon={FileText}>
        {error ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">
            تعذر تحميل الحلقات. حاول مرة أخرى أو تواصل مع الإدارة.
          </p>
        ) : !halaqat?.length ? (
          <p className="rounded-2xl border border-dashed border-[var(--line)] bg-[#fffdf8] p-6 text-center text-sm font-bold text-[var(--muted)]">
            لا توجد حلقات متاحة للطباعة حاليًا.
          </p>
        ) : (
          <form action={`${basePath}/print`} className="grid gap-4 md:grid-cols-4">
            <label className="block md:col-span-2">
              <span className="text-sm font-semibold text-[var(--primary-dark)]">الحلقة</span>
              <select
                name="halaqaId"
                required
                className="mt-2 h-12 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 text-sm font-bold text-[var(--text)] outline-none focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--gold)]/15"
              >
                <option value="">اختر الحلقة</option>
                {halaqat.map((halaqa) => (
                  <option key={halaqa.id} value={halaqa.id}>
                    {halaqa.name}{halaqa.period ? ` - ${periodLabels[halaqa.period] ?? halaqa.period}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-[var(--primary-dark)]">من تاريخ</span>
              <input name="from" type="date" className="mt-2 h-12 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 text-sm font-bold text-[var(--text)] outline-none focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--gold)]/15" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-[var(--primary-dark)]">إلى تاريخ</span>
              <input name="to" type="date" className="mt-2 h-12 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 text-sm font-bold text-[var(--text)] outline-none focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--gold)]/15" />
            </label>
            <div className="md:col-span-4">
              <button className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[var(--primary)] px-7 text-sm font-semibold text-white">
                طباعة تقارير الحلقة
              </button>
            </div>
          </form>
        )}
      </SectionCard>

      <Link href={basePath} className="text-sm font-semibold text-[var(--primary-dark)]">
        الرجوع لتقرير طالب محدد
      </Link>
    </div>
  );
}
