"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAnyRole, requireRole } from "@/lib/auth";
import {
  cleanText,
  finiteNumber,
  parseBoundedJsonArray,
  safeInternalPath,
} from "@/lib/security";
import { createClient } from "@/lib/supabase/server";

const financeWriteRoles = ["admin", "executive_manager"] as const;
const completePayrollRunMinimumEmployees = 10;
const completePayrollRunMinimumAmount = 20000;
const importRowSchema = z.record(z.string().max(100), z.unknown());

type FinanceTable =
  | "finance_expenses"
  | "finance_revenues"
  | "finance_budget_items"
  | "donors"
  | "finance_reports";

export async function savePayrollEmployee(formData: FormData) {
  await requireAnyRole([...financeWriteRoles]);
  const id = text(formData, "id");
  const employeeName = text(formData, "employee_name");
  const rawIban = normalizeIban(text(formData, "iban"));

  if (!employeeName) {
    redirect("/dashboard/finance/payroll?error=missing");
  }

  const payload = {
    employee_name: employeeName,
    employee_type: normalizePayrollEmployeeType(text(formData, "employee_type")),
    iban: rawIban && isValidSaudiIban(rawIban) ? rawIban : null,
    bank_name: nullableText(formData, "bank_name"),
    national_id: nullableText(formData, "national_id"),
    phone: nullableText(formData, "phone"),
    base_salary: numberValue(formData, "base_salary"),
    allowances: numberValue(formData, "allowances"),
    deductions: numberValue(formData, "deductions"),
    notes: nullableText(formData, "notes"),
    status: text(formData, "status") || "active",
  };

  const supabase = await createClient();
  const result = id
    ? await supabase.from("employees_payroll").update(payload).eq("id", id)
    : await supabase.from("employees_payroll").insert(payload);

  if (result.error) {
    redirect("/dashboard/finance/payroll?error=save");
  }

  redirect(`/dashboard/finance/payroll?${id ? "updated" : "created"}=1`);
}

export async function createPayrollRun(formData: FormData) {
  await requireAnyRole([...financeWriteRoles]);
  const selectedMonth = text(formData, "payroll_month");
  const notes = nullableText(formData, "notes");
  const match = /^(\d{4})-(\d{2})$/.exec(selectedMonth);

  if (!match) {
    redirect("/dashboard/finance/payroll?error=month");
  }

  const year = Number(match[1]);
  const month = match[2];
  const supabase = await createClient();
  const { data: employees, error: employeesError } = await supabase
    .from("employees_payroll")
    .select("id,base_salary,allowances,deductions,net_salary")
    .eq("status", "active")
    .is("archived_at", null);

  if (employeesError) {
    redirect("/dashboard/finance/payroll?error=save");
  }

  const activeEmployees = employees ?? [];
  if (activeEmployees.length === 0) {
    redirect("/dashboard/finance/payroll?error=no-employees");
  }

  const totalAmount = activeEmployees.reduce((total, employee) => {
    const net =
      Number(employee.net_salary ?? 0) ||
      Number(employee.base_salary ?? 0) +
        Number(employee.allowances ?? 0) -
        Number(employee.deductions ?? 0);
    return total + net;
  }, 0);

  const { data: run, error: runError } = await supabase
    .from("payroll_runs")
    .insert({
      month,
      year,
      total_employees: activeEmployees.length,
      total_amount: totalAmount,
      notes,
      status: "draft",
    })
    .select("id")
    .single();

  if (runError || !run) {
    redirect("/dashboard/finance/payroll?error=duplicate-run");
  }

  const items = activeEmployees.map((employee) => {
    const baseSalary = Number(employee.base_salary ?? 0);
    const allowances = Number(employee.allowances ?? 0);
    const deductions = Number(employee.deductions ?? 0);

    return {
      run_id: run.id,
      employee_id: employee.id,
      base_salary: baseSalary,
      allowances,
      deductions,
      net_salary: baseSalary + allowances - deductions,
      payment_status: "pending",
    };
  });

  const { error: itemsError } = await supabase.from("payroll_run_items").insert(items);

  if (itemsError) {
    redirect("/dashboard/finance/payroll?error=save");
  }

  redirect(`/dashboard/finance/payroll/${year}-${month}?created=1`);
}

