import { createUserOnboardingRequest } from "@/app/dashboard/users/actions";
import { requireRole } from "@/lib/auth";

export default async function NewUserPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireRole("admin");
  const params = await searchParams;

  return (
    <div className="space-y-5">
      <section className="app-card luxury-pattern overflow-hidden rounded-[1.7rem]">
        <div className="relative border-r-4 border-[var(--gold)] p-5 sm:p-7">
          <p className="text-sm font-semibold text-[var(--gold)]">إدارة المستخدمين</p>
          <h1 className="mt-2 text-2xl font-bold text-[var(--primary-dark)] sm:text-4xl">إضافة مستخدم من النظام</h1>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-[var(--muted)]">
            إذا كان الاسم موجودًا في سجلات المعلمين أو المشرفين أو الموظفين، سيربط النظام البريد والدور بنفس السجل بدل إنشاء نسخة مكررة.
          </p>
        </div>
      </section>
      <Notice code={params.error} />
      <section className="app-card rounded-[1.6rem] p-5 sm:p-7">
        <form action={createUserOnboardingRequest} className="grid gap-4 md:grid-cols-2">
          <Field name="full_name" label="الاسم" required />
          <Field name="email" label="البريد الإلكتروني" type="email" required />
          <Field name="phone" label="الجوال" />
          <Select name="requested_role" label="الدور" options={[
            ["teacher", "معلم"],
            ["supervisor", "مشرف"],
            ["hr_employee", "موظف إداري"],
            ["executive_director", "مدير تنفيذي"],
            ["media_officer", "إعلامي"],
            ["admin", "إدارة"],
          ]} />
          <Select name="document_type" label="نوع الوثيقة" options={[
            ["", "غير محدد"],
            ["national_id", "هوية وطنية"],
            ["iqama", "إقامة"],
            ["other", "أخرى"],
          ]} />
          <Field name="document_number" label="رقم الهوية/الإقامة" />
          <Field name="bank_name" label="البنك" />
          <Field name="iban" label="الآيبان" />
          <Select name="payroll_data_status" label="حالة بيانات التحويل" options={[
            ["incomplete", "ناقصة"],
            ["complete", "مكتملة"],
            ["needs_review", "تحتاج مراجعة"],
          ]} />
          <label className="block text-sm font-bold text-[var(--text)] md:col-span-2">
            ملاحظات
            <textarea name="notes" rows={4} className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 py-3 text-sm font-semibold outline-none focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--gold)]/15" />
          </label>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-7 text-amber-800 md:col-span-2">
            لا يتم إنشاء كلمة مرور من النظام. المستخدم ينشئ كلمة المرور بنفسه من رابط الدعوة، ويمكن حفظ السجل بدون إرسال دعوة إذا أردت المراجعة أولًا.
          </div>
          <div className="flex flex-wrap gap-3 md:col-span-2">
            <button
              name="submit_mode"
              value="save_only"
              className="h-12 rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-7 text-sm font-semibold text-[var(--primary-dark)]"
            >
              حفظ بدون إرسال دعوة
            </button>
            <button
              name="submit_mode"
              value="save_and_invite"
              className="gold-button h-12 rounded-2xl px-7 text-sm font-semibold text-white"
            >
              حفظ وإرسال دعوة
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Field({ name, label, type = "text", required = false }: { name: string; label: string; type?: string; required?: boolean }) {
  return (
    <label className="block text-sm font-bold text-[var(--text)]">
      {label}
      {required ? <span className="text-[var(--danger)]"> *</span> : null}
      <input name={name} type={type} required={required} className="mt-2 h-12 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 text-sm font-semibold outline-none focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--gold)]/15" />
    </label>
  );
}

function Select({ name, label, options }: { name: string; label: string; options: string[][] }) {
  return (
    <label className="block text-sm font-bold text-[var(--text)]">
      {label}
      <select name={name} className="mt-2 h-12 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 text-sm font-semibold outline-none focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--gold)]/15">
        {options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
      </select>
    </label>
  );
}

function Notice({ code }: { code?: string }) {
  if (!code) return null;
  return (
    <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
      {code === "missing" ? "يرجى تعبئة الاسم والبريد والدور." : "تعذر حفظ طلب المستخدم. تأكد من تشغيل migration الخاص بطلبات المستخدمين."}
    </p>
  );
}
