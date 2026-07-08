import { StudentRequestsReview } from "@/components/student-requests-review";
import { requireAnyRole } from "@/lib/auth";
import { getStudentRequestsForReview } from "@/lib/student-requests";

export const dynamic = "force-dynamic";

export default async function DashboardStudentRequestsPage() {
  await requireAnyRole(["admin", "demo_admin", "halaqat_manager", "executive_director", "executive_manager"]);
  const rows = await getStudentRequestsForReview();

  return (
    <StudentRequestsReview
      rows={rows}
      returnTo="/dashboard/student-requests"
      title="طلبات الطلاب والتصحيح"
      description="طلبات المعلمين لإضافة طالب أو تعديل حضور أو تعديل تسميع أو نقل طالب. الاعتماد هنا يمنع إعادة التسجيل العشوائي."
    />
  );
}
