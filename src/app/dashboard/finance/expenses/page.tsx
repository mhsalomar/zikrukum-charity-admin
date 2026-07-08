import { FinanceRecords } from "@/components/finance-records";
import { financeRecordConfigs } from "@/lib/finance-configs";
import { getFinanceRows } from "@/lib/finance";

export default async function ExpensesPage() {
  const records = await getFinanceRows("finance_expenses");
  return <FinanceRecords config={financeRecordConfigs.expenses} records={records} />;
}
