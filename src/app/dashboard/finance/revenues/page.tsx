import { FinanceRecords } from "@/components/finance-records";
import { getFinanceRows } from "@/lib/finance";
import { financeRecordConfigs } from "@/lib/finance-configs";

export default async function RevenuesPage() {
  const records = await getFinanceRows("finance_revenues");
  return <FinanceRecords config={financeRecordConfigs.revenues} records={records} />;
}
