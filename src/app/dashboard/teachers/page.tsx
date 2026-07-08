import {
  TeachersManagement,
  type PayrollOption,
  type TeacherAdminRecord,
} from "@/components/teachers-management";
import { CsvExportButton } from "@/components/csv-export-button";
import { StaffBulkImporter } from "@/components/staff-bulk-importer";
import { requireAnyRole } from "@/lib/auth";
import { operationalRoles } from "@/lib/operational-resources";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<{ created?: string; updated?: string; archived?: string; error?: string }>;
};

type RelatedObject = Record<string, unknown>;

export default async function TeachersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { roles } = await requireAnyRole([...operationalRoles]);
  const [teachersResult, payrollOptions] = await Promise.all([
    getTeachers(),
    getPayrollOptions(),
  ]);
  const teachers = teachersResult.records;
  const canImport = roles.some((role) =>
    ["admin", "demo_admin", "executive_director", "executive_manager", "halaqat_manager"].includes(role),
  );

  return (
    <div className="space-y-5">
      <section className="app-card luxury-pattern overflow-hidden rounded-[1.7rem]">
        <div className="relative border-r-4 border-[var(--gold)] p-5 sm:p-7">
          <p className="mb-2 text-sm font-semibold text-[var(--gold)]">إدارة الحلقات</p>
          <h1 className="text-2xl font-bold text-[var(--primary-dark)] sm:text-4xl">
            المعلمون
          </h1>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <p className="max-w-3xl text-sm leading-7 text-[var(--muted)] sm:text-base">
              بيانات رسمية للمعلمين مع ربط اختياري بالرواتب، وإخفاء الهوية والآيبان في الجداول العامة.
            </p>
            <div className="flex flex-wrap gap-2">
              <CsvExportButton
                filename="قائمة-المعلمين"
                data={teachers.map((t) => ({
                  "الاسم": t.fullName,
                  "الهاتف": t.phone || "—",
                  "البريد": t.email || "—",
                  "الجنسية": t.nationality || "—",
                  "الدور": t.teacherRole || "—",
                  "الحالة": t.status,
                  "جاهزية الراتب": t.payrollDataStatus || "—",
                }))}
              />
              {canImport ? <StaffBulkImporter kind="teacher" /> : null}
            </div>
          </div>
        </div>
      </section>

      <StatusMessage params={params} />
      {teachersResult.loadError ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          تعذر تحميل بيانات المعلمين مؤقتًا. حاول مرة أخرى أو تواصل مع مسؤول النظام.
        </p>
      ) : null}
      <TeachersManagement records={teachers} payrollOptions={payrollOptions} />
    </div>
  );
}

async function getTeachers(): Promise<{ records: TeacherAdminRecord[]; loadError: boolean }> {
  await requireAnyRole([...operationalRoles]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("teachers")
    .select("id,full_name,phone,email,document_type,document_number,nationality,teacher_role,status,start_date,payroll_employee_id,bank_name,iban,account_holder_name,salary_amount,payroll_data_status,payroll_notes,notes,primary_halaqat:halaqat!halaqat_teacher_id_fkey(name),assistant_halaqat:halaqat!halaqat_assistant_teacher_id_fkey(name)")
    .order("full_name");

  if (error) {
    console.error("teachers-load-error", error);
    return { records: [], loadError: true };
  }

  const records = ((data ?? []) as unknown as RelatedObject[]).map((teacher) => ({
    id: readString(teacher.id),
    fullName: readString(teacher.full_name),
    phone: readString(teacher.phone),
    email: readString(teacher.email),
    documentType: readString(teacher.document_type) || "other",
    documentNumber: readString(teacher.document_number),
    nationality: readString(teacher.nationality),
    teacherRole: readString(teacher.teacher_role) || "teacher",
    status: readString(teacher.status) || "active",
    startDate: readString(teacher.start_date),
    payrollEmployeeId: readString(teacher.payroll_employee_id),
    bankName: readString(teacher.bank_name),
    iban: readString(teacher.iban),
    accountHolderName: readString(teacher.account_holder_name),
    salaryAmount: readNumberOrNull(teacher.salary_amount),
    payrollDataStatus: readString(teacher.payroll_data_status) || "incomplete",
    payrollNotes: readString(teacher.payroll_notes),
    notes: readString(teacher.notes),
    halaqat: [
      ...(Array.isArray(teacher.primary_halaqat) ? teacher.primary_halaqat : []),
      ...(Array.isArray(teacher.assistant_halaqat) ? teacher.assistant_halaqat : []),
    ].map((halaqa) => readString(readObject(halaqa).name)).filter(Boolean),
    linkedPayroll: Boolean(readString(teacher.payroll_employee_id)),
  }));

  return { records, loadError: false };
}

async function getPayrollOptions(): Promise<PayrollOption[]> {
  await requireAnyRole([...operationalRoles]);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employees_payroll")
    .select("id,employee_name,iban")
    .is("archived_at", null)
    .order("employee_name");

  if (error) return [];

  return ((data ?? []) as unknown as RelatedObject[]).map((employee) => ({
    id: readString(employee.id),
    label: `${readString(employee.employee_name)}${readString(employee.iban) ? ` — ${readString(employee.iban).slice(-4)}` : ""}`,
  }));
}

function StatusMessage({
  params,
}: {
  params: { created?: string; updated?: string; archived?: string; error?: string };
}) {
  if (params.created) return <Notice kind="success" text="تم إضافة المعلم بنجاح." />;
  if (params.updated) return <Notice kind="success" text="تم تحديث بيانات المعلم بنجاح." />;
  if (params.archived) return <Notice kind="success" text="تم أرشفة المعلم دون حذف سجلاته السابقة." />;
  if (params.error === "missing") return <Notice kind="warning" text="يرجى تعبئة اسم المعلم." />;
  if (params.error) return <Notice kind="error" text="تعذر حفظ بيانات المعلم. تأكد من الصلاحيات والحقول." />;
  return null;
}

function Notice({ kind, text }: { kind: "success" | "warning" | "error"; text: string }) {
  const classes = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    error: "border-red-200 bg-red-50 text-red-700",
  };
  return <p className={`rounded-2xl border p-4 text-sm font-bold ${classes[kind]}`}>{text}</p>;
}

function readObject(value: unknown): RelatedObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as RelatedObject)
    : {};
}

function readString(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function readNumberOrNull(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
