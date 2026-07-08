import Link from "next/link";
import { HandHeart, ReceiptText, TrendingUp, Wallet } from "lucide-react";

import { PageHero, SectionCard } from "@/components/dashboard-ui";
import { HorizontalBarChart, KpiCard } from "@/components/report-charts";
import { donorRelationshipStages, formatLaunchValue } from "@/lib/launch-core";
import { requireAnyRole } from "@/lib/auth";
import { executiveRoles } from "@/lib/module-access";
import { createClient } from "@/lib/supabase/server";

export default async function DonorReportsPage() {
  await requireAnyRole([...executiveRoles]);
  const report = await getDonorReport();

  return (
    <div className="space-y-5">
      <PageHero
        eyebrow="علاقات المانحين"
        title="تقارير المانحين والتبرعات"
        description="ملخص عملي للمانحين والتبرعات والتعهدات والإيصالات، مبني على البيانات الفعلية فقط."
        actions={<Link href="/dashboard/donations" className="gold-button rounded-2xl px-5 py-3 text-sm font-semibold text-white">إضافة تبرع</Link>}
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="المانحون" value={report.donors} icon={HandHeart} />
        <KpiCard label="إجمالي التبرعات" value={money(report.donationsTotal)} icon={Wallet} tone="gold" />
        <KpiCard label="التعهدات المفتوحة" value={report.openPledges} icon={TrendingUp} tone="warning" />
        <KpiCard label="إيصالات غير مصدرة" value={report.pendingReceipts} icon={ReceiptText} />
        <KpiCard label="إجراءات خلال 7 أيام" value={report.upcomingActions.length} icon={TrendingUp} tone={report.upcomingActions.length > 0 ? "warning" : "sage"} />
        <KpiCard label="مانحون بلا تواصل" value={report.noContactDonors} icon={HandHeart} tone={report.noContactDonors > 0 ? "warning" : "emerald"} />
        <KpiCard label="تعهدات تحتاج متابعة" value={report.followupPledges} icon={TrendingUp} tone={report.followupPledges > 0 ? "warning" : "sage"} />
      </section>
      <section className="grid gap-4 xl:grid-cols-2">
        <HorizontalBarChart title="التبرعات حسب نوع الدعم" data={report.bySupportType} valueLabel="ريال" />
        <HorizontalBarChart title="التعهدات حسب الحالة" data={report.pledgesByStatus} />
        <HorizontalBarChart title="مراحل علاقة المانحين" data={report.donorsByStage} />
      </section>
      <SectionCard title="متابعات المانحين القادمة" description="قائمة مختصرة بالإجراءات القادمة خلال 7 أيام.">
        {report.upcomingActions.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--line)] bg-[#fffdf8] p-6 text-center text-sm font-bold text-[var(--muted)]">
            لا توجد متابعات مانحين مستحقة خلال الأيام السبعة القادمة.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {report.upcomingActions.map((donor) => (
              <Link key={donor.id} href={`/dashboard/donors/${donor.id}`} className="rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-4 transition hover:border-[var(--gold)]">
                <p className="font-semibold text-[var(--primary-dark)]">{donor.name}</p>
                <p className="mt-1 text-sm font-bold text-[var(--muted)]">{donor.nextAction}</p>
                <p className="mt-2 text-xs font-semibold text-[#765514]">{donor.nextDate}</p>
              </Link>
            ))}
          </div>
        )}
      </SectionCard>
      <SectionCard title="تقرير أثر للمانح" description="عند ربط التبرعات بالبرامج والمستفيدين سيظهر هنا ملخص الأثر المدعوم. لا توجد أرقام تقديرية في هذه الصفحة.">
        <p className="rounded-2xl border border-dashed border-[var(--line)] bg-[#fffdf8] p-6 text-sm font-bold leading-7 text-[var(--muted)]">
          جاهز لإصدار تقرير أثر بعد إدخال التبرعات وربطها بالبرامج والمنجزات الفعلية.
        </p>
      </SectionCard>
    </div>
  );
}

async function getDonorReport() {
  const supabase = await createClient();
  const [donors, donations, pledges, receipts] = await Promise.all([
    supabase.from("donors").select("id,name,relationship_stage,next_action,next_action_date,last_contact_at,phone,email", { count: "exact" }).is("archived_at", null).limit(2000),
    supabase.from("donations").select("amount,support_type").is("archived_at", null).limit(1000),
    supabase.from("pledges").select("status").is("archived_at", null).limit(1000),
    supabase.from("donation_receipts").select("status").is("archived_at", null).limit(1000),
  ]);

  const donationRows = donations.data ?? [];
  const donorRows = donors.data ?? [];
  const pledgeRows = pledges.data ?? [];
  const receiptRows = receipts.data ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekKey = nextWeek.toISOString().slice(0, 10);
  return {
    donors: donors.count ?? donorRows.length,
    donationsTotal: donationRows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0),
    openPledges: pledgeRows.filter((row) => row.status === "open" || row.status === "overdue").length,
    pendingReceipts: receiptRows.filter((row) => row.status === "draft" || row.status === "ready" || !row.status).length,
    bySupportType: aggregate(donationRows, "support_type", "amount"),
    pledgesByStatus: aggregate(pledgeRows, "status"),
    donorsByStage: aggregate(donorRows, "relationship_stage"),
    noContactDonors: donorRows.filter((row) => !row.last_contact_at || (!row.phone && !row.email)).length,
    followupPledges: pledgeRows.filter((row) => row.status === "open" || row.status === "partially_collected" || row.status === "overdue").length,
    upcomingActions: donorRows
      .filter((row) => row.next_action && row.next_action_date && row.next_action_date >= today && row.next_action_date <= nextWeekKey)
      .slice(0, 8)
      .map((row) => ({
        id: String(row.id),
        name: String(row.name ?? "مانح"),
        nextAction: String(row.next_action ?? "إجراء متابعة"),
        nextDate: formatLaunchValue(row.next_action_date),
      })),
  };
}

function aggregate(rows: Array<Record<string, unknown>>, key: string, valueKey?: string) {
  const map = new Map<string, number>();
  for (const row of rows) {
    const label = labels[String(row[key] ?? "")] ?? "غير محدد";
    map.set(label, (map.get(label) ?? 0) + (valueKey ? Number(row[valueKey] ?? 0) : 1));
  }
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

function money(value: number) {
  return `${new Intl.NumberFormat("ar-SA").format(value)} ريال`;
}

const labels: Record<string, string> = {
  ...Object.fromEntries(donorRelationshipStages.map((stage) => [stage.value, stage.label])),
  cash: "نقدي",
  in_kind: "عيني",
  program_sponsorship: "رعاية برنامج",
  halaqat_sponsorship: "كفالة حلقات",
  competition: "مسابقة",
  general: "عام",
  open: "مفتوح",
  partially_collected: "محصل جزئيًا",
  collected: "محصل",
  overdue: "متأخر",
  cancelled: "ملغي",
};
