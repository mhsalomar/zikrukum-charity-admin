import { ProgramDetail } from "@/components/program-detail";
import { getCurrentUserRoles } from "@/lib/auth";
import { getProgramDetails } from "@/lib/programs";

export default async function ProgramDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [details, roles] = await Promise.all([getProgramDetails(id), getCurrentUserRoles()]);
  const canManageWinnerTransfers = roles.includes("admin");
  const canViewWinnerTransferDetails =
    roles.includes("admin")
    || roles.includes("executive_director")
    || roles.includes("executive_manager")
    || roles.includes("demo_admin");

  return (
    <ProgramDetail
      details={details}
      canManageWinnerTransfers={canManageWinnerTransfers}
      canViewWinnerTransferDetails={canViewWinnerTransferDetails}
    />
  );
}
