import Link from "next/link";
import { CalendarClock, HandHeart, PhoneCall } from "lucide-react";
import { notFound } from "next/navigation";

import { PageHero, SectionCard } from "@/components/dashboard-ui";
import { KpiCard } from "@/components/report-charts";
import { requireAnyRole } from "@/lib/auth";
import { formatLaunchValue } from "@/lib/launch-core";
import { executiveRoles } from "@/lib/module-access";
import { createClient } from "@/lib/supabase/server";

export default async function DonorDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAnyRole([...executiveRoles]);
  const { id } = await params;
  const supabase = await createClient();
  const [donorResult, donations, pledges, receipts] = await Promise.all([
    supabase.from("donors").select("*").eq("id", id).is("archived_at", null).maybeSingle(),
    supabase.from("donations").select("amount,donation_date,receipt_status").eq("donor_id", id).is("archived_at", null).order("donation_date", { ascending: false }).limit(20),
    supabase.from("pledges").select("pledged_amount,due_date,status").eq("donor_id", id).is("archived_at", null).order("due_date", { ascending: true }).limit(20),
    supabase.from("donation_receipts").select("receipt_number,receipt_date,status").eq("donor_id", id).is("archived_at", null).order("receipt_date", { ascending: false }).limit(20),
  ]);

  if (!donorResult.data) notFound();
  const donor = donorResult.data as Record<string, unknown>;
  const donationRows = donations.data ?? [];
  const pledgeRows = pledges.data ?? [];
  const receiptRows = receipts.data ?? [];
  const donationsTotal = donationRows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);

  return (
    <div className="space-y-5">
      <PageHero
        eyebrow="ملف مانح"
        title={String(donor.name ?? "مانح")}
        description="متابعة العلاقة والإجراءات القادمة والتبرعات المرتبطة بالمانح."
        actions={<Link href="/dashboard/donors" className="gold-button inline-flex min-h-12 items-center rounded-2xl px-5 text-sm font-semibold text-white">العودة للمانحين</Link>}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="إجمالي التبرعات" value={money(donationsTotal)} icon={HandHeart} tone="gold" />
        <KpiCard label="التعهدات" value={pledgeRows.length} icon={CalendarClock} tone="warning" />
        <KpiCard label="الإيصالات" value={receiptRows.length} icon={HandHeart} tone="sage" />
        <KpiCard label="مرحلة العلاقة" value={formatLaunchValue(donor.relationship_stage)} icon={PhoneCall} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <SectionCard title="مسار العلاقة" description="هذه الحقول تساعد الإدارة في متابعة التواصل دون التأثير على التبرعات أو المالية.">
          <dl className="grid gap-3 text-sm">
            <Info label="مرحلة العلاقة" value={formatLaunchValue(donor.relationship_stage)} />
            <Info label="الإجراء القادم" value={formatLaunchValue(donor.next_action)} />
            <Info label="تاريخ الإجراء القادم" value={formatLaunchValue(donor.next_action_date)} />
            <Info label="آخر تواصل" value={formatLaunchValue(donor.last_contact_at)} />
            <Info label="مسؤول التواصل" value={formatLaunchValue(donor.contact_owner)} />
            <Info label="وسيلة التواصل" value={`${formatLaunchValue(donor.phone)} / ${formatLaunchValue(donor.email)}`} />
          </dl>
        </SectionCard>

        <SectionCard title="آخر العمليات المرتبطة">
          <div className="grid gap-3">
            {donationRows.slice(0, 5).map((row, index) => (
              <div key={`${row.donation_date}-${index}`} className="rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-4">
                <p className="font-semibold text-[var(--primary-dark)]">{money(Number(row.amount ?? 0))}</p>
                <p className="mt-1 text-xs font-bold text-[var(--muted)]">{formatLaunchValue(row.donation_date)} · الإيصال: {formatLaunchValue(row.receipt_status)}</p>
              </div>
            ))}
            {donationRows.length === 0 ? <Empty text="لا توجد تبرعات مرتبطة بهذا المانح حتى الآن." /> : null}
          </div>
        </SectionCard>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-4">
      <dt className="text-xs font-bold text-[var(--muted)]">{label}</dt>
      <dd className="mt-1 text-base font-semibold text-[var(--primary-dark)]">{value}</dd>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-2xl border border-dashed border-[var(--line)] p-5 text-center text-sm font-bold text-[var(--muted)]">{text}</p>;
}

function money(value: number) {
  return `${new Intl.NumberFormat("ar-SA").format(value)} ريال`;
}
