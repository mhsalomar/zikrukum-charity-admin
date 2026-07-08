import Link from "next/link";
import { ArrowRight, Banknote, BookOpen, ShieldCheck, UserRound } from "lucide-react";

import { requireAnyRole } from "@/lib/auth";
import { maskDocument, maskIban } from "@/lib/masking";
import { operationalRoles } from "@/lib/operational-resources";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ id: string }>;
};

type RelatedObject = Record<string, unknown>;

export default async function TeacherDetailsPage({ params }: PageProps) {
  const { id } = await params;
  const teacher = await getTeacher(id);

  if (!teacher) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold text-amber-800">
        لم يتم العثور على المعلم.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link href="/dashboard/teachers" className="inline-flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 py-2 text-xs font-semibold text-[var(--primary-dark)]">
        <ArrowRight aria-hidden className="size-4" />
        العودة للمعلمين
      </Link>

      <section className="dashboard-hero luxury-pattern overflow-hidden rounded-[1.8rem] text-white">
        <div className="relative p-5 sm:p-7">
          <p className="text-sm font-semibold text-[var(--gold-soft)]">تفاصيل معلم</p>
          <h1 className="mt-2 text-2xl font-bold sm:text-4xl">{teacher.fullName}</h1>
          <p className="mt-3 text-sm font-bold text-[#d9eee5]">
            {teacher.email || "لا يوجد بريد"} — {teacher.phone || "لا يوجد جوال"}
          </p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <InfoCard icon={UserRound} title="البيانات العامة">
          <Info label="الدور" value={roleLabels[teacher.teacherRole] ?? teacher.teacherRole} />
          <Info label="الحالة" value={teacher.status === "active" ? "نشط" : "غير نشط"} />
          <Info label="تاريخ المباشرة" value={teacher.startDate || "غير محدد"} />
          <Info label="الجنسية" value={teacher.nationality || "غير محدد"} />
        </InfoCard>

        <InfoCard icon={ShieldCheck} title="الهوية والإقامة">
          <Info label="نوع الوثيقة" value={documentTypeLabels[teacher.documentType] ?? teacher.documentType} />
          <Info label="الرقم في الملخص" value={maskDocument(teacher.documentNumber)} />
          <Info label="الرقم الكامل للإدارة" value={teacher.documentNumber || "غير محدد"} sensitive />
        </InfoCard>

        <InfoCard icon={Banknote} title="الرواتب والتحويل">
          <Info label="مرتبط بسجل رواتب" value={teacher.payrollEmployeeName || "غير مرتبط"} />
          <Info label="البنك" value={teacher.bankName || teacher.payrollBankName || "غير محدد"} />
          <Info label="الآيبان في الملخص" value={maskIban(teacher.iban || teacher.payrollIban)} />
          <Info label="الآيبان الكامل للإدارة" value={teacher.iban || teacher.payrollIban || "غير محدد"} sensitive />
          <Info label="آخر شهر في مسير" value={teacher.latestPayrollMonth || "لا يوجد"} />
        </InfoCard>
      </section>

      <section className="app-card rounded-[1.7rem] p-5">
        <div className="mb-4 flex items-center gap-2">
          <BookOpen aria-hidden className="size-5 text-[var(--gold)]" />
          <h2 className="text-lg font-bold text-[var(--primary-dark)]">الحلقات المرتبطة</h2>
        </div>
        {teacher.halaqat.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--line)] bg-[#fffdf8] p-4 text-sm font-bold text-[var(--muted)]">
            المعلم غير مرتبط بأي حلقة.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {teacher.halaqat.map((halaqa) => (
              <div key={halaqa.id} className="rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-4">
                <p className="font-semibold text-[var(--primary-dark)]">{halaqa.name}</p>
                <p className="mt-1 text-xs font-bold text-[var(--muted)]">
                  {periodLabels[halaqa.period] ?? halaqa.period} — {halaqa.mosqueName || "المسجد غير محدد"}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

async function getTeacher(id: string) {
  await requireAnyRole([...operationalRoles]);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teachers")
    .select("id,full_name,phone,email,document_type,document_number,nationality,teacher_role,status,start_date,payroll_employee_id,bank_name,iban,account_holder_name,salary_amount,payroll_data_status,payroll_notes,notes,primary_halaqat:halaqat!halaqat_teacher_id_fkey(id,name,period,mosques!halaqat_mosque_id_fkey(name)),assistant_halaqat:halaqat!halaqat_assistant_teacher_id_fkey(id,name,period,mosques!halaqat_mosque_id_fkey(name))")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as unknown as RelatedObject;
  const payrollEmployeeId = readString(row.payroll_employee_id);
  const { data: payrollData } = payrollEmployeeId
    ? await supabase
        .from("employees_payroll")
        .select("employee_name,iban,bank_name,national_id")
        .eq("id", payrollEmployeeId)
        .maybeSingle()
    : { data: null };
  const payroll = readObject(payrollData);
  const { data: latestItem } = payrollEmployeeId
    ? await supabase
        .from("payroll_run_items")
        .select("payroll_runs(month,year)")
        .eq("employee_id", payrollEmployeeId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  const latestRun = readObject((latestItem as RelatedObject | null)?.payroll_runs);

  return {
    id: readString(row.id),
    fullName: readString(row.full_name),
    phone: readString(row.phone),
    email: readString(row.email),
    documentType: readString(row.document_type) || "other",
    documentNumber: readString(row.document_number),
    nationality: readString(row.nationality),
    teacherRole: readString(row.teacher_role) || "teacher",
    status: readString(row.status) || "active",
    startDate: readString(row.start_date),
    payrollEmployeeName: readString(payroll.employee_name),
    payrollBankName: readString(payroll.bank_name),
    payrollIban: readString(payroll.iban),
    bankName: readString(row.bank_name),
    iban: readString(row.iban),
    latestPayrollMonth: latestRun.year && latestRun.month ? `${latestRun.year}-${latestRun.month}` : "",
    halaqat: [
      ...(Array.isArray(row.primary_halaqat) ? row.primary_halaqat : []),
      ...(Array.isArray(row.assistant_halaqat) ? row.assistant_halaqat : []),
    ].map((item) => {
          const halaqa = readObject(item);
          return {
            id: readString(halaqa.id),
            name: readString(halaqa.name),
            period: readString(halaqa.period),
            mosqueName: readString(readObject(halaqa.mosques).name),
          };
        }),
  };
}

const documentTypeLabels: Record<string, string> = {
  national_id: "هوية وطنية",
  iqama: "إقامة",
  other: "أخرى",
};

const roleLabels: Record<string, string> = {
  teacher: "معلم",
  supervisor: "مشرف",
  assistant_teacher: "مساعد معلم",
  admin: "إداري",
};

const periodLabels: Record<string, string> = {
  fajr: "الفجر",
  asr: "العصر",
  maghrib: "المغرب",
  isha: "العشاء",
};

function InfoCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="app-card rounded-[1.7rem] p-5">
      <div className="mb-4 flex items-center gap-2">
        <Icon aria-hidden className="size-5 text-[var(--gold)]" />
        <h2 className="text-lg font-bold text-[var(--primary-dark)]">{title}</h2>
      </div>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}

function Info({ label, value, sensitive = false }: { label: string; value: string; sensitive?: boolean }) {
  return (
    <div className={`rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-3 ${sensitive ? "border-amber-200 bg-amber-50" : ""}`}>
      <p className="text-xs font-bold text-[#81928b]">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-[var(--primary-dark)]">{value}</p>
    </div>
  );
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
