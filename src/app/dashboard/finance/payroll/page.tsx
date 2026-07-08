import { PayrollManager } from "@/components/payroll-manager";
import { getCurrentUserRoles } from "@/lib/auth";
import { getPayrollData } from "@/lib/finance";

export default async function PayrollPage() {
  const [{ employees, runs }, roles] = await Promise.all([
    getPayrollData(),
    getCurrentUserRoles(),
  ]);

  return <PayrollManager employees={employees} runs={runs} canCleanup={roles.includes("admin")} />;
}
