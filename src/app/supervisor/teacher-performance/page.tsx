import { ChartColumn } from "lucide-react";

import { PageHero, SectionCard } from "@/components/dashboard-ui";
import { requireAnyRole } from "@/lib/auth";

export default async function SupervisorTeacherPerformancePage() {
  await requireAnyRole(["admin", "demo_admin", "supervisor"]);
  return (
    <div className="space-y-5">
      <PageHero eyebrow="متابعة تطويرية" title="أداء المعلمين" description="المؤشرات مساعدة للمشرف ولا تغني عن الزيارة الميدانية والتقييم المباشر." />
      <SectionCard title="مؤشرات المعلمين" icon={ChartColumn}>
        <p className="rounded-2xl border border-dashed border-[var(--line)] bg-[#fffdf8] p-6 text-sm font-bold leading-7 text-[var(--muted)]">
          ستظهر مؤشرات المعلمين التابعة للمشرف بعد اكتمال إدخالات الحفظ والزيارات في النظام.
        </p>
      </SectionCard>
    </div>
  );
}
