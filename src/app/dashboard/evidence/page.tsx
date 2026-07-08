import { EvidenceCenter } from "@/components/evidence-center";
import { requireAnyRole } from "@/lib/auth";

const dashboardEvidenceRoles = [
  "admin",
  "demo_admin",
  "executive_director",
  "executive_manager",
  "hr",
] as const;

export default async function EvidencePage() {
  await requireAnyRole([...dashboardEvidenceRoles]);
  return <EvidenceCenter />;
}
