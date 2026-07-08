import { EvidenceCenter } from "@/components/evidence-center";
import { requireAnyRole } from "@/lib/auth";

const mediaEvidenceRoles = [
  "admin",
  "demo_admin",
  "executive_director",
  "executive_manager",
  "media_officer",
  "hr",
] as const;

export default async function MediaEvidencePage() {
  await requireAnyRole([...mediaEvidenceRoles]);
  return <EvidenceCenter />;
}
