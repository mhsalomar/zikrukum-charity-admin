import { BriefcaseBusiness } from "lucide-react";

import { ModuleScaffold } from "@/components/module-scaffold";
import { requireAnyRole } from "@/lib/auth";
import { hrRoles } from "@/lib/module-access";

export default async function EmployeesPage() {
  await requireAnyRole([...hrRoles]);

  return (
    <ModuleScaffold
      eyebrow="وحدة الموارد البشرية"
      title="الموظفون"
      icon={BriefcaseBusiness}
      actions={[
        { label: "إدارة بيانات الموظفين الأساسية", status: "requires-schema" },
        { label: "متابعة الحالة الوظيفية والتكليفات", status: "requires-schema" },
        { label: "ربط الموظفين بالصلاحيات عند الحاجة", status: "planned" },
        { label: "تقارير الموارد البشرية", status: "planned" },
      ]}
      nextStep="اعتماد جدول الموظفين ونطاق بيانات الموارد البشرية قبل تفعيل الإدخال."
    />
  );
}