export async function cloneLatestPayrollRun(formData: FormData) {
  await requireAnyRole([...financeWriteRoles]);
  const selectedMonth = text(formData, "payroll_month");
  const notes = nullableText(formData, "notes");
  const match = /^(\d{4})-(\d{2})$/.exec(selectedMonth);

  if (!match) {
    redirect("/dashboard/finance/payroll?error=month");
  }

  const year = Number(match[1]);
  const month = match[2];
  const supabase = await createClient();

  const { data: existingRun, error: existingError } = await supabase
    .from("payroll_runs")
    .select("id")
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();

  if (existingError) {
    redirect("/dashboard/finance/payroll?error=save");
  }

  if (existingRun) {
    redirect("/dashboard/finance/payroll?error=duplicate-run");
  }

  const { data: candidateRuns, error: latestError } = await supabase
    .from("payroll_runs")
    .select("id,month,year,total_employees,total_amount,status")
    .neq("status", "cancelled")
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .limit(12);

  if (latestError || !candidateRuns) {
    redirect("/dashboard/finance/payroll?error=no-run");
  }

  const sourceRun = candidateRuns.find((run) => {
    const runKey = Number(run.year) * 100 + Number(run.month);
    const targetKey = year * 100 + Number(month);
    return (
      runKey < targetKey &&
      Number(run.total_employees ?? 0) >= completePayrollRunMinimumEmployees &&
      Number(run.total_amount ?? 0) >= completePayrollRunMinimumAmount
    );
  });

  if (!sourceRun) {
    redirect("/dashboard/finance/payroll?error=incomplete-run");
  }

  const { data: sourceItems, error: itemsError } = await supabase
    .from("payroll_run_items")
    .select("employee_id,base_salary,allowances,deductions,net_salary,notes")
    .eq("run_id", sourceRun.id)
    .neq("payment_status", "failed");

  if (itemsError || !sourceItems || sourceItems.length === 0) {
    redirect("/dashboard/finance/payroll?error=no-run");
  }

  const totalAmount = sourceItems.reduce((total, item) => total + Number(item.net_salary ?? 0), 0);
  const { data: newRun, error: runError } = await supabase
    .from("payroll_runs")
    .insert({
      month,
      year,
      total_employees: sourceItems.length,
      total_amount: totalAmount,
      notes,
      status: "draft",
    })
    .select("id")
    .single();

  if (runError || !newRun) {
    redirect("/dashboard/finance/payroll?error=save");
  }

  const { error: copyError } = await supabase.from("payroll_run_items").insert(
    sourceItems.map((item) => ({
      run_id: newRun.id,
      employee_id: item.employee_id,
      base_salary: Number(item.base_salary ?? 0),
      allowances: Number(item.allowances ?? 0),
      deductions: Number(item.deductions ?? 0),
      net_salary: Number(item.net_salary ?? 0),
      notes: item.notes,
      payment_status: "pending",
    })),
  );

  if (copyError) {
    redirect("/dashboard/finance/payroll?error=save");
  }

  redirect(`/dashboard/finance/payroll/${year}-${month}?created=1`);
}

export async function updatePayrollRunItem(formData: FormData) {
  await requireAnyRole([...financeWriteRoles]);
  const itemId = text(formData, "id");
  const runMonth = text(formData, "run_month");

  if (!itemId || !runMonth) {
    redirect("/dashboard/finance/payroll?error=missing");
  }

  const baseSalary = numberValue(formData, "base_salary");
  const allowances = numberValue(formData, "allowances");
  const deductions = numberValue(formData, "deductions");
  const supabase = await createClient();
  const { data: updatedItem, error } = await supabase
    .from("payroll_run_items")
    .update({
      base_salary: baseSalary,
      allowances,
      deductions,
      net_salary: baseSalary + allowances - deductions,
      notes: nullableText(formData, "notes"),
      payment_status: text(formData, "payment_status") || "pending",
    })
    .eq("id", itemId)
    .select("run_id")
    .maybeSingle();

  if (error) {
    redirect(`/dashboard/finance/payroll/${runMonth}?error=save`);
  }

  if (updatedItem?.run_id) {
    await syncPayrollRunTotal(supabase, String(updatedItem.run_id));
  }

  redirect(`/dashboard/finance/payroll/${runMonth}?updated=1`);
}

export async function removePayrollRunItem(formData: FormData) {
  await requireAnyRole([...financeWriteRoles]);
  const itemId = text(formData, "id");
  const runMonth = text(formData, "run_month");

  if (!itemId || !runMonth) {
    redirect(`/dashboard/finance/payroll/${runMonth}?error=remove`);
  }

  const supabase = await createClient();
  const { data: updatedItem, error } = await supabase
    .from("payroll_run_items")
    .update({
      base_salary: 0,
      allowances: 0,
      deductions: 0,
      net_salary: 0,
      payment_status: "failed",
      notes: "تمت إزالته من هذا المسير فقط دون حذف سجل الموظف.",
    })
    .eq("id", itemId)
    .select("run_id")
    .maybeSingle();

  if (error) {
    redirect(`/dashboard/finance/payroll/${runMonth}?error=save`);
  }

  if (updatedItem?.run_id) {
    await syncPayrollRunTotal(supabase, String(updatedItem.run_id));
  }

  redirect(`/dashboard/finance/payroll/${runMonth}?updated=1`);
}

