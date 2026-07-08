import { getMonthlyCloseData } from "@/lib/finance";
import MonthlyCloseChecklist from "@/components/monthly-close-checklist";

export default async function MonthlyClosePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const year = Number(params.year) || now.getFullYear();
  const month = Number(params.month) || now.getMonth() + 1;

  const data = await getMonthlyCloseData(year, month);

  return <MonthlyCloseChecklist items={data.items} year={data.year} month={data.month} />;
}
