import Link from "next/link";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function UserOnboardingDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin");
  const { id } = await params;
  const request = await getRequest(id);
  if (!request) notFound();

  return (
    <div className="space-y-5">
      <section className="app-card luxury-pattern overflow-hidden rounded-[1.7rem]">
        <div className="relative border-r-4 border-[var(--gold)] p-5 sm:p-7">
          <p className="text-sm font-semibold text-[var(--gold)]">طلب مستخدم</p>
          <h1 className="mt-2 text-2xl font-bold text-[var(--primary-dark)]">{String(request.full_name)}</h1>
          <p className="mt-3 text-sm font-bold text-[var(--muted)]">{String(request.email)}</p>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <Info label="الدور المطلوب" value={roleLabel(String(request.requested_role))} />
        <Info label="حالة الدخول" value={authLabel(String(request.auth_status))} />
        <Info label="الجوال" value={String(request.phone ?? "غير محدد")} />
        <Info label="حالة الطلب" value={requestStatusLabel(String(request.status ?? "pending_auth"))} />
        <Info label="سجل المعلم المرتبط" value={String(request.linked_teacher_id ?? "غير مرتبط")} />
        <Info label="سجل المشرف المرتبط" value={String(request.linked_supervisor_id ?? "غير مرتبط")} />
        <Info label="سجل الموظف المرتبط" value={String(request.linked_hr_employee_id ?? "غير مرتبط")} />
      </section>
      <section className="app-card rounded-[1.6rem] p-5">
        <p className="text-sm font-semibold text-[var(--gold)]">خطوة حساب الدخول</p>
        <p className="mt-2 text-sm font-bold leading-7 text-[var(--muted)]">
          أرسل الدعوة من صفحة الدعوات. المستخدم ينشئ كلمة المرور بنفسه، وبعد أول دخول يربط النظام الحساب بسجله الداخلي ودوره.
        </p>
        <Link href="/dashboard/users" className="mt-4 inline-flex rounded-2xl border border-[var(--line)] bg-white px-5 py-3 text-sm font-semibold text-[var(--primary-dark)]">
          العودة للمستخدمين
        </Link>
        <Link href="/dashboard/settings/invitations" className="mt-4 me-3 inline-flex rounded-2xl border border-[var(--line)] bg-white px-5 py-3 text-sm font-semibold text-[var(--primary-dark)]">
          فتح صفحة الدعوات
        </Link>
      </section>
    </div>
  );
}

async function getRequest(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("user_onboarding_requests").select("*").eq("id", id).maybeSingle();
  return data as Record<string, unknown> | null;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="app-card rounded-2xl p-4">
      <p className="text-xs font-bold text-[var(--muted)]">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-[var(--primary-dark)]">{value}</p>
    </div>
  );
}

function roleLabel(value: string) {
  return {
    teacher: "معلم",
    supervisor: "مشرف",
    hr_employee: "موظف إداري",
    executive_director: "مدير تنفيذي",
    media_officer: "إعلامي",
    admin: "إدارة",
  }[value] ?? value;
}

function authLabel(value: string) {
  return value === "linked" ? "مرتبط بحساب دخول" : value === "auth_created" ? "تم إنشاء الحساب" : "بانتظار إنشاء حساب الدخول";
}

function requestStatusLabel(value: string) {
  return {
    pending_auth: "بانتظار حساب الدخول",
    auth_created: "دعوة مرسلة",
    linked: "مرتبط",
    active: "مفعّل",
    needs_linking: "يحتاج ربط داخلي",
    missing_email: "ناقص بريد",
  }[value] ?? "قيد المراجعة";
}
