import { BellRing } from "lucide-react";

import { createNotification } from "@/app/dashboard/notifications/actions";
import { requireAnyRole } from "@/lib/auth";
import { executiveRoles } from "@/lib/module-access";

export default async function NewNotificationPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAnyRole([...executiveRoles, "supervisor"]);
  const params = await searchParams;

  return (
    <div className="space-y-5">
      <section className="app-card luxury-pattern overflow-hidden rounded-[1.7rem]">
        <div className="relative border-r-4 border-[var(--gold)] p-5 sm:p-7">
          <p className="text-sm font-semibold text-[var(--gold)]">الإشعارات الداخلية</p>
          <h1 className="mt-2 text-2xl font-bold text-[var(--primary-dark)] sm:text-4xl">إرسال إشعار</h1>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-[var(--muted)]">
            أرسل تنبيهًا داخل المنصة لمستخدم محدد أو دور كامل. لا يتم إرسال رسائل جوال أو واتساب أو بريد إلكتروني.
          </p>
        </div>
      </section>

      <Notice code={params.error} />

      <section className="app-card rounded-[1.6rem] p-5 sm:p-7">
        <form action={createNotification} className="grid gap-4 md:grid-cols-2">
          <Field name="title" label="عنوان الإشعار" required />
          <Field name="link_url" label="رابط مرتبط اختياري" />
          <Select name="type" label="نوع الإشعار" options={[
            ["general", "عام"],
            ["alert", "تنبيه"],
            ["task", "مهمة"],
            ["reminder", "تذكير"],
            ["approval", "اعتماد"],
          ]} />
          <Select name="priority" label="الأولوية" options={[
            ["normal", "عادي"],
            ["important", "مهم"],
            ["urgent", "عاجل"],
          ]} />
          <Select name="target_type" label="موجه إلى" options={[
            ["role", "دور محدد"],
            ["user", "مستخدم بالبريد"],
            ["all_teachers", "كل المعلمين"],
            ["all_supervisors", "كل المشرفين"],
          ]} />
          <Select name="target_role" label="الدور عند اختيار دور محدد" options={[
            ["teacher", "معلم"],
            ["supervisor", "مشرف"],
            ["executive_director", "مدير تنفيذي"],
            ["media_officer", "إعلامي"],
            ["admin", "مدير النظام"],
          ]} optional />
          <Field name="target_email" label="بريد المستخدم المحدد" />
          <label className="block text-sm font-bold text-[var(--text)] md:col-span-2">
            نص الإشعار
            <textarea name="body" rows={5} required className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 py-3 text-sm font-semibold outline-none focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--gold)]/15" />
          </label>
          <div className="md:col-span-2">
            <button className="gold-button inline-flex h-12 items-center gap-2 rounded-2xl px-7 text-sm font-semibold text-white">
              <BellRing aria-hidden className="size-4" />
              إرسال الإشعار
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Field({ name, label, required = false }: { name: string; label: string; required?: boolean }) {
  return (
    <label className="block text-sm font-bold text-[var(--text)]">
      {label}
      {required ? <span className="text-[var(--danger)]"> *</span> : null}
      <input name={name} required={required} className="mt-2 h-12 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 text-sm font-semibold outline-none focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--gold)]/15" />
    </label>
  );
}

function Select({ name, label, options, optional = false }: { name: string; label: string; options: string[][]; optional?: boolean }) {
  return (
    <label className="block text-sm font-bold text-[var(--text)]">
      {label}
      <select name={name} defaultValue={optional ? "" : options[0][0]} className="mt-2 h-12 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 text-sm font-semibold outline-none focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--gold)]/15">
        {optional ? <option value="">غير محدد</option> : null}
        {options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
      </select>
    </label>
  );
}

function Notice({ code }: { code?: string }) {
  if (!code) return null;
  const text = code === "no-recipients"
    ? "لم يتم العثور على مستلمين مطابقين. تحقق من البريد أو الدور."
    : code === "missing"
      ? "يرجى تعبئة عنوان الإشعار ونصه."
      : "تعذر إرسال الإشعار. تحقق من الصلاحيات أو الجداول.";
  return <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{text}</p>;
}