export async function auditPayrollRun(formData: FormData) {
  await requireAnyRole([...financeWriteRoles]);
  const runId = text(formData, "run_id");
  const runMonth = text(formData, "run_month");

  if (!runId || !runMonth) {
    redirect("/dashboard/finance/payroll?error=missing-run");
  }

  const supabase = await createClient();
  await normalizePayrollRunItems(supabase, runId);
  await syncPayrollRunTotal(supabase, runId);

  redirect(`/dashboard/finance/payroll/${runMonth}?audited=1`);
}

export async function saveFinanceRecord(formData: FormData) {
  await requireAnyRole([...financeWriteRoles]);
  const table = text(formData, "table") as FinanceTable;
  const id = text(formData, "id");
  const returnTo = safeInternalPath(text(formData, "return_to"), "/dashboard/finance");

  const payload = buildFinancePayload(table, formData);
  if (!payload) {
    redirect(`${returnTo}?error=missing`);
  }

  const supabase = await createClient();
  const result = id
    ? await supabase.from(table).update(payload).eq("id", id)
    : await supabase.from(table).insert(payload);

  if (result.error) {
    redirect(`${returnTo}?error=save`);
  }

  redirect(`${returnTo}?${id ? "updated" : "created"}=1`);
}

export async function deleteFinanceRecord(formData: FormData) {
  await requireAnyRole([...financeWriteRoles]);
  const table = text(formData, "table") as FinanceTable;
  const id = text(formData, "id");
  const returnTo = safeInternalPath(text(formData, "return_to"), "/dashboard/finance");

  if (!isFinanceTable(table) || !id) {
    redirect(`${returnTo}?error=missing`);
  }

  const supabase = await createClient();
  const { error } = await supabase.from(table).delete().eq("id", id);

  if (error) {
    const constrained =
      error.code === "23503" ||
      error.message.toLowerCase().includes("foreign key") ||
      error.message.includes("violates foreign key constraint");
    redirect(`${returnTo}?error=${constrained ? "delete-constrained" : "delete"}`);
  }

  redirect(`${returnTo}?deleted=1`);
}

export async function importPayrollEmployees(formData: FormData) {
  await requireAnyRole([...financeWriteRoles]);
  const rowsJson = text(formData, "rows");

  if (!rowsJson) {
    redirect("/dashboard/finance/payroll?error=missing");
  }

  const parsedRows = parseBoundedJsonArray(rowsJson, importRowSchema, 5000);
  if (!parsedRows?.success) {
    redirect("/dashboard/finance/payroll?error=csv");
  }
  const rows = parsedRows.data;

  const supabase = await createClient();

  for (const row of rows) {
    const employeeName = String(row.employee_name ?? "").trim();
    const rawIban = normalizeIban(String(row.iban ?? ""));
    const iban = rawIban && isValidSaudiIban(rawIban) ? rawIban : "";

    if (!employeeName) {
      redirect("/dashboard/finance/payroll?error=csv");
    }

    const payload = {
      employee_name: employeeName,
      employee_type: normalizePayrollEmployeeType(String(row.employee_type ?? "staff")),
      iban: iban || null,
      bank_name: nullable(row.bank_name),
      national_id: nullable(row.national_id),
      phone: nullable(row.phone),
      base_salary: numeric(row.base_salary),
      allowances: numeric(row.allowances),
      deductions: numeric(row.deductions),
      notes: nullable(row.notes),
      status: "active",
    };

    const existingQuery = iban
      ? supabase.from("employees_payroll").select("id").eq("iban", iban).limit(1).maybeSingle()
      : supabase.from("employees_payroll").select("id").eq("employee_name", employeeName).limit(1).maybeSingle();
    const { data: existing, error: lookupError } = await existingQuery;

    if (lookupError) {
      redirect("/dashboard/finance/payroll?error=save");
    }

    const result = existing?.id
      ? await supabase.from("employees_payroll").update(payload).eq("id", existing.id)
      : await supabase.from("employees_payroll").insert(payload);

    if (result.error) {
      redirect("/dashboard/finance/payroll?error=save");
    }
  }

  redirect("/dashboard/finance/payroll?imported=1");
}

