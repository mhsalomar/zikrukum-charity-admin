import { StudentRequestsReview } from "@/components/student-requests-review";
import { requireAnyRole } from "@/lib/auth";
import { getStudentRequestsForReview } from "@/lib/student-requests";

export const dynamic = "force-dynamic";

export default async function SupervisorRequestsPage() {
  await requireAnyRole(["admin", "demo_admin", "supervisor"]);
  const rows = await getStudentRequestsForReview();

  return (
    <StudentRequestsReview
      rows={rows}
      returnTo="/supervisor/requests"
      title="طلبات المعلمين"
      description="راجع طلبات الإضافة أو التصحيح أو النقل الواردة من المعلمين داخل نطاق الإشراف."
    />
  );
}
