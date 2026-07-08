import Link from "next/link";
import { CheckCircle2, ClipboardCheck, Gauge, ShieldAlert } from "lucide-react";

import { FollowupAlertsPanel } from "@/components/followup-alerts-panel";
import { PageHero, SectionCard } from "@/components/dashboard-ui";
import { KpiCard } from "@/components/report-charts";
import { requireAnyRole } from "@/lib/auth";
import { getLaunchReadinessData, type Severity } from "@/lib/launch-readiness";
import { executiveRoles } from "@/lib/module-access";

export default async function LaunchReadinessPage() {
  await requireAnyRole([...executiveRoles]);
  const readiness = await getLaunchReadinessData();
  const activeIssues = readiness.readinessItems.filter((item) => item.count > 0);
  const high = activeIssues.filter((item) => item.severity === "high").length;
  const medium = activeIssues.filter((item) => item.severity === "medium").length;
  const low = activeIssues.filter((item) => item.severity === "low").length;
  const severityTrend = [low, medium, high, activeIssues.length];

  return (
    <div className="space-y-5">
      <PageHero
        eyebrow="قبل الإطلاق"
        title="جاهزية التشغيل"
        description="قائمة عملية بما ينقص قبل التشغيل، مبنية على البيانات الفعلية فقط وبدون أرقام تقديرية."
        actions={
          <Link href="/dashboard/reports" className="gold-button inline-flex min-h-12 items-center rounded-2xl px-5 text-sm font-semibold text-white">
            فتح التقارير
          </Link>
        }
      />

      {activeIssues.length === 0 || high + medium === 0 ? (
        <div className="rounded-[1.4rem] border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
          <div className="flex items-center gap-3">
            <CheckCircle2 aria-hidden className="size-7" />
            <p className="text-lg font-bold">جاهز للتشغيل — لا توجد ملاحظات حرجة حاليًا.</p>
          </div>
          {low > 0 ? <p className="mt-2 text-sm font-bold">توجد ملاحظات منخفضة يمكن تحسينها بعد الإطلاق دون تعطيل التشغيل.</p> : null}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="ملاحظات عالية" value={high} icon={ShieldAlert} tone={high > 0 ? "warning" : "emerald"} trend={severityTrend} />
        <KpiCard label="ملاحظات متوسطة" value={medium} icon={Gauge} tone={medium > 0 ? "gold" : "sage"} trend={severityTrend} />
        <KpiCard label="ملاحظات منخفضة" value={low} icon={ClipboardCheck} tone="sage" trend={severityTrend} />
        <KpiCard label="إجمالي البنود" value={activeIssues.length} icon={ClipboardCheck} tone="emerald" trend={severityTrend} />
      </section>

      <FollowupAlertsPanel
        title="بنود الجاهزية التي تحتاج معالجة"
        description="كل بطاقة تقود للصفحة الأقرب لمعالجة النقص."
        items={readiness.readinessItems}
        emptyText="جاهز للتشغيل — لا توجد ملاحظات حرجة حاليًا."
      />

      <SectionCard title="طريقة قراءة مستوى الخطورة" icon={Gauge}>
        <div className="grid gap-3 md:grid-cols-3">
          <SeverityBox severity="high" title="عالي" text="يؤثر مباشرة على التشغيل مثل معلم بلا حلقة أو طالب بلا حلقة." />
          <SeverityBox severity="medium" title="متوسط" text="يؤثر على جودة المتابعة أو اكتمال البيانات مثل الآيبان والمنجزات." />
          <SeverityBox severity="low" title="منخفض" text="تحسينات تنظيمية لا تمنع الإطلاق مثل بنود اعتماد أو تحديث لاحق." />
        </div>
      </SectionCard>
    </div>
  );
}

function SeverityBox({ severity, title, text }: { severity: Severity; title: string; text: string }) {
  const classes = severity === "high"
    ? "border-red-200 bg-red-50 text-red-900"
    : severity === "medium"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : "border-emerald-100 bg-emerald-50 text-emerald-900";
  return (
    <div className={`rounded-2xl border p-4 ${classes}`}>
      <p className="text-lg font-bold">{title}</p>
      <p className="mt-2 text-sm font-bold leading-7">{text}</p>
    </div>
  );
}
