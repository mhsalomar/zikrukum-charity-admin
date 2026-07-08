import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { getAdminUsers, requireRole } from "@/lib/auth";
import { formatRoleList } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

const statusLabels = {
  active: "نشط",
  inactive: "غير نشط",
  suspended: "موقوف",
};

const PAGE_SIZE = 50;

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireRole("admin");
  const { page: pageParam } = await searchParams;
  const page = Math.max(0, parseInt(pageParam ?? "0", 10) || 0);
  const users = await getAdminUsers(page, PAGE_SIZE);
  const onboarding = await getOnboardingRequests();

  return (
    <div className="space-y-5">
      <section className="app-card luxury-pattern overflow-hidden rounded-[1.7rem]">
        <div className="relative border-r-4 border-[var(--gold)] p-5 sm:p-7">
          <p className="mb-2 text-sm font-semibold text-[var(--gold)]">
            إدارة المستخدمين
          </p>
          <h1 className="text-2xl font-bold text-[var(--primary-dark)] sm:text-4xl">
            المستخدمون
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
            صفحة مخصصة للأدمن فقط لعرض الحسابات الأساسية وأدوارها، وتجهيز إضافة المستخدمين والدعوات من داخل الموقع.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <span className="inline-flex rounded-full bg-[var(--gold-soft)] px-4 py-2 text-xs font-semibold text-[#7a5b16]">
              {users.length} مستخدم (صفحة {page + 1})
            </span>
            <Link href="/dashboard/users/new" className="gold-button inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white">
              <Plus aria-hidden className="size-4" />
              إضافة مستخدم
            </Link>
          </div>
        </div>
      </section>

      <section className="app-card rounded-[1.6rem] p-5">
        <p className="text-sm font-semibold text-[var(--gold)]">طلبات الإضافة من داخل النظام</p>
        <p className="mt-2 text-sm font-bold leading-7 text-[var(--muted)]">
          تُجهز طلبات المستخدمين هنا، ويُرسل رابط الدعوة عند توفر البريد والصلاحية. لا يصبح الحساب مفعّلًا إلا بعد إنشاء كلمة المرور وربطه بسجله الداخلي.
        </p>
        {onboarding.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-[var(--line)] bg-[#fffdf8] p-4 text-sm font-bold text-[var(--muted)]">
            لا توجد طلبات إضافة مستخدمين معلقة.
          </p>
        ) : (
          <div className="mt-4 grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
            {onboarding.map((request) => (
              <Link
                key={request.id}
                href={`/dashboard/users/${request.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-3.5 transition hover:border-[var(--gold)]"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[var(--primary-dark)]">{request.full_name}</p>
                  <p className="mt-0.5 truncate text-xs font-bold text-[var(--muted)]">{request.email}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    request.status === "linked" ? "bg-emerald-50 text-emerald-800" : "bg-[var(--gold-soft)] text-[#7a5b16]"
                  }`}
                >
                  {request.status === "linked" ? "مرتبط" : "بانتظار الربط"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="app-card overflow-hidden rounded-[1.6rem]">
        <div className="hidden overflow-x-auto md:block">
          <table className="formal-table w-full min-w-[720px] text-right text-sm">
            <thead>
              <tr>
                <th className="px-5 py-4">البريد</th>
                <th className="px-5 py-4">الاسم</th>
                <th className="px-5 py-4">الأدوار</th>
                <th className="px-5 py-4">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-5 py-4 font-semibold text-[var(--text)]">
                    <div className="flex flex-col gap-2">
                      <span>{user.email ?? "غير محدد"}</span>
                      <AccountTag email={user.email} />
                    </div>
                  </td>
                  <td className="px-5 py-4 text-[var(--muted)]">
                    {user.full_name ?? "غير مضاف"}
                  </td>
                  <td className="px-5 py-4 text-[var(--muted)]">
                    {formatRoleList(user.roles)}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={user.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 p-4 md:hidden">
          {users.map((user) => (
            <article
              key={user.id}
              className="resource-mobile-card p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="break-words text-sm font-bold text-[#12352d]">
                    {user.email ?? "غير محدد"}
                  </h2>
                  <AccountTag email={user.email} />
                  <p className="mt-1 text-sm text-[#667c74]">
                    {user.full_name ?? "غير مضاف"}
                  </p>
                </div>
                <StatusBadge status={user.status} />
              </div>
              <p className="mt-3 text-sm leading-6 text-[#667c74]">
                {formatRoleList(user.roles)}
              </p>
            </article>
          ))}
        </div>

        {users.length === 0 ? (
          <p className="p-5 text-sm text-[#667c74]">لا يوجد مستخدمون بعد.</p>
        ) : null}
      </section>

      {/* Pagination */}
      <div className="flex items-center justify-between gap-3">
        {page > 0 ? (
          <Link href={`?page=${page - 1}`} className="inline-flex items-center gap-1 rounded-xl border border-[var(--line)] px-4 py-2 text-sm font-bold text-[var(--muted)] hover:bg-[var(--line)]">
            <ChevronRight className="size-4" /> السابق
          </Link>
        ) : <span />}
        {users.length === PAGE_SIZE ? (
          <Link href={`?page=${page + 1}`} className="inline-flex items-center gap-1 rounded-xl border border-[var(--line)] px-4 py-2 text-sm font-bold text-[var(--muted)] hover:bg-[var(--line)]">
            التالي <ChevronLeft className="size-4" />
          </Link>
        ) : <span />}
      </div>
    </div>
  );
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.toLowerCase();

function AccountTag({ email }: { email: string | null }) {
  if (email?.toLowerCase() === "qa@example.com") {
    return <span className="w-fit rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-800">حساب تجربة QA</span>;
  }
  if (ADMIN_EMAIL && email?.toLowerCase() === ADMIN_EMAIL) {
    return <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-800">مدير النظام</span>;
  }
  return null;
}

async function getOnboardingRequests() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_onboarding_requests")
    .select("id,full_name,email,requested_role,status,auth_status,created_at")
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as Array<{ id: string; full_name: string; email: string; requested_role: string; status: string; auth_status: string }>;
}

function StatusBadge({ status }: { status: keyof typeof statusLabels }) {
  return (
    <span className="inline-flex rounded-full bg-[#eaf5ef] px-3 py-1 text-xs font-semibold text-[#075f4d]">
      {statusLabels[status]}
    </span>
  );
}
