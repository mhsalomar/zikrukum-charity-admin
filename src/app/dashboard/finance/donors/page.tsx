import { FinanceRecords } from "@/components/finance-records";
import { getFinanceRows } from "@/lib/finance";
import { financeRecordConfigs } from "@/lib/finance-configs";

export default async function DonorsPage() {
  const records = await getFinanceRows("donors");
  return <FinanceRecords config={financeRecordConfigs.donors} records={records} />;
}
