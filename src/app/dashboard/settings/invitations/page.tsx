import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { InvitationsClient, type InvitationRow } from "./InvitationsClient";

export const dynamic = "force-dynamic";

async function getInvitationRows(): Promise<InvitationRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_onboarding_requests")
    .select("id,full_name,email,requested_role,auth_status,invited_at")
    .is("archived_at", null)
    .neq("email", "qa@example.com")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[invitations] failed to load requests", { message: error.message });
    return [];
  }

  return (data ?? []) as InvitationRow[];
}

export default async function InvitationsPage() {
  await requireRole("admin");
  const rows = await getInvitationRows();

  return (
    <div className="space-y-5">
      <section className="app-card luxury-pattern overflow-hidden rounded-[1.7rem]">
        <div className="relative border-r-4 border-[var(--gold)] p-5 sm:p-7">
          <p className="mb-2 text-sm font-semibold text-[var(--gold)]">الإعدادات</p>
          <h1 className="text-2xl font-bold text-[var(--primary-dark)] sm:text-4xl">
            الدعوات
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
            إرسال دعوات إنشاء الحساب للمستخدمين المسجّلين في طلبات الانضمام. تُرسل الدعوة
            بريدًا يحتوي رابط إنشاء كلمة المرور والدخول إلى النظام.
          </p>
        </div>
      </section>

      <InvitationsClient rows={rows} />
    </div>
  );
}
