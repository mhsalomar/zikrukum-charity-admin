import { ProgramsManager } from "@/components/programs-manager";
import { getPrograms } from "@/lib/programs";

export default async function ProgramsPage() {
  const programs = await getPrograms();
  return <ProgramsManager programs={programs} />;
}
