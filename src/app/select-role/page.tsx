import Link from "next/link";
import { BookOpen, BriefcaseBusiness, LayoutDashboard, Newspaper, ShieldCheck } from "lucide-react";

import { getCurrentUserRoles, requireAuth } from "@/lib/auth";

export default async function SelectRolePage() {
  const user = await requireAuth();
  const roles = await getCurrentUserRoles(user);
  const isDemo = user.email === "qa@example.com" || roles.includes("demo_admin");

  if (!isDemo) {
    return (
      <main className="mx-auto grid min-h-screen max-w-3xl place-items-center p-6" dir="rtl">
        <section className="app-card rounded-[1.7rem] p-7 text-center">
          <h1 className="text-2xl font-bold text-[var(--primary-dark)]">هذه الصفحة مخصصة لحساب التجربة فقط</h1>
          <p className="mt-3 text-sm font-bold text-[var(--muted)]">استخدم لوحة التحكم المناسبة لصلاحيات حسابك.</p>
          <Link href="/auth/role-redirect" className="gold-button mt-5 inline-flex rounded-2xl px-5 py-3 text-sm font-semibold text-white">
            الرجوع للمسار المناسب
          </Link>
        </section>
      </main>
    );
  }

  const modes = [
    { href: "/dashboard/teacher-preview", title: "تجربة بوابة معلم أو معلمة", description: "اختر معلمًا وشاهد نطاقه وسجل العمليات باسم حساب التجربة.", icon: BookOpen },
    { href: "/supervisor/dashboard", title: "تجربة لوحة المشرف", description: "متابعة الحلقات والمعلمين وإدخالاتهم.", icon: ShieldCheck },
    { href: "/executive/dashboard", title: "تجربة لوحة المدير التنفيذي", description: "ملخص الموارد والاجتماعات والحوكمة والتقارير.", icon: BriefcaseBusiness },
    { href: "/media/dashboard", title: "تجربة بوابة الإعلامي", description: "تجهيز الأخبار والتغطيات الإعلامية الداخلية.", icon: Newspaper },
    { href: "/dashboard", title: "تجربة لوحة الإدارة", description: "الوصول للوحة التحكم العامة.", icon: LayoutDashboard },
  ];

  return (
    <main className="min-h-screen bg-[var(--background)] p-4 sm:p-8" dir="rtl">
      <section className="dashboard-hero luxury-pattern mx-auto max-w-5xl overflow-hidden rounded-[1.8rem] text-white">
        <div className="relative p-6 sm:p-8">
          <p className="text-sm font-semibold text-[var(--gold-soft)]">حساب تجربة موحد</p>
          <h1 className="mt-2 text-3xl font-bold">اختر وضع التجربة</h1>
          <p className="mt-3 max-w-2xl text-sm font-bold leading-7 text-[#d9eee5]">
            الحساب qa@example.com مخصص للتجربة الداخلية فقط، ولا يغيّر صلاحيات المستخدمين الحقيقيين.
          </p>
        </div>
      </section>

      <section className="mx-auto mt-5 grid max-w-5xl gap-4 md:grid-cols-2">
        {modes.map((mode) => {
          const Icon = mode.icon;
          return (
            <Link key={mode.href} href={mode.href} className="app-card group rounded-[1.6rem] p-5 transition hover:-translate-y-0.5 hover:border-[var(--gold)]">
              <span className="grid size-12 place-items-center rounded-2xl border border-[var(--line)] bg-[#f8f1df] text-[var(--primary-dark)]">
                <Icon aria-hidden className="size-6" />
              </span>
              <h2 className="mt-4 text-xl font-bold text-[var(--primary-dark)]">{mode.title}</h2>
              <p className="mt-2 text-sm font-bold leading-7 text-[var(--muted)]">{mode.description}</p>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
