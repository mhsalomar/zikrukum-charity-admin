import { FinanceRecords } from "@/components/finance-records";
import { getFinanceRows } from "@/lib/finance";
import { financeRecordConfigs } from "@/lib/finance-configs";

export default async function BudgetItemsPage() {
  const records = await getFinanceRows("finance_budget_items");
  return <FinanceRecords config={financeRecordConfigs.budgetItems} records={records} />;
}
