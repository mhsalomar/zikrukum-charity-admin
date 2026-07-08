import { ProgramsManager } from "@/components/programs-manager";
import { getPrograms } from "@/lib/programs";

export default async function CompetitionsPage() {
  const programs = await getPrograms();
  return (
    <ProgramsManager
      programs={programs}
      initialType="competition"
      heroTitle="المسابقات القرآنية"
      heroDescription="إدارة المسابقات وفئاتها وفائزيها وتحويلات الجوائز من صفحة واحدة مرتبطة بوحدة البرامج."
    />
  );
}