export async function archivePayrollEmployee(formData: FormData) {
  await requireAnyRole([...financeWriteRoles]);
  const id = text(formData, "id");

  if (!id) {
    redirect("/dashboard/finance/payroll?error=missing");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("employees_payroll")
    .update({
      status: "inactive",
      notes: nullableText(formData, "notes") ?? "تم تعطيله من قائمة الرواتب دون حذف بياناته.",
    })
    .eq("id", id);

  if (error) {
    redirect("/dashboard/finance/payroll?error=save");
  }

  await removeEmployeeFromOpenPayrollRuns(supabase, id);

  redirect("/dashboard/finance/payroll?archived=1");
}

export async function importMonthlyPayrollRun(formData: FormData) {
  await requireAnyRole([...financeWriteRoles]);
  const selectedMonth = text(formData, "payroll_month");
  const rowsJson = text(formData, "rows");
  const allowUpdate = text(formData, "update_existing") === "1";
  const match = /^(\d{4})-(\d{2})$/.exec(selectedMonth);

  if (!match || !rowsJson) {
    redirect("/dashboard/finance/payroll?error=month-import");
  }

  const parsedRows = parseBoundedJsonArray(rowsJson, importRowSchema, 5000);
  if (!parsedRows?.success) {
    redirect("/dashboard/finance/payroll?error=payroll-import");
  }
  const rows = parsedRows.data;

  const expectedRows = rows.filter((row) => String(row.row_action ?? "") !== "ignore");
  const expectedTotal = expectedRows.reduce((total, row) => total + numeric(row.amount), 0);
  const unmatchedRows = rows.filter((row) => !String(row.employee_id ?? "").trim() && String(row.row_action ?? "review") === "review").length;
  const missingIbanRows = rows.filter((row) => !isValidSaudiIban(String(row.iban ?? ""))).length;
  const validRows = rows.filter((row) => !["ignore", "review"].includes(String(row.row_action ?? "review")));
  if (validRows.length === 0) {
    redirect("/dashboard/finance/payroll?error=payroll-import");
  }

  const year = Number(match[1]);
  const month = match[2];
  const supabase = await createClient();
  const { data: existingRun, error: existingError } = await supabase
    .from("payroll_runs")
    .select("id,status")
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();

  if (existingError) {
    redirect("/dashboard/finance/payroll?error=save");
  }

  if (existingRun && !allowUpdate) {
    redirect("/dashboard/finance/payroll?error=run-exists");
  }

  let runId = existingRun?.id as string | undefined;
  if (!runId) {
    const totalAmount = validRows.reduce((total, row) => total + numeric(row.amount), 0);
    const { data: createdRun, error: runError } = await supabase
      .from("payroll_runs")
      .insert({
        month,
        year,
        total_employees: validRows.length,
        total_amount: totalAmount,
        status: "draft",
        notes: "مسير مستورد من ملف شهري بعد المعاينة.",
      })
      .select("id")
      .single();

    if (runError || !createdRun) {
      redirect("/dashboard/finance/payroll?error=save");
    }
    runId = createdRun.id;
  }

  for (const row of validRows) {
    const employeeName = String(row.employee_name ?? "").trim();
    const rawIban = normalizeIban(String(row.iban ?? ""));
    const iban = rawIban && isValidSaudiIban(rawIban) ? rawIban : "";
    const amount = numeric(row.amount);
    const rowAction = String(row.row_action ?? "add");

    if (!employeeName || amount < 0) {
      redirect("/dashboard/finance/payroll?error=payroll-import");
    }

    let employeeId = String(row.employee_id ?? "").trim();
    if (!employeeId && iban) {
      const { data: foundEmployee, error: lookupError } = await supabase
        .from("employees_payroll")
        .select("id")
        .eq("iban", iban)
        .limit(1)
        .maybeSingle();

      if (lookupError) {
        redirect("/dashboard/finance/payroll?error=save");
      }
      employeeId = foundEmployee?.id ?? "";
    }
    if (!employeeId) {
      const { data: foundEmployee, error: lookupError } = await supabase
        .from("employees_payroll")
        .select("id")
        .eq("employee_name", employeeName)
        .limit(1)
        .maybeSingle();

      if (lookupError) {
        redirect("/dashboard/finance/payroll?error=save");
      }
      employeeId = foundEmployee?.id ?? "";
    }

    if (!employeeId && rowAction === "add") {
      const { data: createdEmployee, error: employeeError } = await supabase
        .from("employees_payroll")
        .insert({
          employee_name: employeeName,
          employee_type: normalizePayrollEmployeeType(String(row.employee_type ?? "staff")),
          iban: iban || null,
          bank_name: nullable(row.bank_name),
          base_salary: amount,
          allowances: 0,
          deductions: 0,
          notes: "أضيف من استيراد مسير شهري.",
          status: "active",
        })
        .select("id")
        .single();

      if (employeeError || !createdEmployee) {
        redirect("/dashboard/finance/payroll?error=save");
      }
      employeeId = createdEmployee.id;
    }

    if (!employeeId) {
      continue;
    }

    const { error: itemError } = await supabase.from("payroll_run_items").upsert(
      {
        run_id: runId,
        employee_id: employeeId,
        base_salary: amount,
        allowances: 0,
        deductions: 0,
        net_salary: amount,
        payment_status: "pending",
        notes: nullable(row.notes),
      },
      { onConflict: "run_id,employee_id" },
    );

    if (itemError) {
      redirect("/dashboard/finance/payroll?error=save");
    }
  }

  const { data: runItems, error: totalsError } = await supabase
    .from("payroll_run_items")
    .select("net_salary")
    .eq("run_id", runId)
    .neq("payment_status", "failed");

  if (totalsError) {
    redirect("/dashboard/finance/payroll?error=save");
  }

  const totalAmount = (runItems ?? []).reduce((total, item) => total + Number(item.net_salary ?? 0), 0);
  const { error: updateRunError } = await supabase
    .from("payroll_runs")
    .update({
      total_employees: runItems?.length ?? 0,
      total_amount: totalAmount,
      status: "draft",
    })
    .eq("id", runId);

  if (updateRunError) {
    redirect("/dashboard/finance/payroll?error=save");
  }

  const savedRows = runItems?.length ?? 0;
  const resultParams = new URLSearchParams({
    imported: "1",
    read: String(rows.length),
    expected: String(expectedRows.length),
    saved: String(savedRows),
    unmatched: String(unmatchedRows),
    missing_iban: String(missingIbanRows),
    expected_total: String(expectedTotal),
    saved_total: String(totalAmount),
  });
  redirect(`/dashboard/finance/payroll/${year}-${month}?${resultParams.toString()}`);
}

export async function importPayrollWorkbookRuns(formData: FormData) {
  await requireAnyRole([...financeWriteRoles]);
  const rowsJson = text(formData, "rows");

  if (!rowsJson) {
    redirect("/dashboard/finance/payroll?error=payroll-import");
  }

  const parsedRows = parseBoundedJsonArray(rowsJson, importRowSchema, 10_000);
  if (!parsedRows?.success) {
    redirect("/dashboard/finance/payroll?error=payroll-import");
  }
  const rows = parsedRows.data;

  const importableRows = rows.filter((row) => {
    const action = String(row.row_action ?? "review");
    const month = String(row.payroll_month ?? "");
    return month && !["ignore", "review"].includes(action) && String(row.match_status ?? "") !== "duplicate";
  });

  if (importableRows.length === 0) {
    redirect("/dashboard/finance/payroll?error=payroll-import");
  }

  const supabase = await createClient();
  const grouped = new Map<string, Array<Record<string, unknown>>>();
  for (const row of importableRows) {
    const monthKey = String(row.payroll_month ?? "").trim();
    if (!/^(\d{4})-(\d{2})$/.test(monthKey)) {
      redirect("/dashboard/finance/payroll?error=month-import");
    }
    grouped.set(monthKey, [...(grouped.get(monthKey) ?? []), row]);
  }

  let createdCount = 0;
  for (const [monthKey, monthRows] of grouped.entries()) {
    const [yearText, month] = monthKey.split("-");
    const year = Number(yearText);
    const { data: existingRun, error: existingError } = await supabase
      .from("payroll_runs")
      .select("id")
      .eq("year", year)
      .eq("month", month)
      .maybeSingle();

    if (existingError) {
      redirect("/dashboard/finance/payroll?error=save");
    }
    if (existingRun) {
      continue;
    }

    const preparedItems: Array<{
      employee_id: string;
      base_salary: number;
      allowances: number;
      deductions: number;
      net_salary: number;
      payment_status: string;
      notes: string | null;
    }> = [];

    for (const row of monthRows) {
      const employeeName = String(row.employee_name ?? "").trim();
      const amount = numeric(row.amount);
      const rowAction = String(row.row_action ?? "review");
      if (!employeeName || amount < 0) {
        redirect("/dashboard/finance/payroll?error=payroll-import");
      }

      let employeeId = String(row.employee_id ?? "").trim();
      if (!employeeId) {
        const { data: foundEmployee, error: lookupError } = await supabase
          .from("employees_payroll")
          .select("id")
          .eq("employee_name", employeeName)
          .limit(1)
          .maybeSingle();

        if (lookupError) {
          redirect("/dashboard/finance/payroll?error=save");
        }
        employeeId = foundEmployee?.id ?? "";
      }

      if (!employeeId && rowAction === "add") {
        const rawIban = normalizeIban(String(row.iban ?? ""));
        const iban = rawIban && isValidSaudiIban(rawIban) ? rawIban : "";
        const { data: createdEmployee, error: employeeError } = await supabase
          .from("employees_payroll")
          .insert({
            employee_name: employeeName,
            employee_type: String(row.employee_type ?? "staff") || "staff",
            iban: iban || null,
            bank_name: nullable(row.bank_name),
            base_salary: amount,
            allowances: 0,
            deductions: 0,
            notes: "أضيف بعد موافقة صريحة من استيراد ملف المتابعة المالية.",
            status: "active",
          })
          .select("id")
          .single();

        if (employeeError || !createdEmployee) {
          redirect("/dashboard/finance/payroll?error=save");
        }
        employeeId = createdEmployee.id;
      }

      if (!employeeId) {
        continue;
      }

      preparedItems.push({
        employee_id: employeeId,
        base_salary: amount,
        allowances: 0,
        deductions: 0,
        net_salary: amount,
        payment_status: String(row.transfer_result ?? "") === "تم" ? "paid" : "pending",
        notes: nullable([row.source_sheet, row.notes, row.transfer_result ? `نتيجة التحويل: ${row.transfer_result}` : ""].filter(Boolean).join(" — ")),
      });
    }

    if (preparedItems.length === 0) {
      continue;
    }

    const totalAmount = preparedItems.reduce((total, item) => total + item.net_salary, 0);
    const { data: createdRun, error: runError } = await supabase
      .from("payroll_runs")
      .insert({
        month,
        year,
        total_employees: preparedItems.length,
        total_amount: totalAmount,
        status: "draft",
        notes: "مسير مستورد من ملف المتابعة المالية بعد المعاينة.",
      })
      .select("id")
      .single();

    if (runError || !createdRun) {
      redirect("/dashboard/finance/payroll?error=save");
    }

    const { error: itemsError } = await supabase.from("payroll_run_items").insert(
      preparedItems.map((item) => ({
        ...item,
        run_id: createdRun.id,
      })),
    );

    if (itemsError) {
      redirect("/dashboard/finance/payroll?error=save");
    }
    createdCount += 1;
  }

  if (createdCount === 0) {
    redirect("/dashboard/finance/payroll?error=run-exists");
  }

  redirect("/dashboard/finance/payroll?workbook_imported=1");
}

export async function deletePayrollRun(formData: FormData) {
  const { user } = await requireRole("admin");
  const runId = text(formData, "run_id");
  const confirmation = text(formData, "confirmation");

  if (!runId || confirmation !== "حذف المسير") {
    redirect("/dashboard/finance/payroll?error=delete-confirmation");
  }

  const supabase = await createClient();
  const { data: run, error: runError } = await supabase
    .from("payroll_runs")
    .select("id,month,year,total_employees,total_amount,status")
    .eq("id", runId)
    .maybeSingle();

  if (runError || !run) {
    redirect("/dashboard/finance/payroll?error=missing");
  }

  const { error: itemsError } = await supabase
    .from("payroll_run_items")
    .delete()
    .eq("run_id", runId);

  if (itemsError) {
    redirect(`/dashboard/finance/payroll/${run.year}-${String(run.month).padStart(2, "0")}?error=delete`);
  }

  const { error: deleteRunError } = await supabase
    .from("payroll_runs")
    .delete()
    .eq("id", runId);

  if (deleteRunError) {
    redirect(`/dashboard/finance/payroll/${run.year}-${String(run.month).padStart(2, "0")}?error=delete`);
  }

  await supabase.from("audit_logs").insert({
    actor_user_id: user.id,
    action: "payroll_run.delete",
    table_name: "payroll_runs",
    record_id: runId,
    metadata: {
      month: run.month,
      year: run.year,
      total_employees: run.total_employees,
      total_amount: run.total_amount,
      note: "حذف مسير الرواتب وبنوده فقط دون حذف الموظفين أو المعلمين.",
    },
  });

  redirect("/dashboard/finance/payroll?run_deleted=1");
}

export async function cleanupPayrollData(formData: FormData) {
  const { user } = await requireRole("admin");
  const scope = text(formData, "scope");
  const confirmation = text(formData, "confirmation");
  const zeroUuid = "00000000-0000-0000-0000-000000000000";

  if (!["runs_only", "runs_and_employees"].includes(scope) || confirmation !== "حذف بيانات الرواتب") {
    redirect("/dashboard/finance/payroll?error=cleanup-confirmation");
  }

  const supabase = await createClient();
  const { error: itemsError } = await supabase
    .from("payroll_run_items")
    .delete()
    .neq("id", zeroUuid);

  if (itemsError) {
    redirect("/dashboard/finance/payroll?error=cleanup");
  }

  const { error: runsError } = await supabase
    .from("payroll_runs")
    .delete()
    .neq("id", zeroUuid);

  if (runsError) {
    redirect("/dashboard/finance/payroll?error=cleanup");
  }

  if (scope === "runs_and_employees") {
    const { error: employeesError } = await supabase
      .from("employees_payroll")
      .delete()
      .neq("id", zeroUuid);

    if (employeesError) {
      redirect("/dashboard/finance/payroll?error=cleanup");
    }
  }

  await supabase.from("audit_logs").insert({
    actor_user_id: user.id,
    action: "payroll.cleanup",
    table_name: "payroll_runs",
    record_id: null,
    metadata: {
      scope,
      note: "تنظيف بيانات نظام الرواتب فقط دون حذف المعلمين أو الطلاب أو الحلقات أو السجلات المالية العامة.",
    },
  });

  redirect("/dashboard/finance/payroll?cleanup_done=1");
}

function buildFinancePayload(table: FinanceTable, formData: FormData) {
  if (table === "finance_expenses") {
    const expenseDate = text(formData, "expense_date");
    const category = text(formData, "category");
    if (!expenseDate || !category) return null;
    return {
      expense_date: expenseDate,
      amount: numberValue(formData, "amount"),
      category,
      description: nullableText(formData, "description"),
      payment_method: nullableText(formData, "payment_method"),
      reference_number: nullableText(formData, "reference_number"),
      status: text(formData, "status") || "draft",
    };
  }

  if (table === "finance_revenues") {
    const revenueDate = text(formData, "revenue_date");
    const sourceName = text(formData, "source_name");
    if (!revenueDate || !sourceName) return null;
    return {
      revenue_date: revenueDate,
      amount: numberValue(formData, "amount"),
      source_name: sourceName,
      donor_name: nullableText(formData, "donor_name"),
      description: nullableText(formData, "description"),
      reference_number: nullableText(formData, "reference_number"),
      status: text(formData, "status") || "draft",
    };
  }

  if (table === "finance_budget_items") {
    const name = text(formData, "name");
    if (!name) return null;
    return {
      name,
      allocated_amount: numberValue(formData, "allocated_amount"),
      spent_amount: numberValue(formData, "spent_amount"),
      fiscal_year: Number(text(formData, "fiscal_year") || new Date().getFullYear()),
      notes: nullableText(formData, "notes"),
      status: text(formData, "status") || "active",
    };
  }

  if (table === "donors") {
    const name = text(formData, "name");
    if (!name) return null;
    return {
      name,
      donor_type: nullableText(formData, "donor_type"),
      phone: nullableText(formData, "phone"),
      email: nullableText(formData, "email"),
      notes: nullableText(formData, "notes"),
      status: text(formData, "status") || "active",
    };
  }

  if (table === "finance_reports") {
    const title = text(formData, "title");
    if (!title) return null;
    return {
      title,
      report_type: nullableText(formData, "report_type"),
      period_start: nullableText(formData, "period_start"),
      period_end: nullableText(formData, "period_end"),
      summary: nullableText(formData, "summary"),
      status: text(formData, "status") || "draft",
    };
  }

  return null;
}

function text(formData: FormData, key: string) {
  return cleanText(formData.get(key), key === "rows" ? 2_000_000 : 2000);
}

function nullableText(formData: FormData, key: string) {
  return text(formData, key) || null;
}

function numberValue(formData: FormData, key: string) {
  return finiteNumber(text(formData, key) || 0, { min: 0 });
}

function nullable(value: unknown) {
  const textValue = String(value ?? "").trim();
  return textValue || null;
}

function numeric(value: unknown) {
  return finiteNumber(String(value ?? "0").trim() || 0, { min: 0 });
}

function normalizePayrollEmployeeType(value: string) {
  const normalized = value.trim();
  if (["employee", "staff", "موظف"].includes(normalized)) return "staff";
  if (["female_staff", "موظفة"].includes(normalized)) return "female_staff";
  if (["teacher", "معلم", "معلم/معلمة"].includes(normalized)) return "teacher";
  if (["female_teacher", "معلمة"].includes(normalized)) return "female_teacher";
  if (["supervisor", "مشرف"].includes(normalized)) return "supervisor";
  return normalized || "staff";
}

function normalizeIban(value: string) {
  return value.replace(/\s+/g, "").trim().toUpperCase();
}

function isValidSaudiIban(value: string) {
  return /^SA[A-Z0-9]{22}$/.test(normalizeIban(value));
}

function isFinanceTable(table: string): table is FinanceTable {
  return ["finance_expenses", "finance_revenues", "finance_budget_items", "donors", "finance_reports"].includes(table);
}

export async function approvePayrollRun(formData: FormData) {
  await requireAnyRole([...financeWriteRoles]);
  const runId = String(formData.get("run_id") ?? "").trim();
  const returnTo = safeInternalPath(formData.get("return_to"), "/dashboard/finance/payroll");

  if (!runId) redirect(returnTo + "?error=missing-run");

  const supabase = await createClient();
  await normalizePayrollRunItems(supabase, runId);
  await syncPayrollRunTotal(supabase, runId);

  const { error } = await supabase
    .from("payroll_runs")
    .update({ status: "approved" })
    .eq("id", runId);

  if (error) redirect(returnTo + "?error=approve");

  redirect(returnTo + "?approved=1");
}

async function removeEmployeeFromOpenPayrollRuns(
  supabase: Awaited<ReturnType<typeof createClient>>,
  employeeId: string,
) {
  const { data: affectedItems } = await supabase
    .from("payroll_run_items")
    .select("run_id,payment_status")
    .eq("employee_id", employeeId)
    .neq("payment_status", "paid");

  const runIds = [...new Set((affectedItems ?? []).map((item) => String(item.run_id ?? "")).filter(Boolean))];
  if (runIds.length === 0) return;

  await supabase
    .from("payroll_run_items")
    .update({
      base_salary: 0,
      allowances: 0,
      deductions: 0,
      net_salary: 0,
      payment_status: "failed",
      notes: "أُخرج تلقائيًا من المسيرات غير المدفوعة بعد تعطيل المستفيد من قائمة الرواتب.",
    })
    .eq("employee_id", employeeId)
    .neq("payment_status", "paid");

  await Promise.all(runIds.map((runId) => syncPayrollRunTotal(supabase, runId)));
}

async function normalizePayrollRunItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  runId: string,
) {
  const { data: items } = await supabase
    .from("payroll_run_items")
    .select("id,payment_status,employees_payroll(id,status,archived_at)")
    .eq("run_id", runId);

  const staleItemIds = ((items ?? []) as Array<{
    id: string;
    payment_status: string | null;
    employees_payroll?: { id?: string | null; status?: string | null; archived_at?: string | null } | Array<{ id?: string | null; status?: string | null; archived_at?: string | null }> | null;
  }>)
    .filter((item) => item.payment_status !== "paid" && !isPayrollEmployeeActive(item.employees_payroll))
    .map((item) => item.id);

  if (staleItemIds.length === 0) return;

  await supabase
    .from("payroll_run_items")
    .update({
      base_salary: 0,
      allowances: 0,
      deductions: 0,
      net_salary: 0,
      payment_status: "failed",
      notes: "أُخرج من الحساب أثناء تدقيق المسير لعدم وجود مستفيد رواتب نشط مرتبط بهذا البند.",
    })
    .in("id", staleItemIds);
}

