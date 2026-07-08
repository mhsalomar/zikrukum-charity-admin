import { Sun } from "lucide-react";

import { ModuleScaffold } from "@/components/module-scaffold";
import { requireAnyRole } from "@/lib/auth";
import { programsRoles } from "@/lib/module-access";

export default async function SummerCoursesPage() {
  await requireAnyRole([...programsRoles]);

  return (
    <ModuleScaffold
      eyebrow="وحدة البرامج"
      title="الدورات الصيفية"
      icon={Sun}
      actions={[
        { label: "تعريف دورة صيفية", status: "requires-schema" },
        { label: "ربط المشاركين بالحلقات", status: "requires-schema" },
        { label: "متابعة المهام واللجان", status: "planned" },
        { label: "تقرير ختامي للدورة", status: "planned" },
      ]}
      nextStep="اعتماد مخطط البرامج والدورات قبل إضافة أي بيانات تشغيلية."
    />
  );
}