async function syncPayrollRunTotal(
  supabase: Awaited<ReturnType<typeof createClient>>,
  runId: string,
) {
  const { data: items, error } = await supabase
    .from("payroll_run_items")
    .select("net_salary,payment_status,employees_payroll(id,status,archived_at)")
    .eq("run_id", runId);

  if (error) return;

  const payableItems = ((items ?? []) as Array<{
    net_salary: number | null;
    payment_status: string | null;
    employees_payroll?: { id?: string | null; status?: string | null; archived_at?: string | null } | Array<{ id?: string | null; status?: string | null; archived_at?: string | null }> | null;
  }>).filter((item) => item.payment_status !== "failed" && isPayrollEmployeeActive(item.employees_payroll));

  await supabase
    .from("payroll_runs")
    .update({
      total_employees: payableItems.length,
      total_amount: payableItems.reduce((total, item) => total + Number(item.net_salary ?? 0), 0),
    })
    .eq("id", runId);
}

function isPayrollEmployeeActive(
  employee:
    | { id?: string | null; status?: string | null; archived_at?: string | null }
    | Array<{ id?: string | null; status?: string | null; archived_at?: string | null }>
    | null
    | undefined,
) {
  const row = Array.isArray(employee) ? employee[0] : employee;
  return Boolean(row?.id) && row?.status !== "inactive" && !row?.archived_at;
}
